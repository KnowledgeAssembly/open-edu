import { describe, it, expect } from 'vitest';
import { themeRegistry, getTheme, themeIds, defaultThemeId, DEFAULT_THEME } from '../index';
import type { ThemeId } from '../types';

describe('theme registry', () => {
  it('contains exactly 4 themes', () => {
    expect(Object.keys(themeRegistry).length).toBe(4);
  });

  it('contains all expected theme IDs', () => {
    expect(themeRegistry).toHaveProperty('high-focus');
    expect(themeRegistry).toHaveProperty('lumina-scholastica');
    expect(themeRegistry).toHaveProperty('nocturnal');
    expect(themeRegistry).toHaveProperty('sylvan-workspace');
  });

  it('getTheme returns the correct definition for each theme', () => {
    expect(getTheme('high-focus').id).toBe('high-focus');
    expect(getTheme('lumina-scholastica').id).toBe('lumina-scholastica');
    expect(getTheme('nocturnal').id).toBe('nocturnal');
    expect(getTheme('sylvan-workspace').id).toBe('sylvan-workspace');
  });

  it('getTheme throws for unknown theme ID', () => {
    expect(() => getTheme('unknown' as string as ThemeId)).toThrow('Unknown theme');
  });

  it('themeIds lists all 4 themes', () => {
    expect(themeIds).toEqual(['high-focus', 'lumina-scholastica', 'nocturnal', 'sylvan-workspace']);
  });

  it('defaultThemeId is lumina-scholastica', () => {
    expect(defaultThemeId).toBe('lumina-scholastica');
  });

  it('DEFAULT_THEME matches the default theme', () => {
    expect(DEFAULT_THEME.id).toBe(defaultThemeId);
  });
});
