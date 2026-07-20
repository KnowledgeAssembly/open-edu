import { describe, it, expect } from 'vitest';
import { getDirection } from './direction.js';

describe('getDirection', () => {
  it('returns ltr for English', () => {
    expect(getDirection('en')).toBe('ltr');
  });

  it('returns ltr for Hindi', () => {
    expect(getDirection('hi')).toBe('ltr');
  });

  it('returns ltr for Odia', () => {
    expect(getDirection('or')).toBe('ltr');
  });

  it('returns rtl for Urdu (future)', () => {
    expect(getDirection('ur')).toBe('rtl');
  });
});
