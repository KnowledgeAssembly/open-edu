import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, isAssessmentActive, extractMetadata } from '../policy.js';
import type { BoundedContext } from '@open-edu/ai-companion';

function makeBoundedContext(): BoundedContext {
  return {
    entries: [
      {
        source: 'page',
        content: '[Current Page]\nTitle: Test\nType: page\nContent:\nSome content here',
        priority: 0,
        truncated: false,
      },
      {
        source: 'lesson',
        content: '[Current Lesson]\nTitle: Lesson 1\nObjectives:\n- Learn X\nTopics: math',
        priority: 2,
        truncated: false,
      },
    ],
    totalTokens: 50,
    truncated: false,
  };
}

describe('buildSystemPrompt', () => {
  it('includes context entries in prompt', () => {
    const prompt = buildSystemPrompt({
      boundedContext: makeBoundedContext(),
      assessmentActive: false,
      learnerLanguage: 'en',
      readingLevel: 'secondary',
    });
    expect(prompt).toContain('Some content here');
    expect(prompt).toContain('Lesson 1');
  });

  it('includes assessment mode instructions when active', () => {
    const prompt = buildSystemPrompt({
      boundedContext: makeBoundedContext(),
      assessmentActive: true,
      learnerLanguage: 'en',
      readingLevel: 'secondary',
    });
    expect(prompt).toContain('Assessment Mode (ACTIVE)');
    expect(prompt).toContain('Do NOT reveal the answer');
  });

  it('includes autism accessibility instructions', () => {
    const prompt = buildSystemPrompt({
      boundedContext: makeBoundedContext(),
      assessmentActive: false,
      learnerLanguage: 'en',
      readingLevel: 'secondary',
      accessibilityProfile: 'autism',
    });
    expect(prompt).toContain('predictable headings');
  });

  it('includes ADHD accessibility instructions', () => {
    const prompt = buildSystemPrompt({
      boundedContext: makeBoundedContext(),
      assessmentActive: false,
      learnerLanguage: 'en',
      readingLevel: 'secondary',
      accessibilityProfile: 'adhd',
    });
    expect(prompt).toContain('small, scannable sections');
  });

  it('includes dyslexia accessibility instructions', () => {
    const prompt = buildSystemPrompt({
      boundedContext: makeBoundedContext(),
      assessmentActive: false,
      learnerLanguage: 'en',
      readingLevel: 'secondary',
      accessibilityProfile: 'dyslexia',
    });
    expect(prompt).toContain('simpler wording');
  });

  it('excludes assessment section when not active', () => {
    const prompt = buildSystemPrompt({
      boundedContext: makeBoundedContext(),
      assessmentActive: false,
      learnerLanguage: 'en',
      readingLevel: 'secondary',
    });
    expect(prompt).not.toContain('Assessment Mode');
  });

  it('excludes accessibility when no profile set', () => {
    const prompt = buildSystemPrompt({
      boundedContext: makeBoundedContext(),
      assessmentActive: false,
      learnerLanguage: 'en',
      readingLevel: 'secondary',
    });
    expect(prompt).not.toContain('Accessibility Adaptation');
  });

  it('does NOT ask the model to emit a JSON metadata block', () => {
    const prompt = buildSystemPrompt({
      boundedContext: makeBoundedContext(),
      assessmentActive: false,
      learnerLanguage: 'en',
      readingLevel: 'secondary',
    });
    expect(prompt).not.toMatch(/metadata/i);
  });

  it('includes explanation style instructions when a style is provided', () => {
    const prompt = buildSystemPrompt({
      boundedContext: makeBoundedContext(),
      assessmentActive: false,
      learnerLanguage: 'en',
      readingLevel: 'secondary',
      explanationStyle: 'child_friendly',
    });
    expect(prompt).toContain('Explanation Style');
    expect(prompt).toContain('playful');
  });

  it('excludes the explanation style section when no style is provided', () => {
    const prompt = buildSystemPrompt({
      boundedContext: makeBoundedContext(),
      assessmentActive: false,
      learnerLanguage: 'en',
      readingLevel: 'secondary',
    });
    expect(prompt).not.toContain('Explanation Style');
  });

  it('includes emoji guidance when emojiVisualMode is true', () => {
    const prompt = buildSystemPrompt({
      boundedContext: makeBoundedContext(),
      assessmentActive: false,
      learnerLanguage: 'en',
      readingLevel: 'secondary',
      emojiVisualMode: true,
    });
    expect(prompt).toContain('Emoji Use');
    expect(prompt).toContain('friendly emojis');
  });

  it('excludes emoji guidance when emojiVisualMode is false', () => {
    const prompt = buildSystemPrompt({
      boundedContext: makeBoundedContext(),
      assessmentActive: false,
      learnerLanguage: 'en',
      readingLevel: 'secondary',
      emojiVisualMode: false,
    });
    expect(prompt).not.toContain('Emoji Use');
  });
});

