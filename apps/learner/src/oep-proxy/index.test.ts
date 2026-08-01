import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  OEP_PROXY_PATH,
  oepProxyHandler,
  parseProxyTarget,
  isBlockedProxyTarget,
} from './index.js';
import { proxyUrl } from './client.js';

function createMockRes() {
  const chunks: Uint8Array[] = [];
  const headers: Record<string, string> = {};
  let headersSent = false;
  let writableEnded = false;
  return {
    statusCode: 200,
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
    },
    write(chunk: Uint8Array): boolean {
      headersSent = true;
      chunks.push(chunk);
      return true;
    },
    end(chunk?: Uint8Array | string): void {
      headersSent = true;
      writableEnded = true;
      if (chunk) {
        chunks.push(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk);
      }
    },
    get headersSent() {
      return headersSent;
    },
    get writableEnded() {
      return writableEnded;
    },
    get headers() {
      return headers;
    },
    get body(): string {
      const total = chunks.reduce((acc, c) => acc + c.length, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
      }
      return new TextDecoder().decode(merged);
    },
  };
}

function mockRequest(url: string, method = 'GET') {
  return { method, url } as unknown as Parameters<typeof oepProxyHandler>[0];
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

describe('oepProxyHandler', () => {
  beforeEach(() => {
    vi.stubEnv('OEP_PROXY_ALLOW_PRIVATE', '');
    globalThis.fetch = vi.fn();
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
});

describe('proxyUrl', () => {
  it('encodes the target into a same-origin proxy url', () => {
    const target =
      'https://github.com/spatnaik1982/openedu-library/releases/download/v1.0.0/a-1.0.0.oep';
    expect(proxyUrl(target)).toBe(`${OEP_PROXY_PATH}?url=${encodeURIComponent(target)}`);
  });
});
