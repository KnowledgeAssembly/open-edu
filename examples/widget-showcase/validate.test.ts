import { describe, it, expect } from 'vitest';
import { loadPackage } from '@open-edu/core';
import { resolve } from 'path';

const WIDGET_IDS = [
  'core.callout',
  'core.visual-counting',
  'core.multiple-choice',
  'core.matching',
  'core.drag-drop',
  'core.sequencing',
  'core.fill-blank',
  'core.story-question',
  'core.real-world',
  'core.hotspot',
  'core.image-compare',
  'core.timeline',
  'math.fraction-visual',
  'math.place-value-chart',
  'math.grid-area',
  'core.chart-reader',
  'math.clock-time',
  'math.measurement-scale',
  'science.image-label',
  'science.label-diagram',
];

describe('widget-showcase example package', () => {
  it('should load and validate successfully', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.manifest.id).toBe('widget-showcase');
    expect(pkg.manifest.title).toBe('Widget Showcase');
    expect(pkg.nodes.length).toBe(22);
  });

  it('should have correct node types', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.nodes.find((n) => n.relativePath === 'nodes/intro.md')?.node.type).toBe('lesson');
    expect(pkg.nodes.find((n) => n.relativePath === 'nodes/outro.md')?.node.type).toBe('lesson');

    const exerciseNodes = pkg.nodes.filter((n) => n.node.type === 'exercise');
    expect(exerciseNodes).toHaveLength(20);
  });

  it('should reference all 20 widget IDs in exercise nodes', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    const exerciseNodes = pkg.nodes.filter((n) => n.node.type === 'exercise');

    const usedWidgetIds = exerciseNodes.map((n) => (n.node as any).widget).sort();
    const expectedIds = [...WIDGET_IDS].sort();
    expect(usedWidgetIds).toEqual(expectedIds);
  });

  it('should have workflow routing for all nodes', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.workflow).not.toBeNull();

    const nodePaths = pkg.nodes.map((n) => n.relativePath);
    for (const path of nodePaths) {
      expect(pkg.workflow!.routing[path]).toBeDefined();
    }
  });

  it('should have workflow reach COMPLETED terminal', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    const routing = pkg.workflow!.routing;
    const terminalPath = Object.keys(routing).find(
      (key) => routing[key].onComplete === 'COMPLETED',
    );
    expect(terminalPath).toBe('nodes/outro.md');
  });
});
