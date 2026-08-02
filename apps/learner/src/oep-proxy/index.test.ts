import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { lookup } from 'node:dns/promises';
import type { LookupAddress } from 'node:dns';
import {
  OEP_PROXY_PATH,
  oepProxyHandler,
  parseProxyTarget,
  isBlockedProxyTarget,
  isPrivateIp,
  assertPublicTarget,
  ProxyValidationError,
} from './index.js';
import { proxyUrl } from './client.js';
import { createMockRes, mockRequest } from './test-helpers.js';

vi.mock('node:dns/promises', () => {
  const lookup = vi.fn();
  return { default: { lookup }, lookup };
});

const lookupMock = vi.mocked(lookup) as unknown as Mock<
  [hostname: string, options?: { all: true; verbatim?: boolean }],
  Promise<LookupAddress[]>
>;

describe('isBlockedProxyTarget', () => {
  it('blocks localhost and loopback addresses', () => {
    expect(isBlockedProxyTarget('localhost')).toBe(true);
    expect(isBlockedProxyTarget('127.0.0.1')).toBe(true);
    expect(isBlockedProxyTarget('::1')).toBe(true);
  });

  it('blocks private and link-local ranges', () => {
    expect(isBlockedProxyTarget('10.0.0.5')).toBe(true);
    expect(isBlockedProxyTarget('192.168.1.20')).toBe(true);
    expect(isBlockedProxyTarget('169.254.169.254')).toBe(true);
    expect(isBlockedProxyTarget('172.16.0.1')).toBe(true);
    expect(isBlockedProxyTarget('172.31.255.255')).toBe(true);
  });

  it('allows public hosts', () => {
    expect(isBlockedProxyTarget('github.com')).toBe(false);
    expect(isBlockedProxyTarget('objects.githubusercontent.com')).toBe(false);
    expect(isBlockedProxyTarget('172.15.0.1')).toBe(false);
    expect(isBlockedProxyTarget('172.32.0.1')).toBe(false);
  });
});

