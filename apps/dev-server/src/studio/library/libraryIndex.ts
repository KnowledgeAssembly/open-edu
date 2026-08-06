import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BundleManifestSchema, PackageManifestSchema } from '@open-edu/schemas';
import type { LibraryEntry, LibraryKind } from './types.js';

const SKIP_DIRS = new Set(['node_modules', '.git', '.archive', '.edu', 'dist']);

function readJson(dir: string, fileName: string): Record<string, unknown> | null {
  const filePath = join(dir, fileName);
  if (!existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function classifyDir(
  dir: string,
): Pick<LibraryEntry, 'id' | 'title' | 'kind' | 'version' | 'updatedAt'> | null {
  const bundleJson = readJson(dir, 'bundle.json');
  if (bundleJson) {
    const parsed = BundleManifestSchema.safeParse(bundleJson);
    if (parsed.success) {
      return {
        id: parsed.data.id,
        title: parsed.data.title,
        kind: 'unit',
        version: parsed.data.version,
        updatedAt: mtimeMs(dir),
      };
    }
  }

  const packageJson = readJson(dir, 'package.json');
  if (packageJson) {
    const parsed = PackageManifestSchema.safeParse(packageJson);
    if (parsed.success) {
      return {
        id: parsed.data.id,
        title: parsed.data.title,
        kind: 'course',
        version: parsed.data.version,
        updatedAt: mtimeMs(dir),
      };
    }
  }

  return null;
}

function mtimeMs(dir: string): number {
  try {
    return statSync(dir).mtimeMs;
  } catch {
    return 0;
  }
}

/**
 * Scan a workspace root for courses and units.
 *
 * Top-level directories are classified as a course (package.json with OpenEdu
 * fields) or a unit (bundle.json). Directories that classify as neither are
 * scanned one level deeper (e.g. a `units/` grouping folder), so bundle modules
 * nested under a unit never appear as top-level library entries.
 */
export function scanWorkspace(workspaceRoot: string): LibraryEntry[] {
  if (!existsSync(workspaceRoot)) return [];

  const entries: LibraryEntry[] = [];
  let topLevel: Array<{ name: string; isDirectory: boolean }>;
  try {
    topLevel = readdirSync(workspaceRoot, { withFileTypes: true }).map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
    }));
  } catch {
    return [];
  }

  const visit = (name: string, isDirectory: boolean, parentPath = '') => {
    if (!isDirectory || SKIP_DIRS.has(name)) return;
    const absolute = join(workspaceRoot, parentPath, name);
    const relativePath = parentPath ? `${parentPath}/${name}` : name;
    const classified = classifyDir(absolute);
    if (classified) {
      entries.push({ ...classified, relativePath });
      return;
    }
    let children: Array<{ name: string; isDirectory: boolean }>;
    try {
      children = readdirSync(absolute, { withFileTypes: true }).map((entry) => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
      }));
    } catch {
      return;
    }
    for (const child of children) {
      visit(child.name, child.isDirectory, relativePath);
    }
  };

  for (const entry of topLevel) {
    visit(entry.name, entry.isDirectory);
  }

  entries.sort((a, b) => b.updatedAt - a.updatedAt);
  return entries;
}

export function resolveWorkspace(activePackageDir: string): string {
  return process.env.OPEN_EDU_STUDIO_WORKSPACE || parentOf(activePackageDir);
}

export function parentOf(dir: string): string {
  const parts = dir.split('/').filter(Boolean);
  parts.pop();
  return `/${parts.join('/')}`;
}

/**
 * Validate a relative path supplied by the client before it is used to touch
 * the filesystem. Rejects empty paths, absolute paths, `..` segments,
 * backslashes, and null bytes (Windows-safe).
 */
export function isSafeRelativePath(relativePath: string): boolean {
  if (!relativePath || relativePath.length === 0) return false;
  if (relativePath.includes('\\') || relativePath.includes('\0')) return false;
  if (relativePath.startsWith('/')) return false;
  const segments = relativePath.split('/');
  if (segments.some((segment) => segment === '..' || segment === '.')) return false;
  return true;
}

export type { LibraryKind };
