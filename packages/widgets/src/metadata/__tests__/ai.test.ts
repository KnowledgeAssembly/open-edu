import { describe, it, expect } from 'vitest';
import type { AIMetadata } from '../ai';

describe('AIMetadata', () => {
  it('has all AI metadata fields as optional', () => {
    const ai: AIMetadata = {};
    expect(ai.difficulty).toBeUndefined();
    expect(ai.estimatedMinutes).toBeUndefined();
    expect(ai.bloomsLevel).toBeUndefined();
    expect(ai.cognitiveLoad).toBeUndefined();
    expect(ai.recommendedAge).toBeUndefined();
    expect(ai.readingLevel).toBeUndefined();
    expect(ai.subjectTags).toBeUndefined();
    expect(ai.learningObjectives).toBeUndefined();
    expect(ai.commonMisconceptions).toBeUndefined();
    expect(ai.authoringPrompt).toBeUndefined();
    expect(ai.generationHints).toBeUndefined();
    expect(ai.exampleConfigs).toBeUndefined();
  });

  it('allows full AI metadata declaration', () => {
    const ai: AIMetadata = {
      difficulty: 'medium',
      estimatedMinutes: 5,
      bloomsLevel: 'apply',
      cognitiveLoad: 'moderate',
      recommendedAge: [8, 12],
      readingLevel: 'grade-4',
      subjectTags: ['math', 'arithmetic'],
      learningObjectives: ['Identify matching pairs'],
      commonMisconceptions: ['Confusing similar items'],
      authoringPrompt: 'Create a matching exercise with 4-6 pairs',
      generationHints: ['Use simple vocabulary', 'Include visual cues'],
      exampleConfigs: [{ pairs: [{ left: 'A', right: '1' }] }],
    };
    expect(ai.difficulty).toBe('medium');
    expect(ai.recommendedAge).toEqual([8, 12]);
    expect(ai.exampleConfigs).toHaveLength(1);
  });
});