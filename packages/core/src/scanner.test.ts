import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { scanPackages } from './scanner.js';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('scanPackages', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'scan-test-'));
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it('should scan a valid package with nodes and rewards', () => {
    const pkgDir = join(tmpDir, 'valid-pkg');
    mkdirSync(pkgDir);
    mkdirSync(join(pkgDir, 'nodes'));
    writeFileSync(join(pkgDir, 'nodes', 'a.md'), '# Lesson');
    writeFileSync(
      join(pkgDir, 'package.json'),
      JSON.stringify({
        id: 'test-pkg',
        title: 'Test Package',
        version: '1.0.0',
        author: 'Test Author',
        entry: 'nodes/a.md',
      }),
    );
    writeFileSync(
      join(pkgDir, 'rewards.json'),
      JSON.stringify({
        triggers: [
          {
            onEvent: 'node.complete',
            rewards: [
              { action: 'badge.award', badge: 'bronze' },
              { action: 'badge.award', badge: 'silver' },
            ],
          },
        ],
      }),
    );

    const results = scanPackages(tmpDir);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      manifest: { id: 'test-pkg', title: 'Test Package' },
      nodeCount: 1,
      availableBadges: 2,
      rootDir: join(tmpDir, 'valid-pkg'),
    });
  });

  it('should scan multiple valid packages', () => {
    for (let i = 0; i < 3; i++) {
      const pkgDir = join(tmpDir, `multi-pkg-${i}`);
      mkdirSync(pkgDir);
      mkdirSync(join(pkgDir, 'nodes'));
      writeFileSync(join(pkgDir, 'nodes', 'a.md'), '# Lesson');
      writeFileSync(
        join(pkgDir, 'package.json'),
        JSON.stringify({
          id: `multi-pkg-${i}`,
          title: `Package ${i}`,
          version: '1.0.0',
          author: 'Author',
          entry: 'nodes/a.md',
        }),
      );
    }

    const results = scanPackages(tmpDir);
    const multiResults = results.filter((r) => r.manifest.id.startsWith('multi-pkg-'));
    expect(multiResults).toHaveLength(3);
  });

  it('should skip invalid packages and return only valid ones', () => {
    const validDir = join(tmpDir, 'mixed-valid');
    mkdirSync(validDir);
    mkdirSync(join(validDir, 'nodes'));
    writeFileSync(join(validDir, 'nodes', 'a.md'), '# Lesson');
    writeFileSync(
      join(validDir, 'package.json'),
      JSON.stringify({
        id: 'mixed-valid',
        title: 'Valid',
        version: '1.0.0',
        author: 'A',
        entry: 'nodes/a.md',
      }),
    );

    const noPkgDir = join(tmpDir, 'mixed-no-pkg');
    mkdirSync(noPkgDir);
    mkdirSync(join(noPkgDir, 'nodes'));

    const badJsonDir = join(tmpDir, 'mixed-bad-json');
    mkdirSync(badJsonDir);
    writeFileSync(join(badJsonDir, 'package.json'), '{invalid json}');

    const results = scanPackages(tmpDir);
    const mixedResults = results.filter((r) => r.manifest.id.startsWith('mixed-'));
    expect(mixedResults).toHaveLength(1);
    expect(mixedResults[0]!.manifest.id).toBe('mixed-valid');
  });

  it('should return empty array for directory with no subdirectories', () => {
    const emptyDir = join(tmpDir, 'empty-dir');
    mkdirSync(emptyDir);
    writeFileSync(join(emptyDir, 'some-file.txt'), 'not a dir');

    const results = scanPackages(emptyDir);
    expect(results).toHaveLength(0);
  });

  it('should return empty array for non-existent directory', () => {
    const results = scanPackages(join(tmpdir(), String(Date.now())));
    expect(results).toHaveLength(0);
  });

  it('should return 0 availableBadges when no rewards.json', () => {
    const pkgDir = join(tmpDir, 'no-rewards');
    mkdirSync(pkgDir);
    mkdirSync(join(pkgDir, 'nodes'));
    writeFileSync(join(pkgDir, 'nodes', 'a.md'), '# Lesson');
    writeFileSync(
      join(pkgDir, 'package.json'),
      JSON.stringify({
        id: 'no-rewards',
        title: 'No Rewards',
        version: '1.0.0',
        author: 'A',
        entry: 'nodes/a.md',
      }),
    );

    const results = scanPackages(tmpDir);
    const pkg = results.find((r) => r.manifest.id === 'no-rewards');
    expect(pkg).toBeDefined();
    expect(pkg!.availableBadges).toBe(0);
  });

  it('should return 0 availableBadges for invalid rewards.json', () => {
    const pkgDir = join(tmpDir, 'bad-rewards');
    mkdirSync(pkgDir);
    mkdirSync(join(pkgDir, 'nodes'));
    writeFileSync(join(pkgDir, 'nodes', 'a.md'), '# Lesson');
    writeFileSync(
      join(pkgDir, 'package.json'),
      JSON.stringify({
        id: 'bad-rewards',
        title: 'Bad Rewards',
        version: '1.0.0',
        author: 'A',
        entry: 'nodes/a.md',
      }),
    );
    writeFileSync(join(pkgDir, 'rewards.json'), '{invalid:');

    const results = scanPackages(tmpDir);
    const pkg = results.find((r) => r.manifest.id === 'bad-rewards');
    expect(pkg).toBeDefined();
    expect(pkg!.availableBadges).toBe(0);
  });

  it('should return 0 nodeCount when no nodes directory', () => {
    const pkgDir = join(tmpDir, 'no-nodes');
    mkdirSync(pkgDir);
    writeFileSync(
      join(pkgDir, 'package.json'),
      JSON.stringify({
        id: 'no-nodes',
        title: 'No Nodes',
        version: '1.0.0',
        author: 'A',
        entry: 'nodes/a.md',
      }),
    );

    const results = scanPackages(tmpDir);
    const pkg = results.find((r) => r.manifest.id === 'no-nodes');
    expect(pkg).toBeDefined();
    expect(pkg!.nodeCount).toBe(0);
  });
});
