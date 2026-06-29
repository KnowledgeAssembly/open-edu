import { describe, it, expect } from 'vitest';
import {
  selectTypeForStep,
  selectTypesForConcept,
  VALID_TYPES_PER_STEP,
} from '../type-selector.js';
import { makeConcept } from '../../test-helpers.js';

describe('VALID_TYPES_PER_STEP', () => {
  it('maps each step to exactly one type', () => {
    expect(VALID_TYPES_PER_STEP.observe).toEqual(['reading']);
    expect(VALID_TYPES_PER_STEP.guided_practice).toEqual(['exercise']);
    expect(VALID_TYPES_PER_STEP.independent_practice).toEqual(['exercise']);
    expect(VALID_TYPES_PER_STEP.mastery_check).toEqual(['quiz']);
    expect(VALID_TYPES_PER_STEP.positive_completion).toEqual(['reflection']);
  });
});

describe('selectTypeForStep', () => {
  it('returns the first valid type for the step', () => {
    expect(selectTypeForStep('observe', makeConcept())).toBe('reading');
    expect(selectTypeForStep('guided_practice', makeConcept())).toBe('exercise');
  });

  it('throws for unknown step', () => {
    expect(() => selectTypeForStep('unknown', makeConcept())).toThrow('No valid types for step');
  });
});

describe('selectTypesForConcept', () => {
  it('returns all 5 step-type mappings', () => {
    const types = selectTypesForConcept(makeConcept());
    expect(types).toEqual({
      observe: 'reading',
      guided_practice: 'exercise',
      independent_practice: 'exercise',
      mastery_check: 'quiz',
      positive_completion: 'reflection',
    });
  });
});
