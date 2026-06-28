import { describe, it, expect } from 'vitest';
import { breakpoints } from '../breakpoints.js';

describe('breakpoint tokens', () => {
  it('exports standard breakpoint values', () => {
    expect(breakpoints.sm).toBe('640px');
    expect(breakpoints.md).toBe('768px');
    expect(breakpoints.lg).toBe('1024px');
    expect(breakpoints.xl).toBe('1280px');
    expect(breakpoints['2xl']).toBe('1536px');
  });
});
