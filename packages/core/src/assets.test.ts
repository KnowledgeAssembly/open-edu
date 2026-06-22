import { describe, it, expect } from 'vitest';
import { resolveAssets, resolveAssetPath } from './assets';
import { AssetNotFoundError } from './errors';
import { resolve, join } from 'node:path';

const fixturesDir = resolve(__dirname, '__fixtures__');

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
  it('resolves a relative asset path to an absolute filesystem path', () => {
    const result = resolveAssetPath('/pkg', 'images/logo.png');
    expect(result).toBe('/pkg/assets/images/logo.png');
  });

  it('rejects ../ traversal attempts', () => {
    expect(() => resolveAssetPath('/pkg', '../../../etc/passwd')).toThrow(AssetNotFoundError);
    expect(() => resolveAssetPath('/pkg', '../escape.png')).toThrow(AssetNotFoundError);
    expect(() => resolveAssetPath('/pkg', 'images/../../escape.png')).toThrow(AssetNotFoundError);
  });

  it('rejects absolute paths', () => {
    expect(() => resolveAssetPath('/pkg', '/etc/passwd')).toThrow(AssetNotFoundError);
  });

  it('produces a path inside the assets directory', () => {
    const result = resolveAssetPath('/pkg', 'images/logo.png');
    expect(result.startsWith('/pkg/assets/')).toBe(true);
    expect(result.includes('..')).toBe(false);
  });
});
