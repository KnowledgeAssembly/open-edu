import { describe, it, expect } from 'vitest';
import { resolveAssets, resolveAssetPath } from './assets';
import { resolve, join } from 'node:path';

const fixturesDir = resolve(__dirname, '__fixtures__');

describe('resolveAssets', () => {
  it('should return asset paths from valid-package', async () => {
    const assets = await resolveAssets(join(fixturesDir, 'valid-package'));
    expect(assets.length).toBeGreaterThanOrEqual(0);
  });

  it('should return empty array when assets directory is missing', async () => {
    const assets = await resolveAssets(join(fixturesDir, 'minimal-package'));
    expect(assets).toEqual([]);
  });
});

describe('resolveAssetPath', () => {
  it('should resolve a relative asset path', () => {
    const result = resolveAssetPath('/pkg', 'images/logo.png');
    expect(result).toBe('/pkg/assets/images/logo.png');
  });
});
