import { describe, it, expect } from 'vitest';
import { palette, flattenColorTokens, colorTokenToCssVar } from '../colors.js';

describe('color tokens', () => {
  it('exports palette with all base colors', () => {
    expect(palette.white).toBe('#ffffff');
    expect(palette.purple30).toBe('#6750a4');
  });

  it('flattenColorTokens flattens nested structure', () => {
    const result = flattenColorTokens({ base: { primary: '#000' } });
    expect(result['base-primary']).toBe('#000');
  });

  it('colorTokenToCssVar produces correct CSS variable string', () => {
    expect(colorTokenToCssVar('primary')).toBe('var(--oe-color-primary)');
    expect(colorTokenToCssVar('on-surface')).toBe('var(--oe-color-on-surface)');
  });
});
