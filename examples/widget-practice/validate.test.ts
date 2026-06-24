import { describe, it, expect } from 'vitest';
import { loadPackage } from '@open-edu/core';
import { resolve } from 'path';

describe('widget-practice example package', () => {
  it('should load and validate successfully', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.manifest.id).toBe('widget-practice');
    expect(pkg.manifest.title).toBe('Widget Practice');
    expect(pkg.nodes).toHaveLength(2);
  });

  it('should have correct node types', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    const intro = pkg.nodes.find((n) => n.relativePath === 'nodes/intro.md');
    const practice = pkg.nodes.find((n) => n.relativePath === 'nodes/practice.json');
    expect(intro?.node.type).toBe('lesson');
    expect(practice?.node.type).toBe('exercise');
  });

  it('should have workflow routing', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.workflow).not.toBeNull();
    expect(pkg.workflow!.routing['nodes/intro.md']).toBeDefined();
    expect(pkg.workflow!.routing['nodes/practice.json']).toBeDefined();
  });
});
