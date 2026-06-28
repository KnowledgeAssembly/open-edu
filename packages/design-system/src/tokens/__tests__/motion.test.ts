import { describe, it, expect } from 'vitest';
import { motionTokens } from '../motion.js';

describe('motion tokens', () => {
  it('exports duration values', () => {
    expect(motionTokens.durationFast).toBe('100ms');
    expect(motionTokens.durationNormal).toBe('200ms');
    expect(motionTokens.durationSlow).toBe('400ms');
  });

  it('exports easing values', () => {
    expect(motionTokens.easingEaseInOut).toContain('cubic-bezier');
    expect(motionTokens.easingEaseOut).toContain('cubic-bezier');
    expect(motionTokens.easingEaseIn).toContain('cubic-bezier');
  });
});
