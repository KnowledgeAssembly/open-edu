import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInstallPrompt } from '../hooks/useInstallPrompt.js';
import { getInstallState, promptInstall } from '@open-edu/pwa-core';

vi.mock('@open-edu/pwa-core', () => ({
  getInstallState: vi.fn().mockReturnValue({
    isInstallable: false,
    isInstalled: false,
    platform: 'desktop',
  }),
  promptInstall: vi.fn().mockResolvedValue({ outcome: 'dismissed' }),
}));

describe('useInstallPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns install state from pwa-core', () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isInstallable).toBe(false);
    expect(result.current.isInstalled).toBe(false);
    expect(result.current.platform).toBe('desktop');
  });

  it('provides install function', () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(typeof result.current.install).toBe('function');
  });

  it('calls promptInstall when install is invoked', async () => {
    const { result } = renderHook(() => useInstallPrompt());

    await act(async () => {
      await result.current.install();
    });

    expect(promptInstall).toHaveBeenCalled();
  });

  it('refreshes state after install', async () => {
    vi.mocked(getInstallState)
      .mockReturnValueOnce({ isInstallable: true, isInstalled: false, platform: 'desktop' })
      .mockReturnValueOnce({ isInstallable: false, isInstalled: true, platform: 'desktop' });

    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isInstallable).toBe(true);
    expect(result.current.isInstalled).toBe(false);

    await act(async () => {
      await result.current.install();
    });

    expect(result.current.isInstalled).toBe(true);
  });

  it('polls for install state changes', async () => {
    vi.useFakeTimers();

    vi.mocked(getInstallState)
      .mockReturnValueOnce({ isInstallable: false, isInstalled: false, platform: 'desktop' })
      .mockReturnValueOnce({ isInstallable: true, isInstalled: false, platform: 'desktop' });

    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isInstallable).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.isInstallable).toBe(true);

    vi.useRealTimers();
  });
});
