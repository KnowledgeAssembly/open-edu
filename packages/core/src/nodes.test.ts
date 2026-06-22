import { describe, it, expect } from 'vitest';
import { loadNodes } from './nodes';
import { NodeLoadError } from './errors';
import { resolve, join } from 'node:path';
import { writeFile, unlink } from 'node:fs/promises';

const fixturesDir = resolve(__dirname, '__fixtures__');

describe('loadNodes', () => {
  it('should load all node files from valid-package', async () => {
    const nodes = await loadNodes(join(fixturesDir, 'valid-package'));
    expect(nodes).toHaveLength(3);
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
    const tmpDir = join(fixturesDir, 'minimal-package');
    const tmpPath = join(tmpDir, 'nodes', 'bad.json');
    await writeFile(tmpPath, 'not json');
    await expect(loadNodes(tmpDir)).rejects.toThrow(NodeLoadError);
    await unlink(tmpPath);
  });

  it('should reject JSON node without type field', async () => {
    const tmpDir = join(fixturesDir, 'minimal-package');
    const tmpPath = join(tmpDir, 'nodes', 'notype.json');
    await writeFile(tmpPath, JSON.stringify({ question: 'test' }));
    await expect(loadNodes(tmpDir)).rejects.toThrow(NodeLoadError);
    await unlink(tmpPath);
  });
});
