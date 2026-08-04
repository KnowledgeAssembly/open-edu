import { describe, it, expect } from 'vitest';
import { motionTokens, oasDurationToMs, oasDurationVar, lottieThemeColors } from '../motion.js';

describe('motion tokens', () => {
  it('exports duration values', () => {
    expect(motionTokens.durationFast).toBe('100ms');
    expect(motionTokens.durationNormal).toBe('200ms');
    expect(motionTokens.durationSlow).toBe('300ms');
  });

  it('exports easing values', () => {
    expect(motionTokens.easingEaseInOut).toContain('cubic-bezier');
    expect(motionTokens.easingEaseOut).toContain('cubic-bezier');
    expect(motionTokens.easingEaseIn).toContain('cubic-bezier');
  });
});

describe('OAS duration helpers', () => {
  it('maps named durations to millisecond values', () => {
    expect(oasDurationToMs('instant')).toBe('0ms');
    expect(oasDurationToMs('fast')).toBe('100ms');
    expect(oasDurationToMs('normal')).toBe('200ms');
    expect(oasDurationToMs('slow')).toBe('300ms');
  });

  it('passes numeric durations through as milliseconds', () => {
    expect(oasDurationToMs(250)).toBe('250ms');
    expect(oasDurationVar(0)).toBe('0ms');
  });

  it('maps named durations to CSS variables', () => {
    expect(oasDurationVar('fast')).toBe('var(--oe-motion-duration-fast)');
    expect(oasDurationVar('slow')).toBe('var(--oe-motion-duration-slow)');
  });
});

describe('lottieThemeColors', () => {
  it('prefixes color names with --oe-color-', () => {
    const result = lottieThemeColors({ primary: '#6750a4', 'on-surface': '#1c1b1f' });
    expect(result).toEqual({
      '--oe-color-primary': '#6750a4',
      '--oe-color-on-surface': '#1c1b1f',
    });
  });

  it('supports a custom prefix', () => {
    const result = lottieThemeColors({ primary: '#000000' }, '--custom-');
    expect(result).toEqual({ '--custom-primary': '#000000' });
  });

  it('returns an empty map for empty input', () => {
    expect(lottieThemeColors({})).toEqual({});
  });
});
