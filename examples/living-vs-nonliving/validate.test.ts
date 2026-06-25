import { describe, it, expect } from 'vitest';
import { loadPackage } from '@open-edu/core';
import { resolve } from 'path';

describe('living-vs-nonliving example package', () => {
  it('should load and validate successfully', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.manifest.id).toBe('living-vs-nonliving');
    expect(pkg.manifest.title).toBe('Living vs Non-Living Things');
    expect(pkg.nodes.length).toBe(6);
  });

  it('should have correct node types', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    const lessonNodes = pkg.nodes.filter((n) => n.node.type === 'lesson');
    const exerciseNodes = pkg.nodes.filter((n) => n.node.type === 'exercise');
    expect(lessonNodes).toHaveLength(2);
    expect(exerciseNodes).toHaveLength(4);
  });

  it('should have exercise nodes with appropriate widgets', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    const exerciseNodes = pkg.nodes.filter((n) => n.node.type === 'exercise');

    const visualCounting = exerciseNodes.find((n) => n.relativePath === 'nodes/observe.json');
    expect(visualCounting).toBeDefined();
    expect((visualCounting!.node as any).widget).toBe('open-edu.visual-counting');

    const matching = exerciseNodes.find((n) => n.relativePath === 'nodes/guided-practice.json');
    expect(matching).toBeDefined();
    expect((matching!.node as any).widget).toBe('open-edu.matching');

    const mcNodes = exerciseNodes.filter(
      (n) => (n.node as any).widget === 'open-edu.multiple-choice',
    );
    expect(mcNodes).toHaveLength(2);
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

  it('should have a valid rewards configuration', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.rewards).not.toBeNull();
    expect(pkg.rewards!.triggers).toHaveLength(2);
    expect(pkg.rewards!.triggers[0]!.onEvent).toBe('workflow_complete');
    expect(pkg.rewards!.triggers[1]!.onEvent).toBe('node_complete');
  });

  it('should have workflow.complete rewards with badge and webhook actions', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    const rewards = pkg.rewards!.triggers[0]!.rewards;
    expect(rewards).toHaveLength(3);
    expect(rewards[0]!.action).toBe('badge.award');
    expect(rewards[2]!.action).toBe('webhook');
    expect(rewards[0]!.condition).toBeUndefined();
    expect(rewards[1]!.condition).toBeDefined();
  });
});
