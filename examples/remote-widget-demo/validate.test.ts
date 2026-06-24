import { describe, it, expect } from 'vitest';
import { loadPackage } from '@open-edu/core';
import { resolve } from 'path';

describe('remote-widget-demo example', () => {
  it('should load and validate successfully', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.manifest.id).toBe('remote-widget-demo');
    expect(pkg.manifest.title).toBe('Remote Widget Demo');
    expect(pkg.nodes).toHaveLength(2);
  });

  it('should have correct node types', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    const intro = pkg.nodes.find((n) => n.relativePath === 'nodes/intro.md');
    const practice = pkg.nodes.find((n) => n.relativePath === 'nodes/remote-practice.json');
    expect(intro?.node.type).toBe('lesson');
    expect(practice?.node.type).toBe('custom');
  });

  it('should have remoteWidget field on practice node', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    const practice = pkg.nodes.find((n) => n.relativePath === 'nodes/remote-practice.json');
    const node = practice?.node as Record<string, unknown>;
    expect(node.remoteWidget).toBeDefined();
    expect((node.remoteWidget as Record<string, unknown>).id).toBe('open-edu.remote-practice');
    expect((node.remoteWidget as Record<string, unknown>).url).toBe(
      'https://cdn.example.com/widgets/remote-practice.js',
    );
  });

  it('should have workflow routing', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.workflow).not.toBeNull();
    expect(pkg.workflow!.routing['nodes/intro.md']).toBeDefined();
    expect(pkg.workflow!.routing['nodes/remote-practice.json']).toBeDefined();
  });
});
