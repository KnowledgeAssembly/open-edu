import { describe, it, expect, vi } from 'vitest';
import { createRateLimiter } from './rate-limiter';

interface MockRes {
  statusCode: number;
  setHeader: (key: string, value: string) => void;
  end: (...args: unknown[]) => void;
}

function createMockReq(ip: string): Record<string, unknown> {
  return {
    socket: { remoteAddress: ip },
    url: '/',
    method: 'POST',
    headers: {},
    on: vi.fn(),
  };
}

function createMockRes(): MockRes {
  return {
    statusCode: 200,
    setHeader: vi.fn(),
    end: vi.fn(),
  };
}

describe('createRateLimiter', () => {
  it('allows requests under the limit', () => {
    const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60_000 });
    const req = createMockReq('127.0.0.1');

    for (let i = 0; i < 5; i++) {
      const res = createMockRes();
      const next = vi.fn();
      limiter(req as never, res as never, next);
      expect(next).toHaveBeenCalled();
    }
  });

  it('blocks requests over the limit', () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60_000 });
    const req = createMockReq('10.0.0.1');

    for (let i = 0; i < 3; i++) {
      const res = createMockRes();
      const next = vi.fn();
      limiter(req as never, res as never, next);
      expect(next).toHaveBeenCalled();
    }

    const blockedRes = createMockRes();
    const blockedNext = vi.fn();
    limiter(req as never, blockedRes as never, blockedNext);
    expect(blockedNext).not.toHaveBeenCalled();
    expect(blockedRes.statusCode).toBe(429);
    expect(blockedRes.end).toHaveBeenCalled();
  });

  it('tracks different IPs separately', () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60_000 });
    const req1 = createMockReq('10.0.0.1');
    const req2 = createMockReq('10.0.0.2');

    const res1 = createMockRes();
    const next1 = vi.fn();
    limiter(req1 as never, res1 as never, next1);
    expect(next1).toHaveBeenCalled();

    const res2 = createMockRes();
    const next2 = vi.fn();
    limiter(req2 as never, res2 as never, next2);
    expect(next2).toHaveBeenCalled();
  });

  it('sets rate limit headers', () => {
    const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000 });
    const req = createMockReq('10.0.0.1');
    const res = createMockRes();

    const next = vi.fn();
    limiter(req as never, res as never, next);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '9');
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
  });
});
