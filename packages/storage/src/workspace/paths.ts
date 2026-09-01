import { WorkspacePathError } from './errors.js';

export function normalizeCoursePath(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const cleaned = normalized.replace(/\/+/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
  return cleaned;
}

export function assertSafeCoursePath(path: string): string {
  const normalized = normalizeCoursePath(path);

  if (!normalized || normalized.length === 0) {
    throw new WorkspacePathError('Path must not be empty');
  }
  if (normalized.startsWith('/')) {
    throw new WorkspacePathError(`Absolute paths are not allowed: ${path}`);
  }
  if (/^[A-Za-z]:/.test(normalized)) {
    throw new WorkspacePathError(`Drive-letter paths are not allowed: ${path}`);
  }
  if (normalized.includes('\0')) {
    throw new WorkspacePathError(`Path must not contain null bytes: ${path}`);
  }

  const segments = normalized.split('/');
  if (
    segments.some((segment) => segment === '..' || segment === '.') ||
    normalized.includes('..')
  ) {
    throw new WorkspacePathError(`Traversal segments are not allowed: ${path}`);
  }

  return normalized;
}

const TEXT_EXTS = new Set(['.md', '.json', '.txt']);

export function isTextCourseFile(path: string): boolean {
  const lastDot = path.lastIndexOf('.');
  if (lastDot === -1) return false;
  return TEXT_EXTS.has(path.slice(lastDot).toLowerCase());
}
