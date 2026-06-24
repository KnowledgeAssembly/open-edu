import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RemoteWidgetLoader, type EvaluateModule } from './remote-loader';
import { createWidgetRegistry } from './registry';
import type { RemoteWidgetManifest } from './types';

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
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(makeWidgetCode('test-remote'), {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      }),
    );

    const manifest = makeManifest();
    const def = await loader.load(manifest, registry, makeEvaluate({ id: 'test-remote', version: '1.0.0', render: () => null }));

    expect(def.id).toBe('test-remote');
    expect(registry.has('test-remote')).toBe(true);
    expect(registry.get('test-remote')).toBe(def);
  });

  it('should cache results and not make duplicate network requests', async () => {
    let fetchCount = 0;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      fetchCount++;
      return new Response(makeWidgetCode('test-remote'), {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      });
    });

    const manifest = makeManifest();
    const evaluate = makeEvaluate({ id: 'test-remote', version: '1.0.0', render: () => null });
    await loader.load(manifest, registry, evaluate);
    await loader.load(manifest, registry, evaluate);

    expect(fetchCount).toBe(1);
  });

  it('should reject file:// URLs', async () => {
    const manifest = makeManifest({ url: 'file:///tmp/widget.js' });

    await expect(loader.load(manifest, registry)).rejects.toThrow('file://');
  });

  it('should throw on fetch failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const manifest = makeManifest();
    await expect(loader.load(manifest, registry)).rejects.toThrow();
  });

  it('should throw on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Not Found', { status: 404, statusText: 'Not Found' }),
    );

    const manifest = makeManifest();
    await expect(loader.load(manifest, registry)).rejects.toThrow('Failed to fetch');
  });

  it('should throw on integrity mismatch', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(makeWidgetCode('test'), {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      }),
    );

    const manifest = makeManifest({
      integrity: 'sha256-0000000000000000000000000000000000000000000000000000000000000000',
    });

    await expect(loader.load(manifest, registry, makeEvaluate({ id: 'test', render: () => null }))).rejects.toThrow(
      'Integrity check failed',
    );
  });

  it('should throw when default export is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      }),
    );

    const manifest = makeManifest();
    await expect(loader.load(manifest, registry, async () => ({}))).rejects.toThrow(
      'has no default export',
    );
  });

  it('should throw when default export is not a valid WidgetDefinition', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ default: { notAWidget: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      }),
    );

    const manifest = makeManifest();
    await expect(loader.load(manifest, registry, async () => ({ default: { notAWidget: true } }))).rejects.toThrow(
      'not a valid WidgetDefinition',
    );
  });

  it('should update registry remote status through loading states', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(makeWidgetCode('status-test'), {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      }),
    );

    const manifest = makeManifest({ id: 'status-test' });
    registry.registerRemote(manifest);

    const reg1 = registry.getRemoteRegistration(manifest);
    expect(reg1?.status).toBe('pending');

    await loader.load(manifest, registry, makeEvaluate({ id: 'status-test', version: '1.0.0', render: () => null }));

    const reg2 = registry.getRemoteRegistration(manifest);
    expect(reg2?.status).toBe('success');
  });

  it('subscribe should notify when widget is already cached', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(makeWidgetCode('cached-test'), {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      }),
    );

    const manifest = makeManifest({ id: 'cached-test' });
    await loader.load(manifest, registry, makeEvaluate({ id: 'cached-test', version: '1.0.0', render: () => null }));

    const callback = vi.fn();
    const unsubscribe = loader.subscribe(manifest, callback);

    await new Promise((r) => setTimeout(r, 10));
    expect(callback).toHaveBeenCalledWith({ status: 'success' });
    unsubscribe();
  });
});
