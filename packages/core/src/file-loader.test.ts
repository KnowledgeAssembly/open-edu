import { describe, it, expect } from 'vitest';
import { loadPackageFromFiles } from './file-loader.js';
import { loadPackage } from './loader.js';
import {
  ManifestValidationError,
  EntryNodeNotFoundError,
  WorkflowRouteError,
  WorkflowValidationError,
  NodeLoadError,
  RewardsValidationError,
  CardsValidationError,
} from './errors.js';
import type { PackageFileSource } from './types.js';
import { resolve, join } from 'node:path';
import { readFile, readdir, stat } from 'node:fs/promises';

const fixturesDir = resolve(__dirname, '__fixtures__');
const BROWSER_ROOT = 'browser://browser-studio';

function makeSource(files: Record<string, string | Uint8Array>): PackageFileSource {
  const map = new Map<string, Uint8Array>();
  for (const [path, data] of Object.entries(files)) {
    map.set(
      path,
      data instanceof Uint8Array ? new Uint8Array(data) : new TextEncoder().encode(data),
    );
  }
  return {
    get: (path) => map.get(path),
    list: (prefix) =>
      Array.from(map.keys())
        .filter((p) => !prefix || p.startsWith(prefix))
        .sort(),
  };
}

async function fixtureSource(): Promise<PackageFileSource> {
  const dir = join(fixturesDir, 'browser-studio');
  const files = new Map<string, Uint8Array>();
  async function walk(rel: string): Promise<void> {
    const full = join(dir, rel);
    const s = await stat(full);
    if (s.isDirectory()) {
      for (const entry of await readdir(full)) {
        await walk(rel ? `${rel}/${entry}` : entry);
      }
    } else {
      files.set(rel, new Uint8Array(await readFile(full)));
    }
  }
  await walk('');
  return {
    get: (path) => files.get(path),
    list: (prefix) =>
      Array.from(files.keys())
        .filter((p) => !prefix || p.startsWith(prefix))
        .sort(),
  };
}

const VALID_BROWSER_PKG: Record<string, string> = {
  'package.json': JSON.stringify({
    id: 'browser-studio',
    title: 'Browser Studio Composite',
    version: '1.0.0',
    author: 'Open-Edu',
    entry: 'nodes/lesson.md',
  }),
  'workflow.json': JSON.stringify({
    routing: { 'nodes/lesson.md': { onComplete: 'nodes/quiz.json' } },
  }),
  'rewards.json': JSON.stringify({
    triggers: [
      { onEvent: 'workflow.complete', rewards: [{ action: 'badge.award', badge: 'done' }] },
    ],
  }),
  'cards.json': JSON.stringify({
    cards: [
      {
        id: 'one',
        title: 'One',
        category: 'Math',
        type: 'knowledge',
        summary: 'Summary',
        unlock: { type: 'chain', completedNodeIds: ['nodes/quiz.json'] },
      },
    ],
  }),
  'nodes/lesson.md': '# Why the Sky Is Blue\n\nSome text.',
  'nodes/quiz.json': JSON.stringify({
    type: 'quiz',
    title: 'Sky Quiz',
    question: 'Which color scatters the most?',
    options: [
      { id: 'a', text: 'Red', correct: false },
      { id: 'b', text: 'Blue', correct: true },
    ],
  }),
  'assets/diagram.png': 'png-bytes',
  'assets/notes.txt': 'Unknown text file',
};

