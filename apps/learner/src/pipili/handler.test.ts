import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPipiliHandler } from './handler.js';
import { PIPILI_CONFIG } from './config.js';
import type { IncomingMessage, ServerResponse } from 'http';

function mockReq(overrides: Partial<IncomingMessage> = {}): IncomingMessage {
  return {
    method: 'POST',
    url: '/api/pipili/chat',
    headers: { host: 'localhost' },
    on: vi.fn(),
    ...overrides,
  } as unknown as IncomingMessage;
}

function mockRes() {
  return {
    statusCode: 200,
    writeHead: vi.fn(),
    end: vi.fn(),
    write: vi.fn(),
    setHeader: vi.fn(),
    get headersSent() {
      return false;
    },
  };
}

function captureEvents(req: IncomingMessage): Record<string, (...args: unknown[]) => void> {
  const events: Record<string, (...args: unknown[]) => void> = {};
  vi.spyOn(req, 'on').mockImplementation((event, listener) => {
    events[event as string] = listener as (...args: unknown[]) => void;
    return req;
  });
  return events;
}

function lastEndJson(res: ReturnType<typeof mockRes>): Record<string, unknown> {
  const payload = res.end.mock.calls[0]![0] as string;
  return JSON.parse(payload) as Record<string, unknown>;
}

vi.mock('@open-edu/llm-config', () => ({
  createModelFactory: vi.fn(),
  loadConfig: vi.fn().mockReturnValue({
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: 'test-key',
    temperature: 0.7,
  }),
}));

describe('createPipiliHandler', () => {
  let handler: ReturnType<typeof createPipiliHandler>;

  beforeEach(() => {
    handler = createPipiliHandler();
  });

  it('returns 405 for non-POST methods', async () => {
    const res = mockRes();
    await handler(mockReq({ method: 'GET' }), res as unknown as ServerResponse);
    expect(res.writeHead).toHaveBeenCalledWith(405, expect.any(Object));
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }));
  });

  it('returns 413 when request body is too large', async () => {
    const res = mockRes();
    const req = mockReq();
    const events = captureEvents(req);
    const promise = handler(req, res as unknown as ServerResponse);
    events['data']!('x'.repeat(PIPILI_CONFIG.MAX_REQUEST_SIZE_BYTES + 1));
    events['end']!();
    await promise;
    expect(res.writeHead).toHaveBeenCalledWith(413, expect.any(Object));
    expect(lastEndJson(res).error).toBe('PAYLOAD_TOO_LARGE');
  });

  it('returns 413 for an invalid JSON body', async () => {
    const res = mockRes();
    const req = mockReq();
    const events = captureEvents(req);
    const promise = handler(req, res as unknown as ServerResponse);
    events['data']!('not-json');
    events['end']!();
    await promise;
    expect(res.writeHead).toHaveBeenCalledWith(413, expect.any(Object));
    expect(lastEndJson(res).error).toBe('PAYLOAD_TOO_LARGE');
    expect(lastEndJson(res).message).toBe('Invalid JSON');
  });
});
