import { describe, it, expect, vi } from 'vitest';
import pipiliChat from '../pipili/vercel.js';
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

vi.mock('@open-edu/llm-config', () => ({
  createModelFactory: vi.fn(),
  loadConfig: vi.fn().mockReturnValue({
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: 'test-key',
    temperature: 0.7,
  }),
}));

describe('pipili Vercel adapter', () => {
  it('handles GET with 405 method not allowed', async () => {
    const res = mockRes();
    await pipiliChat(mockReq({ method: 'GET' }), res as unknown as ServerResponse);
    expect(res.writeHead).toHaveBeenCalledWith(405, expect.any(Object));
    const body = JSON.parse(res.end.mock.calls[0]![0] as string) as Record<string, unknown>;
    expect(body).toEqual({ error: 'METHOD_NOT_ALLOWED' });
  });

  it('responds with an error on a malformed body', async () => {
    const res = mockRes();
    const req = mockReq();
    const events: Record<string, (...args: unknown[]) => void> = {};
    vi.spyOn(req, 'on').mockImplementation((event, listener) => {
      events[event as string] = listener as (...args: unknown[]) => void;
      return req;
    });
    const promise = pipiliChat(req, res as unknown as ServerResponse);
    events['data']!('not json');
    events['end']!();
    await promise;
    const body = JSON.parse(res.end.mock.calls[0]![0] as string) as Record<string, unknown>;
    expect(body.error).toBe('PAYLOAD_TOO_LARGE');
  });
});