describe('loadPackageFromFiles', () => {
  it('loads a valid in-memory package', async () => {
    const pkg = await loadPackageFromFiles(makeSource(VALID_BROWSER_PKG), BROWSER_ROOT);
    expect(pkg.manifest.id).toBe('browser-studio');
    expect(pkg.workflow).not.toBeNull();
    expect(pkg.rewards).not.toBeNull();
    expect(pkg.cards).not.toBeNull();
    expect(pkg.nodes).toHaveLength(2);
    expect(pkg.assetPaths).toContain('assets/diagram.png');
    expect(pkg.assetPaths).toContain('assets/notes.txt');
    expect(pkg.rootDir).toBe(BROWSER_ROOT);
  });

  it('sets node paths as logical relative paths in browser mode', async () => {
    const pkg = await loadPackageFromFiles(makeSource(VALID_BROWSER_PKG), BROWSER_ROOT);
    for (const node of pkg.nodes) {
      expect(node.path).toBe(node.relativePath);
      expect(node.path.startsWith('browser://')).toBe(false);
    }
  });

  it('rejects a missing manifest with a logical file path', async () => {
    try {
      await loadPackageFromFiles(makeSource({}), BROWSER_ROOT);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ManifestValidationError);
      expect((err as Error).message).toContain('package.json');
      expect((err as Error).message).not.toMatch(/\/Users\//);
    }
  });

  it('rejects an invalid manifest', async () => {
    await expect(
      loadPackageFromFiles(makeSource({ 'package.json': 'not json' }), BROWSER_ROOT),
    ).rejects.toThrow(ManifestValidationError);
  });

  it('rejects invalid workflow sidecar with logical path', async () => {
    try {
      await loadPackageFromFiles(
        makeSource({
          ...VALID_BROWSER_PKG,
          'workflow.json': 'not json',
        }),
        BROWSER_ROOT,
      );
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(WorkflowValidationError);
      expect((err as Error).message).toContain('workflow.json');
    }
  });

  it('rejects invalid rewards and cards sidecars with logical paths', async () => {
    await expect(
      loadPackageFromFiles(
        makeSource({ ...VALID_BROWSER_PKG, 'rewards.json': 'bad' }),
        BROWSER_ROOT,
      ),
    ).rejects.toThrow(RewardsValidationError);
    await expect(
      loadPackageFromFiles(makeSource({ ...VALID_BROWSER_PKG, 'cards.json': 'bad' }), BROWSER_ROOT),
    ).rejects.toThrow(CardsValidationError);
  });

  it('rejects invalid node content with logical paths', async () => {
    try {
      await loadPackageFromFiles(
        makeSource({ ...VALID_BROWSER_PKG, 'nodes/quiz.json': 'not json' }),
        BROWSER_ROOT,
      );
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(NodeLoadError);
      expect((err as Error).message).not.toMatch(/\/Users\//);
    }
  });

  it('rejects a missing entry node', async () => {
    const files = {
      ...VALID_BROWSER_PKG,
      'package.json': JSON.stringify({
        ...JSON.parse(VALID_BROWSER_PKG['package.json']!),
        entry: 'nodes/missing.md',
      }),
    };
    try {
      await loadPackageFromFiles(makeSource(files), BROWSER_ROOT);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(EntryNodeNotFoundError);
      expect((err as Error).message).toContain('Entry node');
      expect((err as Error).message).not.toMatch(/\/Users\//);
    }
  });

  it('rejects an invalid workflow route key', async () => {
    const files = {
      ...VALID_BROWSER_PKG,
      'workflow.json': JSON.stringify({
        routing: { 'nodes/ghost.md': { onComplete: 'COMPLETED' } },
      }),
    };
    try {
      await loadPackageFromFiles(makeSource(files), BROWSER_ROOT);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(WorkflowRouteError);
      expect((err as Error).message).toContain('references unknown node');
    }
  });

  it('rejects an invalid workflow route target', async () => {
    const files = {
      ...VALID_BROWSER_PKG,
      'workflow.json': JSON.stringify({
        routing: { 'nodes/lesson.md': { onComplete: 'nodes/GHOST.json' } },
      }),
    };
    await expect(loadPackageFromFiles(makeSource(files), BROWSER_ROOT)).rejects.toThrow(
      WorkflowRouteError,
    );
  });

  it('rejects workflow when manifest entry is not a routing key', async () => {
    const files = {
      ...VALID_BROWSER_PKG,
      'package.json': JSON.stringify({
        ...JSON.parse(VALID_BROWSER_PKG['package.json']!),
        entry: 'nodes/lesson.md',
      }),
      'workflow.json': JSON.stringify({
        routing: { 'nodes/quiz.json': { onComplete: 'COMPLETED' } },
      }),
    };
    await expect(loadPackageFromFiles(makeSource(files), BROWSER_ROOT)).rejects.toThrow(
      WorkflowRouteError,
    );
  });

  it('rejects JSON node without a type field', async () => {
    const files = {
      ...VALID_BROWSER_PKG,
      'nodes/quiz.json': JSON.stringify({ question: 'Q' }),
    };
    await expect(loadPackageFromFiles(makeSource(files), BROWSER_ROOT)).rejects.toThrow(
      NodeLoadError,
    );
  });

  it('matches the filesystem loader for the browser-studio fixture', async () => {
    const fsPkg = await loadPackage(join(fixturesDir, 'browser-studio'));
    const memoryPkg = await loadPackageFromFiles(await fixtureSource(), BROWSER_ROOT);

    expect(memoryPkg.manifest).toEqual(fsPkg.manifest);
    expect(memoryPkg.workflow).toEqual(fsPkg.workflow);
    expect(memoryPkg.rewards).toEqual(fsPkg.rewards);
    expect(memoryPkg.cards).toEqual(fsPkg.cards);
    expect(memoryPkg.assetPaths).toEqual(fsPkg.assetPaths);
    expect(memoryPkg.nodes.map((n) => n.relativePath).sort()).toEqual(
      fsPkg.nodes.map((n) => n.relativePath).sort(),
    );
    const byPath = new Map(fsPkg.nodes.map((n) => [n.relativePath, n]));
    for (const node of memoryPkg.nodes) {
      expect(node.content).toBe(byPath.get(node.relativePath)!.content);
      expect(node.node).toEqual(byPath.get(node.relativePath)!.node);
    }
  });
});
