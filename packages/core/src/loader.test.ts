import { describe, it, expect } from 'vitest';
import { loadPackage } from './loader';
import { ManifestValidationError } from './errors';
import { resolve, join } from 'node:path';

const fixturesDir = resolve(__dirname, '__fixtures__');

describe('loadPackage', () => {
  it('should load a complete valid package', async () => {
    const pkg = await loadPackage(join(fixturesDir, 'valid-package'));
    expect(pkg.manifest.id).toBe('intro-to-variables');
    expect(pkg.manifest.title).toBe('Introduction to Variables');
    expect(pkg.manifest.entry).toBe('nodes/lesson-01.md');
    expect(pkg.workflow).not.toBeNull();
    expect(pkg.rewards).not.toBeNull();
    expect(pkg.nodes).toHaveLength(3);
    expect(pkg.rootDir).toBe(join(fixturesDir, 'valid-package'));
  });

  it('should load a minimal package (no workflow, no rewards)', async () => {
    const pkg = await loadPackage(join(fixturesDir, 'minimal-package'));
    expect(pkg.manifest.id).toBe('minimal');
    expect(pkg.workflow).toBeNull();
    expect(pkg.rewards).toBeNull();
    expect(pkg.nodes).toHaveLength(1);
  });

  it('should load a full package with workflow', async () => {
    const pkg = await loadPackage(join(fixturesDir, 'full-package'));
    expect(pkg.manifest.id).toBe('full');
    expect(pkg.workflow).not.toBeNull();
    expect(pkg.nodes).toHaveLength(2);
  });

  it('should reject a package with invalid manifest', async () => {
    await expect(loadPackage(join(fixturesDir, 'broken-package'))).rejects.toThrow(
      ManifestValidationError,
    );
  });

  it('should reject a non-existent package directory', async () => {
    await expect(loadPackage(join(fixturesDir, 'nonexistent'))).rejects.toThrow(
      ManifestValidationError,
    );
  });

  it('should reject a package with missing entry node', async () => {
    const pkgDir = join(fixturesDir, 'broken-entry');
    const { mkdir, writeFile } = await import('node:fs/promises');
    const { existsSync } = await import('node:fs');
    if (!existsSync(pkgDir)) {
      await mkdir(pkgDir, { recursive: true });
      await mkdir(join(pkgDir, 'nodes'));
    }
    await writeFile(
      join(pkgDir, 'package.json'),
      JSON.stringify({
        id: 'broken-entry',
        title: 'Broken Entry',
        version: '1.0.0',
        author: 'Test',
        entry: 'nodes/missing.md',
      }),
    );
    await writeFile(join(pkgDir, 'nodes', 'existing.md'), '# Existing');

    await expect(loadPackage(pkgDir)).rejects.toThrow('Entry node');

    // Cleanup
    const { rm } = await import('node:fs/promises');
    await rm(pkgDir, { recursive: true, force: true });
  });
});
