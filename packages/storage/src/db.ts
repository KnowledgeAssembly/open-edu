import { openDB, type IDBPDatabase } from 'idb';

export const DB_NAME = 'open-edu';
export const DB_VERSION = 6;

export interface DistributionMeta {
  sourceKind: string;
  sourceLabel: string;
  checksum: string;
  signatureStatus: string;
  installedAt: string;
}

export interface StoredCourse {
  id: string;
  version: string;
  manifest: Record<string, unknown>;
  nodes: Record<string, unknown>[];
  assets: { path: string; data: ArrayBuffer }[];
  downloadedAt: string;
  distributionMeta?: DistributionMeta;
  workflow?: Record<string, unknown>;
  rewards?: Record<string, unknown>;
  cards?: Record<string, unknown>;
}

export interface StoredBundleModule {
  manifest: Record<string, unknown>;
  nodes: { relativePath: string; content: string }[];
  assets: { path: string; data: ArrayBuffer }[];
  workflow?: Record<string, unknown>;
  rewards?: Record<string, unknown>;
  cards?: Record<string, unknown>;
}

export interface StoredBundle {
  id: string;
  version: string;
  bundleManifest: Record<string, unknown>;
  modules: StoredBundleModule[];
  downloadedAt: string;
  distributionMeta?: DistributionMeta;
  rewards?: Record<string, unknown>;
  cards?: Record<string, unknown>;
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

export interface NoteRecord {
  id: string;
  title: string;
  content: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  courseId?: string;
  lessonId?: string;
}

export interface NoteTagRecord {
  noteId: string;
  tag: string;
}

export type StudioCourseSource =
  | { kind: 'template'; label?: string }
  | { kind: 'oep-import'; label?: string }
  | { kind: 'browser-created'; label?: string };

export interface StoredStudioFile {
  path: string;
  data: ArrayBuffer;
}

export interface StoredStudioCourse {
  id: string;
  version: string;
  title: string;
  files: StoredStudioFile[];
  updatedAt: string;
  source?: StudioCourseSource;
}

export interface StoredStudioDraft {
  id: string;
  courseId: string;
  version: string;
  title: string;
  files: StoredStudioFile[];
  createdAt: string;
  updatedAt: string;
}

export interface OpenEduDB {
  courses: StoredCourse;
  progress: LearningProgress;
  'search-indexes': SearchIndex;
  preferences: UserPreferences;
  badges: BadgeData;
  cards: CardProgressData;
  notes: NoteRecord;
  'note-tags': NoteTagRecord;
  bundles: StoredBundle;
  'studio-courses': StoredStudioCourse;
  'studio-drafts': StoredStudioDraft;
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
        if (!db.objectStoreNames.contains('notes')) {
          db.createObjectStore('notes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('note-tags')) {
          const tagStore = db.createObjectStore('note-tags', { keyPath: ['noteId', 'tag'] });
          tagStore.createIndex('byNoteId', 'noteId', { unique: false });
        }
        if (!db.objectStoreNames.contains('bundles')) {
          db.createObjectStore('bundles', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('studio-courses')) {
          db.createObjectStore('studio-courses', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('studio-drafts')) {
          db.createObjectStore('studio-drafts', { keyPath: 'id' });
        }
      },
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}
