// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import {
  isAllowedOrigin,
  assertBodyLimits,
  checkGatewayRateLimit,
  guardedHandler,
  resetGatewayRateLimits,
} from './safeguards.js';
import { GatewayError } from './errors.js';

describe('gateway safeguards', () => {
  beforeEach(() => resetGatewayRateLimits());

  it('allows same-origin requests without an Origin header', () => {
    expect(isAllowedOrigin(undefined, {})).toBe(true);
    expect(isAllowedOrigin('', {})).toBe(true);
  });

  it('rejects origins not in the allowlist', () => {
    expect(
      isAllowedOrigin('https://evil.example', { allowedOrigins: ['https://good.example'] }),
    ).toBe(false);
  });

  it('allows origins explicitly in the allowlist', () => {
    expect(
      isAllowedOrigin('https://good.example', { allowedOrigins: ['https://good.example'] }),
    ).toBe(true);
  });

  it('allows wildcard origins', () => {
    expect(isAllowedOrigin('https://any.example', { allowedOrigins: ['*'] })).toBe(true);
  });

  it('rejects oversized bodies with payload-too-large', () => {
    expect(() => assertBodyLimits('x'.repeat(11), 'req', 10)).toThrow(GatewayError);
    try {
      assertBodyLimits('x'.repeat(11), 'req', 10);
    } catch (err) {
      expect((err as GatewayError).code).toBe('payload-too-large');
      expect((err as GatewayError).status).toBe(413);
    }
  });

  it('enforces the rate limit per IP', () => {
    resetGatewayRateLimits();
    for (let i = 0; i < 3; i++) {
      checkGatewayRateLimit('10.0.0.1', { rateLimitPerMinute: 3 });
    }
    expect(checkGatewayRateLimit('10.0.0.1', { rateLimitPerMinute: 3 })).toBe(true);
    expect(checkGatewayRateLimit('10.0.0.2', { rateLimitPerMinute: 3 })).toBe(false);
  });

  it('guardedHandler returns structured success bodies', async () => {
    const res = await guardedHandler('req-1', {}, () => Promise.resolve({ ok: true }));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('guardedHandler returns safe provider-error bodies without leaking internals', async () => {
    const res = await guardedHandler('req-1', {}, () => {
      throw new Error('openai 401 invalid api key');
    });
    expect(res.status).toBe(500);
    const body = res.body as { error: { code: string; message: string } };
    expect(body.error.code).toBe('provider-error');
    expect(JSON.stringify(body)).not.toMatch(/401|api key/);
  });

  it('guardedHandler maps GatewayErrors with their status and code', async () => {
    const res = await guardedHandler('req-1', {}, () => {
      throw new GatewayError('rate-limited', 'Too many requests', 'req-1', 429);
    });
    expect(res.status).toBe(429);
    expect((res.body as { error: { code: string } }).error.code).toBe('rate-limited');
  });

  it('guardedHandler times out long requests', async () => {
    const res = await guardedHandler(
      'req-1',
      { requestTimeoutMs: 20 },
      () => new Promise((resolve) => setTimeout(resolve, 500)),
    );
    expect(res.status).toBe(500);
    expect((res.body as { error: { code: string } }).error.code).toBe('timeout');
  });
});
