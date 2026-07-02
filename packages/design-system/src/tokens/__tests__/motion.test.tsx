import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useReducedMotion, motionSafe } from '../motion.js';

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

  it('includes CSS rule to disable animations with style-based reduced-motion', () => {
    const result = motionSafe('.foo { animation: fade 1s; }');
    expect(result).toContain('[style*="--oe-reduced-motion: reduce"]');
    expect(result).toContain('animation-duration: 0s !important');
  });
});

describe('useReducedMotion', () => {
  afterEach(() => {
    document.documentElement.style.removeProperty('--oe-reduced-motion');
  });

  it('returns false by default', () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when CSS variable is set to reduce', async () => {
    document.documentElement.style.setProperty('--oe-reduced-motion', 'reduce');
    const { result } = renderHook(() => useReducedMotion());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('returns false for no-preference', async () => {
    document.documentElement.style.setProperty('--oe-reduced-motion', 'no-preference');
    const { result } = renderHook(() => useReducedMotion());
    await waitFor(() => expect(result.current).toBe(false));
  });
});
