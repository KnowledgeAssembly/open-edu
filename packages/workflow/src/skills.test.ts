import { describe, it, expect } from 'vitest';
import { createSkillState, applyAssessment } from './skills';
import type { SkillGraph } from '@open-edu/schemas';

const sampleGraph: SkillGraph = {
  skills: [
    { id: 'addition', name: 'Addition', maxScore: 100 },
    { id: 'subtraction', name: 'Subtraction', maxScore: 50 },
    { id: 'multiplication', name: 'Multiplication', dependencies: ['addition'], maxScore: 200 },
  ],
  assessments: [
    { nodeId: 'n1', skillId: 'addition', weight: 1.0 },
    { nodeId: 'n2', skillId: 'subtraction', weight: 0.5 },
    { nodeId: 'n3', skillId: 'multiplication', weight: 0.8 },
  ],
};

describe('createSkillState', () => {
  it('returns empty state when no graph is provided', () => {
    const state = createSkillState();
    expect(state.scores).toEqual({});
    expect(state.maxScores).toEqual({});
    expect([...state.achieved]).toHaveLength(0);
  });

  it('initializes scores to zero for all skills', () => {
    const state = createSkillState(sampleGraph);
    expect(state.scores).toEqual({ addition: 0, subtraction: 0, multiplication: 0 });
    expect(state.maxScores).toEqual({ addition: 100, subtraction: 50, multiplication: 200 });
    expect([...state.achieved]).toHaveLength(0);
  });

  it('clamps negative maxScore to 0', () => {
    const graph: SkillGraph = {
      skills: [{ id: 's1', name: 'S1', maxScore: -10 }],
      assessments: [],
    };
    const state = createSkillState(graph);
    expect(state.maxScores.s1).toBe(0);
  });

  it('handles zero skills gracefully', () => {
    const state = createSkillState({ skills: [], assessments: [] });
    expect(state.scores).toEqual({});
    expect(state.maxScores).toEqual({});
  });
});

describe('applyAssessment', () => {
  it('updates score and emits SKILL_UPDATED', () => {
    const state = createSkillState(sampleGraph);
    const { newState, events } = applyAssessment(state, 'addition', 50, 1.0);
    expect(newState.scores.addition).toBe(50);
    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe('SKILL_UPDATED');
  });

  it('accumulates scores across multiple assessments', () => {
    const state = createSkillState(sampleGraph);
    const r1 = applyAssessment(state, 'addition', 50, 1.0);
    const r2 = applyAssessment(r1.newState, 'addition', 30, 1.0);
    expect(r2.newState.scores.addition).toBe(80);
  });

  it('applies weight correctly', () => {
    const state = createSkillState(sampleGraph);
    const { newState } = applyAssessment(state, 'subtraction', 100, 0.5);
    expect(newState.scores.subtraction).toBe(50);
  });

  it('treats undefined score as 0', () => {
    const state = createSkillState(sampleGraph);
    const { newState, events } = applyAssessment(state, 'addition', undefined, 1.0);
    expect(newState.scores.addition).toBe(0);
    expect(events[0]!.masteryLevel).toBe('not_attempted');
  });

  it('handles unknown skillId by returning unchanged state', () => {
    const state = createSkillState(sampleGraph);
    const { newState, events } = applyAssessment(state, 'unknown', 50, 1.0);
    expect(newState.scores.addition).toBe(0);
    expect(events).toHaveLength(0);
  });

  it('skips accumulation when maxScore is 0', () => {
    const graph: SkillGraph = {
      skills: [{ id: 's1', name: 'S1', maxScore: 0 }],
      assessments: [],
    };
    const state = createSkillState(graph);
    const { newState, events } = applyAssessment(state, 's1', 100, 1.0);
    expect(newState.scores.s1).toBe(0);
    expect(events).toHaveLength(0);
  });

  it('skips accumulation when maxScore is negative (clamped to 0)', () => {
    const graph: SkillGraph = {
      skills: [{ id: 's1', name: 'S1', maxScore: -10 }],
      assessments: [],
    };
    const state = createSkillState(graph);
    const { newState, events } = applyAssessment(state, 's1', 100, 1.0);
    expect(newState.scores.s1).toBe(0);
    expect(events).toHaveLength(0);
  });

  describe('mastery threshold', () => {
    it('returns not_attempted for zero score', () => {
      const state = createSkillState(sampleGraph);
      const { events } = applyAssessment(state, 'addition', 0, 1.0);
      expect(events[0]!.masteryLevel).toBe('not_attempted');
    });

    it('returns in_progress for ratio > 0 and < 0.7', () => {
      const state = createSkillState(sampleGraph);
      const { events } = applyAssessment(state, 'addition', 50, 1.0);
      expect(events[0]!.masteryLevel).toBe('in_progress');
    });

    it('returns achieved for ratio >= 0.7 and < 0.9', () => {
      const state = createSkillState(sampleGraph);
      const { events } = applyAssessment(state, 'addition', 75, 1.0);
      expect(events[0]!.masteryLevel).toBe('achieved');
    });

    it('returns mastered for ratio >= 0.9', () => {
      const state = createSkillState(sampleGraph);
      const { events } = applyAssessment(state, 'addition', 90, 1.0);
      expect(events[0]!.masteryLevel).toBe('mastered');
    });
  });

  describe('SKILL_ACHIEVED', () => {
    it('emits SKILL_ACHIEVED when crossing into achieved for the first time', () => {
      const state = createSkillState(sampleGraph);
      const { newState, events } = applyAssessment(state, 'addition', 80, 1.0);
      expect(events).toHaveLength(2);
      expect(events[0]!.type).toBe('SKILL_UPDATED');
      expect(events[1]!.type).toBe('SKILL_ACHIEVED');
      expect(newState.achieved.has('addition')).toBe(true);
    });

    it('emits SKILL_ACHIEVED only once per skill', () => {
      const state = createSkillState(sampleGraph);
      const r1 = applyAssessment(state, 'addition', 80, 1.0);
      expect(r1.events.filter((e) => e.type === 'SKILL_ACHIEVED')).toHaveLength(1);
      const r2 = applyAssessment(r1.newState, 'addition', 10, 1.0);
      expect(r2.events.filter((e) => e.type === 'SKILL_ACHIEVED')).toHaveLength(0);
    });
  });
});
