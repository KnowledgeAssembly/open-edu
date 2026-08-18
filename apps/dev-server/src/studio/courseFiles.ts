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

export function normalizeCoursePath(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const cleaned = normalized.replace(/\/+/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
  return cleaned;
}

export function assertSafeCoursePath(path: string): string {
  const normalized = normalizeCoursePath(path);

  if (!normalized || normalized.length === 0) {
    throw new UnsafeCoursePathError('Path must not be empty');
  }
  if (normalized.startsWith('/')) {
    throw new UnsafeCoursePathError(`Absolute paths are not allowed: ${path}`);
  }
  if (/^[A-Za-z]:/.test(normalized)) {
    throw new UnsafeCoursePathError(`Drive-letter paths are not allowed: ${path}`);
  }
  if (normalized.includes('\0')) {
    throw new UnsafeCoursePathError(`Path must not contain null bytes: ${path}`);
  }

  const segments = normalized.split('/');
  if (
    segments.some((segment) => segment === '..' || segment === '.') ||
    normalized.includes('..')
  ) {
    throw new UnsafeCoursePathError(`Traversal segments are not allowed: ${path}`);
  }

  return normalized;
}

export function isTextCourseFile(path: string): boolean {
  const lastDot = path.lastIndexOf('.');
  if (lastDot === -1) return false;
  return TEXT_EXTS.has(path.slice(lastDot).toLowerCase());
}

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
