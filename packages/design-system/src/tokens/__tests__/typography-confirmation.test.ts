import { describe, it, expect } from 'vitest';
import { defaultTypography } from '../typography.js';

describe('typography confirmation — #335', () => {
  const productiveRoles = Object.keys(defaultTypography.productive);
  const expressiveRoles = Object.keys(defaultTypography.expressive);

  it('has 11 typography roles per set', () => {
    expect(productiveRoles.length).toBe(11);
    expect(expressiveRoles.length).toBe(11);
  });

  it('uses Inter (productive) and Source Serif 4 (expressive)', () => {
    expect(defaultTypography.productive.body.fontFamily).toContain('Inter');
    expect(defaultTypography.expressive.body.fontFamily).toContain('Source Serif 4');
  });

  it('has fallback font stacks specified for all roles', () => {
    for (const role of productiveRoles) {
      const token = defaultTypography.productive[role as keyof typeof defaultTypography.productive];
      expect(token.fontFamily).toContain(',');
    }
    for (const role of expressiveRoles) {
      const token = defaultTypography.expressive[role as keyof typeof defaultTypography.expressive];
      expect(token.fontFamily).toContain(',');
    }
  });

  it('includes heading3 through heading6 tokens', () => {
    expect(defaultTypography.productive).toHaveProperty('heading3');
    expect(defaultTypography.productive).toHaveProperty('heading4');
    expect(defaultTypography.productive).toHaveProperty('heading5');
    expect(defaultTypography.productive).toHaveProperty('heading6');
    expect(defaultTypography.expressive).toHaveProperty('heading3');
    expect(defaultTypography.expressive).toHaveProperty('heading4');
    expect(defaultTypography.expressive).toHaveProperty('heading5');
    expect(defaultTypography.expressive).toHaveProperty('heading6');
  });

  it('has all required font weights available', () => {
    const weights = new Set<number>();
    for (const role of productiveRoles) {
      const token = defaultTypography.productive[role as keyof typeof defaultTypography.productive];
      weights.add(Number(token.fontWeight));
    }
    for (const role of expressiveRoles) {
      const token = defaultTypography.expressive[role as keyof typeof defaultTypography.expressive];
      weights.add(Number(token.fontWeight));
    }
    expect(weights.has(400)).toBe(true);
    expect(weights.has(600)).toBe(true);
    expect(weights.has(700)).toBe(true);
  });
});
