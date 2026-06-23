import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync, mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
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

import { buildPackage } from './build';

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

describe('buildPackage', () => {
  let tmpDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tmpDir = mkdtempSync(join(tmpdir(), 'edu-build-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should copy files to output directory', async () => {
    mkdirSync(join(tmpDir, 'nodes'), { recursive: true });
    writeFileSync(join(tmpDir, 'nodes', 'lesson.md'), '# Lesson');
    writeFileSync(
      join(tmpDir, 'package.json'),
      JSON.stringify({
        id: 'test',
        title: 'Test',
        version: '1.0.0',
        author: 'A',
        entry: 'nodes/lesson.md',
      }),
    );

    mockLoadPackage.mockResolvedValue({ ...validPkg, rootDir: tmpDir });

    const outDir = join(tmpDir, 'output');
    const code = await buildPackage(tmpDir, outDir);

    expect(code).toBe(0);
    expect(existsSync(join(outDir, 'nodes', 'lesson.md'))).toBe(true);
    expect(readFileSync(join(outDir, 'nodes', 'lesson.md'), 'utf-8')).toBe('# Lesson');
  });

  it('should exclude dist and node_modules', async () => {
    mkdirSync(join(tmpDir, 'nodes'), { recursive: true });
    writeFileSync(join(tmpDir, 'nodes', 'lesson.md'), '# Lesson');
    mkdirSync(join(tmpDir, 'dist'), { recursive: true });
    writeFileSync(join(tmpDir, 'dist', 'bundle.js'), '// bundle');
    mkdirSync(join(tmpDir, 'node_modules'), { recursive: true });
    writeFileSync(join(tmpDir, 'node_modules', 'dep.js'), '// dep');

    mockLoadPackage.mockResolvedValue({ ...validPkg, rootDir: tmpDir });

    const outDir = join(tmpDir, 'output');
    const code = await buildPackage(tmpDir, outDir);

    expect(code).toBe(0);
    expect(existsSync(join(outDir, 'nodes', 'lesson.md'))).toBe(true);
    expect(existsSync(join(outDir, 'dist'))).toBe(false);
    expect(existsSync(join(outDir, 'node_modules'))).toBe(false);
  });

  it('should default output to packageDir/dist', async () => {
    mkdirSync(join(tmpDir, 'nodes'), { recursive: true });
    writeFileSync(join(tmpDir, 'nodes', 'lesson.md'), '# Lesson');

    mockLoadPackage.mockResolvedValue({ ...validPkg, rootDir: tmpDir });

    const code = await buildPackage(tmpDir);

    expect(code).toBe(0);
    expect(existsSync(join(tmpDir, 'dist', 'nodes', 'lesson.md'))).toBe(true);
  });

  it('should return 1 on load error', async () => {
    mockLoadPackage.mockRejectedValue(new PackageLoadError('ERR', 'load failed'));
    const code = await buildPackage(tmpDir);
    expect(code).toBe(1);
  });
});
