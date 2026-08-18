import { AssetNotFoundError } from './errors.js';
import type { PackageFileSource } from './types.js';

/**
 * Pure, browser-safe asset path helpers. These contain no node:* imports, so
 * they can be loaded in both filesystem and in-memory/browser contexts.
 */

/**
 * Normalize a path relative to the assets/ root and reject any path that
 * escapes it. The normalized form is always a forward-slash path prefixed
 * with `assets/`, so it works with synthetic browser roots as well as
 * host filesystem roots.
 */
export function normalizeAssetPath(relativePath: string): string {
  const normalized = toForwardSlashes(relativePath).replace(/^\.\//, '');
  const cleaned = normalized.replace(/\/+$/, '');
  if (
    cleaned === '' ||
    cleaned === '.' ||
    cleaned.includes('..') ||
    cleaned.startsWith('/') ||
    /^[A-Za-z]:[\\/]/.test(cleaned)
  ) {
    throw new AssetNotFoundError(`Asset path escapes the assets directory: ${relativePath}`);
  }
  return `assets/${cleaned}`;
}

/**
 * Resolve asset paths from an in-memory package file source. The source is
 * expected to return paths prefixed with `assets/`. Unknown and binary files
 * are all preserved; only traversal or absolute paths are rejected.
 */
export function collectAssetsFromSource(source: PackageFileSource): string[] {
  const assetPaths = source
    .list('assets/')
    .map((p) => p.slice('assets/'.length))
    .map((p) => normalizeAssetPath(p));
  return assetPaths.sort();
}

function toForwardSlashes(p: string): string {
  return p.replace(/\\/g, '/');
}
