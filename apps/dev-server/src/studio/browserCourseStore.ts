import {
  saveStudioCourse,
  getStudioCourse,
  listStudioCourses,
  replaceStudioCourse,
  deleteStudioCourse,
  type StoredStudioCourse,
} from '@open-edu/storage';
import {
  assertSafeCoursePath,
  normalizeCoursePath,
  sortCourseFiles,
  UnsafeCoursePathError,
  type StudioFile,
} from './courseFiles.js';

export interface BrowserCourseSummary {
  id: string;
  title: string;
  version: string;
  updatedAt: number;
  fileCount: number;
}

export interface BrowserCourse {
  id: string;
  version: string;
  title: string;
  files: StudioFile[];
  updatedAt: number;
  source?: StoredStudioCourse['source'];
}

export type BrowserCourseStoreErrorCode =
  | 'storage-unavailable'
  | 'quota-exceeded'
  | 'course-not-found'
  | 'invalid-path';

export class BrowserCourseStoreError extends Error {
  public readonly code: BrowserCourseStoreErrorCode;

  constructor(code: BrowserCourseStoreErrorCode, message: string) {
    super(message);
    this.name = 'BrowserCourseStoreError';
    this.code = code;
  }
}

export interface BrowserCourseStore {
  list(): Promise<BrowserCourseSummary[]>;
  get(id: string): Promise<BrowserCourse | null>;
  create(course: BrowserCourse): Promise<void>;
  replace(id: string, course: BrowserCourse): Promise<void>;
  duplicate(sourceId: string, newId: string, title: string): Promise<BrowserCourse>;
  delete(id: string): Promise<void>;
}

function toStoredFile(file: StudioFile): { path: string; data: ArrayBuffer } {
  const path = assertSafeCoursePath(file.path);
  return { path, data: new Uint8Array(file.data).buffer.slice(0) as ArrayBuffer };
}

function toStudioFile(file: { path: string; data: ArrayBuffer | Uint8Array }): StudioFile {
  const path = assertSafeCoursePath(file.path);
  const bytes =
    file.data instanceof Uint8Array ? new Uint8Array(file.data) : new Uint8Array(file.data);
  return { path, data: new Uint8Array(bytes) };
}

function normalizeFiles(files: StudioFile[]): StudioFile[] {
  const seen = new Set<string>();
  const normalized = files.map((file) => {
    const safe = assertSafeCoursePath(normalizeCoursePath(file.path));
    return { path: safe, data: new Uint8Array(file.data) };
  });
  for (const file of normalized) {
    if (seen.has(file.path)) {
      throw new UnsafeCoursePathError(`Duplicate normalized path: ${file.path}`);
    }
    seen.add(file.path);
  }
  return sortCourseFiles(normalized);
}

export function buildFileIndex(files: StudioFile[]): Map<string, Uint8Array> {
  const index = new Map<string, Uint8Array>();
  for (const file of sortCourseFiles(files)) {
    index.set(file.path, new Uint8Array(file.data));
  }
  return index;
}

function toBrowserCourse(record: StoredStudioCourse): BrowserCourse {
  return {
    id: record.id,
    version: record.version,
    title: record.title,
    files: normalizeFiles(record.files.map(toStudioFile)),
    updatedAt: Date.parse(record.updatedAt) || 0,
    source: record.source,
  };
}

function toStoredCourse(course: BrowserCourse): StoredStudioCourse {
  return {
    id: course.id,
    version: course.version,
    title: course.title,
    files: normalizeFiles(course.files).map(toStoredFile),
    updatedAt: new Date(course.updatedAt).toISOString(),
    source: course.source,
  };
}

function mapStorageError(err: unknown, context: string): never {
  if (err instanceof UnsafeCoursePathError) {
    throw new BrowserCourseStoreError('invalid-path', err.message);
  }
  const name = (err as { name?: string }).name ?? '';
  if (name === 'QuotaExceededError') {
    throw new BrowserCourseStoreError('quota-exceeded', `${context}: storage quota exceeded`);
  }
  if (name === 'NotFoundError' || (err instanceof Error && /does not exist/.test(err.message))) {
    throw new BrowserCourseStoreError('course-not-found', `${context}: course not found`);
  }
  throw new BrowserCourseStoreError('storage-unavailable', `${context}: ${messageOf(err)}`);
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function createBrowserCourseStore(): BrowserCourseStore {
  const store: BrowserCourseStore = {
    async list() {
      try {
        const records = await listStudioCourses();
        return records
          .map((r) => ({
            id: r.id,
            title: r.title,
            version: r.version,
            updatedAt: Date.parse(r.updatedAt) || 0,
            fileCount: r.files.length,
          }))
          .sort((a, b) => b.updatedAt - a.updatedAt);
      } catch (err) {
        mapStorageError(err, 'list courses');
      }
    },

    async get(id) {
      try {
        const record = await getStudioCourse(id);
        if (!record) return null;
        return toBrowserCourse(record);
      } catch (err) {
        mapStorageError(err, `get course ${id}`);
      }
    },

    async create(course) {
      try {
        await saveStudioCourse(toStoredCourse(course));
      } catch (err) {
        mapStorageError(err, `create course ${course.id}`);
      }
    },

    async replace(id, course) {
      try {
        await replaceStudioCourse(id, toStoredCourse({ ...course, id }));
      } catch (err) {
        mapStorageError(err, `replace course ${id}`);
      }
    },

    async duplicate(sourceId, newId, title) {
      try {
        const source = await getStudioCourse(sourceId);
        if (!source) {
          throw new BrowserCourseStoreError('course-not-found', `course ${sourceId} not found`);
        }
        const now = new Date().toISOString();
        const copy: StoredStudioCourse = {
          id: newId,
          version: source.version,
          title,
          files: source.files.map((f) => ({
            path: f.path,
            data: new Uint8Array(f.data).buffer.slice(0) as ArrayBuffer,
          })),
          updatedAt: now,
          source: { kind: 'browser-created' },
        };
        await saveStudioCourse(copy);
        return toBrowserCourse(copy);
      } catch (err) {
        mapStorageError(err, `duplicate course ${sourceId}`);
      }
    },

    async delete(id) {
      try {
        await deleteStudioCourse(id);
      } catch (err) {
        mapStorageError(err, `delete course ${id}`);
      }
    },
  };

  return store;
}
