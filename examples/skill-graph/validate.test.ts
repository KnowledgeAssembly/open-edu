import { describe, it, expect } from 'vitest';
import { loadPackage } from '@open-edu/core';
import { resolve } from 'path';

describe('skill-graph example', () => {
  it('should load without errors', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.manifest.id).toBe('skill-graph');
    expect(pkg.manifest.title).toBe('Algebra Skill Graph');
    expect(pkg.manifest.entry).toBe('nodes/intro.md');
    expect(pkg.nodes).toHaveLength(5);
    expect(pkg.workflow).not.toBeNull();
  });

  it('should define two skills in quiz nodes', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    const basicsQuiz = pkg.nodes.find((n) => n.relativePath === 'nodes/quiz-basics.json');
    const advancedQuiz = pkg.nodes.find((n) => n.relativePath === 'nodes/quiz-advanced.json');
    expect(basicsQuiz).toBeDefined();
    expect(advancedQuiz).toBeDefined();
    expect((basicsQuiz!.node as { skills?: string[] }).skills).toContain('algebra.basics');
    expect((advancedQuiz!.node as { skills?: string[] }).skills).toContain('algebra.advanced');
  });

  it('should route intro to basics quiz', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    const introRoute = pkg.workflow!.routing['nodes/intro.md'];
    expect(introRoute).toHaveProperty('onComplete');
    expect(introRoute.onComplete).toBe('nodes/quiz-basics.json');
  });

  it('should route basics quiz with conditional branching to advanced or remediation', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    const basicsRoute = pkg.workflow!.routing['nodes/quiz-basics.json'];
    expect(basicsRoute).toHaveProperty('conditions');
    expect(Array.isArray(basicsRoute.conditions)).toBe(true);
    expect(basicsRoute.conditions).toHaveLength(2);
    expect(basicsRoute.conditions![0]!.if).toBe('score >= 80');
    expect(basicsRoute.conditions![0]!.then).toBe('nodes/quiz-advanced.json');
    expect(basicsRoute.conditions![1]!.if).toBe('score < 80');
    expect(basicsRoute.conditions![1]!.then).toBe('nodes/remediation.md');
  });

  it('should route advanced quiz to mastery or remediation', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    const advancedRoute = pkg.workflow!.routing['nodes/quiz-advanced.json'];
    expect(advancedRoute).toHaveProperty('conditions');
    expect(advancedRoute.conditions).toHaveLength(2);
    expect(advancedRoute.conditions![0]!.then).toBe('nodes/mastery-complete.md');
    expect(advancedRoute.conditions![1]!.then).toBe('nodes/remediation.md');
  });

  it('should loop remediation back to basics quiz', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    const remediationRoute = pkg.workflow!.routing['nodes/remediation.md'];
    expect(remediationRoute).toHaveProperty('onComplete');
    expect(remediationRoute.onComplete).toBe('nodes/quiz-basics.json');
  });

  it('should route mastery-complete to COMPLETED', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    const masteryRoute = pkg.workflow!.routing['nodes/mastery-complete.md'];
    expect(masteryRoute).toHaveProperty('onComplete');
    expect(masteryRoute.onComplete).toBe('COMPLETED');
  });
});
