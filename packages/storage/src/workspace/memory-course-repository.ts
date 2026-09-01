import {
  COURSE_MANIFEST_PATH,
  type CourseInfo,
  type CourseRepository,
} from './course-repository.js';
import { WorkspaceConflictError, WorkspaceNotFoundError, WorkspacePathError } from './errors.js';
import { MemoryWorkspace } from './memory-workspace.js';
import { assertSafeCoursePath } from './paths.js';
import type { CourseWorkspace } from './types.js';

/**
 * Non-persistent CourseRepository over MemoryWorkspace. Used as the unit-test
 * backend and as the SPEC §47.1 fallback when OPFS is unavailable (incognito,
 * storage-disabled): the Studio keeps functioning in-memory while
 * `getStorageStatus` reports that persistence is unavailable.
 */
export class MemoryCourseRepository implements CourseRepository {
  private readonly courses = new Map<string, MemoryWorkspace>();
  private readonly infos = new Map<string, CourseInfo>();

  constructor(options: { workspaces?: Map<string, MemoryWorkspace> } = {}) {
    if (options.workspaces) {
      for (const [id, ws] of options.workspaces) {
        this.courses.set(id, ws);
        this.infos.set(id, { courseId: id, workspaceId: `mem-${id}`, createdAt: 0, updatedAt: 0 });
      }
    }
  }

  static cloneWorkspaceId(): string {
    const c = globalThis.crypto as Crypto | undefined;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
    return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private assertId(courseId: string): string {
    const safe = assertSafeCoursePath(courseId);
    if (safe.includes('/')) {
      throw new WorkspacePathError(`Course id must be a single path segment: ${courseId}`);
    }
    return safe;
  }

  async list(): Promise<CourseInfo[]> {
    return Array.from(this.infos.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async exists(courseId: string): Promise<boolean> {
    return this.courses.has(this.assertId(courseId));
  }

  async create(courseId: string): Promise<CourseWorkspace> {
    const id = this.assertId(courseId);
    if (this.courses.has(id)) {
      throw new WorkspaceConflictError(`Course already exists: ${id}`);
    }
    const ws = new MemoryWorkspace();
    const now = Date.now();
    const info: CourseInfo = {
      courseId: id,
      workspaceId: MemoryCourseRepository.cloneWorkspaceId(),
      createdAt: now,
      updatedAt: now,
    };
    await ws.writeText(COURSE_MANIFEST_PATH, `${JSON.stringify(info, null, 2)}\n`);
    this.courses.set(id, ws);
    this.infos.set(id, info);
    return ws;
  }

  async open(courseId: string): Promise<CourseWorkspace> {
    const id = this.assertId(courseId);
    const ws = this.courses.get(id);
    if (!ws) {
      throw new WorkspaceNotFoundError(`Course not found: ${id}`);
    }
    return ws;
  }

  async delete(courseId: string): Promise<void> {
    const id = this.assertId(courseId);
    if (!this.courses.has(id)) {
      throw new WorkspaceNotFoundError(`Course not found: ${id}`);
    }
    this.courses.delete(id);
    this.infos.delete(id);
  }
}
