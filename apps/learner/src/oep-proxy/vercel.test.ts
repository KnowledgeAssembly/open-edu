import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { lookup } from 'node:dns/promises';
import type { LookupAddress } from 'node:dns';
import oepProxy from './vercel.js';
import { createMockRes, mockRequest } from './test-helpers.js';
import { OEP_PROXY_PATH } from './index.js';

vi.mock('node:dns/promises', () => {
  const lookup = vi.fn();
  return { default: { lookup }, lookup };
});

const lookupMock = vi.mocked(lookup) as unknown as Mock<
  [hostname: string, options?: { all: true; verbatim?: boolean }],
  Promise<LookupAddress[]>
>;

describe('oepProxy Vercel function', () => {
  beforeEach(() => {
    vi.stubEnv('OEP_PROXY_ALLOW_PRIVATE', '');
    globalThis.fetch = vi.fn();
    lookupMock.mockResolvedValue([{ address: '140.82.112.4', family: 4 }]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns 404 for routes outside the proxy', async () => {
    const res = createMockRes();
    await oepProxy(
      mockRequest('/not-proxy') as unknown as IncomingMessage,
      res as unknown as ServerResponse,
    );
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toBe('NOT_FOUND');
  });

  it('returns 400 for a blocked target', async () => {
    const res = createMockRes();
    await oepProxy(
      mockRequest(
        `${OEP_PROXY_PATH}?url=${encodeURIComponent('http://localhost/x')}`,
      ) as unknown as IncomingMessage,
      res as unknown as ServerResponse,
    );
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('INVALID_URL');
  });

  it('streams a proxied resource', async () => {
    const bytes = new TextEncoder().encode('fake-oep-bytes');
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/octet-stream' } },
      ),
    );
    const res = createMockRes();
    await oepProxy(
      mockRequest(
        `${OEP_PROXY_PATH}?url=${encodeURIComponent('https://github.com/x/a.oep')}`,
      ) as unknown as IncomingMessage,
      res as unknown as ServerResponse,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('fake-oep-bytes');
  });
});
