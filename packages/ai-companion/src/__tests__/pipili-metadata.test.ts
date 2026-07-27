import { describe, it, expect } from 'vitest';
import { pipiliResponseMetadataSchema, citationSchema } from '../pipili/metadata.js';

describe('pipiliResponseMetadataSchema', () => {
  it('validates correct metadata', () => {
    const result = pipiliResponseMetadataSchema.safeParse({
      mode: 'tutor',
      citations: [{ source: 'lesson-1', text: 'some text', type: 'lesson' }],
      assessmentSafe: true,
      suggestedNextSteps: ['Try the next exercise'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing assessmentSafe', () => {
    const result = pipiliResponseMetadataSchema.safeParse({
      mode: 'tutor',
      citations: [],
      suggestedNextSteps: [],
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional hintLevel', () => {
    const result = pipiliResponseMetadataSchema.safeParse({
      mode: 'coach',
      citations: [],
      hintLevel: 2,
      assessmentSafe: true,
      suggestedNextSteps: [],
    });
    expect(result.success).toBe(true);
  });
});

describe('citationSchema', () => {
  it('validates correct citation', () => {
    const result = citationSchema.safeParse({
      source: 'lesson-1',
      text: 'some referenced text',
      type: 'lesson',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid citation type', () => {
    const result = citationSchema.safeParse({
      source: 'lesson-1',
      text: 'text',
      type: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});
