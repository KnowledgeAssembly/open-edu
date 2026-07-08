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

const mockDb = {
  objectStoreNames: {
    contains: vi.fn(() => false),
  },
  createObjectStore: vi.fn(() => ({
    put: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    createIndex: vi.fn(),
  })),
  transaction: vi.fn(() => ({
    objectStore: vi.fn(() => ({
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
    })),
  })),
  close: vi.fn(),
};

const mockRequest = {
  result: mockDb,
  onupgradeneeded: null as unknown as
    | ((this: IDBRequest, ev: IDBVersionChangeEvent) => void)
    | null,
  onsuccess: null as unknown as ((this: IDBRequest, ev: Event) => void) | null,
  onerror: null as unknown as ((this: IDBRequest, ev: Event) => void) | null,
  error: null,
};

const mockOpen = vi.fn(() => {
  setTimeout(() => {
    if (mockRequest.onsuccess) {
      mockRequest.onsuccess.call(mockRequest as unknown as IDBRequest, {} as Event);
    }
  }, 0);
  return mockRequest;
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
