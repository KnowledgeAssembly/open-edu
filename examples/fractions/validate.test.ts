import { describe, it, expect } from 'vitest';
import { loadPackage } from '@open-edu/core';
import { resolve } from 'path';

describe('fractions example', () => {
  it('should load without errors', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.manifest.id).toBe('fractions');
    expect(pkg.manifest.title).toBe('Understanding Fractions');
    expect(pkg.manifest.entry).toBe('nodes/intro.md');
    expect(pkg.nodes).toHaveLength(4);
    expect(pkg.workflow).not.toBeNull();
    expect(pkg.workflow!.routing).toHaveProperty('nodes/intro.md');
    expect(pkg.workflow!.routing).toHaveProperty('nodes/quiz.json');
    const quizRoute = pkg.workflow!.routing['nodes/quiz.json'];
    expect(quizRoute).toHaveProperty('conditions');
    expect(Array.isArray(quizRoute.conditions)).toBe(true);
    expect(quizRoute.conditions).toHaveLength(2);
  });
});
