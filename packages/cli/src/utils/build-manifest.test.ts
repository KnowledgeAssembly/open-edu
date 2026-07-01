import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { LoadedPackage } from '@open-edu/core';
import { CORE_VERSION } from '@open-edu/core';

import { collectFiles, generateBuildManifest, writeBuildManifest } from './build-manifest';

const testPkg: LoadedPackage = {
  rootDir: '/tmp/test-pkg',
  manifest: {
    id: 'test-pkg',
    title: 'Test',
    version: '1.0.0',
    author: 'A',
    entry: 'nodes/entry.md',
  },
  workflow: null,
  rewards: null,
  cards: null,
  nodes: [
    {
      path: '/tmp/test-pkg/nodes/entry.md',
      relativePath: 'nodes/entry.md',
      content: '# Entry',
      node: { type: 'lesson' },
    },
  ],
  assetPaths: [],
};

describe('collectFiles', () => {
  it('should collect relative file paths from a directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bm-collect-'));
    mkdirSync(join(dir, 'nodes'), { recursive: true });
    mkdirSync(join(dir, 'assets'), { recursive: true });
    writeFileSync(join(dir, 'package.json'), '{}');
    writeFileSync(join(dir, 'nodes', 'lesson.md'), '# L');
    writeFileSync(join(dir, 'assets', 'img.png'), 'img');

    const files = collectFiles(dir, dir);
    expect(files).toContain('package.json');
    expect(files).toContain('nodes/lesson.md');
    expect(files).toContain('assets/img.png');
    rmSync(dir, { recursive: true, force: true });
  });

  it('should exclude dist, node_modules, .git', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bm-exclude-'));
    mkdirSync(join(dir, 'dist'), { recursive: true });
    mkdirSync(join(dir, 'node_modules'), { recursive: true });
    mkdirSync(join(dir, '.git'), { recursive: true });
    writeFileSync(join(dir, 'keep.md'), '# keep');
    writeFileSync(join(dir, 'dist', 'bundle.js'), '//');
    writeFileSync(join(dir, 'node_modules', 'dep.js'), '//');
    writeFileSync(join(dir, '.git', 'config'), '//');

    const files = collectFiles(dir, dir);
    expect(files).toContain('keep.md');
    expect(files).not.toContain('dist/bundle.js');
    expect(files).not.toContain('node_modules/dep.js');
    expect(files).not.toContain('.git/config');
    rmSync(dir, { recursive: true, force: true });
  });

  it('should return empty array for non-existent directory', () => {
    expect(collectFiles('/nonexistent', '/nonexistent')).toEqual([]);
  });
});

describe('generateBuildManifest', () => {
  it('should include all required fields', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bm-gen-'));
    writeFileSync(join(dir, 'test.txt'), 'hello');

    const pkg: LoadedPackage = { ...testPkg, rootDir: dir };
    const files = ['test.txt'];
    const manifest = generateBuildManifest(pkg, files);

    expect(manifest.packageId).toBe('test-pkg');
    expect(manifest.packageVersion).toBe('1.0.0');
    expect(manifest.builtAt).toBeDefined();
    expect(() => new Date(manifest.builtAt)).not.toThrow();
    expect(manifest.openEduVersion).toBe(CORE_VERSION);
    expect(manifest.entry).toBe('nodes/entry.md');
    expect(Array.isArray(manifest.files)).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });

  it('should sort files alphabetically', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bm-sort-'));
    writeFileSync(join(dir, 'z.txt'), 'z');
    writeFileSync(join(dir, 'a.txt'), 'a');
    writeFileSync(join(dir, 'm.txt'), 'm');

    const pkg: LoadedPackage = { ...testPkg, rootDir: dir };
    const files = ['z.txt', 'a.txt', 'm.txt'];
    const manifest = generateBuildManifest(pkg, files);

    expect(manifest.files.map((f) => f.path)).toEqual(['a.txt', 'm.txt', 'z.txt']);
    rmSync(dir, { recursive: true, force: true });
  });

  it('should include sha256 hashes for each file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bm-hash-'));
    writeFileSync(join(dir, 'data.bin'), Buffer.from([0, 1, 2, 3]));

    const pkg: LoadedPackage = { ...testPkg, rootDir: dir };
    const files = ['data.bin'];
    const manifest = generateBuildManifest(pkg, files);

    expect(manifest.files[0]!.hash).toHaveLength(64);
    expect(manifest.files[0]!.hash).toMatch(/^[a-f0-9]{64}$/);
    rmSync(dir, { recursive: true, force: true });
  });

  it('should not contain absolute paths', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bm-noabs-'));
    writeFileSync(join(dir, 'safe.txt'), 'data');

    const pkg: LoadedPackage = { ...testPkg, rootDir: dir };
    const files = ['safe.txt'];
    const manifest = generateBuildManifest(pkg, files);

    for (const f of manifest.files) {
      expect(f.path).not.toMatch(/^\//);
      expect(f.path).not.toMatch(/^[A-Za-z]:\\/);
    }
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('writeBuildManifest', () => {
  it('should write open-edu-build.json to the output directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bm-write-'));
    writeFileSync(join(dir, 'f.txt'), 'data');

    const pkg: LoadedPackage = { ...testPkg, rootDir: dir };
    const files = ['f.txt'];
    const manifest = generateBuildManifest(pkg, files);
    writeBuildManifest(dir, manifest);

    const manifestPath = join(dir, 'open-edu-build.json');
    expect(existsSync(manifestPath)).toBe(true);

    const parsed = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(parsed.packageId).toBe('test-pkg');
    expect(parsed.files).toHaveLength(1);
    expect(parsed.files[0]!.path).toBe('f.txt');
    rmSync(dir, { recursive: true, force: true });
  });
});