describe('isAssessmentActive', () => {
  it('returns true when assessment is active', () => {
    expect(isAssessmentActive({ assessment: { isActive: true } })).toBe(true);
  });

  it('returns false when assessment is not active', () => {
    expect(isAssessmentActive({ assessment: { isActive: false } })).toBe(false);
  });

  it('returns false when assessment field is missing', () => {
    expect(isAssessmentActive({})).toBe(false);
  });
});

describe('extractMetadata', () => {
  it('returns mode: "coach" when createProgressiveHint tool was called', () => {
    const meta = extractMetadata({
      text: 'Here is a hint for you',
      boundedContext: makeBoundedContext(),
      assessmentActive: false,
      toolCalls: [{ toolName: 'createProgressiveHint' }],
    });
    expect(meta.mode).toBe('coach');
  });

  it('returns mode: "reflection" when response text contains "reflect"', () => {
    const meta = extractMetadata({
      text: 'Reflect on what you learned today',
      boundedContext: makeBoundedContext(),
      assessmentActive: false,
    });
    expect(meta.mode).toBe('reflection');
  });

  it('returns assessmentSafe: false when assessment active and answer-leak heuristic matches', () => {
    const meta = extractMetadata({
      text: 'The answer is 42.',
      boundedContext: makeBoundedContext(),
      assessmentActive: true,
    });
    expect(meta.assessmentSafe).toBe(false);
  });

  it('returns assessmentSafe: true when assessment active but text is clean', () => {
    const meta = extractMetadata({
      text: 'Let me explain the concept of photosynthesis.',
      boundedContext: makeBoundedContext(),
      assessmentActive: true,
    });
    expect(meta.assessmentSafe).toBe(true);
  });

  it('returns assessmentSafe: true when assessment not active', () => {
    const meta = extractMetadata({
      text: 'The answer is 42.',
      boundedContext: makeBoundedContext(),
      assessmentActive: false,
    });
    expect(meta.assessmentSafe).toBe(true);
  });

  it('derives a citation when response text repeats a context signature', () => {
    const ctx: BoundedContext = {
      entries: [
        {
          source: 'page',
          content: 'Some unique signature text here for citation matching',
          priority: 0,
          truncated: false,
        },
      ],
      totalTokens: 10,
      truncated: false,
    };
    const meta = extractMetadata({
      text: 'Some unique signature text here for citation matching is important',
      boundedContext: ctx,
      assessmentActive: false,
    });
    expect(meta.citations.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty citations when no context signature is found in text', () => {
    const meta = extractMetadata({
      text: 'Unrelated response content',
      boundedContext: makeBoundedContext(),
      assessmentActive: false,
    });
    expect(meta.citations).toEqual([]);
  });

  it('returns a suggested next step when last sentence is a directive', () => {
    const meta = extractMetadata({
      text: 'Here is the explanation. Try the next exercise.',
      boundedContext: makeBoundedContext(),
      assessmentActive: false,
    });
    expect(meta.suggestedNextSteps.length).toBeGreaterThanOrEqual(1);
  });

  it('returns matching output against pipiliResponseMetadataSchema', async () => {
    const { pipiliResponseMetadataSchema } = await import('@open-edu/ai-companion');
    const meta = extractMetadata({
      text: 'Here is some help with your question.',
      boundedContext: makeBoundedContext(),
      assessmentActive: false,
    });
    const result = pipiliResponseMetadataSchema.safeParse(meta);
    expect(result.success).toBe(true);
  });
});
