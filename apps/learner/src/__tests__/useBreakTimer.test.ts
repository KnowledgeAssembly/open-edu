import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBreakTimer } from '../useBreakTimer';

const STORAGE_KEY = 'oe-break-timer-settings';

describe('useBreakTimer', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns isTriggered: false and mode: off initially', () => {
    const { result } = renderHook(() => useBreakTimer());
    expect(result.current.isTriggered).toBe(false);
    expect(result.current.mode).toBe('off');
  });

  it('when mode is 15, fires after 15 minutes', () => {
    const fifteenMinMs = 15 * 60 * 1000;
    const { result } = renderHook(() => useBreakTimer());

    act(() => {
      result.current.setMode('15');
    });

    expect(result.current.isTriggered).toBe(false);

    act(() => {
      vi.advanceTimersByTime(fifteenMinMs + 10_000);
    });

    expect(result.current.isTriggered).toBe(true);
  });

  it('when mode is 30, fires after 30 minutes', () => {
    const thirtyMinMs = 30 * 60 * 1000;
    const { result } = renderHook(() => useBreakTimer());

    act(() => {
      result.current.setMode('30');
    });

    expect(result.current.isTriggered).toBe(false);

    act(() => {
      vi.advanceTimersByTime(thirtyMinMs + 10_000);
    });

    expect(result.current.isTriggered).toBe(true);
  });

  it('dismiss resets isTriggered to false', () => {
    const fifteenMinMs = 15 * 60 * 1000;
    const { result } = renderHook(() => useBreakTimer());

    act(() => {
      result.current.setMode('15');
    });

    act(() => {
      vi.advanceTimersByTime(fifteenMinMs + 10_000);
    });

    expect(result.current.isTriggered).toBe(true);

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.isTriggered).toBe(false);
  });

  it('setMode(off) stops the timer', () => {
    const { result } = renderHook(() => useBreakTimer());

    act(() => {
      result.current.setMode('15');
    });

    act(() => {
      result.current.setMode('off');
    });

    act(() => {
      vi.advanceTimersByTime(30 * 60 * 1000);
    });

    expect(result.current.isTriggered).toBe(false);
  });

  it('mode change resets the timer', () => {
    const { result } = renderHook(() => useBreakTimer());

    act(() => {
      result.current.setMode('15');
    });

    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1000);
    });

    act(() => {
      result.current.setMode('30');
    });

    expect(result.current.isTriggered).toBe(false);

    act(() => {
      vi.advanceTimersByTime(16 * 60 * 1000);
    });

    expect(result.current.isTriggered).toBe(false);

    act(() => {
      vi.advanceTimersByTime(14 * 60 * 1000 + 10_000);
    });

    expect(result.current.isTriggered).toBe(true);
  });

  it('localStorage is written when setMode is called', () => {
    const { result } = renderHook(() => useBreakTimer());

    act(() => {
      result.current.setMode('60');
    });

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(saved.mode).toBe('60');
  });
});
