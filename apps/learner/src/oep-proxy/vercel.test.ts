import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { lookup } from 'node:dns/promises';
import type { LookupAddress } from 'node:dns';
import { Readable } from 'node:stream';
import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import oepProxy from './vercel.js';
import { createMockRes, mockRequest } from './test-helpers.js';
import { OEP_PROXY_PATH } from './index.js';

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

describe('oepProxy Vercel function', () => {
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
    const stream = new Readable({ read() {} }) as unknown as IncomingMessage & {
      statusMessage: string;
    };
    stream.statusCode = 200;
    stream.statusMessage = 'OK';
    stream.headers = { 'content-type': 'application/octet-stream' };
    stream.push(Buffer.from('fake-oep-bytes'));
    stream.push(null);
    const req = new EventEmitter() as EventEmitter & { end(): void };
    req.end = () => {};
    httpsRequestMock.mockImplementationOnce((_options: unknown) => {
      queueMicrotask(() => req.emit('response', stream));
      return req;
    });

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
