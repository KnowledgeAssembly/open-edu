import { openDB, type IDBPDatabase } from 'idb';

export const DB_NAME = 'open-edu';
export const DB_VERSION = 2;

export interface StoredCourse {
  id: string;
  version: string;
  manifest: Record<string, unknown>;
  nodes: Record<string, unknown>[];
  assets: { path: string; data: ArrayBuffer }[];
  downloadedAt: string;
}

export interface LearningProgress {
  courseId: string;
  lessonId: string;
  completed: boolean;
  score?: number;
  updatedAt: string;
  data?: Record<string, unknown>;
}

export interface SearchIndex {
  locale: string;
  indexData: Record<string, unknown>;
}

export interface UserPreferences {
  locale: string;
  theme: string;
  fontSize: string;
}

export interface BadgeData {
  courseId: string;
  badgeNames: string[];
}

export interface CardProgressData {
  cardId: string;
  level: number;
  unlockedAt: string;
}

export interface OpenEduDB {
  courses: StoredCourse;
  progress: LearningProgress;
  'search-indexes': SearchIndex;
  preferences: UserPreferences;
  badges: BadgeData;
  cards: CardProgressData;
}

let dbPromise: Promise<IDBPDatabase<OpenEduDB>> | null = null;

export function resetDatabase(): void {
  dbPromise = null;
}

export function openDatabase(): Promise<IDBPDatabase<OpenEduDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OpenEduDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('courses')) {
          db.createObjectStore('courses', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress', { keyPath: ['courseId', 'lessonId'] });
        }
        if (!db.objectStoreNames.contains('search-indexes')) {
          db.createObjectStore('search-indexes', { keyPath: 'locale' });
        }
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'locale' });
        }
        if (!db.objectStoreNames.contains('badges')) {
          db.createObjectStore('badges', { keyPath: 'courseId' });
        }
        if (!db.objectStoreNames.contains('cards')) {
          db.createObjectStore('cards', { keyPath: 'cardId' });
        }
      },
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}
