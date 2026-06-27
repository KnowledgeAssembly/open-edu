import { describe, it, expect } from 'vitest';
import { evaluateCondition, shouldFireAction, getDefaultContext } from './conditions';
import type { ContextSnapshot } from './types';

const defaultContext: ContextSnapshot = {
  scores: { quiz1: 85, quiz2: 60, quiz3: 95 },
  skills: { math: 'mastered', reading: 'achieved' },
  completedNodes: ['n1', 'n2', 'n3'],
  completedModules: [],
};

describe('evaluateCondition', () => {
  it('should return true when score meets threshold', () => {
    expect(
      evaluateCondition({ type: 'score', nodeId: 'quiz1', minScore: 80 }, defaultContext),
    ).toBe(true);
  });

  it('should return false when score is below threshold', () => {
    expect(
      evaluateCondition({ type: 'score', nodeId: 'quiz2', minScore: 80 }, defaultContext),
    ).toBe(false);
  });

  it('should return false when node has no score', () => {
    expect(
      evaluateCondition({ type: 'score', nodeId: 'unknown', minScore: 50 }, defaultContext),
    ).toBe(false);
  });

  it('should return true when skill is mastered and minLevel is achieved', () => {
    expect(
      evaluateCondition({ type: 'skill', skillId: 'math', minLevel: 'achieved' }, defaultContext),
    ).toBe(true);
  });

  it('should return true when skill is mastered and minLevel is mastered', () => {
    expect(
      evaluateCondition({ type: 'skill', skillId: 'math', minLevel: 'mastered' }, defaultContext),
    ).toBe(true);
  });

  it('should return false when skill is only achieved but mastered required', () => {
    expect(
      evaluateCondition(
        { type: 'skill', skillId: 'reading', minLevel: 'mastered' },
        defaultContext,
      ),
    ).toBe(false);
  });

  it('should return false when skill is not in context', () => {
    expect(
      evaluateCondition(
        { type: 'skill', skillId: 'nonexistent', minLevel: 'achieved' },
        defaultContext,
      ),
    ).toBe(false);
  });

  it('should return true when all chain nodes are completed', () => {
    expect(
      evaluateCondition({ type: 'chain', completedNodeIds: ['n1', 'n3'] }, defaultContext),
    ).toBe(true);
  });

  it('should return false when some chain nodes are not completed', () => {
    expect(
      evaluateCondition({ type: 'chain', completedNodeIds: ['n1', 'n4'] }, defaultContext),
    ).toBe(false);
  });

  it('should evaluate and condition correctly (all true)', () => {
    expect(
      evaluateCondition(
        {
          type: 'and',
          conditions: [
            { type: 'score', nodeId: 'quiz1', minScore: 80 },
            { type: 'skill', skillId: 'math', minLevel: 'achieved' },
          ],
        },
        defaultContext,
      ),
    ).toBe(true);
  });

  it('should evaluate and condition correctly (one false)', () => {
    expect(
      evaluateCondition(
        {
          type: 'and',
          conditions: [
            { type: 'score', nodeId: 'quiz1', minScore: 80 },
            { type: 'score', nodeId: 'quiz2', minScore: 80 },
          ],
        },
        defaultContext,
      ),
    ).toBe(false);
  });

  it('should evaluate or condition correctly (one true)', () => {
    expect(
      evaluateCondition(
        {
          type: 'or',
          conditions: [
            { type: 'score', nodeId: 'quiz2', minScore: 80 },
            { type: 'score', nodeId: 'quiz3', minScore: 80 },
          ],
        },
        defaultContext,
      ),
    ).toBe(true);
  });

  it('should evaluate or condition correctly (all false)', () => {
    expect(
      evaluateCondition(
        {
          type: 'or',
          conditions: [
            { type: 'score', nodeId: 'quiz2', minScore: 80 },
            { type: 'score', nodeId: 'quiz2', minScore: 90 },
          ],
        },
        defaultContext,
      ),
    ).toBe(false);
  });

  it('should return true when condition is nested and/or', () => {
    expect(
      evaluateCondition(
        {
          type: 'and',
          conditions: [
            { type: 'score', nodeId: 'quiz1', minScore: 80 },
            {
              type: 'or',
              conditions: [
                { type: 'skill', skillId: 'math', minLevel: 'mastered' },
                { type: 'skill', skillId: 'reading', minLevel: 'mastered' },
              ],
            },
          ],
        },
        defaultContext,
      ),
    ).toBe(true);
  });
});

describe('shouldFireAction', () => {
  it('should return true when action has no condition', () => {
    expect(shouldFireAction({}, defaultContext)).toBe(true);
    expect(shouldFireAction({ condition: undefined }, defaultContext)).toBe(true);
  });

  it('should return true when condition is met', () => {
    expect(
      shouldFireAction(
        { condition: { type: 'score', nodeId: 'quiz1', minScore: 80 } },
        defaultContext,
      ),
    ).toBe(true);
  });

  it('should return false when condition is not met', () => {
    expect(
      shouldFireAction(
        { condition: { type: 'score', nodeId: 'quiz2', minScore: 80 } },
        defaultContext,
      ),
    ).toBe(false);
  });
});

describe('moduleCompleted condition', () => {
  it('should return true when module is completed', () => {
    expect(
      evaluateCondition(
        { type: 'moduleCompleted', moduleId: 'mod-a' },
        { ...defaultContext, completedModules: ['mod-a', 'mod-b'] },
      ),
    ).toBe(true);
  });

  it('should return false when module is not completed', () => {
    expect(
      evaluateCondition(
        { type: 'moduleCompleted', moduleId: 'mod-c' },
        { ...defaultContext, completedModules: ['mod-a'] },
      ),
    ).toBe(false);
  });
});

describe('bundleCompleted condition', () => {
  it('should return false by default (evaluated externally)', () => {
    expect(evaluateCondition({ type: 'bundleCompleted' }, defaultContext)).toBe(false);
  });
});

describe('getDefaultContext', () => {
  it('should return empty context', () => {
    expect(getDefaultContext()).toEqual({
      scores: {},
      skills: {},
      completedNodes: [],
      completedModules: [],
    });
  });
});
