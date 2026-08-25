import { canonicalIntegrity } from './integrity';

export interface CacheEntry {
  widgetId: string;
  version: string;
  integrity: string;
  bytes: ArrayBuffer;
  cachedAt: number;
  revokedAt?: number;
}

export interface WidgetArtifactCache {
  get(widgetId: string, version: string, integrity: string): Promise<ArrayBuffer | undefined>;
  getEntry(widgetId: string, version: string, integrity: string): Promise<CacheEntry | undefined>;
  put(entry: CacheEntry): Promise<void>;
  invalidate(widgetId: string, version: string): Promise<void>;
  clear(): Promise<void>;
}

const DB_NAME = 'open-edu-widget-artifacts';
const STORE_NAME = 'artifacts';
const MAX_MEMORY_ENTRIES = 32;
const MAX_IDB_BYTES = 50 * 1024 * 1024;

function keyOf(widgetId: string, version: string, integrity: string): string {
  return `${widgetId}@${version}#${integrity}`;
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function openArtifactDb(): Promise<IDBDatabase | undefined> {
  const idb = globalThis.indexedDB;
  if (!idb) return undefined;
  return new Promise((resolve) => {
    try {
      const req = idb.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
      req.onblocked = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

async function withArtifactDb<T>(fn: (db: IDBDatabase) => Promise<T>): Promise<T | undefined> {
  const db = await openArtifactDb();
  if (!db) return undefined;
  try {
    return await fn(db);
  } catch {
    return undefined;
  } finally {
    db.close();
  }
}

async function bytesMatch(expected: string, bytes: ArrayBuffer): Promise<boolean> {
  try {
    return (await canonicalIntegrity(bytes)) === expected;
  } catch {
    return false;
  }
}

class WidgetArtifactCacheImpl implements WidgetArtifactCache {
  private readonly memory = new Map<string, CacheEntry>();

  async get(
    widgetId: string,
    version: string,
    integrity: string,
  ): Promise<ArrayBuffer | undefined> {
    const entry = await this.getEntry(widgetId, version, integrity);
    return entry?.bytes;
  }

  async getEntry(
    widgetId: string,
    version: string,
    integrity: string,
  ): Promise<CacheEntry | undefined> {
    const key = keyOf(widgetId, version, integrity);
    let entry = this.memory.get(key);
    if (entry) {
      this.touch(key);
    } else {
      entry = await withArtifactDb(async (db) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const value = await idbRequest(tx.objectStore(STORE_NAME).get(key));
        return (value as CacheEntry | undefined) ?? undefined;
      });
      if (entry) {
        this.memory.delete(key);
        this.memory.set(key, entry);
        this.evictMemoryIfOver();
      }
    }
    if (!entry) return undefined;
    if (!(await bytesMatch(integrity, entry.bytes))) {
      this.memory.delete(key);
      await withArtifactDb(async (db) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        await idbRequest(tx.objectStore(STORE_NAME).delete(key));
        await txComplete(tx);
      });
      return undefined;
    }
    return entry;
  }

  async put(entry: CacheEntry): Promise<void> {
    const key = keyOf(entry.widgetId, entry.version, entry.integrity);
    this.memory.delete(key);
    this.memory.set(key, entry);
    this.evictMemoryIfOver();
    await withArtifactDb(async (db) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      await idbRequest(tx.objectStore(STORE_NAME).put(entry, key));
      await txComplete(tx);
      await this.evictIdbOverLimit(db);
    });
  }

  async invalidate(widgetId: string, version: string): Promise<void> {
    const prefix = `${widgetId}@${version}#`;
    for (const key of this.memory.keys()) {
      if (key.startsWith(prefix)) {
        this.memory.delete(key);
      }
    }
    await withArtifactDb(async (db) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const matches = await new Promise<string[]>((resolve) => {
        const out: string[] = [];
        const req = store.openKeyCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            if (String(cursor.key).startsWith(prefix)) {
              out.push(String(cursor.key));
            }
            cursor.continue();
          } else {
            resolve(out);
          }
        };
        req.onerror = () => resolve(out);
      });
      for (const key of matches) {
        await idbRequest(store.delete(key));
      }
      await txComplete(tx);
    });
  }

  async clear(): Promise<void> {
    this.memory.clear();
    await withArtifactDb(async (db) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      await idbRequest(tx.objectStore(STORE_NAME).clear());
      await txComplete(tx);
    });
  }

  private touch(key: string): void {
    const entry = this.memory.get(key);
    if (!entry) return;
    this.memory.delete(key);
    this.memory.set(key, entry);
    this.evictMemoryIfOver();
  }

  private evictMemoryIfOver(): void {
    while (this.memory.size > MAX_MEMORY_ENTRIES) {
      const oldest = this.memory.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.memory.delete(oldest);
    }
  }

  private async evictIdbOverLimit(db: IDBDatabase): Promise<void> {
    const readTx = db.transaction(STORE_NAME, 'readonly');
    const store = readTx.objectStore(STORE_NAME);
    const records: { key: string; cachedAt: number; size: number }[] = [];
    let total = 0;
    await new Promise<void>((resolve, reject) => {
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const value = cursor.value as CacheEntry;
          records.push({
            key: String(cursor.key),
            cachedAt: value.cachedAt,
            size: value.bytes.byteLength,
          });
          total += value.bytes.byteLength;
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
    await txComplete(readTx);
    if (total <= MAX_IDB_BYTES) {
      return;
    }
    records.sort((a, b) => a.cachedAt - b.cachedAt);
    let index = 0;
    while (total > MAX_IDB_BYTES && index < records.length) {
      const record = records[index]!;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      await idbRequest(tx.objectStore(STORE_NAME).delete(record.key));
      await txComplete(tx);
      total -= record.size;
      index += 1;
    }
  }
}

export function createWidgetArtifactCache(): WidgetArtifactCache {
  return new WidgetArtifactCacheImpl();
}