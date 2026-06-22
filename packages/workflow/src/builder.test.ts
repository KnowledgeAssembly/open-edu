import { describe, it, expect } from 'vitest';
import { buildMachineConfig } from './builder';
import type { Workflow } from '@open-edu/schemas';
import { encodeStateName } from './state-map';

describe('buildMachineConfig', () => {
  it('should build a simple routing machine', () => {
    const workflow: Workflow = {
      routing: {
        'nodes/lesson-01.md': {
          onComplete: 'nodes/quiz-01.json',
        },
        'nodes/quiz-01.json': {
          onComplete: 'COMPLETED',
        },
      },
    };

    const config = buildMachineConfig(workflow);
    expect(config.id).toBe('workflow');
    expect(config.initial).toBe(encodeStateName('nodes/lesson-01.md'));
    expect(config.states[encodeStateName('nodes/lesson-01.md')]).toBeDefined();
    expect(config.states[encodeStateName('nodes/quiz-01.json')]).toBeDefined();
    expect(config.states['COMPLETED']).toEqual({ type: 'final' });
  });

  it('should build a conditional routing machine', () => {
    const workflow: Workflow = {
      routing: {
        'nodes/quiz-01.json': {
          conditions: [
            { if: 'score >= 80', then: 'COMPLETED' },
            { if: 'score < 80', then: 'nodes/lesson-01.md' },
          ],
        },
      },
    };

    const config = buildMachineConfig(workflow);
    expect(config.initial).toBe(encodeStateName('nodes/quiz-01.json'));
    expect(config.states[encodeStateName('nodes/quiz-01.json')]).toBeDefined();
  });

  it('should use the first route key as initial state by default', () => {
    const workflow: Workflow = {
      routing: {
        'nodes/start.md': {
          onComplete: 'nodes/end.md',
        },
        'nodes/end.md': {
          onComplete: 'COMPLETED',
        },
      },
    };

    const config = buildMachineConfig(workflow);
    expect(config.initial).toBe(encodeStateName('nodes/start.md'));
  });

  it('should use the supplied entry option instead of the first route key', () => {
    const workflow: Workflow = {
      routing: {
        'nodes/start.md': { onComplete: 'nodes/end.md' },
        'nodes/end.md': { onComplete: 'COMPLETED' },
      },
    };

    const config = buildMachineConfig(workflow, { entry: 'nodes/end.md' });
    expect(config.initial).toBe(encodeStateName('nodes/end.md'));
  });

  it('should throw if the supplied entry is not a routing key', () => {
    const workflow: Workflow = {
      routing: {
        'nodes/start.md': { onComplete: 'COMPLETED' },
      },
    };

    expect(() => buildMachineConfig(workflow, { entry: 'nodes/GHOST.md' })).toThrow(
      'not present in workflow routing',
    );
  });

  it('should handle COMPLETED sentinel', () => {
    const workflow: Workflow = {
      routing: {
        'nodes/start.md': {
          onComplete: 'COMPLETED',
        },
      },
    };

    const config = buildMachineConfig(workflow);
    const encodedStart = encodeStateName('nodes/start.md');
    const state = config.states[encodedStart] as {
      on: Record<string, unknown>;
    };
    const transition = state.on!['NODE_COMPLETE'] as { target: string };
    expect(transition.target).toBe('COMPLETED');
  });

  it('should throw for empty workflow', () => {
    expect(() => buildMachineConfig({ routing: {} })).toThrow('no routes');
  });

  it('does not collide distinct paths that differ only by slash/dot/hyphen', () => {
    const workflow: Workflow = {
      routing: {
        'nodes/a-b.md': { onComplete: 'COMPLETED' },
        'nodes/a.b.md': { onComplete: 'COMPLETED' },
        'nodes/a_b.md': { onComplete: 'COMPLETED' },
      },
    };

    const config = buildMachineConfig(workflow);
    expect(Object.keys(config.states).filter((k) => k !== 'COMPLETED')).toHaveLength(3);
  });
});
