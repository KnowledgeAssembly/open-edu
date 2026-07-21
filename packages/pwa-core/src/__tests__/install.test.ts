import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getInstallState, promptInstall } from '../install.js';

describe('Install management', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 13)',
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(display-mode: standalone)' ? false : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
      writable: true,
      configurable: true,
    });
  });

  it('returns install state with expected properties', () => {
    const state = getInstallState();
    expect(state).toHaveProperty('isInstallable');
    expect(state).toHaveProperty('isInstalled');
    expect(state).toHaveProperty('platform');
  });

  it('detects android platform from user agent', () => {
    const state = getInstallState();
    expect(state.platform).toBe('android');
  });

  it('promptInstall returns dismissed when no pending prompt', async () => {
    const result = await promptInstall();
    expect(result.outcome).toBe('dismissed');
  });
});
