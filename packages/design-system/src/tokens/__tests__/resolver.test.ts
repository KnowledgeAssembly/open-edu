import { describe, it, expect } from 'vitest';
import { token, tokenVar } from '../resolver';

describe('token()', () => {
  it('returns CSS variable reference for known color path', () => {
    expect(token('color.primary')).toBe('var(--oe-color-primary)');
  });

  it('returns CSS variable reference for spacing path', () => {
    expect(token('spacing.md')).toBe('var(--oe-space-md)');
  });

  it('returns CSS variable reference for radius path', () => {
    expect(token('radius.full')).toBe('var(--oe-radius-full)');
  });

  it('throws for unknown token path', () => {
    expect(() => token('color.neon-pink')).toThrow('Unknown token path');
  });
});

describe('tokenVar()', () => {
  it('returns raw CSS variable name without var() wrapper', () => {
    expect(tokenVar('color.primary')).toBe('--oe-color-primary');
  });

  it('returns raw variable for spacing', () => {
    expect(tokenVar('spacing.lg')).toBe('--oe-space-lg');
  });

  it('throws for unknown token path', () => {
    expect(() => tokenVar('color.neon-pink')).toThrow('Unknown token path');
  });
});
