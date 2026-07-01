import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PackageLoadError, ManifestValidationError } from '@open-edu/core';
import type { LoadedPackage } from '@open-edu/core';

const mockLoadPackage = vi.hoisted(() => vi.fn());

vi.mock('@open-edu/core', async () => {
  const actual = await vi.importActual('@open-edu/core');
  return {
    ...actual,
    loadPackage: mockLoadPackage,
  };
});

import { validatePackage } from './validate';

const validPkg: LoadedPackage = {
  rootDir: '/tmp/pkg',
  manifest: { id: 'pkg', title: 'Pkg', version: '1.0.0', author: 'A', entry: 'nodes/n.md' },
  workflow: null,
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

describe('validatePackage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return success on valid package', async () => {
    mockLoadPackage.mockResolvedValue(validPkg);
    const result = await validatePackage('/tmp/pkg');
    expect(result.success).toBe(true);
  });

  it('should return failure on PackageLoadError', async () => {
    mockLoadPackage.mockRejectedValue(new PackageLoadError('TEST', 'error'));
    const result = await validatePackage('/tmp/pkg');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(1);
    }
  });

  it('should return failure on generic Error', async () => {
    mockLoadPackage.mockRejectedValue(new Error('unexpected'));
    const result = await validatePackage('/tmp/pkg');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(1);
    }
  });

  describe('--json output', () => {
    it('should return structured data on success in json mode', async () => {
      mockLoadPackage.mockResolvedValue(validPkg);
      const result = await validatePackage('/tmp/pkg', { json: true });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          valid: true,
          title: 'Pkg',
          version: '1.0.0',
          author: 'A',
          entry: 'nodes/n.md',
          nodes: 1,
          assets: 0,
        });
      }
    });

    it('should return error info on failure in json mode', async () => {
      mockLoadPackage.mockRejectedValue(new PackageLoadError('TEST', 'error message'));
      const result = await validatePackage('/tmp/pkg', { json: true });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('error message');
        expect(result.code).toBe(1);
      }
    });

    it('should include zod issues in json error output', async () => {
      const zodErr = { issues: [{ path: ['title'], message: 'Required' }] } as any;
      mockLoadPackage.mockRejectedValue(new ManifestValidationError('invalid', zodErr));
      const result = await validatePackage('/tmp/pkg', { json: true });
      expect(result.success).toBe(false);
    });
  });
});
