import { openDB, type IDBPDatabase } from 'idb';

export const DB_NAME = 'open-edu';
export const DB_VERSION = 8;

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

/** Whole-course legacy records. Retained ONLY for the one-time legacy
 *  migration utility (`migrateLegacyCourses`) — canonical content now lives in
 *  CourseWorkspace/OPFS and the Studio no longer reads these for normal use. */
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

export interface StoredPendingDraft {
  id: string;
  courseId: string;
  items: Array<{ kind: string; title: string; content: string }>;
  source: string;
  applyMode: string;
  context: { kind?: string; path?: string };
  createdAt: string;
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
  'pending-drafts': StoredPendingDraft;
  workspaces: WorkspaceRecord;
  files: IndexedFile;
  history: HistoryEntryRecord;
  aiSessions: AiSessionRecord;
  searchIndex: WorkspaceSearchIndexRecord;
}

/** @see SPEC §24 — IndexedDB metadata layer for the workspace architecture. */
export interface WorkspaceRecord {
  id: string;
  courseId: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Metadata about a canonical file. The record MUST NOT contain file content
 * (SPEC §25); content lives only in CourseWorkspace/OPFS.
 */
export interface IndexedFile {
  id: string;
  workspaceId: string;
  path: string;
  size: number;
  hash?: string;
  mimeType?: string;
  modifiedAt: number;
}

/** File-level change history (SPEC §37). Canonical files stay in OPFS. */
export interface HistoryEntryRecord {
  id: string;
  workspaceId: string;
  timestamp: number;
  source: 'user' | 'ai';
  description: string;
  changes: Array<{
    path: string;
    operation: 'create' | 'update' | 'delete' | 'move';
    previousContent?: ArrayBuffer | Uint8Array;
    newContent?: ArrayBuffer | Uint8Array;
    from?: string;
    to?: string;
  }>;
}

export interface AiSessionRecord {
  id: string;
  workspaceId: string;
  updatedAt: number;
  data?: Record<string, unknown>;
}

/** Rebuildable derived search index; deleting it never invalidates the course. */
export interface WorkspaceSearchIndexRecord {
  id: string;
  workspaceId: string;
  updatedAt: number;
  /** Serialized matches keyed by query generation; content-derived. */
  data?: Record<string, unknown>;
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
          // Retained for the legacy migration utility; not a canonical store.
          db.createObjectStore('studio-courses', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('studio-drafts')) {
          db.createObjectStore('studio-drafts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pending-drafts')) {
          db.createObjectStore('pending-drafts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('workspaces')) {
          db.createObjectStore('workspaces', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('files')) {
          const files = db.createObjectStore('files', { keyPath: 'id' });
          files.createIndex('byWorkspace', 'workspaceId', { unique: false });
        }
        if (!db.objectStoreNames.contains('history')) {
          const history = db.createObjectStore('history', { keyPath: 'id' });
          history.createIndex('byWorkspace', 'workspaceId', { unique: false });
        }
        if (!db.objectStoreNames.contains('aiSessions')) {
          const aiSessions = db.createObjectStore('aiSessions', { keyPath: 'id' });
          aiSessions.createIndex('byWorkspace', 'workspaceId', { unique: false });
        }
        if (!db.objectStoreNames.contains('searchIndex')) {
          const searchIndex = db.createObjectStore('searchIndex', { keyPath: 'id' });
          searchIndex.createIndex('byWorkspace', 'workspaceId', { unique: false });
        }
      },
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}
