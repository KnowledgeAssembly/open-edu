export const READY_TIMEOUT_MS = 10_000;
export const MAX_MESSAGES_PER_MINUTE = 120;
export const MIN_IFRAME_HEIGHT = 120;
export const MAX_IFRAME_HEIGHT = 1200;

export function clampResizeHeight(height: number): number {
  return Math.min(MAX_IFRAME_HEIGHT, Math.max(MIN_IFRAME_HEIGHT, Math.round(height)));
}

export function createRateLimiter(limit = MAX_MESSAGES_PER_MINUTE) {
  const stamps: number[] = [];
  return {
    allow(now = Date.now()): boolean {
      const windowStart = now - 60_000;
      while (stamps.length && stamps[0]! < windowStart) stamps.shift();
      if (stamps.length >= limit) return false;
      stamps.push(now);
      return true;
    },
  };
}

export function isSandboxWidgetsEnabled(): boolean {
  return (
    (globalThis as { __OPEN_EDU_SANDBOX_WIDGETS__?: boolean }).__OPEN_EDU_SANDBOX_WIDGETS__ === true
  );
}
