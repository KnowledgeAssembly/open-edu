import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createWidgetArtifactCache } from './artifact-cache';
import { canonicalIntegrity } from './integrity';

const K = 'core.multiple-choice';
const V = '1.0.0';

async function sampleBytes(
  text = 'hello artifact',
): Promise<{ bytes: ArrayBuffer; integrity: string }> {
  const bytes = new TextEncoder().encode(text).buffer;
  const integrity = await canonicalIntegrity(bytes);
  return { bytes, integrity };
}

describe('WidgetArtifactCache (memory)', () => {
  // default: no global indexedDB in jsdom → memory store
  let cache: ReturnType<typeof createWidgetArtifactCache>;
  beforeEach(() => {
    cache = createWidgetArtifactCache();
  });
  afterEach(async () => {
    await cache.clear();
  });

  it('hit returns bytes after put with matching integrity', async () => {
    const { bytes, integrity } = await sampleBytes();
    await cache.put({ widgetId: K, version: V, integrity, bytes, cachedAt: Date.now() });
    await expect(cache.get(K, V, integrity)).resolves.toEqual(bytes);
  });

  it('miss returns undefined', async () => {
    await expect(cache.get(K, V, 'sha256-' + 'a'.repeat(64))).resolves.toBeUndefined();
  });

  it('mismatch on read returns undefined (verifies integrity, never executes)', async () => {
    const { bytes, integrity } = await sampleBytes();
    await cache.put({ widgetId: K, version: V, integrity, bytes, cachedAt: Date.now() });
    const wrong = 'sha256-' + 'b'.repeat(64);
    await expect(cache.get(K, V, wrong)).resolves.toBeUndefined();
  });

  it('invalidate removes the entry', async () => {
    const { bytes, integrity } = await sampleBytes();
    await cache.put({ widgetId: K, version: V, integrity, bytes, cachedAt: Date.now() });
    await cache.invalidate(K, V);
    await expect(cache.get(K, V, integrity)).resolves.toBeUndefined();
  });

  it('separates manifest-kind entries from document entries by key', async () => {
    const doc = await sampleBytes('doc bytes');
    const man = await sampleBytes('manifest bytes');
    await cache.put({
      widgetId: K,
      version: V,
      integrity: doc.integrity,
      bytes: doc.bytes,
      cachedAt: Date.now(),
    });
    await cache.put({
      widgetId: K,
      version: V,
      integrity: man.integrity,
      bytes: man.bytes,
      cachedAt: Date.now(),
      kind: 'manifest',
    });
    await expect(cache.get(K, V, doc.integrity)).resolves.toEqual(doc.bytes);
    await expect(cache.get(K, V, doc.integrity, 'manifest')).resolves.toBeUndefined();
    await expect(cache.get(K, V, man.integrity, 'manifest')).resolves.toEqual(man.bytes);
    const entry = await cache.getEntry(K, V, man.integrity, 'manifest');
    expect(entry?.kind).toBe('manifest');
  });

  it('invalidate with a kind only removes entries of that kind', async () => {
    const doc = await sampleBytes('doc bytes');
    const man = await sampleBytes('manifest bytes');
    await cache.put({
      widgetId: K,
      version: V,
      integrity: doc.integrity,
      bytes: doc.bytes,
      cachedAt: Date.now(),
    });
    await cache.put({
      widgetId: K,
      version: V,
      integrity: man.integrity,
      bytes: man.bytes,
      cachedAt: Date.now(),
      kind: 'manifest',
    });
    await cache.invalidate(K, V, 'manifest');
    await expect(cache.get(K, V, man.integrity, 'manifest')).resolves.toBeUndefined();
    await expect(cache.get(K, V, doc.integrity)).resolves.toEqual(doc.bytes);
  });

  it('memory store is LRU-bounded to 32 entries', async () => {
    const { bytes, integrity } = await sampleBytes('tiny');
    for (let i = 0; i < 33; i++) {
      await cache.put({ widgetId: `w${i}`, version: V, integrity, bytes, cachedAt: Date.now() });
    }
    await expect(cache.get('w0', V, integrity)).resolves.toBeUndefined();
    await expect(cache.get('w32', V, integrity)).resolves.toEqual(bytes);
  });

  it('getEntry returns the full entry with cachedAt metadata', async () => {
    const { bytes, integrity } = await sampleBytes();
    await cache.put({ widgetId: K, version: V, integrity, bytes, cachedAt: 1234 });
    const entry = await cache.getEntry(K, V, integrity);
    expect(entry?.cachedAt).toBe(1234);
    expect(entry?.bytes).toEqual(bytes);
  });
});

type TestGlobalIDB = {
  indexedDB?: IDBFactory;
  IDBKeyRange?: typeof globalThis.IDBKeyRange;
};
const testGlobal = globalThis as TestGlobalIDB;

describe('WidgetArtifactCache (IndexedDB)', () => {
  beforeEach(async () => {
    const { indexedDB, IDBKeyRange } = await import('fake-indexeddb');
    testGlobal.indexedDB = indexedDB;
    testGlobal.IDBKeyRange = IDBKeyRange;
    // ensure a pristine DB
    const del = await new Promise<void>((resolve, _reject) => {
      const req = indexedDB.deleteDatabase('open-edu-widget-artifacts');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
    void del;
  });
  afterEach(() => {
    delete testGlobal.indexedDB;
    delete testGlobal.IDBKeyRange;
  });

  it('persists and returns matching entry across instances', async () => {
    const c1 = createWidgetArtifactCache();
    const c2 = createWidgetArtifactCache();
    const { bytes, integrity } = await sampleBytes();
    await c1.put({ widgetId: K, version: V, integrity, bytes, cachedAt: Date.now() });
    await expect(c2.get(K, V, integrity)).resolves.toEqual(bytes);
  });

  it('evicts oldest entries once total exceeds 50 MiB', async () => {
    const cache = createWidgetArtifactCache();
    const bytes = new Uint8Array(1024 * 1024).buffer;
    const integrity = await canonicalIntegrity(bytes);
    for (let i = 0; i < 51; i++) {
      await cache.put({
        widgetId: K,
        version: `v${i}`,
        integrity,
        bytes,
        cachedAt: Date.now() + i,
      });
    }
    await expect(cache.get(K, 'v0', integrity)).resolves.toBeUndefined();
    await expect(cache.get(K, 'v50', integrity)).resolves.toEqual(bytes);
  });
});
