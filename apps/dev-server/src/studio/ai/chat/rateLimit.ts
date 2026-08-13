interface RateWindow {
  count: number;
  resetAt: number;
}

/**
 * In-memory soft rate limiter for Studio AI chat requests, keyed by
 * conversation/session id. Lives in the Vite process; reset on restart.
 * Configurable via OPEN_EDU_STUDIO_AI_RATE_LIMIT (requests per minute).
 */
const windows = new Map<string, RateWindow>();

export function checkRateLimit(
  sessionKey: string | undefined,
  options: { limit?: number; windowMs?: number } = {},
): boolean {
  const configured = Number(process.env.OPEN_EDU_STUDIO_AI_RATE_LIMIT);
  const limit = Number.isFinite(configured) && configured > 0 ? configured : (options.limit ?? 120);
  const windowMs = options.windowMs ?? 60_000;
  const key = sessionKey || 'anonymous';
  const now = Date.now();

  const existing = windows.get(key);
  if (!existing || now >= existing.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  existing.count += 1;
  return existing.count > limit;
}

/** Test-only reset so windows do not leak across test cases. */
export function resetRateLimits(): void {
  windows.clear();
}
