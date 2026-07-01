import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PackageLoadError } from '@open-edu/core';
import type { LoadedPackage } from '@open-edu/core';

const mockLoadPackage = vi.hoisted(() => vi.fn());
const mockStartDevServer = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@open-edu/core', async () => {
  const actual = await vi.importActual('@open-edu/core');
  return {
    ...actual,
    loadPackage: mockLoadPackage,
  };
});

vi.mock('@open-edu/dev-server', () => ({
  startDevServer: mockStartDevServer,
}));

import { devPackage } from './dev';

const validPkg: LoadedPackage = {
  rootDir: '/tmp/pkg',
  manifest: { id: 'pkg', title: 'Pkg', version: '1.0.0', author: 'A', entry: 'nodes/n.md' },
  workflow: { routing: { 'nodes/n.md': { onComplete: 'COMPLETED' } } },
  rewards: null,
  cards: null,
  nodes: [
    {
      path: '/tmp/pkg/nodes/n.md',
      relativePath: 'nodes/n.md',
      content: '# N',
      node: { type: 'lesson' },
    },
  ],
  assetPaths: [],
};

describe('devPackage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load package and start dev server on success', async () => {
    mockLoadPackage.mockResolvedValue(validPkg);
    const result = await devPackage('/tmp/pkg');
    expect(result.success).toBe(true);
    expect(mockLoadPackage).toHaveBeenCalledWith('/tmp/pkg');
    expect(mockStartDevServer).toHaveBeenCalledWith('/tmp/pkg');
  });

  it('should return failure on load error and not start dev server', async () => {
    mockLoadPackage.mockRejectedValue(new PackageLoadError('ERR', 'fail'));
    const result = await devPackage('/tmp/pkg');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(1);
    }
    expect(mockStartDevServer).not.toHaveBeenCalled();
  });

  describe('--json output', () => {
    it('should return structured data on success in json mode', async () => {
      mockLoadPackage.mockResolvedValue(validPkg);
      const result = await devPackage('/tmp/pkg', { json: true });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          title: 'Pkg',
          version: '1.0.0',
          serverUrl: 'http://localhost:4000',
        });
      }
      expect(mockStartDevServer).toHaveBeenCalledWith('/tmp/pkg');
    });

    it('should return error info on failure in json mode', async () => {
      mockLoadPackage.mockRejectedValue(new PackageLoadError('ERR', 'fail'));
      const result = await devPackage('/tmp/pkg', { json: true });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('fail');
        expect(result.code).toBe(1);
      }
    });
  });
});
