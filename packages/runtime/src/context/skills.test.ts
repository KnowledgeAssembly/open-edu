import { describe, it, expect } from 'vitest';
import { computeSkillScores, getSkillMastery, getMasteryLabel, getMasteryColor } from './skills';
import type { SkillGraph } from '@open-edu/schemas';

describe('computeSkillScores', () => {
  const graph: SkillGraph = {
    skills: [
      { id: 'algebra.basics', name: 'Algebra Basics', maxScore: 100 },
      { id: 'algebra.advanced', name: 'Algebra Advanced', maxScore: 100 },
    ],
    assessments: [
      { nodeId: 'nodes/quiz-basics.json', skillId: 'algebra.basics', weight: 1.0 },
      { nodeId: 'nodes/quiz-advanced.json', skillId: 'algebra.advanced', weight: 1.0 },
    ],
  };

  it('returns empty object when no skillGraph provided', () => {
    expect(computeSkillScores({ 'nodes/a': 80 })).toEqual({});
  });

  it('returns empty object when skillGraph has no assessments', () => {
    const noAssess: SkillGraph = {
      skills: [{ id: 's1', name: 'S1', maxScore: 100 }],
      assessments: [],
    };
    expect(computeSkillScores({ 'nodes/a': 80 }, noAssess)).toEqual({});
  });

  it('computes skill scores from node scores', () => {
    const scores = computeSkillScores({ 'nodes/quiz-basics.json': 90 }, graph);
    expect(scores).toEqual({ 'algebra.basics': 90 });
  });

  it('computes multiple skills from multiple node scores', () => {
    const scores = computeSkillScores(
      {
        'nodes/quiz-basics.json': 85,
        'nodes/quiz-advanced.json': 70,
      },
      graph,
    );
    expect(scores).toEqual({ 'algebra.basics': 85, 'algebra.advanced': 70 });
  });

  it('ignores nodes not in assessments', () => {
    const scores = computeSkillScores(
      {
        'nodes/quiz-basics.json': 80,
        'nodes/unknown.json': 100,
      },
      graph,
    );
    expect(scores).toEqual({ 'algebra.basics': 80 });
  });

  it('computes weighted skill scores', () => {
    const weightedGraph: SkillGraph = {
      skills: [{ id: 'math', name: 'Math', maxScore: 100 }],
      assessments: [
        { nodeId: 'nodes/quiz-easy.json', skillId: 'math', weight: 0.3 },
        { nodeId: 'nodes/quiz-hard.json', skillId: 'math', weight: 0.7 },
      ],
    };
    const scores = computeSkillScores(
      {
        'nodes/quiz-easy.json': 100,
        'nodes/quiz-hard.json': 50,
      },
      weightedGraph,
    );
    expect(scores).toEqual({ math: 65 });
  });

  it('rounds skill scores to integers', () => {
    const graph3: SkillGraph = {
      skills: [{ id: 's1', name: 'S1', maxScore: 100 }],
      assessments: [
        { nodeId: 'a', skillId: 's1', weight: 0.33 },
        { nodeId: 'b', skillId: 's1', weight: 0.67 },
      ],
    };
    const scores = computeSkillScores({ a: 100, b: 100 }, graph3);
    expect(scores.s1).toBe(100);
  });
});

describe('getSkillMastery', () => {
  it('returns not_attempted for score < 50', () => {
    expect(getSkillMastery(0)).toBe('not_attempted');
    expect(getSkillMastery(49)).toBe('not_attempted');
  });

  it('returns in_progress for score >= 50', () => {
    expect(getSkillMastery(50)).toBe('in_progress');
    expect(getSkillMastery(74)).toBe('in_progress');
  });

  it('returns achieved for score >= 75', () => {
    expect(getSkillMastery(75)).toBe('achieved');
    expect(getSkillMastery(89)).toBe('achieved');
  });

  it('returns mastered for score >= 90', () => {
    expect(getSkillMastery(90)).toBe('mastered');
    expect(getSkillMastery(100)).toBe('mastered');
  });
});

describe('getMasteryLabel', () => {
  it('returns human-readable labels', () => {
    expect(getMasteryLabel('not_attempted')).toBe('Not Attempted');
    expect(getMasteryLabel('in_progress')).toBe('In Progress');
    expect(getMasteryLabel('achieved')).toBe('Achieved');
    expect(getMasteryLabel('mastered')).toBe('Mastered');
  });
});

describe('getMasteryColor', () => {
  it('returns CSS variable references', () => {
    expect(getMasteryColor('not_attempted')).toBe('var(--oe-color-outline)');
    expect(getMasteryColor('in_progress')).toBe('var(--oe-color-primary)');
    expect(getMasteryColor('achieved')).toBe('var(--oe-color-tertiary)');
    expect(getMasteryColor('mastered')).toBe('var(--oe-color-success)');
  });
});
