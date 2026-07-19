import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOnlineStatus, onOnlineStatusChange } from '../connectivity.js';

describe('Connectivity detection', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('returns current online status', () => {
    expect(getOnlineStatus()).toBe(true);
    Object.defineProperty(navigator, 'onLine', { value: false });
    expect(getOnlineStatus()).toBe(false);
  });

  it('calls listener on offline event', () => {
    const listener = vi.fn();
    const cleanup = onOnlineStatusChange(listener);

    window.dispatchEvent(new Event('offline'));
    expect(listener).toHaveBeenCalledWith(false);

    cleanup();
  });

  it('calls listener on online event', () => {
    const listener = vi.fn();
    const cleanup = onOnlineStatusChange(listener);

    window.dispatchEvent(new Event('online'));
    expect(listener).toHaveBeenCalledWith(true);

    cleanup();
  });

  it('cleanup removes listener', () => {
    const listener = vi.fn();
    const cleanup = onOnlineStatusChange(listener);

    cleanup();
    window.dispatchEvent(new Event('offline'));
    expect(listener).not.toHaveBeenCalled();
  });
});
