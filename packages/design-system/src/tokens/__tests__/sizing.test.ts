import { describe, it, expect } from 'vitest';
import { sizingScale, sizingTokenToCssVar } from '../sizing';
import { tailwindSizingExtensions } from '../tailwind';

describe('sizing tokens', () => {
  it('has icon sizes', () => {
    expect(sizingScale['icon-sm']).toBe('16px');
    expect(sizingScale['icon-lg']).toBe('24px');
  });

  it('has component heights', () => {
    expect(sizingScale['height-md']).toBe('40px');
  });

  it('generates CSS var references', () => {
    expect(sizingTokenToCssVar('icon-sm')).toBe('var(--oe-size-icon-sm)');
  });

  it('tailwind extensions reference CSS vars', () => {
    expect(tailwindSizingExtensions['icon-sm']).toBe('var(--oe-size-icon-sm)');
  });
});
