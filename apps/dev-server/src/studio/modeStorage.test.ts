import { describe, it, expect, beforeEach } from 'vitest';
import { getStudioMode, setStudioMode, STUDIO_MODE_KEY } from './modeStorage';

describe('modeStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to creator', () => {
    expect(getStudioMode()).toBe('creator');
  });

  it('persists developer mode', () => {
    setStudioMode('developer');
    expect(localStorage.getItem(STUDIO_MODE_KEY)).toBe('developer');
    expect(getStudioMode()).toBe('developer');
  });

  it('ignores invalid stored values', () => {
    localStorage.setItem(STUDIO_MODE_KEY, 'nope');
    expect(getStudioMode()).toBe('creator');
  });
});
