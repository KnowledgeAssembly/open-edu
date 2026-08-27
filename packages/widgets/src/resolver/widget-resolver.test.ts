import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WIDGET_POLICY,
  type WidgetCapability,
  type WidgetManifest,
  type WidgetPolicy,
  type WidgetReference,
} from '@open-edu/schemas';
import { createWidgetResolver } from './widget-resolver.js';
import type {
  ResolverCatalog,
  CatalogWidgetMeta,
  WidgetResolver,
  WidgetResolverOptions,
} from './widget-resolver.js';
import { createWidgetRegistry } from '../registry.js';
import type { WidgetRegistry } from '../types.js';
import { createWidgetArtifactCache } from '../artifact-cache.js';
import { canonicalIntegrity } from '../integrity.js';

const ORIGIN = 'https://widgets.example.edu';
const WIDGET_ID = 'community.example.counter';
const VERSION = '1.0.0';
const MANIFEST_URL = `${ORIGIN}/${WIDGET_ID}/${VERSION}/manifest.json`;
const DOCUMENT_URL = `${ORIGIN}/${WIDGET_ID}/${VERSION}/index.html`;
const DOC_TEXT = '<!doctype html><html><body>counter</body></html>';
const DOC_FORMAT = 'self-contained-html' as const;
const DAY = 24 * 60 * 60 * 1000;

const ALL_CAPABILITIES: WidgetCapability[] = [
  'resize',
  'telemetry-interaction',
  'state-persistence',
  'locale',
  'theme',
  'hints',
  'observe-mode',
];

function policy(overrides: Partial<WidgetPolicy> = {}): WidgetPolicy {
  return {
    ...DEFAULT_WIDGET_POLICY,
    registryCatalogOrigins: [ORIGIN],
    grantedCapabilities: [...ALL_CAPABILITIES],
    experimentalWidgets: 'allow',
    ...overrides,
  };
}

function registryWith(def: { id: string; version: string; render: () => null }): WidgetRegistry {
  const registry = createWidgetRegistry();
  registry.register(def);
  return registry;
}

const BUILTIN_COUNTER = {
  id: 'core.matching',
  version: '1.0.0',
  render: () => null,
};

function catalogFor(
  registryId: string,
  status: CatalogWidgetMeta['status'] = 'experimental',
): ResolverCatalog {
  return {
    registryId,
    origin: ORIGIN,
    widgets: new Map([
      [
        `${WIDGET_ID}@${VERSION}`,
        {
          id: WIDGET_ID,
          version: VERSION,
          manifestUrl: MANIFEST_URL,
          status,
          trustTier: 'sandboxed',
          offline: false,
        },
      ],
    ]),
  };
}

function baseArtifact(documentIntegrity: string): WidgetManifest['artifact'] {
  return {
    documentUrl: DOCUMENT_URL,
    documentIntegrity,
    sizeBytes: 1024,
    format: DOC_FORMAT,
  };
}

async function manifestBytes(
  overrides: Partial<WidgetManifest> = {},
): Promise<{ bytes: ArrayBuffer; integrity: string }> {
  const manifest: WidgetManifest = {
    id: WIDGET_ID,
    version: VERSION,
    apiVersion: 'open-edu.widget/1',
    artifact: baseArtifact(`sha256-${'a'.repeat(64)}`),
    publisher: { id: 'p-1', name: 'P' },
    metadata: {},
    schemas: {},
    capabilities: ['resize', 'telemetry-interaction'],
    accessibility: {},
    supportedThemes: ['light', 'dark', 'zen'],
    reducedMotion: 'supported',
    compatibility: { runtime: 'open-edu >= 0.1.0' },
    distribution: { offline: false, cachePolicy: 'immutable' },
    status: 'experimental',
    ...overrides,
  };
  const json = JSON.stringify(manifest);
  const bytes = new TextEncoder().encode(json).buffer;
  const integrity = await canonicalIntegrity(bytes);
  return { bytes, integrity };
}

async function documentBytes(text: string): Promise<{ bytes: ArrayBuffer; integrity: string }> {
  const bytes = new TextEncoder().encode(text).buffer;
  const integrity = await canonicalIntegrity(bytes);
  return { bytes, integrity };
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof Request) return input.url;
  return input.href;
}

function makeFetchMock(handlers: Record<string, ArrayBuffer | (() => ArrayBuffer)>): {
  impl: typeof fetch;
  calls: string[];
} {
  const calls: string[] = [];
  const impl: typeof fetch = async (input) => {
    const url = urlOf(input);
    calls.push(url);
    const handler = handlers[url];
    if (handler === undefined) {
      throw new Error(`unexpected fetch: ${url}`);
    }
    return new Response(typeof handler === 'function' ? handler() : handler, { status: 200 });
  };
  return { impl, calls };
}

