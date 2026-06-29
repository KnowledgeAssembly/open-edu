import { describe, it, expect } from 'vitest';
import { validateConceptPair, validateAll } from '../index.js';
import type { GeneratedConcept, GeneratedActivity, ConceptActivityPair } from '../../types.js';

function makeConcept(overrides: Partial<GeneratedConcept> = {}): GeneratedConcept {
  return {
    conceptId: 'addition_1_10',
    chapterCode: 'CH1',
    chapterName: 'Addition',
    learningObjective: 'Add two numbers with sum up to 10',
    coreIdea: 'Addition means putting groups together.',
    examples: ['2 + 1 = 3'],
    misconceptions: [],
    supports: { visual: true },
    masteryCriteria: 0.8,
    difficulty: 'beginner',
    estimatedDuration: 15,
    dependencies: [],
    ...overrides,
  };
}

function makeActivity(step: string, order: number): GeneratedActivity {
  return {
    step: step as GeneratedActivity['step'],
    courseSpecType: 'exercise' as GeneratedActivity['courseSpecType'],
    order,
    content: { description: 'Test', instructions: 'Do it' },
  };
}

function makeQuizActivity(): GeneratedActivity {
  return {
    step: 'mastery_check',
    courseSpecType: 'quiz',
    order: 4,
    content: {
      description: 'Quiz',
      questions: [{ question: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0 }],
    },
  };
}

describe('validateConceptPair', () => {
  it('passes valid concept with all 5 activities', () => {
    const concept = makeConcept();
    const activities = [
      makeActivity('observe', 1),
      makeActivity('guided_practice', 2),
      makeActivity('independent_practice', 3),
      makeQuizActivity(),
      makeActivity('positive_completion', 5),
    ];
    const result = validateConceptPair(concept, activities);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects invalid conceptId format', () => {
    const concept = makeConcept({ conceptId: 'Invalid-ID' });
    const result = validateConceptPair(concept, []);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.message).toContain('Invalid conceptId format');
  });

  it('rejects short learning objective', () => {
    const concept = makeConcept({ learningObjective: 'Short' });
    const result = validateConceptPair(concept, []);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.message).toContain('learningObjective');
  });

  it('rejects missing core idea', () => {
    const concept = makeConcept({ coreIdea: '' });
    const result = validateConceptPair(concept, []);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.message).toContain('coreIdea');
  });

  it('rejects missing examples', () => {
    const concept = makeConcept({ examples: [] });
    const result = validateConceptPair(concept, []);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.message).toContain('example');
  });

  it('rejects missing activities', () => {
    const concept = makeConcept();
    const result = validateConceptPair(concept, []);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.message.includes('5 activities'))).toBe(true);
  });

  it('rejects mastery_check without questions', () => {
    const concept = makeConcept();
    const activities = [
      makeActivity('observe', 1),
      makeActivity('guided_practice', 2),
      makeActivity('independent_practice', 3),
      {
        step: 'mastery_check' as const,
        courseSpecType: 'quiz' as const,
        order: 4,
        content: { description: 'Quiz' },
      },
      makeActivity('positive_completion', 5),
    ];
    const result = validateConceptPair(concept, activities);
    expect(result.errors.some((e) => e.message.includes('question'))).toBe(true);
  });
});

describe('validateAll', () => {
  it('passes valid pairs and fails invalid ones', () => {
    const validPair: ConceptActivityPair = {
      concept: makeConcept(),
      activities: [
        makeActivity('observe', 1),
        makeActivity('guided_practice', 2),
        makeActivity('independent_practice', 3),
        makeQuizActivity(),
        makeActivity('positive_completion', 5),
      ],
    };
    const invalidPair: ConceptActivityPair = {
      concept: makeConcept({ conceptId: 'Bad-ID!' }),
      activities: [],
    };

    const result = validateAll([validPair, invalidPair]);
    expect(result.passed).toHaveLength(1);
    expect(result.failed).toHaveLength(1);
  });
});
