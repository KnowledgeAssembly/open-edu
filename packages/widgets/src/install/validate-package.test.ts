import { describe, it, expect } from 'vitest';
import { validateWidgetPackage } from './validate-package.js';
import { canonicalIntegrity } from '../integrity.js';
import { DEFAULT_WIDGET_POLICY } from '@open-edu/schemas';

const CSP_HTML = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-x'; style-src 'unsafe-inline'; connect-src 'none'; frame-src 'none'; base-uri 'none';">
<script>const w = { apiVersion: 'open-edu.widget/1' };</script>`;

function validManifest(
  overrides: Record<string, unknown> = {},
  artifact: Record<string, unknown> = {},
) {
  return {
    id: 'community.example.counter',
    version: '1.0.0',
    apiVersion: 'open-edu.widget/1',
    artifact: {
      documentUrl: 'https://registry.example/counter/index.html',
      documentIntegrity: '',
      sizeBytes: 0,
      format: 'self-contained-html',
      ...artifact,
    },
    publisher: { id: 'publisher', name: 'Publisher' },
    metadata: {},
    schemas: {},
    capabilities: ['resize'],
    accessibility: {},
    supportedThemes: ['light', 'dark', 'zen'],
    reducedMotion: 'not-applicable',
    compatibility: { runtime: 'open-edu.widget/1' },
    distribution: { offline: true, cachePolicy: 'immutable' },
    status: 'experimental',
    ...overrides,
  };
}

function expectInvalid(
  result: Awaited<ReturnType<typeof validateWidgetPackage>>,
): asserts result is { ok: false; errors: string[] } {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error('expected validation to fail');
  }
}

describe('validateWidgetPackage', () => {
  it('returns ok with manifest for a valid self-contained package', async () => {
    const documentBytes = new TextEncoder().encode(CSP_HTML);
    const manifest = validManifest(
      {},
      {
        documentIntegrity: await canonicalIntegrity(documentBytes),
        sizeBytes: documentBytes.byteLength,
      },
    );
    const result = await validateWidgetPackage(
      { manifestJson: manifest, documentBytes },
      { maxArtifactBytes: DEFAULT_WIDGET_POLICY.maxArtifactBytes },
    );
    expect(result.ok).toBe(true);
  });

  it('reports manifest-invalid with the first issue when the manifest does not parse', async () => {
    const documentBytes = new TextEncoder().encode(CSP_HTML);
    const manifest = validManifest({ apiVersion: 'wrong-version' });
    const result = await validateWidgetPackage(
      { manifestJson: manifest, documentBytes },
      { maxArtifactBytes: 1024 },
    );
    expectInvalid(result);
    expect(result.errors[0]).toMatch(/^manifest-invalid:/);
  });

  it('reports document-integrity-mismatch when bytes do not match the declared integrity', async () => {
    const manifest = validManifest(
      {},
      { documentIntegrity: `sha256-${'0'.repeat(64)}`, sizeBytes: CSP_HTML.length },
    );
    const documentBytes = new TextEncoder().encode(CSP_HTML);
    const result = await validateWidgetPackage(
      { manifestJson: manifest, documentBytes },
      { maxArtifactBytes: 1024 },
    );
    expectInvalid(result);
    expect(result.errors).toContain('document-integrity-mismatch');
  });

  it('reports size-mismatch when sizeBytes does not equal the actual byte length', async () => {
    const documentBytes = new TextEncoder().encode(CSP_HTML);
    const manifest = validManifest(
      {},
      {
        documentIntegrity: await canonicalIntegrity(documentBytes),
        sizeBytes: documentBytes.byteLength + 1,
      },
    );
    const result = await validateWidgetPackage(
      { manifestJson: manifest, documentBytes },
      { maxArtifactBytes: 1024 },
    );
    expectInvalid(result);
    expect(result.errors).toContain('size-mismatch');
  });

  it('reports size-exceeds-policy when the document exceeds maxArtifactBytes', async () => {
    const documentBytes = new TextEncoder().encode(CSP_HTML);
    const manifest = validManifest(
      {},
      {
        documentIntegrity: await canonicalIntegrity(documentBytes),
        sizeBytes: documentBytes.byteLength,
      },
    );
    const result = await validateWidgetPackage(
      { manifestJson: manifest, documentBytes },
      { maxArtifactBytes: documentBytes.byteLength - 1 },
    );
    expectInvalid(result);
    expect(result.errors).toContain('size-exceeds-policy');
  });

  it('reports both size-mismatch and size-exceeds-policy when sizeBytes is wrong and over budget', async () => {
    const documentBytes = new TextEncoder().encode(CSP_HTML);
    const manifest = validManifest(
      {},
      {
        documentIntegrity: await canonicalIntegrity(documentBytes),
        sizeBytes: documentBytes.byteLength + 1000,
      },
    );
    const result = await validateWidgetPackage(
      { manifestJson: manifest, documentBytes },
      { maxArtifactBytes: documentBytes.byteLength - 1 },
    );
    expectInvalid(result);
    expect(result.errors).toContain('size-mismatch');
    expect(result.errors).toContain('size-exceeds-policy');
  });

  it('validates the archive integrity when archiveBytes is provided and metadata is present', async () => {
    const documentBytes = new TextEncoder().encode(CSP_HTML);
    const archiveBytes = new TextEncoder().encode('zip-content');
    const manifest = validManifest(
      {},
      {
        documentIntegrity: await canonicalIntegrity(documentBytes),
        sizeBytes: documentBytes.byteLength,
        archiveUrl: 'https://registry.example/counter/counter.zip',
        archiveIntegrity: await canonicalIntegrity(archiveBytes),
      },
    );
    const result = await validateWidgetPackage(
      { manifestJson: manifest, documentBytes, archiveBytes },
      { maxArtifactBytes: 1024 },
    );
    expect(result.ok).toBe(true);
  });

  it('reports archive-integrity-mismatch when archiveBytes do not match the declared archiveIntegrity', async () => {
    const documentBytes = new TextEncoder().encode(CSP_HTML);
    const archiveBytes = new TextEncoder().encode('zip-content');
    const manifest = validManifest(
      {},
      {
        documentIntegrity: await canonicalIntegrity(documentBytes),
        sizeBytes: documentBytes.byteLength,
        archiveUrl: 'https://registry.example/counter/counter.zip',
        archiveIntegrity: `sha256-${'1'.repeat(64)}`,
      },
    );
    const result = await validateWidgetPackage(
      { manifestJson: manifest, documentBytes, archiveBytes },
      { maxArtifactBytes: 1024 },
    );
    expectInvalid(result);
    expect(result.errors).toContain('archive-integrity-mismatch');
  });

  it('reports archive-missing-metadata when archiveBytes are provided but archive metadata is absent', async () => {
    const documentBytes = new TextEncoder().encode(CSP_HTML);
    const archiveBytes = new TextEncoder().encode('zip-content');
    const manifest = validManifest(
      {},
      {
        documentIntegrity: await canonicalIntegrity(documentBytes),
        sizeBytes: documentBytes.byteLength,
      },
    );
    const result = await validateWidgetPackage(
      { manifestJson: manifest, documentBytes, archiveBytes },
      { maxArtifactBytes: 1024 },
    );
    expectInvalid(result);
    expect(result.errors).toContain('archive-missing-metadata');
  });

  it('reports csp errors when the document has no CSP and no header is supplied', async () => {
    const documentBytes = new TextEncoder().encode(`<script>const w = {};</script>`);
    const manifest = validManifest(
      {},
      {
        documentIntegrity: await canonicalIntegrity(documentBytes),
        sizeBytes: documentBytes.byteLength,
      },
    );
    const result = await validateWidgetPackage(
      { manifestJson: manifest, documentBytes },
      { maxArtifactBytes: 1024 },
    );
    expectInvalid(result);
    expect(result.errors).toContain('csp-missing-connect-none');
    expect(result.errors).toContain('csp-missing-frame-none');
  });

  it('accepts a document with no CSP meta when cspHeader is supplied and complete', async () => {
    const html = `<script>const w = { apiVersion: 'open-edu.widget/1' };</script>`;
    const documentBytes = new TextEncoder().encode(html);
    const manifest = validManifest(
      {},
      {
        documentIntegrity: await canonicalIntegrity(documentBytes),
        sizeBytes: documentBytes.byteLength,
      },
    );
    const result = await validateWidgetPackage(
      {
        manifestJson: manifest,
        documentBytes,
        cspHeader: `default-src 'none'; connect-src 'none'; frame-src 'none'`,
      },
      { maxArtifactBytes: 1024 },
    );
    expect(result.ok).toBe(true);
  });

  it('reports relative-subresource for a relative src', async () => {
    const html = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src 'none'; frame-src 'none';">
<script src="./x.js"></script>`;
    const documentBytes = new TextEncoder().encode(html);
    const manifest = validManifest(
      {},
      {
        documentIntegrity: await canonicalIntegrity(documentBytes),
        sizeBytes: documentBytes.byteLength,
      },
    );
    const result = await validateWidgetPackage(
      { manifestJson: manifest, documentBytes },
      { maxArtifactBytes: 1024 },
    );
    expectInvalid(result);
    expect(result.errors).toContain('relative-subresource:./x.js');
  });

  it('collects multiple independent violations', async () => {
    const html = `<script src="./x.js"></script>`;
    const documentBytes = new TextEncoder().encode(html);
    const manifest = validManifest(
      {},
      {
        documentIntegrity: await canonicalIntegrity(documentBytes),
        sizeBytes: documentBytes.byteLength,
      },
    );
    const result = await validateWidgetPackage(
      { manifestJson: manifest, documentBytes },
      { maxArtifactBytes: 1024 },
    );
    expectInvalid(result);
    expect(result.errors).toContain('relative-subresource:./x.js');
    expect(result.errors).toContain('csp-missing-connect-none');
    expect(result.errors).toContain('csp-missing-frame-none');
  });
});
