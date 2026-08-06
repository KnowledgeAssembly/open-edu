import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { cp, mkdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import {
  BundleManifestSchema,
  PackageManifestSchema,
  OEP_FORMAT,
  OEP_FORMAT_VERSION,
  type DistributionManifest,
} from '@open-edu/schemas';
import { OepWriter } from '@open-edu/oep-distribution';
import type { LibraryEntry } from './types.js';

const SKIP_DIRS = new Set(['node_modules', '.git', '.edu', 'dist']);

export interface CreateUnitOptions {
  workspaceRoot: string;
  /** Course relative paths from the workspace root */
  courseRelativePaths: string[];
  unitId: string;
  unitTitle: string;
  author: string;
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

/**
 * Create a light unit (bundle) by copying selected courses into
 * `units/<unit-id>/modules/<course-id>/` and writing a canonical bundle.json.
 */
export async function createUnit(options: CreateUnitOptions): Promise<LibraryEntry> {
  const { workspaceRoot, courseRelativePaths, unitId, unitTitle, author } = options;
  if (courseRelativePaths.length < 2) {
    throw new Error('Pick at least two courses to create a unit.');
  }
  if (courseRelativePaths.length > 5) {
    throw new Error('Pick up to five courses for a unit.');
  }

  const rootResolved = resolve(workspaceRoot);
  const unitsRoot = join(rootResolved, 'units');
  await mkdir(unitsRoot, { recursive: true });
  const destName = uniqueDir(unitsRoot, unitId);
  const dest = join(unitsRoot, destName);

  const modules: Array<{ id: string; title: string; path: string; dependsOn: string[] }> = [];
  for (const courseRel of courseRelativePaths) {
    const courseDir = resolve(rootResolved, courseRel);
    if (!courseDir.startsWith(rootResolved)) {
      throw new Error(`Course path escapes the workspace: ${courseRel}`);
    }
    const manifest = readJson(join(courseDir, 'package.json'));
    if (!manifest) throw new Error(`Course has no package.json: ${courseRel}`);
    const parsed = PackageManifestSchema.safeParse(manifest);
    if (!parsed.success) {
      throw new Error(`Course is not a valid OpenEdu package: ${courseRel}`);
    }
    const moduleId = parsed.data.id;
    await cp(courseDir, join(dest, 'modules', moduleId), { recursive: true });
    modules.push({
      id: moduleId,
      title: parsed.data.title,
      path: `./modules/${moduleId}`,
      dependsOn: [],
    });
  }

  const bundle = {
    id: destName,
    title: unitTitle,
    version: '1.0.0',
    author,
    description: `A unit combining ${modules.length} courses.`,
    modules,
  };
  const parsedBundle = BundleManifestSchema.safeParse(bundle);
  if (!parsedBundle.success) {
    throw new Error('Unit bundle could not be validated.');
  }

  await mkdir(dest, { recursive: true });
  const bundlePath = join(dest, 'bundle.json');
  const { writeFile } = await import('node:fs/promises');
  await writeFile(bundlePath, JSON.stringify(parsedBundle.data, null, 2), 'utf-8');

  return {
    id: parsedBundle.data.id,
    title: parsedBundle.data.title,
    kind: 'unit',
    relativePath: `units/${destName}`,
    version: parsedBundle.data.version,
    updatedAt: Date.now(),
  };
}

function collectModuleFiles(moduleDir: string): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (!SKIP_DIRS.has(entry)) walk(fullPath);
      } else if (stat.isFile()) {
        files.set(relative(moduleDir, fullPath), new Uint8Array(readFileSync(fullPath)));
      }
    }
  }
  walk(moduleDir);
  return files;
}

function collectBundleRootFiles(bundleDir: string): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  for (const name of ['rewards.json', 'cards.json']) {
    const path = join(bundleDir, name);
    if (existsSync(path)) {
      files.set(`bundle/${name}`, new Uint8Array(readFileSync(path)));
    }
  }
  return files;
}

/**
 * Build a portable .oep bundle archive for a unit directory.
 */
export async function buildUnitOep(unitDir: string): Promise<Uint8Array> {
  const bundleJson = readJson(join(unitDir, 'bundle.json'));
  if (!bundleJson) throw new Error('bundle.json not found in unit directory');

  const bundleManifest = BundleManifestSchema.parse(bundleJson);
  const moduleFiles = new Map<string, Map<string, Uint8Array>>();
  for (const moduleRef of bundleManifest.modules) {
    const moduleDir = resolve(unitDir, moduleRef.path);
    if (!existsSync(moduleDir)) {
      throw new Error(`Module directory not found: ${moduleDir}`);
    }
    moduleFiles.set(moduleRef.id, collectModuleFiles(moduleDir));
  }

  const distManifest: DistributionManifest = {
    format: OEP_FORMAT,
    formatVersion: OEP_FORMAT_VERSION,
    type: 'bundle',
    id: bundleManifest.id,
    version: bundleManifest.version,
    title: bundleManifest.title,
    checksum: { algorithm: 'sha256', value: '' },
    contentRoot: 'bundle/',
    signature: { status: 'unsigned' },
  };

  const result = await OepWriter.buildBundle({
    manifest: distManifest,
    bundleManifest,
    moduleFiles,
    bundleFiles: collectBundleRootFiles(unitDir),
  });
  return result.bytes;
}
