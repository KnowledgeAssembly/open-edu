import type { CacheProvider } from '../providers/types.js';
import { pipiliServiceLogger } from './logger.js';

interface CacheRecord<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
}

const DEFAULT_TTL = 60 * 60 * 1000;
const SMALL_VALUE_MAX_SIZE = 1024 * 100;

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('open-edu-cache', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class CacheService implements CacheProvider {
  private memoryCache = new Map<string, CacheRecord<unknown>>();
  private dbPromise: Promise<IDBDatabase> | null = null;

  get<T>(key: string): T | null {
    const memRecord = this.memoryCache.get(key);
    if (memRecord) {
      if (this.isExpired(memRecord)) {
        this.memoryCache.delete(key);
        return null;
      }
      return memRecord.value as T;
    }

    const stored = this.readFromStorage<T>(key);
    if (stored) {
      if (this.isExpired(stored)) {
        this.removeFromStorage(key);
        return null;
      }
      this.memoryCache.set(key, stored);
      return stored.value;
    }

    return null;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    const record: CacheRecord<T> = {
      key,
      value,
      timestamp: Date.now(),
      ttl: ttl ?? DEFAULT_TTL,
    };

    this.memoryCache.set(key, record as CacheRecord<unknown>);
    this.writeToStorage(key, record);
  }

  delete(key: string): void {
    this.memoryCache.delete(key);
    this.removeFromStorage(key);
  }

  clear(): void {
    this.memoryCache.clear();
    this.clearLocalStorage();
    this.clearIndexedDB();
  }

  private clearLocalStorage(): void {
    try {
      const raw = localStorage.getItem('oe-cache-keys');
      const keys: string[] = raw ? JSON.parse(raw) : [];
      for (const key of keys) {
        localStorage.removeItem(`oe-cache:${key}`);
      }
      localStorage.removeItem('oe-cache-keys');
    } catch {
      // ignore
    }
  }

  private isExpired(record: CacheRecord<unknown>): boolean {
    return Date.now() - record.timestamp > record.ttl;
  }

  private readFromStorage<T>(key: string): CacheRecord<T> | null {
    try {
      const raw = localStorage.getItem(`oe-cache:${key}`);
      if (raw) {
        return JSON.parse(raw) as CacheRecord<T>;
      }
    } catch {
      // ignore parse errors
    }
    return null;
  }

  private writeToStorage<T>(key: string, record: CacheRecord<T>): void {
    const serialized = JSON.stringify(record);
    if (serialized.length <= SMALL_VALUE_MAX_SIZE) {
      try {
        localStorage.setItem(`oe-cache:${key}`, serialized);
        this.trackStorageKey(key);
        return;
      } catch {
        // localStorage full or unavailable
      }
    }

    this.dbPromise = this.dbPromise ?? openIndexedDB();
    this.dbPromise
      .then((db) => {
        const tx = db.transaction('cache', 'readwrite');
        tx.objectStore('cache').put(record);
      })
      .catch((err) => {
        pipiliServiceLogger.warn('IndexedDB write failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
  }

  private removeFromStorage(key: string): void {
    localStorage.removeItem(`oe-cache:${key}`);
    this.dbPromise
      ?.then((db) => {
        const tx = db.transaction('cache', 'readwrite');
        tx.objectStore('cache').delete(key);
      })
      .catch((err) => {
        pipiliServiceLogger.warn('IndexedDB delete failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
  }

  private trackStorageKey(key: string): void {
    try {
      const raw = localStorage.getItem('oe-cache-keys');
      const keys: string[] = raw ? JSON.parse(raw) : [];
      if (!keys.includes(key)) {
        keys.push(key);
        localStorage.setItem('oe-cache-keys', JSON.stringify(keys));
      }
    } catch {
      // ignore
    }
  }

  private clearIndexedDB(): void {
    this.dbPromise
      ?.then((db) => {
        const tx = db.transaction('cache', 'readwrite');
        tx.objectStore('cache').clear();
      })
      .catch((err) => {
        pipiliServiceLogger.warn('IndexedDB clear failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
  }
}
