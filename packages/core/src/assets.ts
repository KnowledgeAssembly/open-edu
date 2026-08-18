import { AssetNotFoundError } from './errors.js';
import { normalizeAssetPath } from './asset-paths.js';

export { normalizeAssetPath, collectAssetsFromSource } from './asset-paths.js';

export async function resolveAssets(packageDir: string): Promise<string[]> {
  const { collectAssetFiles } = await import('./assets-fs.js');
  const { join, relative } = await import('node:path');
  const assetsDir = join(packageDir, 'assets');
  const absolutePaths = await collectAssetFiles(assetsDir, join);
  return absolutePaths
    .map((abs) => relative(packageDir, abs).replace(/\\/g, '/'))
    .map((p) => normalizeAssetPath(p.slice('assets/'.length)))
    .sort();
}

export async function resolveAssetPath(packageDir: string, relativePath: string): Promise<string> {
  const { resolve, relative, sep } = await import('node:path');
  const normalized = normalizeAssetPath(relativePath).slice('assets/'.length);

  const assetsRoot = resolve(packageDir, 'assets');
  const resolved = resolve(assetsRoot, normalized);
  const rel = relative(assetsRoot, resolved);
  if (rel.startsWith('..') || /^[A-Za-z]:[\\/]/.test(rel) || rel === '') {
    throw new AssetNotFoundError(`Asset path escapes the assets directory: ${relativePath}`);
  }

  return sep === '/' ? resolved : resolved.split(sep).join('/');
}
