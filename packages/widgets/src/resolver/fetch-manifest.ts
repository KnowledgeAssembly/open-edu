const RETRY_DELAY_MS = 200;
const DEFAULT_JSON_TIMEOUT_MS = 10_000;

export type FetchTimeoutError = { kind: 'timeout' };

export function isFetchTimeout(err: unknown): err is FetchTimeoutError {
  return typeof err === 'object' && err !== null && (err as { kind?: unknown }).kind === 'timeout';
}

export async function fetchBytes(
  url: string,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch,
): Promise<ArrayBuffer> {
  const doFetch = async (): Promise<ArrayBuffer> => {
    const res = await fetchImpl(url, init);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.arrayBuffer();
  };
  try {
    return await doFetch();
  } catch (err) {
    if (err && typeof err === 'object' && (err as { name?: string }).name === 'AbortError') {
      throw Object.assign(new Error('request timed out'), { kind: 'timeout' });
    }
    if (err instanceof TypeError) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return await doFetch();
    }
    throw err;
  }
}

export async function fetchJson<T = unknown>(
  url: string,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const withTimeout: RequestInit = init.signal
    ? init
    : { ...init, signal: AbortSignal.timeout(DEFAULT_JSON_TIMEOUT_MS) };
  const bytes = await fetchBytes(url, withTimeout, fetchImpl);
  const text = new TextDecoder().decode(bytes);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON from ${url}`);
  }
}
