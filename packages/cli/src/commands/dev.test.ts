import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
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

function makeTempDir(prefix: string): string {
  const dir = join(tmpdir(), `${prefix}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('devPackage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load package and start dev server on success', async () => {
    const pkgDir = makeTempDir('edu-dev-pkg');
    mockLoadPackage.mockResolvedValue(validPkg);
    const result = await devPackage(pkgDir);
    expect(result.success).toBe(true);
    expect(mockLoadPackage).toHaveBeenCalledWith(pkgDir);
    expect(mockStartDevServer).toHaveBeenCalledWith(pkgDir);
    rmSync(pkgDir, { recursive: true, force: true });
  });

  it('should start dev server for an existing empty directory', async () => {
    const emptyDir = makeTempDir('edu-dev-empty');
    mockLoadPackage.mockRejectedValue(new PackageLoadError('MANIFEST_VALIDATION_ERROR', 'no pkg'));
    const result = await devPackage(emptyDir);
    expect(result.success).toBe(true);
    expect(mockStartDevServer).toHaveBeenCalledWith(emptyDir);
    rmSync(emptyDir, { recursive: true, force: true });
  });

  it('should fail for a directory that does not exist', async () => {
    const result = await devPackage('/nonexistent/edu-dev-path');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(1);
    }
    expect(mockStartDevServer).not.toHaveBeenCalled();
  });

  describe('--json output', () => {
    it('should return structured data on success in json mode', async () => {
      const pkgDir = makeTempDir('edu-dev-json-pkg');
      mockLoadPackage.mockResolvedValue(validPkg);
      const result = await devPackage(pkgDir, { json: true });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          title: 'Pkg',
          version: '1.0.0',
          serverUrl: 'http://localhost:4000',
        });
      }
      expect(mockStartDevServer).toHaveBeenCalledWith(pkgDir);
      rmSync(pkgDir, { recursive: true, force: true });
    });

    it('should return structured data for an empty directory in json mode', async () => {
      const emptyDir = makeTempDir('edu-dev-json-empty');
      mockLoadPackage.mockRejectedValue(
        new PackageLoadError('MANIFEST_VALIDATION_ERROR', 'no pkg'),
      );
      const result = await devPackage(emptyDir, { json: true });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          title: emptyDir.split('/').pop() ?? '',
          serverUrl: 'http://localhost:4000',
        });
      }
      expect(mockStartDevServer).toHaveBeenCalledWith(emptyDir);
      rmSync(emptyDir, { recursive: true, force: true });
    });

    it('should return error info on failure in json mode', async () => {
      const result = await devPackage('/nonexistent/edu-dev-path', { json: true });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Directory does not exist');
        expect(result.code).toBe(1);
      }
    });
  });
});
