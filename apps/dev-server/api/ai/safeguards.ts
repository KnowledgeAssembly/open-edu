import { GatewayError, safeErrorBody, isGatewayError, classifyGatewayError } from './errors.js';
import {
  MAX_REQUEST_BODY_BYTES,
  MAX_RESPONSE_BYTES,
  ALLOWED_MODELS,
  ALLOWED_PROVIDERS,
} from './requestSchema.js';

export interface GatewaySafeguardOptions {
  allowedOrigins?: string[];
  requestTimeoutMs?: number;
  perRequestBudgetUsd?: number;
  rateLimitPerMinute?: number;
}

export class RequestBudgetExceededError extends Error {}

export class GatewayRateLimitError extends Error {}

const windows = new Map<string, { count: number; resetAt: number }>();

/**
 * Platform-compatible soft rate limiter keyed by IP. In serverless this is
 * best-effort (per-instance memory). The plan requires per-request cost bounds
 * as the reliable control; the limiter is an additional best-effort guard and
 * never a replacement for cost limits.
 */
export function checkGatewayRateLimit(
  ip: string | undefined,
  opts: GatewaySafeguardOptions,
): boolean {
  const configured = Number(process.env.OPEN_EDU_GATEWAY_RATE_LIMIT);
  const limit = Number.isFinite(configured) ? configured : (opts.rateLimitPerMinute ?? 60);
  const windowMs = 60_000;
  const key = ip || 'anonymous';
  const now = Date.now();
  const entry = windows.get(key);
  if (!entry || now >= entry.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

export function isAllowedOrigin(
  origin: string | undefined,
  opts: GatewaySafeguardOptions,
): boolean {
  if (!origin) return true; // non-browser / same-origin requests
  const allowed = opts.allowedOrigins;
  if (!allowed || allowed.length === 0) return false;
  return allowed.includes(origin) || allowed.includes('*');
}

export function readBody(req: { body: unknown }): unknown {
  return req.body;
}

export function assertBodyLimits(
  body: unknown,
  requestId: string,
  maxBytes = MAX_REQUEST_BODY_BYTES,
): void {
  const size = JSON.stringify(body ?? {}).length;
  if (size > maxBytes) {
    throw new GatewayError(
      'payload-too-large',
      'Request body exceeds the size limit.',
      requestId,
      413,
    );
  }
}

/**
 * Wrap a synchronous handler with timeout, budget enforcement, and safe-error
 * serialization. Returns a structured success or error body, never throwing.
 */
export async function guardedHandler(
  requestId: string,
  opts: GatewaySafeguardOptions,
  fn: () => Promise<unknown>,
): Promise<{ status: number; body: unknown }> {
  const timeoutMs =
    opts.requestTimeoutMs ?? Number(process.env.OPEN_EDU_GATEWAY_TIMEOUT_MS ?? 25_000);
  const budgetUsd =
    opts.perRequestBudgetUsd ?? Number(process.env.OPEN_EDU_GATEWAY_BUDGET_USD ?? 5);

  if (budgetUsd <= 0) {
    return {
      status: 503,
      body: safeErrorBody(requestId, 'missing-config', 'AI is not configured.'),
    };
  }

  try {
    const result = await withTimeout(fn(), timeoutMs);
    const serialized = JSON.stringify(result ?? {});
    if (serialized.length > MAX_RESPONSE_BYTES) {
      return {
        status: 422,
        body: safeErrorBody(requestId, 'generation-error', 'Response is too large.'),
      };
    }
    return { status: 200, body: result };
  } catch (err) {
    if (err instanceof GatewayRateLimitError) {
      return {
        status: 429,
        body: safeErrorBody(requestId, 'rate-limited', 'Too many requests. Try again shortly.'),
      };
    }
    if (err instanceof RequestBudgetExceededError) {
      return {
        status: 429,
        body: safeErrorBody(requestId, 'rate-limited', 'Request budget exceeded.'),
      };
    }
    if (isGatewayError(err)) {
      return { status: err.status, body: safeErrorBody(requestId, err.code, err.message) };
    }
    const classified = classifyGatewayError(requestId, err);
    return {
      status: classified.status,
      body: safeErrorBody(requestId, classified.code, classified.message),
    };
  }
}

/**
 * Validate that a model identifier is in the configured allowlist. If
 * OPEN_EDU_GATEWAY_ALLOWED_MODELS is set, only those models are permitted.
 * Otherwise, all models in ALLOWED_MODELS are allowed.
 */
export function isAllowedModel(model: string | undefined): boolean {
  if (!model) return true;
  const envList = process.env.OPEN_EDU_GATEWAY_ALLOWED_MODELS;
  const allowed = envList ? envList.split(',').map((m) => m.trim()) : ALLOWED_MODELS;
  return allowed.includes(model);
}

export function isAllowedProvider(provider: string | undefined): boolean {
  if (!provider) return true;
  const envList = process.env.OPEN_EDU_GATEWAY_ALLOWED_PROVIDERS;
  const allowed = envList ? envList.split(',').map((value) => value.trim()) : ALLOWED_PROVIDERS;
  return allowed.includes(provider);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  if (!ms || ms <= 0) return promise;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      const t = setTimeout(() => reject(new Error('request timed out')), ms);
      t.unref?.();
    }),
  ]);
}

export function resetGatewayRateLimits(): void {
  windows.clear();
}
