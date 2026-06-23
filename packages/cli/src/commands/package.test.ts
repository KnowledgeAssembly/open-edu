import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PackageLoadError } from '@open-edu/core';
import type { LoadedPackage } from '@open-edu/core';

const mockLoadPackage = vi.hoisted(() => vi.fn());
const mockExecSync = vi.hoisted(() => vi.fn());

vi.mock('@open-edu/core', async () => {
  const actual = await vi.importActual('@open-edu/core');
  return {
    ...actual,
    loadPackage: mockLoadPackage,
  };
});

vi.mock('node:child_process', async () => {
  const actual = await vi.importActual('node:child_process');
  return {
    ...actual,
    execSync: mockExecSync,
  };
});

import { packagePackage } from './package';

const validPkg: LoadedPackage = {
  rootDir: '/tmp/pkg',
  manifest: { id: 'my-pkg', title: 'My Pkg', version: '2.0.0', author: 'A', entry: 'nodes/n.md' },
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

describe('packagePackage', () => {
  let tmpDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tmpDir = mkdtempSync(join(tmpdir(), 'edu-pkg-test-'));
    mockExecSync.mockReturnValue(Buffer.from(''));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should call tar with correct arguments', async () => {
    mockLoadPackage.mockResolvedValue(validPkg);

    const code = await packagePackage(tmpDir, tmpDir);

    expect(code).toBe(0);
    // first call is isTarAvailable() check, second is actual tar
    expect(mockExecSync).toHaveBeenCalledTimes(2);
    const call = mockExecSync.mock.calls[1] as [string, unknown];
    expect(call[0]).toContain('tar -czf');
    expect(call[0]).toContain('my-pkg-2.0.0.tar.gz');
    expect(call[0]).toContain("--exclude='dist'");
    expect(call[0]).toContain("--exclude='node_modules'");
    expect(call[0]).toContain("--exclude='.git'");
    expect(call[0]).toContain(`-C ${tmpDir}`);
  });

  it('should default output to current working directory', async () => {
    mockLoadPackage.mockResolvedValue(validPkg);
    mockExecSync.mockReturnValue(Buffer.from(''));

    const code = await packagePackage(tmpDir);

    expect(code).toBe(0);
    expect(mockExecSync).toHaveBeenCalledTimes(2);
  });

  it('should return 1 on load error', async () => {
    mockLoadPackage.mockRejectedValue(new PackageLoadError('ERR', 'load failed'));

    const code = await packagePackage(tmpDir, tmpDir);
    expect(code).toBe(1);
    expect(mockExecSync).not.toHaveBeenCalled();
  });
});
