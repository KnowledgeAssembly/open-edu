import { describe, it, expect } from 'vitest';
import { loadPackage } from '@open-edu/core';
import { resolve } from 'path';
import fs from 'fs';

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
  'core.audio-player',
  'core.video-player',
  'language.flashcard',
  'science.process-diagram',
  'math.number-line',
  'social.map',
  'core.process-explainer',
  'core.timer',
];

describe('widget-showcase example package', () => {
  it('should load and validate successfully', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.manifest.id).toBe('widget-showcase');
    expect(pkg.manifest.title).toBe('Widget Showcase');
    expect(pkg.nodes.length).toBe(32);
  });

  it('should have correct node types', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.nodes.find((n) => n.relativePath === 'nodes/intro.md')?.node.type).toBe('lesson');
    expect(pkg.nodes.find((n) => n.relativePath === 'nodes/outro.md')?.node.type).toBe('lesson');

    const exerciseNodes = pkg.nodes.filter((n) => n.node.type === 'exercise');
    expect(exerciseNodes).toHaveLength(30);
  });

  it('should reference all 28 widget IDs in exercise nodes', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    const exerciseNodes = pkg.nodes.filter((n) => n.node.type === 'exercise');

    // Animation demo nodes reuse core.process-explainer (animated-water-cycle already does),
    // so exclude them from the one-node-per-widget assertion; the remaining 27 nodes keep
    // a 1:1 mapping with the 27 widget IDs.
    const demoNodes = new Set(['nodes/svg-animation.json', 'nodes/canvas-sorting.json']);
    const usedWidgetIds = exerciseNodes
      .filter((n) => !demoNodes.has(n.relativePath))
      .map((n) => (n.node as any).widget)
      .sort();
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

  it('should have a valid SVG animation demo node', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    const node = pkg.nodes.find((n) => n.relativePath === 'nodes/svg-animation.json');
    expect(node).toBeDefined();
    const cfg = (node!.node as any).config as { animation?: { backend?: string; src?: string } };
    expect(cfg.animation?.backend).toBe('svg');
    expect(cfg.animation?.src).toBe('assets/animations/water-cycle.svg');
    expect(fs.existsSync(resolve(__dirname, 'assets/animations/water-cycle.svg'))).toBe(true);
  });

  it('should have a valid Canvas animation demo node', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    const node = pkg.nodes.find((n) => n.relativePath === 'nodes/canvas-sorting.json');
    expect(node).toBeDefined();
    const cfg = (node!.node as any).config as {
      animation?: { backend?: string; effects?: Array<{ step?: number; effect?: string }> };
    };
    expect(cfg.animation?.backend).toBe('canvas');
    expect(cfg.animation?.effects?.[0]?.effect).toBe('flow');
    const values = cfg.animation?.effects?.map((e) => e.step).filter((s) => s !== undefined);
    expect(values).toEqual([30, 50, 20, 80, 40, 60]);
  });
});
