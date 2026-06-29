import type { GeneratedConcept } from '../types.js';

export const VALID_TYPES_PER_STEP: Record<string, readonly string[]> = {
  observe: ['reading'],
  guided_practice: ['exercise'],
  independent_practice: ['exercise'],
  mastery_check: ['quiz'],
  positive_completion: ['reflection'],
};

export function selectTypeForStep(step: string, _concept: GeneratedConcept): string {
  const allowed = VALID_TYPES_PER_STEP[step];
  if (!allowed || allowed.length === 0) {
    throw new Error(`No valid types for step: ${step}`);
  }
  return allowed[0]!;
}

export function selectTypesForConcept(concept: GeneratedConcept): Record<string, string> {
  return {
    observe: selectTypeForStep('observe', concept),
    guided_practice: selectTypeForStep('guided_practice', concept),
    independent_practice: selectTypeForStep('independent_practice', concept),
    mastery_check: 'quiz',
    positive_completion: 'reflection',
  };
}
