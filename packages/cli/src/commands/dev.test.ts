import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PackageLoadError } from '@open-edu/core';
import type { LoadedPackage } from '@open-edu/core';

const mockLoadPackage = vi.hoisted(() => vi.fn());

vi.mock('@open-edu/core', async () => {
  const actual = await vi.importActual('@open-edu/core');
  return {
    ...actual,
    loadPackage: mockLoadPackage,
  };
});

import { devPackage } from './dev';

const validPkg: LoadedPackage = {
  rootDir: '/tmp/pkg',
  manifest: { id: 'pkg', title: 'Pkg', version: '1.0.0', author: 'A', entry: 'nodes/n.md' },
  workflow: null,
  rewards: null,
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

  it('should return 0 on success', async () => {
    mockLoadPackage.mockResolvedValue(validPkg);
    const code = await devPackage('/tmp/pkg');
    expect(code).toBe(0);
  });

  it('should return 1 on error', async () => {
    mockLoadPackage.mockRejectedValue(new PackageLoadError('ERR', 'fail'));
    const code = await devPackage('/tmp/pkg');
    expect(code).toBe(1);
  });
});
