import { describe, it, expect } from 'vitest';
import { defaultTypography, typographyTokenToCssVar } from '../typography.js';
import type { TypographyRole } from '../typography.js';

describe('typography tokens', () => {
  const roles: TypographyRole[] = [
    'display',
    'heading',
    'subheading',
    'body',
    'label',
    'caption',
    'code',
  ];

  it('exports productive set with all 7 typography roles', () => {
    for (const role of roles) {
      expect(defaultTypography.productive[role]).toBeDefined();
      expect(defaultTypography.productive[role].fontFamily).toBeDefined();
      expect(defaultTypography.productive[role].fontSize).toBeDefined();
    }
  });

  it('exports expressive set with all 7 typography roles', () => {
    for (const role of roles) {
      expect(defaultTypography.expressive[role]).toBeDefined();
      expect(defaultTypography.expressive[role].fontFamily).toBeDefined();
      expect(defaultTypography.expressive[role].fontSize).toBeDefined();
    }
  });

  it('typographyTokenToCssVar produces correct CSS variable string', () => {
    expect(typographyTokenToCssVar('body', 'fontFamily', 'productive')).toBe('var(--oe-font-productive-body-family)');
  });

  it('typographyTokenToCssVar maps fontSize to size suffix', () => {
    expect(typographyTokenToCssVar('display', 'fontSize', 'expressive')).toBe('var(--oe-font-expressive-display-size)');
  });

  it('typographyTokenToCssVar defaults to productive set', () => {
    expect(typographyTokenToCssVar('code', 'fontWeight')).toBe('var(--oe-font-productive-code-weight)');
  });
});
