import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  applyFallbackConfig,
  communityCounterToMultipleChoice,
  FALLBACK_ADAPTERS,
} from './fallback-transform';

describe('fallback config adapters', () => {
  it('adapts a community counter config to a core.multiple-choice config', () => {
    const result = applyFallbackConfig(communityCounterToMultipleChoice, { prompt: 'Count five' });
    expect(result).toEqual({
      question: 'Count five',
      options: [
        { id: 'a', text: 'OK', correct: true },
        { id: 'b', text: 'Skip', correct: false },
      ],
    });
  });

  it('throws fallback-input-invalid for configs that do not match the input schema', () => {
    expect(() => applyFallbackConfig(communityCounterToMultipleChoice, { nope: 1 })).toThrow(
      'fallback-input-invalid',
    );
  });

  it('throws fallback-input-invalid for missing prompt', () => {
    expect(() => applyFallbackConfig(communityCounterToMultipleChoice, {})).toThrow(
      'fallback-input-invalid',
    );
  });

  it('throws fallback-output-invalid when a transform produces invalid output', () => {
    const badAdapter = {
      inputSchema: z.object({ prompt: z.string() }),
      outputSchema: z.object({ question: z.string() }),
      transform: () => ({ question: 5 }),
    };
    expect(() => applyFallbackConfig(badAdapter, { prompt: 'Count five' })).toThrow(
      'fallback-output-invalid',
    );
  });

  it('is deterministic: same input always yields the same output', () => {
    const first = applyFallbackConfig(communityCounterToMultipleChoice, { prompt: 'Count five' });
    const second = applyFallbackConfig(communityCounterToMultipleChoice, { prompt: 'Count five' });
    expect(second).toEqual(first);
  });

  it('rejects unknown inputs instead of defaulting them', () => {
    expect(() => applyFallbackConfig(communityCounterToMultipleChoice, { prompt: 42 })).toThrow(
      'fallback-input-invalid',
    );
  });

  it('registers the counter adapter under its intended widget id', () => {
    expect(FALLBACK_ADAPTERS['community.example.counter']).toBe(communityCounterToMultipleChoice);
  });
});
