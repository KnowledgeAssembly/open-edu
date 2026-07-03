import { describe, it, expect } from 'vitest';
import {
  iconSizeScale,
  iconStrokeScale,
  iconSizeTokenToCssVar,
  tailwindIconSizeExtensions,
} from '../icons';

describe('icon tokens', () => {
  it('has size scale', () => {
    expect(iconSizeScale['sm']).toBe('16px');
    expect(iconSizeScale['lg']).toBe('24px');
  });

  it('has stroke scale', () => {
    expect(iconStrokeScale['regular']).toBe('1.5');
  });

  it('generates CSS var references', () => {
    expect(iconSizeTokenToCssVar('sm')).toBe('var(--oe-icon-size-sm)');
  });

  it('tailwind extensions map correctly', () => {
    expect(tailwindIconSizeExtensions['sm']).toBe('16px');
  });
});
