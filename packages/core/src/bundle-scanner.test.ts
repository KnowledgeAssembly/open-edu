import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { scanBundles, scanAll } from './bundle-scanner.js';

const FIXTURES_DIR = join(__dirname, '__fixtures__', 'bundles');

describe('scanBundles', () => {
  it('should detect bundle.json in subdirectories', () => {
    const results = scanBundles(FIXTURES_DIR);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const validBundle = results.find((r) => r.manifest.id === 'test-bundle');
    expect(validBundle).toBeDefined();
    expect(validBundle!.moduleCount).toBe(2);
  });

  it('should report totalNodeCount for scanned modules', () => {
    const results = scanBundles(FIXTURES_DIR);
    const validBundle = results.find((r) => r.manifest.id === 'test-bundle');
    expect(validBundle).toBeDefined();
    expect(typeof validBundle!.totalNodeCount).toBe('number');
    expect(validBundle!.moduleSummaries.length).toBeLessThanOrEqual(validBundle!.moduleCount);
  });

  it('should silently skip directories without bundle.json', async () => {
    const { mkdtempSync, rmSync } = await import('node:fs');
    const tmpDir = mkdtempSync(join(FIXTURES_DIR, 'tmp-empty-'));
    const results = scanBundles(tmpDir);
    expect(results).toEqual([]);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return empty array for invalid directory', () => {
    const results = scanBundles('/nonexistent/path');
    expect(results).toEqual([]);
  });
});

describe('scanAll', () => {
  it('should return both packages and bundles', () => {
    const { packages, bundles } = scanAll(FIXTURES_DIR);
    expect(Array.isArray(packages)).toBe(true);
    expect(Array.isArray(bundles)).toBe(true);
  });

  it('should be synchronous', () => {
    const result = scanAll(FIXTURES_DIR);
    expect(result.packages).toBeDefined();
    expect(result.bundles).toBeDefined();
  });

  it('should not include bundle directories in packages list', () => {
    const { packages, bundles } = scanAll(FIXTURES_DIR);
    const bundleRoots = new Set(bundles.map((b) => b.rootDir));
    for (const pkg of packages) {
      expect(bundleRoots.has(pkg.rootDir)).toBe(false);
    }
  });
});
