import { describe, it, expect } from 'vitest';
import { loadNodes } from './nodes';
import { NodeLoadError } from './errors';
import { resolve, join } from 'node:path';
import { writeFile, mkdir, rm } from 'node:fs/promises';

const fixturesDir = resolve(__dirname, '__fixtures__');

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = join(fixturesDir, `tmp-${Math.random().toString(36).slice(2)}`);
  await mkdir(join(dir, 'nodes'), { recursive: true });
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('loadNodes', () => {
  it('should load all node files from valid-package', async () => {
    const nodes = await loadNodes(join(fixturesDir, 'valid-package'));
    expect(nodes).toHaveLength(3);
  });

  it('uses forward slashes in relativePath regardless of platform', async () => {
    const nodes = await loadNodes(join(fixturesDir, 'valid-package'));
    const paths = nodes.map((n) => n.relativePath);
    expect(paths).toContain('nodes/lesson-01.md');
    expect(paths).toContain('nodes/quiz-01.json');
    expect(paths).toContain('nodes/reflection-01.json');
    for (const p of paths) {
      expect(p.includes('\\')).toBe(false);
    }
  });

  it('should detect lesson node from .md file', async () => {
    const nodes = await loadNodes(join(fixturesDir, 'valid-package'));
    const lesson = nodes.find((n) => n.relativePath === 'nodes/lesson-01.md');
    expect(lesson).toBeDefined();
    expect(lesson!.node.type).toBe('lesson');
    expect(lesson!.content).toContain('# Introduction to Variables');
  });

  it('should detect quiz node from .json file', async () => {
    const nodes = await loadNodes(join(fixturesDir, 'valid-package'));
    const quiz = nodes.find((n) => n.relativePath === 'nodes/quiz-01.json');
    expect(quiz).toBeDefined();
    expect(quiz!.node.type).toBe('quiz');
    if (quiz!.node.type === 'quiz') {
      expect(quiz!.node.question).toBe('Which keyword creates a constant?');
      expect(quiz!.node.options).toHaveLength(3);
    }
  });

  it('should detect reflection node from .json file', async () => {
    const nodes = await loadNodes(join(fixturesDir, 'valid-package'));
    const reflection = nodes.find((n) => n.relativePath === 'nodes/reflection-01.json');
    expect(reflection).toBeDefined();
    expect(reflection!.node.type).toBe('reflection');
    if (reflection!.node.type === 'reflection') {
      expect(reflection!.node.prompt).toBe('Describe what you learned.');
    }
  });

  it('should return empty array when nodes/ directory is missing', async () => {
    const nodes = await loadNodes(join(fixturesDir, 'nonexistent'));
    expect(nodes).toEqual([]);
  });

  it('should reject invalid JSON node files', async () => {
    await withTempDir(async (dir) => {
      await writeFile(join(dir, 'nodes', 'bad.json'), 'not json');
      await expect(loadNodes(dir)).rejects.toThrow(NodeLoadError);
    });
  });

  it('should reject JSON node without type field', async () => {
    await withTempDir(async (dir) => {
      await writeFile(join(dir, 'nodes', 'notype.json'), JSON.stringify({ question: 'test' }));
      await expect(loadNodes(dir)).rejects.toThrow(NodeLoadError);
    });
  });

  it('should reject subdirectories inside nodes/ with a NodeLoadError', async () => {
    await withTempDir(async (dir) => {
      await mkdir(join(dir, 'nodes', 'subdir'), { recursive: true });
      await writeFile(join(dir, 'nodes', 'subdir', 'a.md'), '# A');
      await expect(loadNodes(dir)).rejects.toThrow(NodeLoadError);
    });
  });
});
