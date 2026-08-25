import { describe, it, expect } from 'vitest';
import {
  WidgetManifestSchema,
  WidgetCapabilitySchema,
  PROTOCOL_API_VERSION,
} from './community-widget-manifest';
import { toJsonSchemaDraft7 } from './json-schema';

const VALID: Record<string, unknown> = {
  id: 'community.example.counter',
  version: '1.0.0',
  apiVersion: 'open-edu.widget/1',
  artifact: {
    documentUrl: 'https://cdn.example.com/counter/index.html',
    documentIntegrity: 'sha256-' + 'a'.repeat(64),
    sizeBytes: 2048,
    format: 'multi-file',
  },
  publisher: { id: 'publisher-1', name: 'Example Publisher' },
  metadata: {},
  schemas: {},
  capabilities: ['resize', 'telemetry-interaction'],
  accessibility: {},
  supportedThemes: ['light', 'dark', 'zen'],
  reducedMotion: 'supported',
  compatibility: { runtime: 'open-edu >= 0.1.0' },
  distribution: { offline: false, cachePolicy: 'immutable' },
  status: 'experimental',
};

function buildManifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...VALID, ...overrides };
  if (overrides.artifact !== undefined) {
    merged.artifact = {
      ...(VALID.artifact as Record<string, unknown>),
      ...(overrides.artifact as Record<string, unknown>),
    };
  }
  if (overrides.distribution !== undefined) {
    merged.distribution = {
      ...(VALID.distribution as Record<string, unknown>),
      ...(overrides.distribution as Record<string, unknown>),
    };
  }
  return merged;
}

describe('WidgetManifestSchema', () => {
  it('parses a valid multi-file HTTPS manifest', () => {
    const result = WidgetManifestSchema.parse(VALID);
    expect(result.id).toBe('community.example.counter');
    expect(result.artifact.documentUrl).toBe('https://cdn.example.com/counter/index.html');
  });

  it('rejects file:/data:/blob: documentUrl', () => {
    for (const url of [
      'file:///tmp/counter/index.html',
      'data:text/html;base64,PGh0bWw+',
      'blob:https://cdn.example.com/counter/uuid',
    ]) {
      expect(() =>
        WidgetManifestSchema.parse(buildManifest({ artifact: { documentUrl: url } })),
      ).toThrow();
    }
  });

  it('rejects missing documentIntegrity', () => {
    const { documentIntegrity: _di, ...artifact } = VALID.artifact as Record<string, unknown>;
    expect(() => WidgetManifestSchema.parse({ ...VALID, artifact })).toThrow();
  });

  it('rejects distribution.offline:true with multi-file format', () => {
    expect(() =>
      WidgetManifestSchema.parse(
        buildManifest({
          artifact: { format: 'multi-file' },
          distribution: { offline: true },
        }),
      ),
    ).toThrow();
  });

  it('accepts distribution.offline:true with self-contained-html format', () => {
    expect(() =>
      WidgetManifestSchema.parse(
        buildManifest({
          artifact: { format: 'self-contained-html' },
          distribution: { offline: true },
        }),
      ),
    ).not.toThrow();
  });

  it('accepts a valid dotted id and rejects invalid ids', () => {
    expect(() =>
      WidgetManifestSchema.parse(buildManifest({ id: 'community.example.counter' })),
    ).not.toThrow();
    for (const id of ['Counter!', 'invalid', '-bad', 'bad-', 'a..b', 'UPPER', 'has_underscore']) {
      expect(() => WidgetManifestSchema.parse(buildManifest({ id }))).toThrow();
    }
  });

  it('rejects non-semver version and accepts semver with prerelease', () => {
    expect(() => WidgetManifestSchema.parse(buildManifest({ version: 'not-a-version' }))).toThrow();
    expect(() =>
      WidgetManifestSchema.parse(buildManifest({ version: '1.2.3-beta.1' })),
    ).not.toThrow();
  });

  it('accepts all four status values, including verified', () => {
    for (const status of ['experimental', 'verified', 'deprecated', 'revoked']) {
      expect(() => WidgetManifestSchema.parse(buildManifest({ status }))).not.toThrow();
    }
  });

  it('rejects archiveUrl set without archiveIntegrity and accepts it with', () => {
    expect(() =>
      WidgetManifestSchema.parse(
        buildManifest({ artifact: { archiveUrl: 'https://cdn.example.com/counter/archive.zip' } }),
      ),
    ).toThrow();
    expect(() =>
      WidgetManifestSchema.parse(
        buildManifest({
          artifact: {
            archiveUrl: 'https://cdn.example.com/counter/archive.zip',
            archiveIntegrity: 'sha256-' + 'b'.repeat(64),
          },
        }),
      ),
    ).not.toThrow();
  });

  it('requires self-contained-html when distribution.offline is true (superRefine)', () => {
    expect(() =>
      WidgetManifestSchema.parse(
        buildManifest({
          artifact: { format: 'multi-file' },
          distribution: { offline: true },
        }),
      ),
    ).toThrowError(/self-contained-html/);
  });

  it('generates a JSON Schema with top-level id, artifact, apiVersion properties', () => {
    const result = toJsonSchemaDraft7(WidgetManifestSchema);
    const properties = (result.properties ?? {}) as Record<string, unknown>;
    expect(properties).toHaveProperty('id');
    expect(properties).toHaveProperty('artifact');
    expect(properties).toHaveProperty('apiVersion');
  });
});

describe('WidgetManifestSchema stateSchemaVersion', () => {
  it('parses a manifest with stateSchemaVersion', () => {
    expect(() => buildManifest({ stateSchemaVersion: '2' })).not.toThrow();
    const result = WidgetManifestSchema.parse(buildManifest({ stateSchemaVersion: '2' }));
    expect(result.stateSchemaVersion).toBe('2');
  });

  it('still parses the base fixture without stateSchemaVersion', () => {
    expect(WidgetManifestSchema.safeParse(VALID).success).toBe(true);
  });
});

describe('WidgetCapabilitySchema', () => {
  it('rejects unknown capabilities', () => {
    expect(() =>
      WidgetManifestSchema.parse(buildManifest({ capabilities: ['resize', 'fullscreen'] })),
    ).toThrow();
  });

  it('accepts every enum value', () => {
    const capabilities = WidgetCapabilitySchema.options;
    expect(capabilities).toContain('resize');
    expect(() => WidgetManifestSchema.parse(buildManifest({ capabilities }))).not.toThrow();
  });
});

describe('PROTOCOL_API_VERSION', () => {
  it('is exported and matches the manifest apiVersion literal', () => {
    expect(PROTOCOL_API_VERSION).toBe('open-edu.widget/1');
  });
});
