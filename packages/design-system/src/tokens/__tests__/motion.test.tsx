import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReducedMotion, motionTokens, motionSafe } from '../motion.js';

describe('motionTokens', () => {
  it('exports duration values', () => {
    expect(motionTokens.durationFast).toBe('100ms');
    expect(motionTokens.durationNormal).toBe('200ms');
    expect(motionTokens.durationSlow).toBe('300ms');
  });

  it('exports easing values', () => {
    expect(motionTokens.easingEaseInOut).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
    expect(motionTokens.easingEaseOut).toBe('cubic-bezier(0, 0, 0.15, 1)');
    expect(motionTokens.easingEaseIn).toBe('cubic-bezier(0.4, 0, 1, 1)');
  });
});

describe('motionSafe', () => {
  it('wraps animations in reduced-motion media query', () => {
    const result = motionSafe('.foo { animation: fade 1s; }');
    expect(result).toContain('@media (prefers-reduced-motion: no-preference)');
    expect(result).toContain('.foo { animation: fade 1s; }');
  });

  it('handles empty string', () => {
    const result = motionSafe('');
    expect(result).toContain('@media (prefers-reduced-motion: no-preference)');
  });
});

describe('useReducedMotion', () => {
  it('returns false by default', () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when CSS variable is set to reduce', () => {
    document.documentElement.style.setProperty('--oe-reduced-motion', 'reduce');
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
    document.documentElement.style.setProperty('--oe-reduced-motion', 'no-preference');
  });

  it('returns false for no-preference', () => {
    document.documentElement.style.setProperty('--oe-reduced-motion', 'no-preference');
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });
});
