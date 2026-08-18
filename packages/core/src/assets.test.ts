import { describe, it, expect } from 'vitest';
import {
  resolveAssets,
  resolveAssetPath,
  normalizeAssetPath,
  collectAssetsFromSource,
} from './assets';
import { AssetNotFoundError } from './errors';
import { resolve, join } from 'node:path';
import type { PackageFileSource } from './types';

const fixturesDir = resolve(__dirname, '__fixtures__');

function makeSource(files: Record<string, string>): PackageFileSource {
  const map = new Map<string, Uint8Array>(
    Object.entries(files).map(([path, data]) => [path, new TextEncoder().encode(data)]),
  );
  return {
    get: (path) => map.get(path),
    list: (prefix) =>
      prefix
        ? Array.from(map.keys())
            .filter((p) => p.startsWith(prefix))
            .sort()
        : [],
  };
}

describe('normalizeAssetPath', () => {
  it('normalizes nested asset paths with the assets/ prefix', () => {
    expect(normalizeAssetPath('images/logo.png')).toBe('assets/images/logo.png');
    expect(normalizeAssetPath('./images/logo.png')).toBe('assets/images/logo.png');
  });

  it('rejects empty and dot paths', () => {
    expect(() => normalizeAssetPath('')).toThrow(AssetNotFoundError);
    expect(() => normalizeAssetPath('.')).toThrow(AssetNotFoundError);
  });

  it('rejects traversal and absolute paths', () => {
    expect(() => normalizeAssetPath('../escape.png')).toThrow(AssetNotFoundError);
    expect(() => normalizeAssetPath('images/../../escape.png')).toThrow(AssetNotFoundError);
    expect(() => normalizeAssetPath('/etc/passwd')).toThrow(AssetNotFoundError);
    expect(() => normalizeAssetPath('C:/windows/file')).toThrow(AssetNotFoundError);
  });

  it('rejects backslash traversal', () => {
    expect(() => normalizeAssetPath('..\\escape.png')).toThrow(AssetNotFoundError);
  });
});

describe('collectAssetsFromSource', () => {
  it('resolves nested assets from an in-memory source', () => {
    const source = makeSource({
      'package.json': '{}',
      'assets/images/diagram.png': 'png',
      'assets/notes.txt': 'notes',
      'nodes/lesson.md': '# Lesson',
    });
    const assets = collectAssetsFromSource(source);
    expect(assets).toContain('assets/images/diagram.png');
    expect(assets).toContain('assets/notes.txt');
    expect(assets).not.toContain('nodes/lesson.md');
  });

  it('returns an empty array when there is no assets directory', () => {
    const source = makeSource({ 'package.json': '{}' });
    expect(collectAssetsFromSource(source)).toEqual([]);
  });

  it('rejects traversal paths from a source', () => {
    const source = makeSource({
      'assets/ok.png': 'png',
      'assets/../escape.txt': 'x',
    });
    expect(() => collectAssetsFromSource(source)).toThrow(AssetNotFoundError);
  });
});

describe('resolveAssets', () => {
  it('returns paths relative to packageDir (portable) from assets-package', async () => {
    const assets = await resolveAssets(join(fixturesDir, 'assets-package'));
    expect(assets).toContain('assets/images/diagram.png');
    expect(assets).toContain('assets/notes.txt');
    // portable: never absolute, no host-specific separators
    for (const a of assets) {
      expect(a.startsWith('/')).toBe(false);
      expect(a.includes('\\')).toBe(false);
    }
  });

  it('recurses into subdirectories', async () => {
    const assets = await resolveAssets(join(fixturesDir, 'assets-package'));
    expect(assets.some((a) => a.includes('images/diagram.png'))).toBe(true);
  });

  it('returns empty array when assets directory is missing', async () => {
    const assets = await resolveAssets(join(fixturesDir, 'minimal-package'));
    expect(assets).toEqual([]);
  });
});

describe('resolveAssetPath', () => {
  it('resolves a relative asset path to an absolute filesystem path', async () => {
    const result = await resolveAssetPath('/pkg', 'images/logo.png');
    expect(result).toBe('/pkg/assets/images/logo.png');
  });

  it('rejects ../ traversal attempts', async () => {
    await expect(resolveAssetPath('/pkg', '../../../etc/passwd')).rejects.toThrow(
      AssetNotFoundError,
    );
    await expect(resolveAssetPath('/pkg', '../escape.png')).rejects.toThrow(AssetNotFoundError);
    await expect(resolveAssetPath('/pkg', 'images/../../escape.png')).rejects.toThrow(
      AssetNotFoundError,
    );
  });

  it('rejects absolute paths', async () => {
    await expect(resolveAssetPath('/pkg', '/etc/passwd')).rejects.toThrow(AssetNotFoundError);
  });

  it('produces a path inside the assets directory', async () => {
    const result = await resolveAssetPath('/pkg', 'images/logo.png');
    expect(result.startsWith('/pkg/assets/')).toBe(true);
    expect(result.includes('..')).toBe(false);
  });
});
