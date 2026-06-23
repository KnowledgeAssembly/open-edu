import { describe, it, expect } from 'vitest';
import { loadPackage } from '@open-edu/core';
import { resolve } from 'path';

describe('hello-world example', () => {
  it('should load without errors', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.manifest.id).toBe('hello-world');
    expect(pkg.manifest.title).toBe('Hello World');
    expect(pkg.manifest.entry).toBe('nodes/hello.md');
    expect(pkg.nodes).toHaveLength(1);
    expect(pkg.nodes[0].relativePath).toBe('nodes/hello.md');
    expect(pkg.workflow).not.toBeNull();
    expect(pkg.workflow!.routing).toHaveProperty('nodes/hello.md');
  });
});
