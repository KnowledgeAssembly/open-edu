import { describe, it, expect } from 'vitest';
import { focusTokens, focusRingClass } from '../focus';
import { tailwindFocusExtensions } from '../tailwind';

describe('focus tokens', () => {
  it('defines ring width', () => {
    expect(focusTokens['ring-width']).toBe('2px');
  });

  it('generates focus ring class string', () => {
    expect(focusRingClass()).toContain('ring-2');
  });

  it('tailwind extensions reference CSS vars', () => {
    expect(tailwindFocusExtensions['width']).toBe('var(--oe-focus-ring-width)');
  });
});
