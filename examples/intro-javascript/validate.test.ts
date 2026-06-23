import { describe, it, expect } from 'vitest';
import { loadPackage } from '@open-edu/core';
import { resolve } from 'path';

describe('intro-javascript example', () => {
  it('should load without errors', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.manifest.id).toBe('intro-javascript');
    expect(pkg.manifest.title).toBe('Introduction to JavaScript');
    expect(pkg.manifest.entry).toBe('nodes/what-is-javascript.md');
    expect(pkg.nodes).toHaveLength(4);
    expect(pkg.workflow).not.toBeNull();
    expect(pkg.workflow!.routing).toHaveProperty('nodes/what-is-javascript.md');
    expect(pkg.workflow!.routing).toHaveProperty('nodes/variables.md');
    expect(pkg.workflow!.routing).toHaveProperty('nodes/variables-quiz.json');
    expect(pkg.workflow!.routing).toHaveProperty('nodes/finished.md');
  });
});
