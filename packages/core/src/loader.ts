import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadPackageFromFiles } from './file-loader.js';
import type { LoadedPackage, PackageFileSource } from './types.js';

export type LoadOptions = Record<string, never>;

async function createFileSystemSource(packageDir: string): Promise<PackageFileSource> {
  const files = new Map<string, Uint8Array>();

  async function walk(dir: string, prefix: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(fullPath, relPath);
      } else if (entry.isFile()) {
        files.set(relPath, new Uint8Array(await readFile(fullPath)));
      }
    }
  }

  await walk(packageDir, '');

  return {
    get: (path) => files.get(path),
    list: (prefix) =>
      Array.from(files.keys())
        .filter((p) => !prefix || p.startsWith(prefix))
        .sort(),
  };
}

export async function loadPackage(
  packageDir: string,
  _options?: LoadOptions,
): Promise<LoadedPackage> {
  const source = await createFileSystemSource(packageDir);
  return loadPackageFromFiles(source, packageDir);
}
