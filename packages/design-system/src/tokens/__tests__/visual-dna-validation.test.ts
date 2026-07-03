import { describe, it, expect } from 'vitest';
import { palette } from '../colors.js';
import {
  tailwindColorExtensions,
} from '../tailwind.js';

describe('color palette validation against Visual DNA', () => {
  it('includes all 5 Silhouette Assembly palette color families', () => {
    expect(palette).toHaveProperty('purple30');
    expect(palette).toHaveProperty('purpleMuted');
    expect(palette).toHaveProperty('goldTertiary');
    expect(palette).toHaveProperty('green30');
  });

  it('includes warm greige v2 palette colors', () => {
    expect(palette.greigeWhite).toBe('#fcfaf8');
    expect(palette.greigeDim).toBe('#e3dfda');
    expect(palette.greigeBright).toBe('#fefcf9');
    expect(palette.greigeOutline).toBe('#ccc6c0');
    expect(palette.purpleMuted).toBe('#5d4a8a');
    expect(palette.goldTertiary).toBe('#b8862d');
  });

  it('includes purple family for primary token', () => {
    expect(palette.purple10).toBe('#22005d');
    expect(palette.purple30).toBe('#6750a4');
    expect(palette.purple40).toBe('#7c6bb0');
    expect(palette.purple80).toBe('#cfbcff');
  });

  it('includes warm gray neutrals for surface tokens', () => {
    expect(palette.gray10).toBe('#1d1b20');
    expect(palette.gray20).toBe('#322f35');
    expect(palette.gray90).toBe('#f2ecf4');
    expect(palette.gray99).toBe('#fdf7ff');
  });

  it('includes all 6 theme color families', () => {
    const families = ['purple', 'gray', 'red', 'green', 'amber', 'blue'];
    const colorKeys = Object.keys(palette);
    for (const family of families) {
      const hasFamily = colorKeys.some((key) => key.startsWith(family));
      expect(hasFamily).toBe(true);
    }
  });

  it('includes silhouette assembly palette mappings matching Visual DNA spec', () => {
    expect(tailwindColorExtensions.accent).toBe('var(--oe-color-accent)');
    expect(tailwindColorExtensions.primary).toBe('var(--oe-color-primary)');
    expect(tailwindColorExtensions['primary-light']).toBe('var(--oe-color-primary-light)');
    expect(tailwindColorExtensions.tertiary).toBe('var(--oe-color-tertiary)');
    expect(tailwindColorExtensions.success).toBe('var(--oe-color-success)');
  });
});