describe('parseProxyTarget', () => {
  beforeEach(() => {
    vi.stubEnv('OEP_PROXY_ALLOW_PRIVATE', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('parses a valid https target', () => {
    const target = parseProxyTarget(
      `${OEP_PROXY_PATH}?url=${encodeURIComponent('https://github.com/x/a.oep')}`,
    );
    expect(target?.href).toBe('https://github.com/x/a.oep');
  });

  it('returns null when the url param is missing', () => {
    expect(parseProxyTarget(OEP_PROXY_PATH)).toBeNull();
  });

  it('returns null for non-http(s) protocols', () => {
    expect(
      parseProxyTarget(`${OEP_PROXY_PATH}?url=${encodeURIComponent('ftp://x/a.oep')}`),
    ).toBeNull();
    expect(
      parseProxyTarget(`${OEP_PROXY_PATH}?url=${encodeURIComponent('file:///etc/passwd')}`),
    ).toBeNull();
  });

  it('returns null for blocked private hosts', () => {
    expect(
      parseProxyTarget(
        `${OEP_PROXY_PATH}?url=${encodeURIComponent('http://localhost:9000/cat.json')}`,
      ),
    ).toBeNull();
    expect(
      parseProxyTarget(
        `${OEP_PROXY_PATH}?url=${encodeURIComponent('http://169.254.169.254/meta')}`,
      ),
    ).toBeNull();
  });

  it('allows private hosts when OEP_PROXY_ALLOW_PRIVATE is enabled', () => {
    vi.stubEnv('OEP_PROXY_ALLOW_PRIVATE', 'true');
    expect(
      parseProxyTarget(
        `${OEP_PROXY_PATH}?url=${encodeURIComponent('http://localhost:9000/cat.json')}`,
      ),
    ).not.toBeNull();
  });
});

describe('isPrivateIp', () => {
  it('blocks IPv6 loopback and unspecified addresses', () => {
    expect(isPrivateIp('::1')).toBe(true);
    expect(isPrivateIp('::')).toBe(true);
  });

  it('blocks IPv6 unique-local addresses (fc00::/7)', () => {
    expect(isPrivateIp('fd00::1')).toBe(true);
    expect(isPrivateIp('fc00::')).toBe(true);
  });

  it('blocks IPv6 link-local addresses (fe80::/10)', () => {
    expect(isPrivateIp('fe80::1')).toBe(true);
    expect(isPrivateIp('fe90::1')).toBe(true);
    expect(isPrivateIp('febf::1')).toBe(true);
  });

  it('blocks IPv4-mapped private IPv6 addresses', () => {
    expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateIp('::ffff:192.168.1.1')).toBe(true);
  });

  it('allows public IPv6 addresses', () => {
    expect(isPrivateIp('2606:4700::1111')).toBe(false);
  });

  it('delegates IPv4 addresses to isBlockedProxyTarget', () => {
    expect(isPrivateIp('10.0.0.1')).toBe(true);
    expect(isPrivateIp('172.16.0.1')).toBe(true);
    expect(isPrivateIp('140.82.112.4')).toBe(false);
  });
});

describe('assertPublicTarget', () => {
  beforeEach(() => {
    vi.stubEnv('OEP_PROXY_ALLOW_PRIVATE', '');
    lookupMock.mockReset();
  });

  it('rejects a hostname that resolves to a private address', async () => {
    lookupMock.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
    await expect(
      assertPublicTarget(new URL('https://spoofed.example.com/a.oep')),
    ).rejects.toBeInstanceOf(ProxyValidationError);
  });

  it('rejects a literal private address', async () => {
    await expect(assertPublicTarget(new URL('http://169.254.169.254/meta'))).rejects.toBeInstanceOf(
      ProxyValidationError,
    );
  });

  it('resolves for a public hostname', async () => {
    lookupMock.mockResolvedValue([{ address: '140.82.112.4', family: 4 }]);
    await expect(
      assertPublicTarget(new URL('https://github.com/x/a.oep')),
    ).resolves.toBeUndefined();
  });

  it('skips the check when OEP_PROXY_ALLOW_PRIVATE is enabled', async () => {
    vi.stubEnv('OEP_PROXY_ALLOW_PRIVATE', 'true');
    lookupMock.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
    await expect(
      assertPublicTarget(new URL('https://spoofed.example.com/a.oep')),
    ).resolves.toBeUndefined();
  });
});

describe('oepProxyHandler', () => {
  beforeEach(() => {
    vi.stubEnv('OEP_PROXY_ALLOW_PRIVATE', '');
    globalThis.fetch = vi.fn();
    lookupMock.mockResolvedValue([{ address: '140.82.112.4', family: 4 }]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('calls next for non-proxy paths', () => {
    const res = createMockRes();
    const next = vi.fn();
    oepProxyHandler(mockRequest('/catalog'), res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('calls next for a prefix-only path that is not the proxy endpoint', () => {
    const res = createMockRes();
    const next = vi.fn();
    oepProxyHandler(mockRequest('/api/oep-proxy-foo?url=x'), res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when the target resolves to a private address', async () => {
    lookupMock.mockResolvedValueOnce([{ address: '10.0.0.5', family: 4 }]);
    const res = createMockRes();
    oepProxyHandler(
      mockRequest(
        `${OEP_PROXY_PATH}?url=${encodeURIComponent('https://spoofed.example.com/x.oep')}`,
      ),
      res,
      () => {},
    );
    await vi.waitFor(() => expect(res.writableEnded).toBe(true));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('INVALID_URL');
  });

  it('follows public redirects and streams the final response', async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: 'https://objects.githubusercontent.com/x/a.oep' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('redirected-bytes'));
              controller.close();
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/octet-stream' } },
        ),
      );

    const res = createMockRes();
    oepProxyHandler(
      mockRequest(`${OEP_PROXY_PATH}?url=${encodeURIComponent('https://github.com/x/a.oep')}`),
      res,
      () => {},
    );
    await vi.waitFor(() => expect(res.writableEnded).toBe(true));

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('redirected-bytes');
  });

  it('blocks a redirect to a private host', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: 'http://169.254.169.254/meta' },
      }),
    );

    const res = createMockRes();
    oepProxyHandler(
      mockRequest(`${OEP_PROXY_PATH}?url=${encodeURIComponent('https://github.com/x/a.oep')}`),
      res,
      () => {},
    );
    await vi.waitFor(() => expect(res.writableEnded).toBe(true));

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('INVALID_URL');
  });

  it('blocks a redirect to a non-http protocol', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(null, { status: 302, headers: { location: 'file:///etc/passwd' } }),
    );

    const res = createMockRes();
    oepProxyHandler(
      mockRequest(`${OEP_PROXY_PATH}?url=${encodeURIComponent('https://github.com/x/a.oep')}`),
      res,
      () => {},
    );
    await vi.waitFor(() => expect(res.writableEnded).toBe(true));

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('INVALID_URL');
  });

  it('returns 502 when the target redirects too many times', async () => {
    for (let i = 0; i < 6; i++) {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: 'https://github.com/x/a.oep' },
        }),
      );
    }

    const res = createMockRes();
    oepProxyHandler(
      mockRequest(`${OEP_PROXY_PATH}?url=${encodeURIComponent('https://github.com/x/a.oep')}`),
      res,
      () => {},
    );
    await vi.waitFor(() => expect(res.writableEnded).toBe(true));

    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body).error).toBe('PROXY_ERROR');
  });

  it('calls next for non-GET methods', () => {
    const res = createMockRes();
    const next = vi.fn();
    oepProxyHandler(mockRequest(`${OEP_PROXY_PATH}?url=x`, 'POST'), res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for a blocked target', () => {
    const res = createMockRes();
    const next = vi.fn();
    oepProxyHandler(
      mockRequest(`${OEP_PROXY_PATH}?url=${encodeURIComponent('http://localhost/x')}`),
      res,
      next,
    );
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('INVALID_URL');
    expect(next).not.toHaveBeenCalled();
  });

  it('streams upstream bytes back to the client', async () => {
    const bytes = new TextEncoder().encode('fake-oep-bytes');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'application/octet-stream' },
      }),
    );

    const res = createMockRes();
    oepProxyHandler(
      mockRequest(`${OEP_PROXY_PATH}?url=${encodeURIComponent('https://github.com/x/a.oep')}`),
      res,
      () => {},
    );
    await vi.waitFor(() => expect(res.writableEnded).toBe(true));

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/octet-stream');
    expect(res.body).toBe('fake-oep-bytes');
  });

  it('forwards upstream error status codes', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response('', { status: 404, statusText: 'Not Found' }),
    );

    const res = createMockRes();
    oepProxyHandler(
      mockRequest(
        `${OEP_PROXY_PATH}?url=${encodeURIComponent('https://github.com/x/missing.oep')}`,
      ),
      res,
      () => {},
    );
    await vi.waitFor(() => expect(res.writableEnded).toBe(true));

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toBe('UPSTREAM_ERROR');
  });

  it('returns 502 when the upstream fetch fails', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError('Failed to fetch'));

    const res = createMockRes();
    oepProxyHandler(
      mockRequest(`${OEP_PROXY_PATH}?url=${encodeURIComponent('https://github.com/x/a.oep')}`),
      res,
      () => {},
    );
    await vi.waitFor(() => expect(res.writableEnded).toBe(true));

    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body).error).toBe('PROXY_ERROR');
  });

  it('returns 502 when the upstream request is aborted', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(
      new DOMException('The operation was aborted', 'AbortError'),
    );

    const res = createMockRes();
    oepProxyHandler(
      mockRequest(`${OEP_PROXY_PATH}?url=${encodeURIComponent('https://github.com/x/a.oep')}`),
      res,
      () => {},
    );
    await vi.waitFor(() => expect(res.writableEnded).toBe(true));

    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body).error).toBe('PROXY_ERROR');
  });
});

describe('proxyUrl', () => {
  it('encodes the target into a same-origin proxy url', () => {
    const target =
      'https://github.com/spatnaik1982/openedu-library/releases/download/v1.0.0/a-1.0.0.oep';
    expect(proxyUrl(target)).toBe(`${OEP_PROXY_PATH}?url=${encodeURIComponent(target)}`);
  });
});
