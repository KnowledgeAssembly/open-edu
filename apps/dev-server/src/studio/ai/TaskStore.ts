import type { Task, TaskStore } from '@open-edu/companion';

export const TASK_STORE_NAME = 'open-edu-studio-tasks';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(TASK_STORE_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('tasks')) {
        const store = db.createObjectStore('tasks', { keyPath: 'id' });
        store.createIndex('conversationId', 'conversationId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(request.error);
  });
}

/**
 * Persists `Task` records (spec §20) via IndexedDB, mirroring the
 * `ConversationStore` pattern (store name `open-edu-studio-tasks`, `keyPath`
 * `id`, index on `conversationId`) with a sessionStorage fallback for
 * restricted environments. Tasks are separate from both conversation history
 * and workspace state.
 */
export class IndexedDbTaskStore implements TaskStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDb().catch((err) => {
        this.dbPromise = null;
        throw err;
      });
    }
    return this.dbPromise;
  }

  private async transaction<T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.getDb();
    const tx = db.transaction('tasks', mode);
    const store = tx.objectStore('tasks');
    const request = fn(store);
    return await new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.onerror = () => reject(tx.error);
    });
  }

  private sessionKey(conversationId: string): string {
    return `openedu.studio.tasks.${conversationId}`;
  }

  private loadSession(conversationId: string): Task[] {
    try {
      const raw = sessionStorage.getItem(this.sessionKey(conversationId));
      return raw ? (JSON.parse(raw) as Task[]) : [];
    } catch {
      return [];
    }
  }

  private saveSession(conversationId: string, tasks: Task[]): void {
    try {
      sessionStorage.setItem(this.sessionKey(conversationId), JSON.stringify(tasks));
    } catch {
      // non-fatal
    }
  }

  async create(task: Task): Promise<void> {
    try {
      await this.transaction('readwrite', (store) => store.put({ ...task }));
    } catch {
      const tasks = this.loadSession(task.conversationId);
      if (!tasks.some((existing) => existing.id === task.id)) {
        this.saveSession(task.conversationId, [...tasks, { ...task }]);
      }
    }
  }

  async update(id: string, patch: Partial<Task>): Promise<void> {
    const existing = await this.get(id);
    if (!existing) return;
    const next: Task = { ...existing, ...patch, updatedAt: Date.now() };
    try {
      await this.transaction('readwrite', (store) => store.put(next));
    } catch {
      this.saveSession(
        existing.conversationId,
        this.loadSession(existing.conversationId).map((task) => (task.id === id ? next : task)),
      );
    }
  }

  async get(id: string): Promise<Task | undefined> {
    try {
      const record = await this.transaction<Task | undefined>(
        'readonly',
        (store) => store.get(id) as IDBRequest<Task | undefined>,
      );
      if (record !== undefined) return record;
    } catch {
      // fall through to session storage
    }
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('openedu.studio.tasks.')) {
        const found = this.loadSession(key.replace('openedu.studio.tasks.', '')).find(
          (task) => task.id === id,
        );
        if (found) return found;
      }
    }
    return undefined;
  }

  async listByConversation(conversationId: string): Promise<Task[]> {
    try {
      const records = await this.transaction<Task[]>('readonly', (store) =>
        store.index('conversationId').getAll(IDBKeyRange.only(conversationId)),
      );
      return records;
    } catch {
      return this.loadSession(conversationId);
    }
  }
}
