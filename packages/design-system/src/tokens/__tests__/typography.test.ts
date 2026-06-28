import { describe, it, expect } from 'vitest';
import { defaultTypography, typographyTokenToCssVar } from '../typography.js';
import type { TypographyRole } from '../typography.js';

describe('typography tokens', () => {
  const roles: TypographyRole[] = [
    'display',
    'headlineLg',
    'headlineMd',
    'title',
    'bodyLg',
    'bodyMd',
    'label',
    'caption',
    'mono',
  ];

  it('exports all 9 typography roles', () => {
    for (const role of roles) {
      expect(defaultTypography[role]).toBeDefined();
      expect(defaultTypography[role].fontFamily).toBeDefined();
      expect(defaultTypography[role].fontSize).toBeDefined();
    }
  });

  it('typographyTokenToCssVar produces correct CSS variable string', () => {
    expect(typographyTokenToCssVar('bodyMd', 'fontFamily')).toBe('var(--oe-font-bodyMd-family)');
  });

  it('typographyTokenToCssVar maps fontSize to size suffix', () => {
    expect(typographyTokenToCssVar('display', 'fontSize')).toBe('var(--oe-font-display-size)');
  });
});
