import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { lookup } from 'node:dns/promises';
import type { LookupAddress } from 'node:dns';
import { Readable } from 'node:stream';
import { EventEmitter } from 'node:events';
import type { IncomingMessage } from 'node:http';
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

const httpRequestMock = vi.hoisted(() => vi.fn());
const httpsRequestMock = vi.hoisted(() => vi.fn());

vi.mock('node:dns/promises', () => {
  const lookup = vi.fn();
  return { default: { lookup }, lookup };
});

vi.mock('node:http', () => ({ default: { request: httpRequestMock }, request: httpRequestMock }));
vi.mock('node:https', () => ({
  default: { request: httpsRequestMock },
  request: httpsRequestMock,
}));

const lookupMock = vi.mocked(lookup) as unknown as Mock<
  [hostname: string, options?: { all: true; verbatim?: boolean }],
  Promise<LookupAddress[]>
>;

type FakeResponseOptions = {
  status: number;
  headers?: Record<string, string>;
  body?: string | null;
  viaHttps?: boolean;
};

function createFakeResponse(status: number, headers: Record<string, string>, body: string | null) {
  const stream = new Readable({ read() {} }) as unknown as IncomingMessage & {
    statusMessage: string;
  };
  stream.statusCode = status;
  stream.statusMessage = 'Mock';
  stream.headers = headers;
  if (body !== null) stream.push(Buffer.from(body));
  stream.push(null);
  return stream;
}

function mockHttpOnce({ status, headers = {}, body = null, viaHttps = true }: FakeResponseOptions) {
  const response = createFakeResponse(status, headers, body);
  const req = new EventEmitter() as EventEmitter & { end(): void };
  req.end = () => {};
  const requestMock = viaHttps ? httpsRequestMock : httpRequestMock;
  requestMock.mockImplementationOnce((_options: unknown) => {
    queueMicrotask(() => req.emit('response', response));
    return req;
  });
  return { req, response };
}

function mockHttpError(error: Error, viaHttps = true) {
  const req = new EventEmitter() as EventEmitter & { end(): void };
  req.end = () => {};
  const requestMock = viaHttps ? httpsRequestMock : httpRequestMock;
  requestMock.mockImplementationOnce(() => {
    queueMicrotask(() => req.emit('error', error));
    return req;
  });
  return req;
}

