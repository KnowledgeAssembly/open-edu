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

  it('returns null rewards/cards for a bundle without them', async () => {
    const loaded = await loadBundle(join(FIXTURES_DIR, 'valid-bundle'));
    expect(loaded.rewards).toBeNull();
    expect(loaded.cards).toBeNull();
  });

  it('loads bundle-root rewards and cards', async () => {
    const loaded = await loadBundle(join(FIXTURES_DIR, 'bundle-with-rewards'));
    expect(loaded.rewards).not.toBeNull();
    expect(loaded.rewards!.triggers.length).toBeGreaterThan(0);
    expect(loaded.cards).not.toBeNull();
    expect(loaded.cards!.cards.length).toBeGreaterThan(0);
  });

  it('honors manifest rewards/cards paths instead of hardcoded filenames', async () => {
    const { mkdtempSync, writeFileSync, mkdirSync, rmSync } = await import('node:fs');
    const tmpDir = mkdtempSync(join(FIXTURES_DIR, 'tmp-manifest-paths-'));
    mkdirSync(join(tmpDir, 'config'), { recursive: true });
    mkdirSync(join(tmpDir, 'modules', 'mod-a', 'nodes'), { recursive: true });
    writeFileSync(
      join(tmpDir, 'bundle.json'),
      JSON.stringify({
        id: 'manifest-paths-bundle',
        title: 'Manifest Paths',
        version: '1.0.0',
        author: 'Test',
        modules: [{ id: 'mod-a', title: 'Module A', path: './modules/mod-a', dependsOn: [] }],
        rewards: './config/rewardz.json',
        cards: './config/cardz.json',
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
    writeFileSync(
      join(tmpDir, 'modules', 'mod-a', 'workflow.json'),
      JSON.stringify({ routing: { 'nodes/lesson.md': { onComplete: 'COMPLETED' } } }),
    );
    writeFileSync(join(tmpDir, 'modules', 'mod-a', 'nodes', 'lesson.md'), '# Test');
    writeFileSync(
      join(tmpDir, 'rewards.json'),
      JSON.stringify({
        triggers: [{ onEvent: 'x', rewards: [{ action: 'badge.award', badge: 'root-file' }] }],
      }),
    );
    writeFileSync(
      join(tmpDir, 'config', 'rewardz.json'),
      JSON.stringify({
        triggers: [
          {
            onEvent: 'bundle_complete',
            rewards: [{ action: 'badge.award', badge: 'manifest-file' }],
          },
        ],
      }),
    );
    writeFileSync(
      join(tmpDir, 'config', 'cardz.json'),
      JSON.stringify({
        cards: [
          {
            id: 'manifest-card',
            title: 'M',
            category: 'C',
            type: 'achievement',
            summary: 'S',
            unlock: { type: 'bundleCompleted' },
          },
        ],
      }),
    );

    const loaded = await loadBundle(tmpDir);
    expect(loaded.rewards?.triggers[0]?.rewards[0]).toMatchObject({ badge: 'manifest-file' });
    expect(loaded.cards?.cards[0]?.id).toBe('manifest-card');
    rmSync(tmpDir, { recursive: true, force: true });
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