function makeResolver(overrides: Partial<WidgetResolverOptions> = {}): WidgetResolver {
  return createWidgetResolver({
    policy: policy(),
    cache: createWidgetArtifactCache(),
    catalogs: { widgets: catalogFor('widgets') },
    registry: registryWith(BUILTIN_COUNTER),
    isOnline: () => true,
    now: () => Date.now(),
    ...overrides,
  });
}

function registryRef(integrity: string): WidgetReference {
  return {
    id: WIDGET_ID,
    version: VERSION,
    source: 'registry',
    registryId: 'widgets',
    integrity,
  };
}

describe('WidgetResolver (policy-aware)', () => {
  it('resolves a registered builtin to a native definition', async () => {
    const resolver = makeResolver();
    const result = await resolver.resolve({
      id: 'core.matching',
      version: '1.0.0',
      source: 'builtin',
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.tier === 'native') {
      expect(result.definition.id).toBe('core.matching');
    }
  });

  it('fails with unavailable when a builtin is not registered', async () => {
    const resolver = makeResolver({ registry: createWidgetRegistry() });
    const result = await resolver.resolve({
      id: 'ghost.widget',
      version: '1.0.0',
      source: 'builtin',
    });
    expect(result).toMatchObject({ ok: false, failure: 'unavailable' });
  });

  it('resolves a registry widget end to end and decodes srcDoc', async () => {
    const doc = await documentBytes(DOC_TEXT);
    const man = await manifestBytes({
      artifact: { ...baseArtifact(doc.integrity), sizeBytes: doc.bytes.byteLength },
      distribution: { offline: false, cachePolicy: 'immutable' },
    });
    const { impl, calls } = makeFetchMock({
      [MANIFEST_URL]: man.bytes,
      [DOCUMENT_URL]: doc.bytes,
    });
    const resolver = makeResolver({ fetchImpl: impl });

    const result = await resolver.resolve(registryRef(man.integrity));

    expect(result.ok).toBe(true);
    if (result.ok && result.tier === 'sandboxed') {
      expect(result.widgetId).toBe(WIDGET_ID);
      expect(result.version).toBe(VERSION);
      expect(result.srcDoc).toBe(DOC_TEXT);
      expect(result.documentBytes).toEqual(doc.bytes);
      expect(result.grantedCapabilities).toEqual(['resize', 'telemetry-interaction']);
    }
    expect(calls).toContain(MANIFEST_URL);
    expect(calls).toContain(DOCUMENT_URL);
  });

  it('falls back to the locally served registry index.html when the documentUrl fetch fails', async () => {
    const LOCAL_REGISTRY = 'http://localhost:4001';
    const LOCAL_MANIFEST_URL = `${LOCAL_REGISTRY}/widget-registry/localpub/community.example.counter/1.0.0/manifest.json`;
    const LOCAL_DOCUMENT_URL = `${LOCAL_REGISTRY}/widget-registry/localpub/community.example.counter/1.0.0/index.html`;
    const CDN_DOCUMENT_URL =
      'https://cdn.example.com/widgets/community.example.counter/1.0.0/index.html';
    const doc = await documentBytes(DOC_TEXT);
    const man = await manifestBytes({
      artifact: {
        ...baseArtifact(doc.integrity),
        documentUrl: CDN_DOCUMENT_URL,
        sizeBytes: doc.bytes.byteLength,
      },
      distribution: { offline: false, cachePolicy: 'immutable' },
    });
    const { impl, calls } = makeFetchMock({
      [LOCAL_MANIFEST_URL]: man.bytes,
      [LOCAL_DOCUMENT_URL]: doc.bytes,
    });
    const catalog: ResolverCatalog = {
      registryId: 'localdev',
      origin: LOCAL_REGISTRY,
      widgets: new Map([
        [
          `${WIDGET_ID}@${VERSION}`,
          {
            id: WIDGET_ID,
            version: VERSION,
            manifestUrl: LOCAL_MANIFEST_URL,
            status: 'experimental',
            trustTier: 'sandboxed',
            offline: true,
          },
        ],
      ]),
    };
    const resolver = createWidgetResolver({
      policy: policy({ registryCatalogOrigins: [LOCAL_REGISTRY] }),
      cache: createWidgetArtifactCache(),
      catalogs: { localdev: catalog },
      registry: registryWith(BUILTIN_COUNTER),
      fetchImpl: impl,
      isOnline: () => true,
      now: () => Date.now(),
    });

    const result = await resolver.resolve({
      id: WIDGET_ID,
      version: VERSION,
      source: 'registry',
      registryId: 'localdev',
      integrity: man.integrity,
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.tier === 'sandboxed') {
      expect(result.srcDoc).toBe(DOC_TEXT);
    }
    expect(calls).toContain(LOCAL_MANIFEST_URL);
    expect(calls).toContain(LOCAL_DOCUMENT_URL);
    expect(calls).toContain(CDN_DOCUMENT_URL);
    expect(calls.indexOf(CDN_DOCUMENT_URL)).toBeLessThan(calls.indexOf(LOCAL_DOCUMENT_URL));
  });

  it('returns unavailable when both primary and local fallback fetches fail', async () => {
    const LOCAL_REGISTRY = 'http://localhost:4001';
    const LOCAL_MANIFEST_URL = `${LOCAL_REGISTRY}/widget-registry/localpub/community.example.counter/1.0.0/manifest.json`;
    const CDN_DOCUMENT_URL =
      'https://cdn.example.com/widgets/community.example.counter/1.0.0/index.html';
    const doc = await documentBytes(DOC_TEXT);
    const man = await manifestBytes({
      artifact: {
        ...baseArtifact(doc.integrity),
        documentUrl: CDN_DOCUMENT_URL,
        sizeBytes: doc.bytes.byteLength,
      },
      distribution: { offline: false, cachePolicy: 'immutable' },
    });
    const { impl, calls } = makeFetchMock({
      [LOCAL_MANIFEST_URL]: man.bytes,
      // neither CDN nor local document URL registered → both fail
    });
    const catalog: ResolverCatalog = {
      registryId: 'localdev',
      origin: LOCAL_REGISTRY,
      widgets: new Map([
        [
          `${WIDGET_ID}@${VERSION}`,
          {
            id: WIDGET_ID,
            version: VERSION,
            manifestUrl: LOCAL_MANIFEST_URL,
            status: 'experimental',
            trustTier: 'sandboxed',
            offline: true,
          },
        ],
      ]),
    };
    const resolver = createWidgetResolver({
      policy: policy({ registryCatalogOrigins: [LOCAL_REGISTRY] }),
      cache: createWidgetArtifactCache(),
      catalogs: { localdev: catalog },
      registry: registryWith(BUILTIN_COUNTER),
      fetchImpl: impl,
      isOnline: () => true,
      now: () => Date.now(),
    });

    const result = await resolver.resolve({
      id: WIDGET_ID,
      version: VERSION,
      source: 'registry',
      registryId: 'localdev',
      integrity: man.integrity,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure).toBe('unavailable');
    }
    expect(calls).toContain(CDN_DOCUMENT_URL);
  });

  it('fails with integrity before fetching the document on mismatch', async () => {
    const doc = await documentBytes(DOC_TEXT);
    const man = await manifestBytes({
      artifact: { ...baseArtifact(doc.integrity), sizeBytes: doc.bytes.byteLength },
    });
    const { impl, calls } = makeFetchMock({
      [MANIFEST_URL]: man.bytes,
      [DOCUMENT_URL]: doc.bytes,
    });
    const resolver = makeResolver({ fetchImpl: impl });

    const wrongManifestIntegrity = `sha256-${'c'.repeat(64)}`;
    const result = await resolver.resolve(registryRef(wrongManifestIntegrity));

    expect(result).toMatchObject({ ok: false, failure: 'integrity' });
    expect(calls).not.toContain(DOCUMENT_URL);
  });

  it('refuses a revoked widget online', async () => {
    const man = await manifestBytes({ status: 'revoked' });
    const { impl } = makeFetchMock({ [MANIFEST_URL]: man.bytes });
    const resolver = makeResolver({ fetchImpl: impl, isOnline: () => true });

    const result = await resolver.resolve(registryRef(man.integrity));

    expect(result).toMatchObject({ ok: false, failure: 'revoked' });
  });

  it('refuses online when the catalog marks the widget revoked even if the served manifest is not', async () => {
    const man = await manifestBytes();
    const { impl, calls } = makeFetchMock({ [MANIFEST_URL]: man.bytes });
    const cache = createWidgetArtifactCache();
    const resolver = createWidgetResolver({
      policy: policy(),
      cache,
      catalogs: { widgets: catalogFor('widgets', 'revoked') },
      registry: registryWith(BUILTIN_COUNTER),
      fetchImpl: impl,
      isOnline: () => true,
      now: () => Date.now(),
    });

    const result = await resolver.resolve(registryRef(man.integrity));

    expect(result).toMatchObject({ ok: false, failure: 'revoked' });
    expect(calls).toContain(MANIFEST_URL);
  });

  it('marks revokedAt on both the document and manifest cache entries when revoked', async () => {
    const doc = await documentBytes(DOC_TEXT);
    const man = await manifestBytes({
      status: 'revoked',
      artifact: { ...baseArtifact(doc.integrity), sizeBytes: doc.bytes.byteLength },
    });
    const cache = createWidgetArtifactCache();
    const now = Date.now();
    await cache.put({
      widgetId: WIDGET_ID,
      version: VERSION,
      integrity: doc.integrity,
      bytes: doc.bytes,
      cachedAt: now - 1000,
    });
    const { impl } = makeFetchMock({ [MANIFEST_URL]: man.bytes });
    const resolver = makeResolver({
      cache,
      fetchImpl: impl,
      isOnline: () => false,
      now: () => now,
      catalogs: { widgets: catalogFor('widgets', 'revoked') },
    });

    await resolver.resolve(registryRef(man.integrity));

    const docEntry = await cache.getEntry(WIDGET_ID, VERSION, doc.integrity);
    expect(docEntry?.revokedAt).toBe(now);
    const manifestEntry = await cache.getEntry(WIDGET_ID, VERSION, man.integrity, 'manifest');
    expect(manifestEntry?.revokedAt).toBe(now);
  });

  it('serves a revoked widget from cache offline within the 7d grace', async () => {
    const doc = await documentBytes(DOC_TEXT);
    const man = await manifestBytes({
      status: 'revoked',
      artifact: { ...baseArtifact(doc.integrity), sizeBytes: doc.bytes.byteLength },
    });
    const cache = createWidgetArtifactCache();
    const now = Date.now();
    await cache.put({
      widgetId: WIDGET_ID,
      version: VERSION,
      integrity: doc.integrity,
      bytes: doc.bytes,
      cachedAt: now - 30 * DAY,
      revokedAt: now - 1000,
    });
    const { impl, calls } = makeFetchMock({ [MANIFEST_URL]: man.bytes });
    const resolver = makeResolver({
      cache,
      fetchImpl: impl,
      isOnline: () => false,
      now: () => now,
    });

    const result = await resolver.resolve(registryRef(man.integrity));

    expect(result.ok).toBe(true);
    if (result.ok && result.tier === 'sandboxed') {
      expect(result.documentBytes).toEqual(doc.bytes);
      expect(result.srcDoc).toBe(DOC_TEXT);
    }
    expect(calls).not.toContain(DOCUMENT_URL);
  });

  it('fails a revoked offline widget past the 7d grace', async () => {
    const doc = await documentBytes(DOC_TEXT);
    const man = await manifestBytes({
      status: 'revoked',
      artifact: { ...baseArtifact(doc.integrity), sizeBytes: doc.bytes.byteLength },
    });
    const cache = createWidgetArtifactCache();
    const now = Date.now();
    await cache.put({
      widgetId: WIDGET_ID,
      version: VERSION,
      integrity: doc.integrity,
      bytes: doc.bytes,
      cachedAt: now - 30 * DAY,
      revokedAt: now - 8 * DAY,
    });
    const { impl } = makeFetchMock({ [MANIFEST_URL]: man.bytes });
    const resolver = makeResolver({
      cache,
      fetchImpl: impl,
      isOnline: () => false,
      now: () => now,
    });

    const result = await resolver.resolve(registryRef(man.integrity));

    expect(result).toMatchObject({ ok: false, failure: 'revoked' });
  });

  it('falls back to a cached manifest offline when the registry is unreachable', async () => {
    const doc = await documentBytes(DOC_TEXT);
    const man = await manifestBytes({
      artifact: { ...baseArtifact(doc.integrity), sizeBytes: doc.bytes.byteLength },
      distribution: { offline: true, cachePolicy: 'immutable' },
    });
    const cache = createWidgetArtifactCache();
    const now = Date.now();
    await cache.put({
      widgetId: WIDGET_ID,
      version: VERSION,
      integrity: man.integrity,
      bytes: man.bytes,
      cachedAt: now - 1000,
      kind: 'manifest',
    });
    await cache.put({
      widgetId: WIDGET_ID,
      version: VERSION,
      integrity: doc.integrity,
      bytes: doc.bytes,
      cachedAt: now - 1000,
    });
    const impl: typeof fetch = async () => {
      throw new TypeError('network unreachable');
    };
    const resolver = makeResolver({
      cache,
      fetchImpl: impl,
      isOnline: () => false,
      now: () => now,
    });

    const result = await resolver.resolve(registryRef(man.integrity));

    expect(result.ok).toBe(true);
    if (result.ok && result.tier === 'sandboxed') {
      expect(result.srcDoc).toBe(DOC_TEXT);
      expect(result.documentBytes).toEqual(doc.bytes);
    }
  });

  it('rejects a legacy url ref when trusted-remote is disabled', async () => {
    const resolver = makeResolver();
    const result = await resolver.resolve({ id: 'legacy.x', version: '1.0.0', source: 'url' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure).toBe('policy');
      expect(result.message).toContain('trusted-remote');
    }
  });

  it('blocks a registry origin outside the allowlist without fetching', async () => {
    const man = await manifestBytes();
    const { impl, calls } = makeFetchMock({ [MANIFEST_URL]: man.bytes });
    const resolver = makeResolver({
      policy: policy({ registryCatalogOrigins: [] }),
      fetchImpl: impl,
    });

    const result = await resolver.resolve(registryRef(man.integrity));

    expect(result).toMatchObject({
      ok: false,
      failure: 'policy',
      message: 'registry-origin-not-allowed',
    });
    expect(calls).toHaveLength(0);
  });

  it('rejects an invalid nodeConfig against the config schema before fetching the document', async () => {
    const doc = await documentBytes(DOC_TEXT);
    const schema = JSON.stringify({
      type: 'object',
      properties: { count: { type: 'number' } },
      required: ['count'],
      additionalProperties: false,
    });
    const configUrl = `${ORIGIN}/${WIDGET_ID}/${VERSION}/config-schema.json`;
    const man = await manifestBytes({
      schemas: { configUrl },
      artifact: { ...baseArtifact(doc.integrity), sizeBytes: doc.bytes.byteLength },
    });
    const { impl, calls } = makeFetchMock({
      [MANIFEST_URL]: man.bytes,
      [configUrl]: new TextEncoder().encode(schema).buffer,
      [DOCUMENT_URL]: doc.bytes,
    });
    const resolver = makeResolver({ fetchImpl: impl });

    const result = await resolver.resolve(registryRef(man.integrity), { prompt: 'x' });

    expect(result).toMatchObject({ ok: false, failure: 'schema', message: 'config-invalid' });
    expect(calls).not.toContain(DOCUMENT_URL);
  });

  it('retries a transient network TypeError once and succeeds', async () => {
    const doc = await documentBytes(DOC_TEXT);
    const man = await manifestBytes({
      artifact: { ...baseArtifact(doc.integrity), sizeBytes: doc.bytes.byteLength },
    });
    const urlCalls: Record<string, number> = {};
    const impl: typeof fetch = async (input) => {
      const url = urlOf(input);
      urlCalls[url] = (urlCalls[url] ?? 0) + 1;
      if (url === MANIFEST_URL && urlCalls[url] === 1) throw new TypeError('network');
      if (url === MANIFEST_URL) return new Response(man.bytes, { status: 200 });
      if (url === DOCUMENT_URL) return new Response(doc.bytes, { status: 200 });
      throw new Error(`unexpected fetch: ${url}`);
    };
    const resolver = makeResolver({ fetchImpl: impl });

    const result = await resolver.resolve(registryRef(man.integrity));

    expect(result.ok).toBe(true);
    expect(urlCalls[MANIFEST_URL]).toBe(2);
    expect(urlCalls[DOCUMENT_URL]).toBe(1);
  });

  it('denies experimental widgets when the policy says deny', async () => {
    const man = await manifestBytes({ status: 'experimental' });
    const { impl, calls } = makeFetchMock({ [MANIFEST_URL]: man.bytes });
    const resolver = makeResolver({
      policy: policy({ experimentalWidgets: 'deny' }),
      fetchImpl: impl,
    });

    const result = await resolver.resolve(registryRef(man.integrity));

    expect(result).toMatchObject({ ok: false, failure: 'policy', message: 'experimental-denied' });
    expect(calls).not.toContain(DOCUMENT_URL);
  });

  it('demotes an unsigned verified manifest to experimental (policy deny blocks it)', async () => {
    const man = await manifestBytes({ status: 'verified', signature: undefined });
    const { impl, calls } = makeFetchMock({ [MANIFEST_URL]: man.bytes });
    const resolver = makeResolver({
      policy: policy({ experimentalWidgets: 'deny' }),
      fetchImpl: impl,
    });

    const result = await resolver.resolve(registryRef(man.integrity));

    expect(result).toMatchObject({ ok: false, failure: 'policy', message: 'experimental-denied' });
    expect(calls).not.toContain(DOCUMENT_URL);
  });
});
