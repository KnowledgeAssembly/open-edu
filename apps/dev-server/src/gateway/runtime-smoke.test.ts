// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { compile } from '@open-edu/course-compiler';
import { loadPackage, loadPackageFromFiles, type PackageFileSource } from '@open-edu/core';
import { createModelFactoryFromEnv, loadConfig } from '@open-edu/llm-config';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const FIXTURE_DIR = resolve(import.meta.dirname, '__tests__', 'fixtures');
const SPEC_PATH = join(FIXTURE_DIR, 'runtime-smoke-course-spec.json');

describe('Phase 2 gateway runtime smoke', () => {
  it('loads @open-edu/course-compiler, @open-edu/core, and @open-edu/llm-config', () => {
    expect(typeof compile).toBe('function');
    expect(typeof loadPackage).toBe('function');
    expect(typeof loadPackageFromFiles).toBe('function');
    expect(typeof createModelFactoryFromEnv).toBe('function');
    expect(typeof loadConfig).toBe('function');
  });

  it('compiles one fixture course inside the runtime and cleans up temp files', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'openedu-gw-smoke-'));
    try {
      const outputDir = join(tempDir, 'out');
      const result = await compile(SPEC_PATH, { output: outputDir, validate: true });
      expect(result.success).toBe(true);

      // Read the complete compiled output into memory.
      const files = new Map<string, Uint8Array>();
      const walk = async (dir: string, prefix = ''): Promise<void> => {
        for (const entry of await readdir(dir, { withFileTypes: true })) {
          const full = join(dir, entry.name);
          const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            await walk(full, rel);
          } else if (entry.isFile()) {
            files.set(rel, new Uint8Array(await readFile(full)));
          }
        }
      }
      await walk(outputDir);

      expect(files.has('package.json')).toBe(true);

      // Validate the compiled package through the shared (browser-safe) loader.
      const source: PackageFileSource = {
        get: (path) => files.get(path),
        list: (prefix) =>
          Array.from(files.keys())
            .filter((p) => !prefix || p.startsWith(prefix))
            .sort(),
      };
      const pkg = await loadPackageFromFiles(source, 'runtime-smoke://out');
      expect(pkg.manifest.id).toBeDefined();
      expect(pkg.nodes.length).toBeGreaterThan(0);
    } finally {
      // Confirm temporary files are removed.
      await rm(tempDir, { recursive: true, force: true });
    }
    await expect(stat(tempDir)).rejects.toThrow();
  });
});
