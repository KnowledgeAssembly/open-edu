import { readdir } from 'node:fs/promises';
import { join, resolve, relative, sep } from 'node:path';
import { AssetNotFoundError } from './errors.js';

function toForwardSlashes(p: string): string {
  return sep === '/' ? p : p.split(sep).join('/');
}

async function collectAssetFiles(dir: string): Promise<string[]> {
  const assetPaths: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const nested = await collectAssetFiles(join(dir, entry.name));
        assetPaths.push(...nested);
      } else if (entry.isFile()) {
        assetPaths.push(join(dir, entry.name));
      }
    }
  } catch {
    // assets/ directory doesn't exist — no assets
  }

  return assetPaths;
}

export async function resolveAssets(packageDir: string): Promise<string[]> {
  const assetsDir = join(packageDir, 'assets');
  const absolutePaths = await collectAssetFiles(assetsDir);
  return absolutePaths.map((abs) => toForwardSlashes(relative(packageDir, abs)));
}

export function resolveAssetPath(packageDir: string, relativePath: string): string {
  const normalizedRelative = toForwardSlashes(relativePath);
  if (
    normalizedRelative.includes('..') ||
    normalizedRelative.startsWith('/') ||
    /^[A-Za-z]:[\\/]/.test(normalizedRelative)
  ) {
    throw new AssetNotFoundError(`Asset path escapes the assets directory: ${relativePath}`);
  }

  const assetsRoot = resolve(packageDir, 'assets');
  const resolved = resolve(assetsRoot, normalizedRelative);
  const rel = relative(assetsRoot, resolved);
  if (rel.startsWith('..') || /^[A-Za-z]:[\\/]/.test(rel) || rel === '') {
    throw new AssetNotFoundError(`Asset path escapes the assets directory: ${relativePath}`);
  }

  return toForwardSlashes(resolved);
}
