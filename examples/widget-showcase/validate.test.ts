import { describe, it, expect } from 'vitest';
import { loadPackage } from '@open-edu/core';
import { resolve } from 'path';

const WIDGET_IDS = [
  'open-edu.visual-counting',
  'open-edu.multiple-choice',
  'open-edu.matching',
  'open-edu.drag-drop',
  'open-edu.sequencing',
  'open-edu.fill-blank',
  'open-edu.story-question',
  'open-edu.real-world',
  'open-edu.fraction-visual',
  'open-edu.place-value-chart',
  'open-edu.grid-area',
  'open-edu.chart-reader',
  'open-edu.clock-time',
  'open-edu.measurement-scale',
];

describe('widget-showcase example package', () => {
  it('should load and validate successfully', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.manifest.id).toBe('widget-showcase');
    expect(pkg.manifest.title).toBe('Widget Showcase');
    expect(pkg.nodes.length).toBe(16);
  });

  it('should have correct node types', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.nodes.find((n) => n.relativePath === 'nodes/intro.md')?.node.type).toBe('lesson');
    expect(pkg.nodes.find((n) => n.relativePath === 'nodes/outro.md')?.node.type).toBe('lesson');

    const exerciseNodes = pkg.nodes.filter((n) => n.node.type === 'exercise');
    expect(exerciseNodes).toHaveLength(14);
  });

  it('should reference all 14 widget IDs in exercise nodes', async () => {
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