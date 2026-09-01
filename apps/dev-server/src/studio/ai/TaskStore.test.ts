import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import type { Task } from '@open-edu/companion';
import { IndexedDbTaskStore, TASK_STORE_NAME } from './TaskStore.js';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: `task-${Math.random().toString(36).slice(2, 8)}`,
    conversationId: 'conv-1',
    state: 'started',
    kind: 'multi-step',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

async function clearTasks(): Promise<void> {
  const request = indexedDB.open(TASK_STORE_NAME, 1);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains('tasks')) {
      const store = db.createObjectStore('tasks', { keyPath: 'id' });
      store.createIndex('conversationId', 'conversationId', { unique: false });
    }
  };
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const tx = db.transaction('tasks', 'readwrite');
  tx.objectStore('tasks').clear();
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

describe('IndexedDbTaskStore', () => {
  let store: IndexedDbTaskStore;

  beforeEach(async () => {
    sessionStorage.clear();
    await clearTasks();
    store = new IndexedDbTaskStore();
  });

  it('creates, gets, updates, and lists tasks', async () => {
    const task = makeTask({ kind: 'generate_item' });
    await store.create(task);

    expect(await store.get(task.id)).toMatchObject({ id: task.id, state: 'started' });

    await store.update(task.id, { state: 'running' });
    const running = await store.get(task.id);
    expect(running?.state).toBe('running');
    expect(running?.updatedAt).toBeGreaterThanOrEqual(task.updatedAt);

    await store.update(task.id, { state: 'completed' });
    expect((await store.get(task.id))?.state).toBe('completed');
  });

  it('persists state transitions across store instances (IndexedDB)', async () => {
    const task = makeTask();
    await store.create(task);
    await store.update(task.id, { state: 'waiting-for-approval' });

    const reopened = new IndexedDbTaskStore();
    const loaded = await reopened.listByConversation(task.conversationId);
    expect(loaded.find((t) => t.id === task.id)?.state).toBe('waiting-for-approval');
  });

  it('lists tasks by conversation only', async () => {
    const a = makeTask({ conversationId: 'conv-1', state: 'completed' });
    const b = makeTask({ conversationId: 'conv-2', state: 'failed' });
    await store.create(a);
    await store.create(b);

    const conv1 = await store.listByConversation('conv-1');
    expect(conv1.map((task) => task.id)).toEqual([a.id]);
  });

  it('returns undefined for an unknown task', async () => {
    expect(await store.get('task-missing')).toBeUndefined();
  });

  it('falls back to sessionStorage when IndexedDB is unavailable', async () => {
    sessionStorage.clear();
    const original = globalThis.indexedDB;
    const desc = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
    Object.defineProperty(globalThis, 'indexedDB', { value: undefined, configurable: true });

    try {
      const fallbackStore = new IndexedDbTaskStore();
      const task = makeTask();
      await fallbackStore.create(task);
      await fallbackStore.update(task.id, { state: 'completed' });

      expect((await fallbackStore.get(task.id))?.state).toBe('completed');
      expect(
        (await fallbackStore.listByConversation(task.conversationId)).map((t) => t.id),
      ).toEqual([task.id]);
    } finally {
      if (desc) Object.defineProperty(globalThis, 'indexedDB', desc);
      else delete (globalThis as Record<string, unknown>).indexedDB;
      void original;
      sessionStorage.clear();
    }
  });

  it('uses the documented store name', () => {
    expect(TASK_STORE_NAME).toBe('open-edu-studio-tasks');
  });
});
