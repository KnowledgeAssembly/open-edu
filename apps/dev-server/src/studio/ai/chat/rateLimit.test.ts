import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, resetRateLimits } from './rateLimit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  afterEach(() => {
    resetRateLimits();
  });

  it('allows first request', () => {
    expect(checkRateLimit('session-1')).toBe(false);
  });

  it('blocks after limit exceeded', () => {
    // limit=3, windowMs=10000
    expect(checkRateLimit('session-1', { limit: 3, windowMs: 10000 })).toBe(false);
    expect(checkRateLimit('session-1', { limit: 3, windowMs: 10000 })).toBe(false);
    expect(checkRateLimit('session-1', { limit: 3, windowMs: 10000 })).toBe(false);
    // 4th triggers
    expect(checkRateLimit('session-1', { limit: 3, windowMs: 10000 })).toBe(true);
  });

  it('resets after window expires', async () => {
    expect(checkRateLimit('session-2', { limit: 1, windowMs: 50 })).toBe(false);
    expect(checkRateLimit('session-2', { limit: 1, windowMs: 50 })).toBe(true);
    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 60));
    expect(checkRateLimit('session-2', { limit: 1, windowMs: 50 })).toBe(false);
  });

  it('uses anonymous key for undefined session', () => {
    expect(checkRateLimit(undefined, { limit: 1, windowMs: 10000 })).toBe(false);
    expect(checkRateLimit(undefined, { limit: 1, windowMs: 10000 })).toBe(true);
  });

  it('different sessions have independent counters', () => {
    checkRateLimit('a', { limit: 2, windowMs: 10000 });
    checkRateLimit('a', { limit: 2, windowMs: 10000 });
    expect(checkRateLimit('a', { limit: 2, windowMs: 10000 })).toBe(true);
    expect(checkRateLimit('b', { limit: 2, windowMs: 10000 })).toBe(false);
  });
});
