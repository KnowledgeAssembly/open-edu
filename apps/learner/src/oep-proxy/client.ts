export const OEP_PROXY_PATH = '/api/oep-proxy';

export function proxyUrl(targetUrl: string): string {
  return `${OEP_PROXY_PATH}?url=${encodeURIComponent(targetUrl)}`;
}

export type ProxyErrorCode = 'INVALID_URL' | 'UPSTREAM_ERROR' | 'PROXY_ERROR';

export class ProxyFetchError extends Error {
  readonly code: ProxyErrorCode;
  readonly status: number;

  constructor(code: ProxyErrorCode, status: number) {
    super(`Proxy request failed with HTTP ${status} (${code})`);
    this.name = 'ProxyFetchError';
    this.code = code;
    this.status = status;
  }
}

const KNOWN_PROXY_ERROR_CODES: readonly ProxyErrorCode[] = [
  'INVALID_URL',
  'UPSTREAM_ERROR',
  'PROXY_ERROR',
];

export async function proxyFetch(targetUrl: string): Promise<Response> {
  const response = await fetch(proxyUrl(targetUrl));
  if (response.ok) return response;

  let code: ProxyErrorCode = 'PROXY_ERROR';
  try {
    const body = (await response.json()) as { error?: unknown };
    if (
      typeof body.error === 'string' &&
      (KNOWN_PROXY_ERROR_CODES as readonly string[]).includes(body.error)
    ) {
      code = body.error as ProxyErrorCode;
    }
  } catch {
    // non-JSON error body — fall back to a generic proxy error
  }
  throw new ProxyFetchError(code, response.status);
}

export function proxyErrorCode(err: unknown): ProxyErrorCode | null {
  return err instanceof ProxyFetchError ? err.code : null;
}
