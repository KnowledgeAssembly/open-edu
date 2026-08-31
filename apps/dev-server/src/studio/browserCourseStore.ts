import {
  MemoryCourseRepository,
  OpfsCourseRepository,
  WorkspaceConflictError,
  WorkspaceNotFoundError,
  WorkspacePathError,
  WorkspaceUnavailableError,
  type CourseRepository,
  type CourseWorkspace,
  walkWorkspace,
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

export interface CourseSource {
  kind: string;
  label?: string;
}

export interface BrowserCourse {
  id: string;
  version: string;
  title: string;
  files: StudioFile[];
  updatedAt: number;
  source?: CourseSource;
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
  /** Resolve the live CourseWorkspace for a course id, or null when absent. */
  workspaceOf?(id: string): Promise<CourseWorkspace | null>;
}

export interface BrowserCourseStoreOptions {
  repository?: CourseRepository;
  /** When true a non-persistent in-memory repository backs the store (tests). */
  nonPersistent?: boolean;
}

const TEXT_DECODER = new TextDecoder();
const TEXT_ENCODER = new TextEncoder();

export function buildFileIndex(files: StudioFile[]): Map<string, Uint8Array> {
  const index = new Map<string, Uint8Array>();
  for (const file of sortCourseFiles(files)) {
    index.set(file.path, new Uint8Array(file.data));
  }
  return index;
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

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function mapStorageError(err: unknown, context: string): never {
  if (err instanceof BrowserCourseStoreError) {
    throw err;
  }
  if (err instanceof UnsafeCoursePathError || err instanceof WorkspacePathError) {
    throw new BrowserCourseStoreError('invalid-path', err.message);
  }
  if (err instanceof WorkspaceUnavailableError) {
    const cause =
      err.cause && typeof err.cause === 'object' && 'name' in err.cause
        ? (err.cause as { name?: string }).name
        : undefined;
    if (cause === 'QuotaExceededError') {
      throw new BrowserCourseStoreError('quota-exceeded', `${context}: storage quota exceeded`);
    }
    throw new BrowserCourseStoreError('storage-unavailable', `${context}: ${messageOf(err)}`);
  }
  const name = (err as { name?: string }).name ?? '';
  if (name === 'QuotaExceededError') {
    throw new BrowserCourseStoreError('quota-exceeded', `${context}: storage quota exceeded`);
  }
  if (err instanceof WorkspaceNotFoundError || name === 'NotFoundError') {
    throw new BrowserCourseStoreError('course-not-found', `${context}: course not found`);
  }
  throw new BrowserCourseStoreError('storage-unavailable', `${context}: ${messageOf(err)}`);
}

async function readManifestTitleVersion(
  ws: CourseWorkspace,
): Promise<{ version: string; title: string }> {
  try {
    const raw = await ws.readText('package.json');
    const manifest = JSON.parse(raw) as { version?: string; title?: string };
    return { version: manifest.version ?? '1.0.0', title: manifest.title ?? '' };
  } catch {
    return { version: '1.0.0', title: '' };
  }
}

async function readWorkspaceMeta(ws: CourseWorkspace): Promise<{ updatedAt: number }> {
  try {
    const raw = await ws.readText('.openu/manifest.json');
    const manifest = JSON.parse(raw) as { updatedAt?: number };
    return { updatedAt: typeof manifest.updatedAt === 'number' ? manifest.updatedAt : Date.now() };
  } catch {
    return { updatedAt: Date.now() };
  }
}

async function listFiles(ws: CourseWorkspace): Promise<StudioFile[]> {
  const files = await walkWorkspace(ws);
  return files
    .filter((file) => !file.path.startsWith('.openu/'))
    .map((file) => ({ path: file.path, data: new Uint8Array(file.data) }));
}

export function createBrowserCourseStore(
  options: BrowserCourseStoreOptions = {},
): BrowserCourseStore {
  const repository: CourseRepository = options.repository ?? createDefaultRepository(options);

  async function openOrNull(id: string): Promise<CourseWorkspace | null> {
    try {
      if (!(await repository.exists(id))) return null;
      return await repository.open(id);
    } catch (err) {
      mapStorageError(err, `open course ${id}`);
    }
  }

  const store: BrowserCourseStore = {
    async list() {
      try {
        const infos = (await repository.list()).filter(
          (info) => info.courseId && info.courseId.length > 0,
        );
        const summaries: BrowserCourseSummary[] = [];
        for (const info of infos) {
          try {
            const ws = await repository.open(info.courseId);
            const { title, version } = await readManifestTitleVersion(ws);
            const files = await listFiles(ws);
            summaries.push({
              id: info.courseId,
              title,
              version,
              updatedAt: info.updatedAt,
              fileCount: files.length,
            });
          } catch {
            // A course whose workspace cannot be opened is skipped.
          }
        }
        return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
      } catch (err) {
        mapStorageError(err, 'list courses');
      }
    },

    async get(id) {
      const ws = await openOrNull(id);
      if (!ws) return null;
      try {
        const files = await listFiles(ws);
        const { title, version } = await readManifestTitleVersion(ws);
        const { updatedAt } = await readWorkspaceMeta(ws);
        return { id, version, title, files, updatedAt };
      } catch (err) {
        mapStorageError(err, `get course ${id}`);
      }
    },

    async create(course) {
      try {
        const files = normalizeFiles(course.files);
        let ws: CourseWorkspace;
        try {
          ws = await repository.create(course.id);
        } catch (err) {
          if (err instanceof WorkspaceConflictError) {
            throw new BrowserCourseStoreError(
              'course-not-found',
              `Course ${course.id} already exists`,
            );
          }
          throw err;
        }
        for (const file of files) {
          await ws.write(file.path, file.data);
        }
      } catch (err) {
        mapStorageError(err, `create course ${course.id}`);
      }
    },

    async replace(id, course) {
      try {
        const ws = await openOrNull(id);
        if (!ws) {
          throw new BrowserCourseStoreError('course-not-found', `course ${id} not found`);
        }
        const target = normalizeFiles(course.files);
        const targetSet = new Set(target.map((f) => f.path));
        const existing = await listFiles(ws);
        for (const file of existing) {
          if (!targetSet.has(file.path)) {
            await ws.delete(file.path);
          }
        }
        for (const file of target) {
          await ws.write(file.path, file.data);
        }
      } catch (err) {
        mapStorageError(err, `replace course ${id}`);
      }
    },

    async duplicate(sourceId, newId, title) {
      try {
        const source = await store.get(sourceId);
        if (!source) {
          throw new BrowserCourseStoreError('course-not-found', `course ${sourceId} not found`);
        }
        const ws = await repository.create(newId);
        const index = buildFileIndex(source.files);
        let manifest: Record<string, unknown> = {};
        const manifestRaw = index.get('package.json');
        if (manifestRaw) {
          try {
            manifest = JSON.parse(TEXT_DECODER.decode(manifestRaw)) as Record<string, unknown>;
          } catch {
            manifest = {};
          }
        }
        for (const file of source.files) {
          const data =
            file.path === 'package.json'
              ? TEXT_ENCODER.encode(JSON.stringify({ ...manifest, id: newId, title }, null, 2))
              : file.data;
          await ws.write(file.path, data);
        }
        const copy: BrowserCourse = {
          id: newId,
          version: source.version,
          title,
          files: source.files.map((file) => ({
            path: file.path,
            data:
              file.path === 'package.json'
                ? TEXT_ENCODER.encode(JSON.stringify({ ...manifest, id: newId, title }, null, 2))
                : new Uint8Array(file.data),
          })),
          updatedAt: Date.now(),
          source: { kind: 'browser-created' },
        };
        return copy;
      } catch (err) {
        mapStorageError(err, `duplicate course ${sourceId}`);
      }
    },

    async delete(id) {
      try {
        await repository.delete(id);
      } catch (err) {
        mapStorageError(err, `delete course ${id}`);
      }
    },

    async workspaceOf(id) {
      return openOrNull(id);
    },
  };

  return store;
}

function createDefaultRepository(options: BrowserCourseStoreOptions): CourseRepository {
  if (options.nonPersistent) return new MemoryCourseRepository();
  const primary = new OpfsCourseRepository();
  const fallback = new MemoryCourseRepository();
  let active: CourseRepository = primary;
  const switchTo = (next: CourseRepository): void => {
    active = next;
  };
  const delegate = async <T>(op: (repo: CourseRepository) => Promise<T>): Promise<T> => {
    try {
      return await op(active);
    } catch (err) {
      if (err instanceof WorkspaceUnavailableError) {
        switchTo(fallback);
        return op(active);
      }
      throw err;
    }
  };
  return {
    list: () => delegate((r) => r.list()),
    exists: (id) => delegate((r) => r.exists(id)),
    create: (id) => delegate((r) => r.create(id)),
    open: (id) => delegate((r) => r.open(id)),
    delete: (id) => delegate((r) => r.delete(id)),
  };
}
