import { readdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { CORE_VERSION, computeFileHash } from '@open-edu/core';
import type { LoadedPackage } from '@open-edu/core';

export interface BuildManifestFile {
  path: string;
  hash: string;
}

export interface BuildManifest {
  packageId: string;
  packageVersion: string;
  builtAt: string;
  openEduVersion: string;
  files: BuildManifestFile[];
  entry: string;
}

const EXCLUDED_DIRS = new Set(['dist', 'node_modules', '.git']);

export function collectFiles(dir: string, rootDir: string): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir)) {
    if (EXCLUDED_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    const relPath = relative(rootDir, fullPath);
    if (statSync(fullPath).isDirectory()) {
      files.push(...collectFiles(fullPath, rootDir));
    } else {
      files.push(relPath);
    }
  }
  return files;
}

export function generateBuildManifest(pkg: LoadedPackage, filePaths: string[]): BuildManifest {
  const sorted = [...filePaths].sort();
  const files: BuildManifestFile[] = sorted.map((f) => ({
    path: f,
    hash: computeFileHash(join(pkg.rootDir, f)),
  }));

  return {
    packageId: pkg.manifest.id,
    packageVersion: pkg.manifest.version,
    builtAt: new Date().toISOString(),
    openEduVersion: CORE_VERSION,
    files,
    entry: pkg.manifest.entry,
  };
}

export function writeBuildManifest(outDir: string, manifest: BuildManifest): void {
  const manifestPath = join(outDir, 'open-edu-build.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
}
