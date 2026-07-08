import type {
  ConversationMessage,
  ConversationStore,
  LearningContext,
} from '../providers/types.js';

interface Session {
  id: string;
  context: LearningContext;
  messages: ConversationMessage[];
  created: number;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('open-edu-conversations', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('sessions')) {
        const store = db.createObjectStore('sessions', { keyPath: 'id' });
        store.createIndex('created', 'created', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class ConversationManager implements ConversationStore {
  private sessions = new Map<string, Session>();
  private currentSessionId: string | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openIndexedDB();
    }
    return this.dbPromise;
  }

  get currentSession(): string | null {
    return this.currentSessionId;
  }

  createSession(context: LearningContext): string {
    const session: Session = {
      id: generateId(),
      context: { ...context },
      messages: [],
      created: Date.now(),
    };
    this.sessions.set(session.id, session);
    this.currentSessionId = session.id;
    this.persistSession(session);
    return session.id;
  }

  getHistory(sessionId: string): ConversationMessage[] {
    const session = this.findSession(sessionId);
    return session ? [...session.messages] : [];
  }

  addMessage(sessionId: string, message: ConversationMessage): void {
    const session = this.findSession(sessionId);
    if (!session) return;
    session.messages.push(message);
    this.persistSession(session);
  }

  send(text: string, context: LearningContext): ConversationMessage {
    let sessionId = this.currentSessionId;
    if (!sessionId) {
      sessionId = this.createSession(context);
    }

    const userMessage: ConversationMessage = {
      id: generateId(),
      role: 'user',
      text,
      timestamp: Date.now(),
    };
    this.addMessage(sessionId, userMessage);

    this.updateSessionContext(sessionId, context);
    return userMessage;
  }

  resetSession(sessionId: string): void {
    const session = this.findSession(sessionId);
    if (session) {
      session.messages = [];
      this.persistSession(session);
    }
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
  }

  getCurrentMessages(): ConversationMessage[] {
    if (!this.currentSessionId) return [];
    return this.getHistory(this.currentSessionId);
  }

  private findSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  private updateSessionContext(sessionId: string, context: LearningContext): void {
    const session = this.findSession(sessionId);
    if (session) {
      session.context = { ...session.context, ...context };
      this.persistSession(session);
    }
  }

  private persistSession(session: Session): void {
    this.getDb().then((db) => {
      const tx = db.transaction('sessions', 'readwrite');
      tx.objectStore('sessions').put(session);
    });
  }
}
