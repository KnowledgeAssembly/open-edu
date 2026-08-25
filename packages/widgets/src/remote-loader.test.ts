import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DEFAULT_WIDGET_POLICY, type WidgetPolicy } from '@open-edu/schemas';
import { RemoteWidgetLoader, type EvaluateModule } from './remote-loader';
import { createWidgetRegistry } from './registry';
import type { RemoteWidgetManifest } from './types';
import { canonicalIntegrity } from './integrity';

const SHA_256_64_ZEROS =
  'sha256-0000000000000000000000000000000000000000000000000000000000000000';

const policy: WidgetPolicy = {
  ...DEFAULT_WIDGET_POLICY,
  enabledTrustTiers: ['native', 'sandboxed', 'trusted-remote'],
  allowedOrigins: ['https://cdn.example.com'],
};

function makeManifest(overrides: Partial<RemoteWidgetManifest> = {}): RemoteWidgetManifest {
  return {
    id: 'test-remote',
    version: '1.0.0',
    url: 'https://cdn.example.com/widget.js',
    apiVersion: '1.0.0',
    ...overrides,
  };
}

function makeWidgetCode(id: string): string {
  return JSON.stringify({
    default: { id, version: '1.0.0', render: '(placeholder)' },
  });
}

function makeEvaluate(defaultExport: unknown): EvaluateModule {
  return async () => ({ default: defaultExport });
}

describe('RemoteWidgetLoader', () => {
  let loader: RemoteWidgetLoader;
  let registry: ReturnType<typeof createWidgetRegistry>;

  beforeEach(() => {
    loader = RemoteWidgetLoader.getInstance();
    loader.clearCache();
    registry = createWidgetRegistry();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch and register a remote widget', async () => {
    const code = makeWidgetCode('test-remote');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(code, {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      }),
    );

    const manifest = makeManifest({ integrity: await canonicalIntegrity(new TextEncoder().encode(code)) });
    const def = await loader.load(
      manifest,
      registry,
      makeEvaluate({ id: 'test-remote', version: '1.0.0', render: () => null }),
      policy,
    );

    expect(def.id).toBe('test-remote');
    expect(registry.has('test-remote')).toBe(true);
    expect(registry.get('test-remote')).toBe(def);
  });

  it('should cache results and not make duplicate network requests', async () => {
    let fetchCount = 0;
    const code = makeWidgetCode('test-remote');

    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      fetchCount++;
      return new Response(code, {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      });
    });

    const manifest = makeManifest({ integrity: await canonicalIntegrity(new TextEncoder().encode(code)) });
    const evaluate = makeEvaluate({ id: 'test-remote', version: '1.0.0', render: () => null });
    await loader.load(manifest, registry, evaluate, policy);
    await loader.load(manifest, registry, evaluate, policy);

    expect(fetchCount).toBe(1);
  });

  it('should reject file:// URLs', async () => {
    const manifest = makeManifest({ url: 'file:///tmp/widget.js' });

    await expect(loader.load(manifest, registry, undefined, policy)).rejects.toThrow('file://');
  });

  it('should throw on fetch failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const manifest = makeManifest({ integrity: SHA_256_64_ZEROS });
    await expect(loader.load(manifest, registry, undefined, policy)).rejects.toThrow();
  });

  it('should throw on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Not Found', { status: 404, statusText: 'Not Found' }),
    );

    const manifest = makeManifest({ integrity: SHA_256_64_ZEROS });
    await expect(loader.load(manifest, registry, undefined, policy)).rejects.toThrow(
      'Failed to fetch',
    );
  });

  it('should throw on integrity mismatch', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(makeWidgetCode('test'), {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      }),
    );

    const manifest = makeManifest({ integrity: SHA_256_64_ZEROS });

    await expect(
      loader.load(manifest, registry, makeEvaluate({ id: 'test', render: () => null }), policy),
    ).rejects.toThrow('Integrity mismatch');
  });

  it('should throw when default export is missing', async () => {
    const code = '{}';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(code, {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      }),
    );

    const manifest = makeManifest({ integrity: await canonicalIntegrity(new TextEncoder().encode(code)) });
    await expect(loader.load(manifest, registry, async () => ({}), policy)).rejects.toThrow(
      'has no default export',
    );
  });

  it('should throw when default export is not a valid WidgetDefinition', async () => {
    const code = JSON.stringify({ default: { notAWidget: true } });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(code, {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      }),
    );

    const manifest = makeManifest({ integrity: await canonicalIntegrity(new TextEncoder().encode(code)) });
    await expect(
      loader.load(manifest, registry, async () => ({ default: { notAWidget: true } }), policy),
    ).rejects.toThrow('not a valid WidgetDefinition');
  });

  it('should update registry remote status through loading states', async () => {
    const code = makeWidgetCode('status-test');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(code, {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      }),
    );

    const manifest = makeManifest({ id: 'status-test', integrity: await canonicalIntegrity(new TextEncoder().encode(code)) });
    registry.registerRemote(manifest);

    const reg1 = registry.getRemoteRegistration(manifest);
    expect(reg1?.status).toBe('pending');

    await loader.load(
      manifest,
      registry,
      makeEvaluate({ id: 'status-test', version: '1.0.0', render: () => null }),
      policy,
    );

    const reg2 = registry.getRemoteRegistration(manifest);
    expect(reg2?.status).toBe('success');
  });

  it('subscribe should notify when widget is already cached', async () => {
    const code = makeWidgetCode('cached-test');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(code, {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      }),
    );

    const manifest = makeManifest({ id: 'cached-test', integrity: await canonicalIntegrity(new TextEncoder().encode(code)) });
    await loader.load(
      manifest,
      registry,
      makeEvaluate({ id: 'cached-test', version: '1.0.0', render: () => null }),
      policy,
    );

    const callback = vi.fn();
    const unsubscribe = loader.subscribe(manifest, callback);

    await new Promise((r) => setTimeout(r, 10));
    expect(callback).toHaveBeenCalledWith({ status: 'success' });
    unsubscribe();
  });

  it('rejects load when trusted-remote is disabled', async () => {
    await expect(loader.load(makeManifest(), registry)).rejects.toThrow('trusted-remote');
  });

  it('rejects missing integrity even when trusted-remote is enabled', async () => {
    const { integrity: _i, ...rest } = makeManifest();

    await expect(loader.load(rest as RemoteWidgetManifest, registry, undefined, policy)).rejects.toThrow(
      'integrity',
    );
  });

  it('rejects apiVersion other than 1.0.0', async () => {
    const manifest = makeManifest({ apiVersion: 'open-edu.widget/1' });

    await expect(loader.load(manifest, registry, undefined, policy)).rejects.toThrow('apiVersion');
  });

  it('rejects responses larger than maxArtifactBytes', async () => {
    const strictPolicy: WidgetPolicy = { ...policy, maxArtifactBytes: 8 };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('this is more than eight bytes', { status: 200 }),
    );

    const manifest = makeManifest({ integrity: SHA_256_64_ZEROS });
    await expect(loader.load(manifest, registry, undefined, strictPolicy)).rejects.toThrow('size');
  });

  it('accepts a valid artifact when policy, integrity, and apiVersion match', async () => {
    const code = 'export default { id: "test-remote", render() {} }';
    const integrity = await canonicalIntegrity(new TextEncoder().encode(code));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(code, {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      }),
    );

    const manifest = makeManifest({ integrity });
    const def = await loader.load(
      manifest,
      registry,
      async () => ({ default: { id: 'test-remote', version: '1.0.0', render: () => null } }),
      policy,
    );

    expect(def.id).toBe('test-remote');
  });
});