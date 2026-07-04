import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThemePreference } from '../useThemePreference.js';

const STORAGE_KEY = 'oe-theme-preference';

describe('useThemePreference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default theme when localStorage is empty', () => {
    const { result } = renderHook(() => useThemePreference());
    expect(result.current[0]).toBe('lumina-scholastica');
  });

  it('reads persisted value from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'nocturnal');
    const { result } = renderHook(() => useThemePreference());
    expect(result.current[0]).toBe('nocturnal');
  });

  it('setTheme writes to localStorage and updates state', () => {
    const { result } = renderHook(() => useThemePreference());
    expect(result.current[0]).toBe('lumina-scholastica');

    act(() => {
      result.current[1]('zen');
    });

    expect(result.current[0]).toBe('zen');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('zen');
  });

  it('falls back to default for invalid stored values', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid-theme');
    const { result } = renderHook(() => useThemePreference());
    expect(result.current[0]).toBe('lumina-scholastica');
  });

  it('falls back to default for deleted theme IDs', () => {
    localStorage.setItem(STORAGE_KEY, 'forest');
    const { result } = renderHook(() => useThemePreference());
    expect(result.current[0]).toBe('lumina-scholastica');
  });

  it('handles corrupted localStorage gracefully', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage error');
    });

    const { result } = renderHook(() => useThemePreference());
    expect(result.current[0]).toBe('lumina-scholastica');

    getItemSpy.mockRestore();
  });
});
