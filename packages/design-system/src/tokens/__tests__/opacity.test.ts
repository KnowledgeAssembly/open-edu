import { describe, it, expect } from 'vitest';
import { opacityScale, opacityTokenToCssVar } from '../opacity';
import { tailwindOpacityExtensions } from '../tailwind';

describe('opacity tokens', () => {
  it('has full scale from 0 to 100', () => {
    expect(opacityScale['0']).toBe('0');
    expect(opacityScale['50']).toBe('0.50');
    expect(opacityScale['100']).toBe('1');
  });

  it('generates CSS var references', () => {
    expect(opacityTokenToCssVar('50')).toBe('var(--oe-opacity-50)');
  });

  it('tailwind extensions reference CSS vars', () => {
    expect(tailwindOpacityExtensions['50']).toBe('var(--oe-opacity-50)');
  });
});
