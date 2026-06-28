import { describe, it, expect } from 'vitest';
import { radiusScale } from '../radius.js';

describe('radius tokens', () => {
  it('exports all radius values', () => {
    expect(radiusScale.sm).toBe('0.125rem');
    expect(radiusScale.DEFAULT).toBe('0.25rem');
    expect(radiusScale.md).toBe('0.375rem');
    expect(radiusScale.lg).toBe('0.5rem');
    expect(radiusScale.xl).toBe('0.75rem');
    expect(radiusScale.full).toBe('9999px');
  });
});
