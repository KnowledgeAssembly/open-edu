import { describe, it, expect } from 'vitest';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, isValidLocale } from './locale.js';

describe('locale', () => {
  it('has English as the default locale', () => {
    expect(DEFAULT_LOCALE).toBe('en');
  });

  it('includes English in supported locales', () => {
    expect(SUPPORTED_LOCALES).toContain('en');
  });

  it('validates known locales', () => {
    expect(isValidLocale('en')).toBe(true);
    expect(isValidLocale('hi')).toBe(true);
    expect(isValidLocale('or')).toBe(true);
  });

  it('rejects unknown locales', () => {
    expect(isValidLocale('fr')).toBe(false);
    expect(isValidLocale('')).toBe(false);
    expect(isValidLocale('EN')).toBe(false);
  });

  it('returns all locale codes as an array', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'hi', 'or']);
  });
});