function mockHttpsRedirectChain(location: string) {
  httpsRequestMock.mockImplementation((_options: unknown) => {
    const response = createFakeResponse(302, { location }, null);
    const req = new EventEmitter() as EventEmitter & { end(): void };
    req.end = () => {};
    queueMicrotask(() => req.emit('response', response));
    return req;
  });
}

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

  it('blocks CGNAT and reserved ranges', () => {
    expect(isBlockedProxyTarget('100.64.0.1')).toBe(true);
    expect(isBlockedProxyTarget('100.127.255.255')).toBe(true);
    expect(isBlockedProxyTarget('192.0.0.1')).toBe(true);
    expect(isBlockedProxyTarget('198.18.0.1')).toBe(true);
    expect(isBlockedProxyTarget('224.0.0.1')).toBe(true);
    expect(isBlockedProxyTarget('240.0.0.1')).toBe(true);
  });

  it('allows public hosts', () => {
    expect(isBlockedProxyTarget('github.com')).toBe(false);
    expect(isBlockedProxyTarget('objects.githubusercontent.com')).toBe(false);
    expect(isBlockedProxyTarget('172.15.0.1')).toBe(false);
    expect(isBlockedProxyTarget('172.32.0.1')).toBe(false);
    expect(isBlockedProxyTarget('100.128.0.1')).toBe(false);
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

  it('blocks IPv6 site-local addresses (fec0::/10)', () => {
    expect(isPrivateIp('fec0::1')).toBe(true);
  });

  it('blocks IPv4-mapped private IPv6 addresses', () => {
    expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateIp('::ffff:192.168.1.1')).toBe(true);
  });

  it('blocks hex-canonicalized IPv4-mapped private IPv6 addresses', () => {
    expect(isPrivateIp('::ffff:7f00:1')).toBe(true);
    expect(isPrivateIp('::ffff:a9fe:a9fe')).toBe(true);
  });

  it('allows hex-canonicalized IPv4-mapped public IPv6 addresses', () => {
    expect(isPrivateIp('::ffff:8c52:7004')).toBe(false);
  });

  it('blocks IPv4-translated private IPv6 addresses (::ffff:0:...)', () => {
    expect(isPrivateIp('::ffff:0:7f00:1')).toBe(true);
    expect(isPrivateIp('::ffff:0:127.0.0.1')).toBe(true);
    expect(isPrivateIp('::ffff:0:a00:1')).toBe(true);
    expect(isPrivateIp('::ffff:0:8c52:7004')).toBe(false);
  });

  it('blocks NAT64-mapped private IPv6 addresses (64:ff9b::/96 and local-use prefix)', () => {
    expect(isPrivateIp('64:ff9b::7f00:1')).toBe(true);
    expect(isPrivateIp('64:ff9b::127.0.0.1')).toBe(true);
    expect(isPrivateIp('64:ff9b:1::a00:1')).toBe(true);
    expect(isPrivateIp('64:ff9b:1::10.0.0.1')).toBe(true);
    expect(isPrivateIp('64:ff9b::8c52:7004')).toBe(false);
  });

  it('blocks IPv4-compatible private IPv6 addresses (::a.b.c.d)', () => {
    expect(isPrivateIp('::7f00:1')).toBe(true);
    expect(isPrivateIp('::127.0.0.1')).toBe(true);
    expect(isPrivateIp('::8c52:7004')).toBe(false);
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
    httpRequestMock.mockReset();
    httpsRequestMock.mockReset();
    lookupMock.mockReset();
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

  it('blocks an IPv4-mapped IPv6 private target through the real URL parser', async () => {
    const res = createMockRes();
    oepProxyHandler(
      mockRequest(`${OEP_PROXY_PATH}?url=${encodeURIComponent('http://[::ffff:127.0.0.1]/x.oep')}`),
      res,
      () => {},
    );
    await vi.waitFor(() => expect(res.writableEnded).toBe(true));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('INVALID_URL');
  });

  it.each(['[64:ff9b::7f00:1]', '[64:ff9b:1::a00:1]', '[::7f00:1]', '[::ffff:0:7f00:1]'])(
    'blocks the IPv6 embed bypass %s through the real URL parser',
    async (host) => {
      const res = createMockRes();
      oepProxyHandler(
        mockRequest(`${OEP_PROXY_PATH}?url=${encodeURIComponent(`http://${host}/x.oep`)}`),
        res,
        () => {},
      );
      await vi.waitFor(() => expect(res.writableEnded).toBe(true));
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('INVALID_URL');
    },
  );

  it('follows public redirects and streams the final response', async () => {
    mockHttpOnce({
      status: 302,
      headers: { location: 'https://objects.githubusercontent.com/x/a.oep' },
    });
    mockHttpOnce({ status: 200, body: 'redirected-bytes' });

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
    mockHttpOnce({ status: 302, headers: { location: 'http://169.254.169.254/meta' } });

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
    mockHttpOnce({ status: 302, headers: { location: 'file:///etc/passwd' } });

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

  it('blocks an https to http redirect downgrade', async () => {
    mockHttpOnce({ status: 302, headers: { location: 'http://example.com/x.oep' } });

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
    mockHttpsRedirectChain('https://github.com/x/a.oep');

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
    mockHttpOnce({
      status: 200,
      headers: { 'content-type': 'application/octet-stream' },
      body: 'fake-oep-bytes',
    });

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
    mockHttpOnce({ status: 404, headers: { 'content-type': 'text/plain' }, body: 'Not Found' });

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

  it('returns 502 when the upstream request fails', async () => {
    mockHttpError(new TypeError('Failed to fetch'));

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
    mockHttpError(new DOMException('The operation was aborted', 'AbortError'));

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

describe('oepProxyHandler streaming timeouts', () => {
  beforeEach(() => {
    vi.stubEnv('OEP_PROXY_ALLOW_PRIVATE', '');
    httpRequestMock.mockReset();
    httpsRequestMock.mockReset();
    lookupMock.mockReset();
    lookupMock.mockResolvedValue([{ address: '140.82.112.4', family: 4 }]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function mockControlledUpstream() {
    const response = new Readable({ read() {} }) as unknown as IncomingMessage & {
      statusMessage: string;
    };
    response.statusCode = 200;
    response.statusMessage = 'Mock';
    response.headers = { 'content-type': 'application/octet-stream' };
    const req = new EventEmitter() as EventEmitter & { end(): void };
    req.end = () => {};
    httpsRequestMock.mockImplementation((options: unknown) => {
      const signal = (options as { signal?: AbortSignal }).signal;
      signal?.addEventListener('abort', () => {
        const err = new DOMException('The operation was aborted', 'AbortError');
        req.emit('error', err);
        response.destroy(err);
      });
      queueMicrotask(() => req.emit('response', response));
      return req;
    });
    return response;
  }

  const proxyRequest = () =>
    mockRequest(`${OEP_PROXY_PATH}?url=${encodeURIComponent('https://github.com/x/a.oep')}`);

  it('keeps streaming a slow download as long as chunks keep arriving', async () => {
    vi.useFakeTimers();
    const response = mockControlledUpstream();
    const res = createMockRes();
    const pending = oepProxyHandler(proxyRequest(), res, () => {}, {
      ttfbMs: 50,
      streamIdleMs: 100,
    });

    await vi.advanceTimersByTimeAsync(0);

    response.push(Buffer.from('part1-'));
    await vi.advanceTimersByTimeAsync(50);
    response.push(Buffer.from('part2-'));
    await vi.advanceTimersByTimeAsync(50);
    response.push(Buffer.from('part3'));
    await vi.advanceTimersByTimeAsync(50);
    response.push(null);

    await pending;
    expect(res.writableEnded).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('part1-part2-part3');
  });

  it('aborts when the stream stalls beyond the idle timeout', async () => {
    vi.useFakeTimers();
    const response = mockControlledUpstream();
    const res = createMockRes();
    const pending = oepProxyHandler(proxyRequest(), res, () => {}, {
      ttfbMs: 50,
      streamIdleMs: 100,
    });

    await vi.advanceTimersByTimeAsync(0);
    response.push(Buffer.from('partial'));
    await vi.advanceTimersByTimeAsync(0);

    await vi.advanceTimersByTimeAsync(150);

    await pending;
    expect(res.writableEnded).toBe(true);
    expect(res.body).toBe('partial');
  });

  it('aborts when upstream headers do not arrive within the TTFB timeout', async () => {
    vi.useFakeTimers();
    const response = new Readable({ read() {} }) as unknown as IncomingMessage & {
      statusMessage: string;
    };
    response.on('error', () => {});
    const req = new EventEmitter() as EventEmitter & { end(): void };
    req.end = () => {};
    const err = new DOMException('The operation was aborted', 'AbortError');
    httpsRequestMock.mockImplementation((options: unknown) => {
      const signal = (options as { signal?: AbortSignal }).signal;
      signal?.addEventListener('abort', () => {
        req.emit('error', err);
        response.destroy(err);
      });
      return req;
    });

    const res = createMockRes();
    const pending = oepProxyHandler(proxyRequest(), res, () => {}, { ttfbMs: 50 });
    await vi.advanceTimersByTimeAsync(60);
    await pending;

    expect(res.writableEnded).toBe(true);
    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body).error).toBe('PROXY_ERROR');
  });

  it('completes via a working address even when another resolved address fails', async () => {
    lookupMock.mockResolvedValue([
      { address: '185.199.109.133', family: 4 },
      { address: '185.199.110.133', family: 4 },
    ]);
    mockHttpError(Object.assign(new Error('Connect timed out'), { code: 'ETIMEDOUT' }));
    mockHttpOnce({ status: 200, body: 'failover-bytes' });

    const res = createMockRes();
    oepProxyHandler(proxyRequest(), res, () => {});
    await vi.waitFor(() => expect(res.writableEnded).toBe(true));

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('failover-bytes');
    expect(httpsRequestMock).toHaveBeenCalledTimes(2);
  });

  it('does not spawn new attempts once the request has been aborted', async () => {
    vi.useFakeTimers();
    lookupMock.mockResolvedValue([
      { address: '185.199.109.133', family: 4 },
      { address: '185.199.110.133', family: 4 },
    ]);
    const err = new DOMException('The operation was aborted', 'AbortError');
    const signals: AbortSignal[] = [];
    httpsRequestMock.mockImplementation((options: unknown) => {
      const req = new EventEmitter() as EventEmitter & { end(): void };
      req.end = () => {};
      const signal = (options as { signal?: AbortSignal }).signal;
      signals.push(signal!);
      signal?.addEventListener('abort', () => req.emit('error', err));
      return req;
    });

    const res = createMockRes();
    const pending = oepProxyHandler(proxyRequest(), res, () => {}, { ttfbMs: 50 });
    await vi.advanceTimersByTimeAsync(60);
    await pending;

    expect(res.writableEnded).toBe(true);
    expect(res.statusCode).toBe(502);
    expect(httpsRequestMock).toHaveBeenCalledTimes(2);
    expect(signals.every((s) => s.aborted)).toBe(true);
  });

  it('returns 502 when every resolved address is unreachable', async () => {
    lookupMock.mockResolvedValue([
      { address: '185.199.109.133', family: 4 },
      { address: '185.199.110.133', family: 4 },
    ]);
    mockHttpError(Object.assign(new Error('Connection refused'), { code: 'ECONNREFUSED' }));
    mockHttpError(Object.assign(new Error('Connection refused'), { code: 'ECONNREFUSED' }));

    const res = createMockRes();
    oepProxyHandler(proxyRequest(), res, () => {});
    await vi.waitFor(() => expect(res.writableEnded).toBe(true));

    expect(res.writableEnded).toBe(true);
    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body).error).toBe('PROXY_ERROR');
  });

  it('accepts a successful address even when another address fails non-connectionally', async () => {
    lookupMock.mockResolvedValue([
      { address: '185.199.109.133', family: 4 },
      { address: '185.199.110.133', family: 4 },
    ]);
    mockHttpError(
      Object.assign(new Error('TLS verify failed'), { code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' }),
    );
    mockHttpOnce({ status: 200, body: 'good-edge' });

    const res = createMockRes();
    oepProxyHandler(proxyRequest(), res, () => {});
    await vi.waitFor(() => expect(res.writableEnded).toBe(true));

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('good-edge');
    expect(httpsRequestMock).toHaveBeenCalledTimes(2);
  });

  it('resolves via the fastest-responding address rather than waiting on DNS order', async () => {
    vi.useFakeTimers();
    lookupMock.mockResolvedValue([
      { address: '185.199.109.133', family: 4 },
      { address: '185.199.110.133', family: 4 },
    ]);
    httpsRequestMock.mockImplementationOnce((options: unknown) => {
      const req = new EventEmitter() as EventEmitter & { end(): void };
      req.end = () => {};
      const signal = (options as { signal?: AbortSignal }).signal;
      signal?.addEventListener('abort', () =>
        req.emit('error', new DOMException('The operation was aborted', 'AbortError')),
      );
      setTimeout(() => req.emit('response', createFakeResponse(200, {}, 'slow-edge')), 1000);
      return req;
    });
    httpsRequestMock.mockImplementationOnce(() => {
      const req = new EventEmitter() as EventEmitter & { end(): void };
      req.end = () => {};
      queueMicrotask(() => req.emit('response', createFakeResponse(200, {}, 'fast-edge')));
      return req;
    });

    const res = createMockRes();
    const pending = oepProxyHandler(proxyRequest(), res, () => {});
    await vi.advanceTimersByTimeAsync(0);
    await pending;

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('fast-edge');
    expect(httpsRequestMock).toHaveBeenCalledTimes(2);
  });

  it('aborts losing attempts once another address responds', async () => {
    lookupMock.mockResolvedValue([
      { address: '185.199.109.133', family: 4 },
      { address: '185.199.110.133', family: 4 },
    ]);
    const signals: AbortSignal[] = [];
    httpsRequestMock.mockImplementationOnce((options: unknown) => {
      const req = new EventEmitter() as EventEmitter & { end(): void };
      req.end = () => {};
      const signal = (options as { signal?: AbortSignal }).signal;
      signals.push(signal!);
      signal?.addEventListener('abort', () =>
        req.emit('error', new DOMException('The operation was aborted', 'AbortError')),
      );
      return req;
    });
    httpsRequestMock.mockImplementationOnce((options: unknown) => {
      const req = new EventEmitter() as EventEmitter & { end(): void };
      req.end = () => {};
      const signal = (options as { signal?: AbortSignal }).signal;
      signals.push(signal!);
      queueMicrotask(() => req.emit('response', createFakeResponse(200, {}, 'winner')));
      return req;
    });

    const res = createMockRes();
    oepProxyHandler(proxyRequest(), res, () => {});
    await vi.waitFor(() => expect(res.writableEnded).toBe(true));

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('winner');
    expect(signals).toHaveLength(2);
    expect(signals[0]!.aborted).toBe(true);
    expect(signals[1]!.aborted).toBe(false);
  });
});

describe('proxyUrl', () => {
  it('encodes the target into a same-origin proxy url', () => {
    const target =
      'https://github.com/spatnaik1982/openedu-library/releases/download/v1.0.0/a-1.0.0.oep';
    expect(proxyUrl(target)).toBe(`${OEP_PROXY_PATH}?url=${encodeURIComponent(target)}`);
  });
});
