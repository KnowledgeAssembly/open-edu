export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  pronunciations?: { text: string; audioUrl?: string }[];
  partOfSpeech?: string;
  definitions: { definition: string; example?: string }[];
  synonyms?: string[];
  antonyms?: string[];
  relatedWords?: string[];
  translations?: Record<string, string>;
}

export interface DictionaryProvider {
  lookupWord(word: string): DictionaryEntry | null;
  search(query: string): DictionaryEntry[];
  getSuggestions(prefix: string): string[];
}

export interface LearningContext {
  courseId?: string;
  courseTitle?: string;
  bundleId?: string;
  chapterId?: string;
  lessonId?: string;
  lessonTitle?: string;
  sectionId?: string;
  pageContent?: string;
  selectedText?: string;
  learnerPreferences?: {
    readingLevel?: string;
    language?: string;
  };
}

export interface ExplanationRequest {
  text: string;
  context: LearningContext;
  style: 'simple' | 'detailed' | 'child_friendly' | 'autism_friendly' | 'exam';
  readingLevel?: '6-8' | '9-12' | 'secondary' | 'adult' | 'teacher';
}

export interface AIResponse {
  text: string;
  citations?: { source: string; text: string }[];
  timestamp: number;
}

export interface AIProvider {
  explain(request: ExplanationRequest): Promise<AIResponse>;
  ask(question: string, context: LearningContext): Promise<AIResponse>;
  simplify(text: string, level: string): Promise<string>;
}

export interface ContextProvider {
  getCurrentContext(): LearningContext;
  subscribe(callback: (context: LearningContext) => void): () => void;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'ai' | 'system';
  text: string;
  timestamp: number;
  citations?: { source: string; text: string }[];
}

export interface ConversationStore {
  getHistory(sessionId: string): ConversationMessage[];
  addMessage(sessionId: string, message: ConversationMessage): void;
  createSession(context: LearningContext): string;
  resetSession(sessionId: string): void;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
}

export interface CacheProvider {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
}
