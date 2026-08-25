import { describe, it, expect } from 'vitest';
import {
  clampResizeHeight,
  createRateLimiter,
  MIN_IFRAME_HEIGHT,
  MAX_IFRAME_HEIGHT,
  MAX_MESSAGES_PER_MINUTE,
  isSandboxWidgetsEnabled,
} from './sandbox-limits';

describe('clampResizeHeight', () => {
  it('clamps below the minimum', () => {
    expect(clampResizeHeight(10)).toBe(MIN_IFRAME_HEIGHT);
  });

  it('clamps above the maximum', () => {
    expect(clampResizeHeight(9999)).toBe(MAX_IFRAME_HEIGHT);
  });

  it('rounds fractional heights', () => {
    expect(clampResizeHeight(240.6)).toBe(241);
    expect(clampResizeHeight(240.2)).toBe(240);
  });

  it('passes through in-range values', () => {
    expect(clampResizeHeight(400)).toBe(400);
  });
});

describe('createRateLimiter', () => {
  it('allows up to the limit within a 60s window then denies', () => {
    const limiter = createRateLimiter(3);
    const now = 1_000_000;
    expect(limiter.allow(now)).toBe(true);
    expect(limiter.allow(now + 1000)).toBe(true);
    expect(limiter.allow(now + 2000)).toBe(true);
    expect(limiter.allow(now + 3000)).toBe(false);
    expect(limiter.allow(now + 30_000)).toBe(false);
  });

  it('allows again after the 60s window passes', () => {
    const limiter = createRateLimiter(2);
    const now = 1_000_000;
    expect(limiter.allow(now)).toBe(true);
    expect(limiter.allow(now + 1000)).toBe(true);
    expect(limiter.allow(now + 2000)).toBe(false);
    expect(limiter.allow(now + 61_000)).toBe(true);
  });

  it('uses the default per-minute limit', () => {
    const limiter = createRateLimiter();
    const now = 1_000_000;
    for (let i = 0; i < MAX_MESSAGES_PER_MINUTE; i += 1) {
      expect(limiter.allow(now + i)).toBe(true);
    }
    expect(limiter.allow(now + MAX_MESSAGES_PER_MINUTE)).toBe(false);
  });
});

describe('isSandboxWidgetsEnabled', () => {
  it('is false by default', () => {
    delete (globalThis as { __OPEN_EDU_SANDBOX_WIDGETS__?: boolean }).__OPEN_EDU_SANDBOX_WIDGETS__;
    expect(isSandboxWidgetsEnabled()).toBe(false);
  });

  it('is true when the flag is explicitly enabled', () => {
    (globalThis as { __OPEN_EDU_SANDBOX_WIDGETS__?: boolean }).__OPEN_EDU_SANDBOX_WIDGETS__ = true;
    expect(isSandboxWidgetsEnabled()).toBe(true);
    delete (globalThis as { __OPEN_EDU_SANDBOX_WIDGETS__?: boolean }).__OPEN_EDU_SANDBOX_WIDGETS__;
  });
});
