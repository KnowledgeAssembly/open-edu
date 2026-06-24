import { describe, it, expect } from 'vitest';
import {
  SkillDefinitionSchema,
  MasteryLevelSchema,
  SkillAssessmentSchema,
  SkillGraphSchema,
  validateSkillGraph,
} from './skills';

describe('SkillDefinitionSchema', () => {
  it('should validate a valid skill definition', () => {
    const result = SkillDefinitionSchema.parse({
      id: 'skill-1',
      name: 'Addition',
    });
    expect(result.id).toBe('skill-1');
    expect(result.maxScore).toBe(100);
  });

  it('should use default maxScore of 100', () => {
    const result = SkillDefinitionSchema.parse({ id: 's1', name: 'Test' });
    expect(result.maxScore).toBe(100);
  });

  it('should accept custom maxScore', () => {
    const result = SkillDefinitionSchema.parse({
      id: 's1',
      name: 'Test',
      maxScore: 50,
    });
    expect(result.maxScore).toBe(50);
  });

  it('should accept optional description and dependencies', () => {
    const result = SkillDefinitionSchema.parse({
      id: 's1',
      name: 'Test',
      description: 'A test skill',
      dependencies: ['s2'],
    });
    expect(result.description).toBe('A test skill');
    expect(result.dependencies).toEqual(['s2']);
  });
});

describe('MasteryLevelSchema', () => {
  it('should accept valid mastery levels', () => {
    expect(MasteryLevelSchema.parse('not_attempted')).toBe('not_attempted');
    expect(MasteryLevelSchema.parse('in_progress')).toBe('in_progress');
    expect(MasteryLevelSchema.parse('achieved')).toBe('achieved');
    expect(MasteryLevelSchema.parse('mastered')).toBe('mastered');
  });

  it('should reject invalid mastery levels', () => {
    expect(() => MasteryLevelSchema.parse('expert')).toThrow();
  });
});

describe('SkillAssessmentSchema', () => {
  it('should validate a valid assessment', () => {
    const result = SkillAssessmentSchema.parse({
      nodeId: 'nodes/lesson-01.md',
      skillId: 'skill-1',
      weight: 0.5,
    });
    expect(result.nodeId).toBe('nodes/lesson-01.md');
    expect(result.weight).toBe(0.5);
  });

  it('should reject weight over 1', () => {
    expect(() =>
      SkillAssessmentSchema.parse({
        nodeId: 'n1',
        skillId: 's1',
        weight: 1.5,
      }),
    ).toThrow();
  });

  it('should reject negative weight', () => {
    expect(() =>
      SkillAssessmentSchema.parse({
        nodeId: 'n1',
        skillId: 's1',
        weight: -0.1,
      }),
    ).toThrow();
  });
});

describe('SkillGraphSchema', () => {
  it('should validate a complete skill graph', () => {
    const result = SkillGraphSchema.parse({
      skills: [
        { id: 's1', name: 'Skill 1', maxScore: 100 },
        { id: 's2', name: 'Skill 2', dependencies: ['s1'], maxScore: 50 },
      ],
      assessments: [
        { nodeId: 'n1', skillId: 's1', weight: 1.0 },
        { nodeId: 'n2', skillId: 's2', weight: 0.5 },
      ],
    });
    expect(result.skills).toHaveLength(2);
    expect(result.assessments).toHaveLength(2);
  });

  it('should accept empty skills and assessments', () => {
    const result = SkillGraphSchema.parse({ skills: [], assessments: [] });
    expect(result.skills).toHaveLength(0);
  });
});

describe('validateSkillGraph', () => {
  it('should pass a valid graph', () => {
    const result = validateSkillGraph({
      skills: [
        { id: 's1', name: 'Skill 1', maxScore: 100 },
        { id: 's2', name: 'Skill 2', dependencies: ['s1'], maxScore: 50 },
      ],
      assessments: [{ nodeId: 'n1', skillId: 's1', weight: 1.0 }],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject circular dependencies', () => {
    const result = validateSkillGraph({
      skills: [
        { id: 's1', name: 'Skill 1', dependencies: ['s2'], maxScore: 100 },
        { id: 's2', name: 'Skill 2', dependencies: ['s1'], maxScore: 100 },
      ],
      assessments: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('circular'))).toBe(true);
  });

  it('should reject self-referencing dependency', () => {
    const result = validateSkillGraph({
      skills: [{ id: 's1', name: 'Skill 1', dependencies: ['s1'], maxScore: 100 }],
      assessments: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('circular'))).toBe(true);
  });

  it('should reject missing dependency IDs', () => {
    const result = validateSkillGraph({
      skills: [
        {
          id: 's1',
          name: 'Skill 1',
          dependencies: ['nonexistent'],
          maxScore: 100,
        },
      ],
      assessments: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('nonexistent'))).toBe(true);
  });

  it('should reject assessments with unknown skillId', () => {
    const result = validateSkillGraph({
      skills: [{ id: 's1', name: 'Skill 1', maxScore: 100 }],
      assessments: [{ nodeId: 'n1', skillId: 'unknown', weight: 1.0 }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('unknown'))).toBe(true);
  });

  it('should pass a graph with no dependencies', () => {
    const result = validateSkillGraph({
      skills: [
        { id: 's1', name: 'Skill 1', maxScore: 100 },
        { id: 's2', name: 'Skill 2', maxScore: 100 },
      ],
      assessments: [],
    });
    expect(result.valid).toBe(true);
  });
});
