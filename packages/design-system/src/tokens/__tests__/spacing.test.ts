import { describe, it, expect } from 'vitest';
import { spacingScale, spacingTokenToCssVar } from '../spacing.js';

describe('spacing tokens', () => {
  it('exports standard spacing scale', () => {
    expect(spacingScale.xs).toBe('4px');
    expect(spacingScale.sm).toBe('8px');
    expect(spacingScale.md).toBe('12px');
    expect(spacingScale.lg).toBe('16px');
    expect(spacingScale.xl).toBe('24px');
  });

  it('spacingTokenToCssVar produces correct CSS variable string', () => {
    expect(spacingTokenToCssVar('md')).toBe('var(--oe-space-md)');
  });
});
