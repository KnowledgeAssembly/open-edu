import { describe, it, expect } from 'vitest';
import { loadPackage } from '@open-edu/core';
import { resolve } from 'path';

describe('adaptive-study example', () => {
  it('should load without errors', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.manifest.id).toBe('adaptive-study');
    expect(pkg.manifest.title).toBe('Adaptive Study');
    expect(pkg.manifest.entry).toBe('nodes/intro.md');
    expect(pkg.nodes).toHaveLength(4);
    expect(pkg.workflow).not.toBeNull();
    expect(pkg.workflow!.routing).toHaveProperty('nodes/intro.md');
    expect(pkg.workflow!.routing).toHaveProperty('nodes/checkpoint.json');
    expect(pkg.workflow!.routing).toHaveProperty('nodes/remediation.md');
    expect(pkg.workflow!.routing).toHaveProperty('nodes/reflection.json');
    const checkpointRoute = pkg.workflow!.routing['nodes/checkpoint.json'];
    expect(checkpointRoute).toHaveProperty('conditions');
    expect(Array.isArray(checkpointRoute.conditions)).toBe(true);
    expect(checkpointRoute.conditions).toHaveLength(2);
    expect(checkpointRoute.conditions![0]!.if).toBe('score >= 80');
    expect(checkpointRoute.conditions![1]!.if).toBe('score < 80');
  });

  it('should have a valid rewards configuration', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    expect(pkg.rewards).not.toBeNull();
    expect(pkg.rewards!.triggers).toHaveLength(1);
    expect(pkg.rewards!.triggers[0]!.onEvent).toBe('workflow.complete');
    expect(pkg.rewards!.triggers[0]!.rewards).toHaveLength(1);
    expect(pkg.rewards!.triggers[0]!.rewards[0]!.action).toBe('badge.award');
  });

  it('should route remediation back to checkpoint', async () => {
    const pkg = await loadPackage(resolve(__dirname));
    const remediationRoute = pkg.workflow!.routing['nodes/remediation.md'];
    expect(remediationRoute).toHaveProperty('onComplete');
    expect(remediationRoute.onComplete).toBe('nodes/checkpoint.json');
  });
});
