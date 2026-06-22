import { describe, it, expect } from 'vitest';
import { loadPackage } from './loader';
import {
  ManifestValidationError,
  WorkflowRouteError,
  EntryNodeNotFoundError,
  PackageLoadError,
} from './errors';
import { resolve, join } from 'node:path';
import { mkdir, writeFile, rm } from 'node:fs/promises';

const fixturesDir = resolve(__dirname, '__fixtures__');

async function withTempPackage(
  pkg: Record<string, unknown>,
  fn: (dir: string) => Promise<void>,
): Promise<void> {
  const dir = join(fixturesDir, `tmp-${Math.random().toString(36).slice(2)}`);
  await mkdir(join(dir, 'nodes'), { recursive: true });
  await writeFile(join(dir, 'package.json'), JSON.stringify(pkg.manifest));
  if (pkg.workflow) {
    await writeFile(join(dir, 'workflow.json'), JSON.stringify(pkg.workflow));
  }
  for (const [name, content] of Object.entries(pkg.nodes ?? {}) as Array<[string, string]>) {
    await writeFile(join(dir, 'nodes', name), content);
  }
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

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

  it('should reject a missing entry node with EntryNodeNotFoundError (subclass of PackageLoadError)', async () => {
    await withTempPackage(
      {
        manifest: {
          id: 'broken-entry',
          title: 'Broken Entry',
          version: '1.0.0',
          author: 'Test',
          entry: 'nodes/missing.md',
        },
        nodes: { 'existing.md': '# Existing' },
      },
      async (dir) => {
        let caught: unknown;
        try {
          await loadPackage(dir);
        } catch (err) {
          caught = err;
        }
        expect(caught).toBeInstanceOf(EntryNodeNotFoundError);
        expect(caught).toBeInstanceOf(PackageLoadError);
        expect((caught as Error).message).toContain('Entry node');
      },
    );
  });

  it('should reject a workflow whose onComplete target is not a node', async () => {
    await withTempPackage(
      {
        manifest: {
          id: 'broken-target',
          title: 'Broken Target',
          version: '1.0.0',
          author: 'Test',
          entry: 'nodes/lesson.md',
        },
        workflow: {
          routing: {
            'nodes/lesson.md': { onComplete: 'nodes/GHOST.json' },
          },
        },
        nodes: { 'lesson.md': '# Lesson' },
      },
      async (dir) => {
        let caught: unknown;
        try {
          await loadPackage(dir);
        } catch (err) {
          caught = err;
        }
        expect(caught).toBeInstanceOf(WorkflowRouteError);
        expect((caught as Error).message).toContain('targets unknown node');
        expect((caught as Error).message).toContain('nodes/GHOST.json');
      },
    );
  });

  it('should reject a workflow whose conditional target (then) is not a node', async () => {
    await withTempPackage(
      {
        manifest: {
          id: 'broken-cond',
          title: 'Broken Cond',
          version: '1.0.0',
          author: 'Test',
          entry: 'nodes/quiz.json',
        },
        workflow: {
          routing: {
            'nodes/quiz.json': {
              conditions: [{ if: 'score >= 80', then: 'nodes/GHOST.md' }],
            },
          },
        },
        nodes: {
          'quiz.json': JSON.stringify({
            type: 'quiz',
            question: 'Q?',
            options: [
              { id: 'a', text: 'A', correct: true },
              { id: 'b', text: 'B', correct: false },
            ],
          }),
        },
      },
      async (dir) => {
        let caught: unknown;
        try {
          await loadPackage(dir);
        } catch (err) {
          caught = err;
        }
        expect(caught).toBeInstanceOf(WorkflowRouteError);
        expect((caught as Error).message).toContain('nodes/GHOST.md');
      },
    );
  });

  it('allows the COMPLETED sentinel as a workflow target without a node', async () => {
    await withTempPackage(
      {
        manifest: {
          id: 'ok-completed',
          title: 'OK Completed',
          version: '1.0.0',
          author: 'Test',
          entry: 'nodes/lesson.md',
        },
        workflow: {
          routing: {
            'nodes/lesson.md': { onComplete: 'COMPLETED' },
          },
        },
        nodes: { 'lesson.md': '# Lesson' },
      },
      async (dir) => {
        const pkg = await loadPackage(dir);
        expect(pkg.workflow!.routing['nodes/lesson.md']).toEqual({
          onComplete: 'COMPLETED',
        });
      },
    );
  });

  it('should reject when manifest.entry is not a key in workflow.routing', async () => {
    await withTempPackage(
      {
        manifest: {
          id: 'entry-not-route',
          title: 'Entry Not Route',
          version: '1.0.0',
          author: 'Test',
          entry: 'nodes/lesson-01.md',
        },
        workflow: {
          routing: {
            'nodes/lesson-02.md': { onComplete: 'COMPLETED' },
          },
        },
        nodes: {
          'lesson-01.md': '# Entry',
          'lesson-02.md': '# Other',
        },
      },
      async (dir) => {
        let caught: unknown;
        try {
          await loadPackage(dir);
        } catch (err) {
          caught = err;
        }
        expect(caught).toBeInstanceOf(WorkflowRouteError);
        expect((caught as Error).message).toContain('not a key in workflow.routing');
      },
    );
  });

  it('produces portable assetPaths (relative, forward slashes) for an assets package', async () => {
    const pkg = await loadPackage(join(fixturesDir, 'assets-package'));
    expect(pkg.assetPaths).toContain('assets/images/diagram.png');
    expect(pkg.assetPaths).toContain('assets/notes.txt');
    for (const a of pkg.assetPaths) {
      expect(a.startsWith('/')).toBe(false);
      expect(a.includes('\\')).toBe(false);
    }
  });
});
