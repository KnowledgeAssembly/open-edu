import { vi } from 'vitest';

const storage = new Map<string, string>();

const mockStorage: Storage = {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storage.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    storage.delete(key);
  }),
  clear: vi.fn(() => {
    storage.clear();
  }),
  key: vi.fn((index: number) => Array.from(storage.keys())[index] ?? null),
  get length() {
    return storage.size;
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
  configurable: true,
});

const dbData = new Map<string, Map<string, unknown>>();

const makeRequest = <T>(result: T) => {
  const req: {
    result: T;
    onsuccess: ((this: IDBRequest, ev: Event) => void) | null;
    onerror: ((this: IDBRequest, ev: Event) => void) | null;
    error: DOMException | null;
  } = {
    result,
    onsuccess: null,
    onerror: null,
    error: null,
  };
  setTimeout(() => {
    if (req.onsuccess) req.onsuccess.call(req as unknown as IDBRequest, {} as Event);
  }, 0);
  return req;
};

const mockObjectStore = (storeName: string) => {
  if (!dbData.has(storeName)) dbData.set(storeName, new Map());
  const store = dbData.get(storeName)!;

  return {
    put: vi.fn((value: { key?: string; id?: string } & Record<string, unknown>) => {
      const key = (value.key ?? value.id) as string;
      store.set(key, value);
    }),
    get: vi.fn((key: string) => makeRequest(store.get(key) ?? null)),
    delete: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
    createIndex: vi.fn(),
    getAll: vi.fn(() => makeRequest(Array.from(store.values()))),
  };
};

const mockDb = {
  objectStoreNames: {
    contains: vi.fn(() => false),
  },
  createObjectStore: vi.fn((name: string) => {
    dbData.set(name, new Map());
    return mockObjectStore(name);
  }),
  transaction: vi.fn((storeName: string) => ({
    objectStore: vi.fn(() => mockObjectStore(storeName)),
  })),
  close: vi.fn(),
};

const mockOpen = vi.fn(() => {
  const req: {
    result: typeof mockDb;
    onupgradeneeded: ((this: IDBRequest, ev: IDBVersionChangeEvent) => void) | null;
    onsuccess: ((this: IDBRequest, ev: Event) => void) | null;
    onerror: ((this: IDBRequest, ev: Event) => void) | null;
    error: DOMException | null;
  } = {
    result: mockDb,
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
    error: null,
  };
  setTimeout(() => {
    if (req.onsuccess) {
      req.onsuccess.call(req as unknown as IDBRequest, {} as Event);
    }
  }, 0);
  return req;
});

Object.defineProperty(globalThis, 'indexedDB', {
  value: {
    open: mockOpen,
    deleteDatabase: vi.fn(),
    databases: vi.fn(),
  },
  writable: true,
  configurable: true,
});
