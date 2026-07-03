import { describe, it, expect } from 'vitest';
import {
  borderWidthScale,
  borderStyleScale,
  borderWidthTokenToCssVar,
  tailwindBorderWidthExtensions,
} from '../borders';

describe('border tokens', () => {
  it('has width scale', () => {
    expect(borderWidthScale['1']).toBe('1px');
    expect(borderWidthScale['2']).toBe('2px');
  });

  it('has style scale', () => {
    expect(borderStyleScale['solid']).toBe('solid');
    expect(borderStyleScale['dashed']).toBe('dashed');
  });

  it('generates CSS var references', () => {
    expect(borderWidthTokenToCssVar('1')).toBe('var(--oe-border-width-1)');
  });

  it('tailwind extensions map correctly', () => {
    expect(tailwindBorderWidthExtensions['1']).toBe('1px');
  });
});
