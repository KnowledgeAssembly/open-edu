import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUpdatePrompt } from '../hooks/useUpdatePrompt.js';
import { registerUpdateListener, skipWaiting } from '@open-edu/pwa-core';

vi.mock('@open-edu/pwa-core', () => ({
  registerUpdateListener: vi.fn().mockResolvedValue(vi.fn()),
  skipWaiting: vi.fn().mockResolvedValue(undefined),
  getUpdateState: vi.fn().mockReturnValue({ updateAvailable: false, registration: null }),
}));

describe('useUpdatePrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with no update available', () => {
    const { result } = renderHook(() => useUpdatePrompt());
    expect(result.current.updateAvailable).toBe(false);
  });

  it('provides dismiss and accept functions', () => {
    const { result } = renderHook(() => useUpdatePrompt());
    expect(typeof result.current.dismiss).toBe('function');
    expect(typeof result.current.accept).toBe('function');
  });

  it('dismiss sets updateAvailable to false', () => {
    const { result } = renderHook(() => useUpdatePrompt());
    act(() => {
      result.current.dismiss();
    });
    expect(result.current.updateAvailable).toBe(false);
  });

  it('accept calls skipWaiting', async () => {
    const { result } = renderHook(() => useUpdatePrompt());

    await act(async () => {
      result.current.accept();
    });

    expect(skipWaiting).toHaveBeenCalled();
  });

  it('registers an update listener on mount', () => {
    renderHook(() => useUpdatePrompt());
    expect(registerUpdateListener).toHaveBeenCalled();
  });
});
