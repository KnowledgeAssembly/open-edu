import { describe, it, expect } from 'vitest';
import { focusTokens, focusRingClass, tailwindFocusExtensions } from '../focus';

describe('focus tokens', () => {
  it('defines ring width', () => {
    expect(focusTokens['ring-width']).toBe('2px');
  });

  it('generates focus ring class string', () => {
    expect(focusRingClass()).toContain('ring-2');
  });

  it('tailwind extensions map correctly', () => {
    expect(tailwindFocusExtensions['ring-width']).toBe('2px');
  });
});
