import type { IncomingMessage, ServerResponse } from 'node:http';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: {
  maxRequests: number;
  windowMs: number;
}): (req: IncomingMessage, res: ServerResponse, next: () => void) => void {
  const { maxRequests, windowMs } = options;
  const store = new Map<string, RateLimitEntry>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const ip = req.socket.remoteAddress ?? 'unknown';
    const now = Date.now();
    let entry = store.get(ip);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(ip, entry);
    }

    entry.count++;

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - entry.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > maxRequests) {
      res.statusCode = 429;
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      res.end(
        JSON.stringify({ error: 'Too many requests. Try again later.', code: 'RATE_LIMITED' }),
      );
      return;
    }

    next();
  };
}
