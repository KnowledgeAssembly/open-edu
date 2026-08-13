import type { DraftApplyMode } from './StudioAssistantProvider';
import type { DraftItem, CourseDraftResult } from './types';

export const CONVERSATION_STORE_NAME = 'open-edu-studio-conversations';
export const CONVERSATION_MAX_MESSAGES = 100;

export interface StoredChatMetadata {
  mode?: 'explain' | 'draft' | 'course_draft';
  drafts?: DraftItem[];
  courseDraft?: CourseDraftResult;
  applyMode?: DraftApplyMode;
  suggestedNextSteps?: string[];
}

export interface StoredChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: StoredChatMetadata;
  createdAt: number;
}

interface ConversationRecord {
  courseId: string;
  messages: StoredChatMessage[];
  updatedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CONVERSATION_STORE_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('conversations')) {
        const store = db.createObjectStore('conversations', { keyPath: 'courseId' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Persists Studio author-assistant threads per `courseId` via IndexedDB.
 * Falls back to sessionStorage when IndexedDB is unavailable (private mode,
 * quota, or unsupported environment) so history still survives navigation.
 *
 * Messages are capped at `CONVERSATION_MAX_MESSAGES`; oldest user/assistant
 * pairs are pruned so a turn is never split.
 */
export class ConversationStore {
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
    const tx = db.transaction('conversations', mode);
    const store = tx.objectStore('conversations');
    const request = fn(store);
    return new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async loadMessages(courseId: string): Promise<StoredChatMessage[]> {
    try {
      const record = await this.transaction<ConversationRecord | undefined>(
        'readonly',
        (store) => store.get(courseId) as IDBRequest<ConversationRecord | undefined>,
      );
      return record?.messages ?? [];
    } catch {
      return this.loadSessionFallback(courseId);
    }
  }

  async saveMessages(courseId: string, messages: StoredChatMessage[]): Promise<void> {
    const pruned = pruneMessages(messages);
    const record: ConversationRecord = {
      courseId,
      messages: pruned,
      updatedAt: Date.now(),
    };
    try {
      await this.transaction('readwrite', (store) => store.put(record));
    } catch {
      this.saveSessionFallback(courseId, pruned);
    }
  }

  async clearMessages(courseId: string): Promise<void> {
    try {
      await this.transaction('readwrite', (store) => store.delete(courseId));
    } catch {
      // fall through to sessionStorage clear
    }
    try {
      sessionStorage.removeItem(sessionKey(courseId));
    } catch {
      // ignore
    }
  }

  private loadSessionFallback(courseId: string): StoredChatMessage[] {
    try {
      const raw = sessionStorage.getItem(sessionKey(courseId));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as { messages?: StoredChatMessage[] };
      return parsed.messages ?? [];
    } catch {
      return [];
    }
  }

  private saveSessionFallback(courseId: string, messages: StoredChatMessage[]): void {
    try {
      sessionStorage.setItem(sessionKey(courseId), JSON.stringify({ messages }));
    } catch {
      // non-fatal: history simply won't persist in restricted environments
    }
  }
}

function sessionKey(courseId: string): string {
  return `openedu.studio.conversation.${courseId}`;
}

/** Cap stored messages to the last N, preserving whole user/assistant turns. */
export function pruneMessages(messages: StoredChatMessage[]): StoredChatMessage[] {
  if (messages.length <= CONVERSATION_MAX_MESSAGES) return messages;

  let start = messages.length - CONVERSATION_MAX_MESSAGES;
  // Never start on an assistant message (which would orphan the tail of a turn).
  while (start < messages.length && messages[start]!.role === 'assistant') {
    start += 1;
  }
  return messages.slice(start);
}
