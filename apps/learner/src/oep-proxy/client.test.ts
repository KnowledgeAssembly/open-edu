import { describe, it, expect, vi, afterEach } from 'vitest';
import { proxyFetch, proxyErrorCode } from './client.js';

describe('proxyFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the response for a successful proxy request', async () => {
    const response = new Response('ok', { status: 200 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    await expect(proxyFetch('https://github.com/x/a.oep')).resolves.toBe(response);
  });

  it('throws a ProxyFetchError with the proxy error code for a JSON error body', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: 'INVALID_URL', message: 'x' }), { status: 400 }),
        ),
    );
    const err = (await proxyFetch('http://localhost/x').catch((e: unknown) => e)) as unknown;
    expect(proxyErrorCode(err)).toBe('INVALID_URL');
    expect(err).toBeInstanceOf(Error);
  });

  it('falls back to PROXY_ERROR for a non-JSON error body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not json', { status: 502 })));
    const err = (await proxyFetch('https://github.com/x/a.oep').catch(
      (e: unknown) => e,
    )) as unknown;
    expect(proxyErrorCode(err)).toBe('PROXY_ERROR');
  });

  it('returns null for non-proxy errors', () => {
    expect(proxyErrorCode(new Error('boom'))).toBeNull();
  });
});
