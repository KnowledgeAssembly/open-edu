import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PackageLoadError } from '@open-edu/core';
import type { LoadedPackage } from '@open-edu/core';

const mockLoadPackage = vi.hoisted(() => vi.fn());
const mockTarC = vi.hoisted(() => vi.fn());

vi.mock('@open-edu/core', async () => {
  const actual = await vi.importActual('@open-edu/core');
  return {
    ...actual,
    loadPackage: mockLoadPackage,
  };
});

vi.mock('tar', () => ({ c: mockTarC }));

import { packagePackage } from './package';

function createMockStream(): any {
  const stream = {
    pipe: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
  };
  stream.on.mockImplementation(function (
    this: any,
    event: string,
    handler: (...args: any[]) => void,
  ) {
    if (event === 'finish') {
      setImmediate(handler);
    }
    return this;
  });
  return stream;
}

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
    mockTarC.mockReturnValue(createMockStream());
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should create tar archive with gzip and exclude options', async () => {
    mockLoadPackage.mockResolvedValue(validPkg);

    const code = await packagePackage(tmpDir, tmpDir);

    expect(code).toBe(0);
    expect(mockTarC).toHaveBeenCalledTimes(1);
    const [opts, files] = mockTarC.mock.calls[0] as [Record<string, unknown>, string[]];
    expect(files).toEqual(['.']);
    expect(opts).toMatchObject({ gzip: true, cwd: tmpDir });
    expect(typeof opts.filter).toBe('function');
    const filter = opts.filter as (path: string) => boolean;
    expect(filter('dist/index.js')).toBe(false);
    expect(filter('node_modules/pkg/index.js')).toBe(false);
    expect(filter('.git/config')).toBe(false);
    expect(filter('nodes/lesson.md')).toBe(true);
    expect(filter('package.json')).toBe(true);
  });

  it('should default output to current working directory', async () => {
    mockLoadPackage.mockResolvedValue(validPkg);

    const code = await packagePackage(tmpDir);

    expect(code).toBe(0);
    expect(mockTarC).toHaveBeenCalledTimes(1);
  });

  it('should return 1 on load error', async () => {
    mockLoadPackage.mockRejectedValue(new PackageLoadError('ERR', 'load failed'));

    const code = await packagePackage(tmpDir, tmpDir);
    expect(code).toBe(1);
    expect(mockTarC).not.toHaveBeenCalled();
  });
});
