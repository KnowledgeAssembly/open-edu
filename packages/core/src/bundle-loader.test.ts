import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { loadBundle } from './bundle-loader.js';
import {
  BundleValidationError,
  ModuleMismatchError,
  CircularDependencyError,
  MissingPrerequisiteError,
  ModuleNotFoundError,
} from './errors.js';

const FIXTURES_DIR = join(__dirname, '__fixtures__', 'bundles');

describe('loadBundle', () => {
  it('should load a valid bundle with 2 modules', async () => {
    const bundle = await loadBundle(join(FIXTURES_DIR, 'valid-bundle'));
    expect(bundle.manifest.id).toBe('test-bundle');
    expect(bundle.modules).toHaveLength(2);
    expect(bundle.moduleMap.size).toBe(2);
    expect(bundle.moduleMap.has('mod-a')).toBe(true);
    expect(bundle.moduleMap.has('mod-b')).toBe(true);
  });

  it('should throw ModuleMismatchError when moduleRef.id differs from manifest.id', async () => {
    await expect(loadBundle(join(FIXTURES_DIR, 'mismatch-bundle'))).rejects.toThrow(
      ModuleMismatchError,
    );
  });

  it('should throw CircularDependencyError for cycles', async () => {
    await expect(loadBundle(join(FIXTURES_DIR, 'cycle-bundle'))).rejects.toThrow(
      CircularDependencyError,
    );
  });

  it('should throw BundleValidationError for missing bundle.json', async () => {
    await expect(loadBundle(join(FIXTURES_DIR, 'nonexistent'))).rejects.toThrow(
      BundleValidationError,
    );
  });

  it('should throw BundleValidationError for invalid JSON', async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
    const tmpDir = mkdtempSync(join(FIXTURES_DIR, 'tmp-invalid-'));
    writeFileSync(join(tmpDir, 'bundle.json'), '{invalid json}');
    await expect(loadBundle(tmpDir)).rejects.toThrow(BundleValidationError);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should throw BundleValidationError for schema-invalid bundle.json', async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
    const tmpDir = mkdtempSync(join(FIXTURES_DIR, 'tmp-schema-'));
    writeFileSync(join(tmpDir, 'bundle.json'), JSON.stringify({ id: 'test' }));
    await expect(loadBundle(tmpDir)).rejects.toThrow(BundleValidationError);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should throw MissingPrerequisiteError for dangling dependsOn', async () => {
    const { mkdtempSync, writeFileSync, mkdirSync, rmSync } = await import('node:fs');
    const tmpDir = mkdtempSync(join(FIXTURES_DIR, 'tmp-dangling-'));
    mkdirSync(join(tmpDir, 'modules', 'mod-a'), { recursive: true });
    writeFileSync(
      join(tmpDir, 'bundle.json'),
      JSON.stringify({
        id: 'dangling-bundle',
        title: 'Dangling',
        version: '1.0.0',
        author: 'Test',
        modules: [
          {
            id: 'mod-a',
            title: 'Module A',
            path: './modules/mod-a',
            dependsOn: ['nonexistent-module'],
          },
        ],
      }),
    );
    writeFileSync(
      join(tmpDir, 'modules', 'mod-a', 'package.json'),
      JSON.stringify({
        id: 'mod-a',
        title: 'Module A',
        version: '1.0.0',
        author: 'Test',
        entry: 'nodes/lesson.md',
      }),
    );
    mkdirSync(join(tmpDir, 'modules', 'mod-a', 'nodes'), { recursive: true });
    writeFileSync(
      join(tmpDir, 'modules', 'mod-a', 'workflow.json'),
      JSON.stringify({
        routing: { 'nodes/lesson.md': { onComplete: 'COMPLETED' } },
      }),
    );
    writeFileSync(join(tmpDir, 'modules', 'mod-a', 'nodes', 'lesson.md'), '# Test');

    await expect(loadBundle(tmpDir)).rejects.toThrow(MissingPrerequisiteError);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should throw ModuleNotFoundError for path traversal', async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
    const tmpDir = mkdtempSync(join(FIXTURES_DIR, 'tmp-traversal-'));
    writeFileSync(
      join(tmpDir, 'bundle.json'),
      JSON.stringify({
        id: 'traversal-bundle',
        title: 'Traversal',
        version: '1.0.0',
        author: 'Test',
        modules: [
          {
            id: 'escape',
            title: 'Escape',
            path: '../outside',
            dependsOn: [],
          },
        ],
      }),
    );
    await expect(loadBundle(tmpDir)).rejects.toThrow(ModuleNotFoundError);
    rmSync(tmpDir, { recursive: true, force: true });
  });
});
