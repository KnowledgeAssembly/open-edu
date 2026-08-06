import { existsSync, readFileSync } from 'node:fs';
import { cp, mkdir, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PackageManifestSchema, BundleManifestSchema } from '@open-edu/schemas';

export interface CourseOpResult {
  relativePath: string;
  id: string;
  title: string;
}

function assertInsideWorkspace(resolvedPath: string, workspaceRoot: string): void {
  if (!resolvedPath.startsWith(resolve(workspaceRoot))) {
    throw new Error(`Path escapes the workspace: ${resolvedPath}`);
  }
}

function readJson(filePath: string): Record<string, unknown> | null {
  if (!existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function uniqueDir(baseDir: string, name: string): string {
  let candidate = name;
  let counter = 2;
  while (existsSync(join(baseDir, candidate))) {
    candidate = `${name}-${counter}`;
    counter += 1;
  }
  return candidate;
}

const PACKAGE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

/**
 * Deep-copy a course directory into the workspace under a new id/title.
 * The source is left untouched.
 */
export async function duplicateCourse(
  src: string,
  workspaceRoot: string,
  newId: string,
  newTitle: string,
): Promise<CourseOpResult> {
  if (!PACKAGE_ID_PATTERN.test(newId)) {
    throw new Error('New id must be kebab-case (lowercase, hyphens, underscores).');
  }

  const srcResolved = resolve(src);
  const rootResolved = resolve(workspaceRoot);
  assertInsideWorkspace(srcResolved, rootResolved);

  const manifest = readJson(join(srcResolved, 'package.json'));
  if (!manifest) throw new Error('Source folder has no package.json');

  const updated = { ...manifest, id: newId, title: newTitle };
  const parsed = PackageManifestSchema.safeParse(updated);
  if (!parsed.success) {
    throw new Error('Duplicate would produce an invalid package manifest');
  }

  const destName = uniqueDir(rootResolved, newId);
  const dest = join(rootResolved, destName);
  assertInsideWorkspace(dest, rootResolved);
  await cp(srcResolved, dest, { recursive: true });

  await writeFile(join(dest, 'package.json'), JSON.stringify(parsed.data, null, 2), 'utf-8');

  return { relativePath: destName, id: parsed.data.id, title: parsed.data.title };
}

/**
 * Rename a course or unit in place (updates the manifest title).
 */
export async function renameCourse(
  dir: string,
  workspaceRoot: string,
  newTitle: string,
): Promise<CourseOpResult> {
  const resolved = resolve(dir);
  assertInsideWorkspace(resolved, resolve(workspaceRoot));

  const packageJsonPath = join(resolved, 'package.json');
  const bundleJsonPath = join(resolved, 'bundle.json');

  if (existsSync(packageJsonPath)) {
    const manifest = readJson(packageJsonPath);
    if (!manifest) throw new Error('Invalid package.json');
    const parsed = PackageManifestSchema.safeParse({ ...manifest, title: newTitle });
    if (!parsed.success) throw new Error('New title produces an invalid manifest');
    await writeFile(packageJsonPath, JSON.stringify(parsed.data, null, 2), 'utf-8');
    return {
      relativePath: resolved.split('/').pop() ?? '',
      id: parsed.data.id,
      title: parsed.data.title,
    };
  }

  if (existsSync(bundleJsonPath)) {
    const manifest = readJson(bundleJsonPath);
    if (!manifest) throw new Error('Invalid bundle.json');
    const parsed = BundleManifestSchema.safeParse({ ...manifest, title: newTitle });
    if (!parsed.success) throw new Error('New title produces an invalid bundle manifest');
    await writeFile(bundleJsonPath, JSON.stringify(parsed.data, null, 2), 'utf-8');
    return {
      relativePath: resolved.split('/').pop() ?? '',
      id: parsed.data.id,
      title: parsed.data.title,
    };
  }

  throw new Error('Folder is not a valid OpenEdu course or unit');
}

/**
 * Move a course/unit into the workspace .archive/ folder (soft delete).
 * Returns the archived absolute path.
 */
export async function archiveCourse(dir: string, workspaceRoot: string): Promise<string> {
  const resolved = resolve(dir);
  const rootResolved = resolve(workspaceRoot);
  assertInsideWorkspace(resolved, rootResolved);

  const name = resolved.split('/').pop() ?? 'course';
  const archiveDir = join(rootResolved, '.archive');
  await mkdir(archiveDir, { recursive: true });
  const archiveName = uniqueDir(archiveDir, `${name}-${Date.now()}`);
  const target = join(archiveDir, archiveName);
  await rename(resolved, target);
  return target;
}

/**
 * Copy an existing OpenEdu course folder into the workspace after validating
 * its manifest. Rejects invalid or colliding imports.
 */
export async function importCourseFolder(
  src: string,
  workspaceRoot: string,
): Promise<CourseOpResult> {
  const srcResolved = resolve(src);
  if (!existsSync(srcResolved)) throw new Error('Source folder does not exist');

  const manifest = readJson(join(srcResolved, 'package.json'));
  if (!manifest) throw new Error('Folder has no package.json');

  const parsed = PackageManifestSchema.safeParse(manifest);
  if (!parsed.success) {
    throw new Error('That folder is not a valid OpenEdu package.');
  }

  const rootResolved = resolve(workspaceRoot);
  const destName = uniqueDir(rootResolved, parsed.data.id);
  const dest = join(rootResolved, destName);
  assertInsideWorkspace(dest, rootResolved);
  await cp(srcResolved, dest, { recursive: true });

  return { relativePath: destName, id: parsed.data.id, title: parsed.data.title };
}
