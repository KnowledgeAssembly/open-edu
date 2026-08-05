import { describe, it, expect, beforeEach } from 'vitest';
import { getStudioMode, setStudioMode, STUDIO_MODE_KEY } from './modeStorage';

describe('modeStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    delete (globalThis as Record<string, unknown>).OPEN_EDU_STUDIO_MODE;
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

  it('respects OPEN_EDU_STUDIO_MODE developer override', () => {
    (globalThis as Record<string, unknown>).OPEN_EDU_STUDIO_MODE = 'developer';
    expect(getStudioMode()).toBe('developer');
  });

  it('respects OPEN_EDU_STUDIO_MODE creator override even when developer was persisted', () => {
    setStudioMode('developer');
    (globalThis as Record<string, unknown>).OPEN_EDU_STUDIO_MODE = 'creator';
    expect(getStudioMode()).toBe('creator');
  });

  it('ignores invalid OPEN_EDU_STUDIO_MODE values', () => {
    (globalThis as Record<string, unknown>).OPEN_EDU_STUDIO_MODE = 'nope';
    expect(getStudioMode()).toBe('creator');
  });
});
