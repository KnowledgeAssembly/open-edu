import { WorkspaceConflictError, WorkspaceNotFoundError, WorkspacePathError } from './errors.js';
import { getOpfsRoot } from './opfs-availability.js';
import { OPFSWorkspace } from './opfs-workspace.js';
import { assertSafeCoursePath } from './paths.js';
import type { CourseWorkspace } from './types.js';

export interface CourseInfo {
  courseId: string;
  workspaceId: string;
  createdAt: number;
  updatedAt: number;
}

export interface CourseRepository {
  list(): Promise<CourseInfo[]>;
  exists(courseId: string): Promise<boolean>;
  create(courseId: string): Promise<CourseWorkspace>;
  open(courseId: string): Promise<CourseWorkspace>;
  delete(courseId: string): Promise<void>;
}

export interface OpfsCourseManifest {
  courseId: string;
  workspaceId: string;
  createdAt: number;
  updatedAt: number;
}

export const OPENEDU_ROOT_DIR = 'openedu';
export const COURSES_ROOT_DIR = 'courses';
export const COURSE_MANIFEST_DIR = '.openu';
export const COURSE_MANIFEST_PATH = '.openu/manifest.json';

const TEXT_DECODER = new TextDecoder();

function assertCourseId(courseId: string): string {
  const safe = assertSafeCoursePath(courseId);
  if (safe.includes('/')) {
    throw new WorkspacePathError(`Course id must be a single path segment: ${courseId}`);
  }
  return safe;
}

function generateWorkspaceId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * CourseRepository backed by OPFSWorkspace. Each course owns a directory
 * beneath `openedu/courses/<courseId>`; course identity always comes from the
 * `.openu/manifest.json`, never from the filesystem path (SPEC §18).
 */
export class OpfsCourseRepository implements CourseRepository {
  private readonly injectedRoot?: FileSystemDirectoryHandle;

  constructor(options: { root?: FileSystemDirectoryHandle } = {}) {
    this.injectedRoot = options.root;
  }

  private async getRoot(): Promise<FileSystemDirectoryHandle> {
    if (this.injectedRoot) return this.injectedRoot;
    return getOpfsRoot();
  }

  private async coursesDir(): Promise<FileSystemDirectoryHandle> {
    const root = await this.getRoot();
    const openedu = await root.getDirectoryHandle(OPENEDU_ROOT_DIR, { create: true });
    return openedu.getDirectoryHandle(COURSES_ROOT_DIR, { create: true });
  }

  async list(): Promise<CourseInfo[]> {
    const courses = await this.coursesDir();
    const infos: CourseInfo[] = [];
    for await (const [name, handle] of courses.entries()) {
      if (handle.kind !== 'directory') continue;
      try {
        const info = await this.readManifest(courses, name);
        infos.push(info);
      } catch {
        // A directory without a readable manifest is not a usable course.
      }
    }
    return infos.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  private async readManifest(
    courses: FileSystemDirectoryHandle,
    courseId: string,
  ): Promise<CourseInfo> {
    const courseDir = await courses.getDirectoryHandle(courseId);
    const dot = await courseDir.getDirectoryHandle(COURSE_MANIFEST_DIR);
    const manifestFile = await dot.getFileHandle('manifest.json');
    const blob = await manifestFile.getFile();
    const manifest = JSON.parse(
      TEXT_DECODER.decode(new Uint8Array(await blob.arrayBuffer())),
    ) as OpfsCourseManifest;
    return {
      courseId: manifest.courseId ?? courseId,
      workspaceId: manifest.workspaceId,
      createdAt: manifest.createdAt,
      updatedAt: manifest.updatedAt,
    };
  }

  async exists(courseId: string): Promise<boolean> {
    assertCourseId(courseId);
    const courses = await this.coursesDir();
    try {
      await courses.getDirectoryHandle(courseId);
      return true;
    } catch {
      return false;
    }
  }

  async create(courseId: string): Promise<CourseWorkspace> {
    const id = assertCourseId(courseId);
    const courses = await this.coursesDir();
    let exists = false;
    try {
      await courses.getDirectoryHandle(id);
      exists = true;
    } catch {
      // not present
    }
    if (exists) {
      throw new WorkspaceConflictError(`Course already exists: ${id}`);
    }
    const courseDir = await courses.getDirectoryHandle(id, { create: true });
    const now = Date.now();
    const manifest: OpfsCourseManifest = {
      courseId: id,
      workspaceId: generateWorkspaceId(),
      createdAt: now,
      updatedAt: now,
    };
    const workspace = new OPFSWorkspace(courseDir);
    await workspace.writeText(COURSE_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
    return workspace;
  }

  async open(courseId: string): Promise<CourseWorkspace> {
    const id = assertCourseId(courseId);
    const courses = await this.coursesDir();
    let courseDir: FileSystemDirectoryHandle;
    try {
      courseDir = await courses.getDirectoryHandle(id);
    } catch {
      throw new WorkspaceNotFoundError(`Course not found: ${id}`);
    }
    return new OPFSWorkspace(courseDir);
  }

  async delete(courseId: string): Promise<void> {
    const id = assertCourseId(courseId);
    const courses = await this.coursesDir();
    try {
      await courses.removeEntry(id, { recursive: true });
    } catch {
      throw new WorkspaceNotFoundError(`Course not found: ${id}`);
    }
  }
}
