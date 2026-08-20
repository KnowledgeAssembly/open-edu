export type GatewayErrorCode =
  | 'invalid-request'
  | 'missing-config'
  | 'provider-error'
  | 'generation-error'
  | 'rate-limited'
  | 'origin-not-allowed'
  | 'timeout'
  | 'payload-too-large'
  | 'unsupported-method';

export class GatewayError extends Error {
  public readonly code: GatewayErrorCode;
  public readonly status: number;
  public readonly requestId: string;

  constructor(code: GatewayErrorCode, message: string, requestId: string, status = 400) {
    super(message);
    this.name = 'GatewayError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

/**
 * Build a safe, client-facing structured error. Never includes provider
 * keys, raw provider errors, stack traces, temporary paths, or host
 * filesystem roots.
 */
export function safeErrorBody(
  requestId: string,
  code: GatewayErrorCode,
  message: string,
): Record<string, unknown> {
  return {
    requestId,
    error: {
      code,
      message,
    },
  };
}

export function isGatewayError(err: unknown): err is GatewayError {
  return err instanceof GatewayError;
}

/**
 * Classify an internal error into a safe, client-facing message. Provider
 * errors are collapsed to a generic retryable message so no internal detail
 * leaks to the browser.
 */
export function classifyGatewayError(requestId: string, err: unknown, status = 500): GatewayError {
  if (err instanceof GatewayError) return err;

  const name = (err as { name?: string }).name ?? '';
  const msg = String((err as Error).message ?? '');
  const code: GatewayErrorCode =
    name === 'AbortError' || /timeout|timed out/i.test(msg)
      ? 'timeout'
      : 'provider-error';

  return new GatewayError(
    code,
    code === 'timeout'
      ? 'The request timed out. The AI provider may be experiencing high load. Try again with a shorter input.'
      : 'The AI provider could not be reached.',
    requestId,
    status,
  );
}
