import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUpdatePrompt } from '../hooks/useUpdatePrompt.js';
import { registerUpdateListener, skipWaiting, type UpdateState } from '@open-edu/pwa-core';

vi.mock('@open-edu/pwa-core', () => ({
  registerUpdateListener: vi.fn().mockResolvedValue(vi.fn()),
  skipWaiting: vi.fn().mockResolvedValue(undefined),
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

  it('transitions to update available when listener fires', async () => {
    let listenerCb: (state: UpdateState) => void = () => {};
    vi.mocked(registerUpdateListener).mockImplementation((cb: (state: UpdateState) => void) => {
      listenerCb = cb;
      return Promise.resolve(vi.fn());
    });

    const { result } = renderHook(() => useUpdatePrompt());
    expect(result.current.updateAvailable).toBe(false);

    await act(async () => {
      listenerCb({ updateAvailable: true, registration: null });
    });

    expect(result.current.updateAvailable).toBe(true);
  });
});
