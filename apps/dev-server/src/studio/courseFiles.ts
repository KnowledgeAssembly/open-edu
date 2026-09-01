import {
  WorkspacePathError,
  assertSafeCoursePath as storageAssertSafeCoursePath,
  isTextCourseFile as storageIsTextCourseFile,
  normalizeCoursePath as storageNormalizeCoursePath,
} from '@open-edu/storage';

export interface StudioFile {
  path: string;
  data: Uint8Array;
}

const TEXT_EXTS = new Set(['.md', '.json', '.txt']);

export class UnsafeCoursePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeCoursePathError';
  }
}

/**
 * Path helpers moved to `@open-edu/storage` (shared with workspace backends)
 * to avoid a cross-package import cycle. This module re-exports them as a thin
 * wrapper so existing app code keeps working unchanged.
 */
export const normalizeCoursePath = storageNormalizeCoursePath;

export function assertSafeCoursePath(path: string): string {
  try {
    return storageAssertSafeCoursePath(path);
  } catch (err) {
    if (err instanceof WorkspacePathError) {
      throw new UnsafeCoursePathError(err.message);
    }
    throw err;
  }
}

export const isTextCourseFile = storageIsTextCourseFile;

export function cloneCourseFiles(files: StudioFile[]): StudioFile[] {
  return files.map((file) => ({
    path: file.path,
    data: new Uint8Array(file.data),
  }));
}

export function sortCourseFiles(files: StudioFile[]): StudioFile[] {
  return [...files].sort((a, b) => a.path.localeCompare(b.path));
}

export function courseFilesToRecord(files: StudioFile[]): Record<string, Uint8Array> {
  const record: Record<string, Uint8Array> = {};
  const seen = new Set<string>();
  for (const file of files) {
    const path = assertSafeCoursePath(file.path);
    const normalized = normalizeCoursePath(path);
    if (seen.has(normalized)) {
      throw new UnsafeCoursePathError(`Duplicate normalized path: ${normalized}`);
    }
    seen.add(normalized);
    record[normalized] = new Uint8Array(file.data);
  }
  return record;
}

export function recordToCourseFiles(record: Record<string, Uint8Array>): StudioFile[] {
  const files = Object.entries(record).map(([path, data]) => {
    const safe = assertSafeCoursePath(path);
    return { path: safe, data: new Uint8Array(data) };
  });
  return sortCourseFiles(files);
}

export { TEXT_EXTS };
