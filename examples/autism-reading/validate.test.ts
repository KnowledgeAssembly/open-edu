import { describe, it, expect } from 'vitest';
import { loadPackage } from '@open-edu/core';
import { resolve } from 'path';

describe('autism-reading example', () => {
  it('should load without errors', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.manifest.id).toBe('autism-reading');
    expect(pkg.manifest.title).toBe('A Day at the Park');
    expect(pkg.manifest.entry).toBe('nodes/a-day-at-the-park.md');
    expect(pkg.nodes).toHaveLength(3);
    expect(pkg.workflow).not.toBeNull();
    expect(pkg.workflow!.routing).toHaveProperty('nodes/a-day-at-the-park.md');
    expect(pkg.workflow!.routing).toHaveProperty('nodes/quiz.json');
    expect(pkg.workflow!.routing).toHaveProperty('nodes/reflection.json');
  });
});
