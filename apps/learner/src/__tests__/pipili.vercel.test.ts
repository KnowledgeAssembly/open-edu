import { describe, it, expect, vi } from 'vitest';
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

const VALID_BODY = JSON.stringify({
  conversationId: 'test-123',
  messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
  context: {},
});

vi.mock('@open-edu/llm-config', () => ({
  createModelFactory: vi.fn(() => ({
    getModel: vi.fn(() => ({
      provider: 'openai',
      modelId: 'gpt-4o-mini',
    })),
  })),
  loadConfig: vi.fn().mockReturnValue({
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: 'test-key',
    temperature: 0.7,
  }),
}));

vi.mock('@open-edu/ai-companion/pipili', () => ({
  boundContext: vi.fn(() => ({
    entries: [],
    totalTokens: 0,
    truncated: false,
  })),
  pipiliResponseMetadataSchema: {
    safeParse: vi.fn(() => ({
      success: true,
      data: {
        mode: 'tutor',
        citations: [],
        assessmentSafe: true,
        suggestedNextSteps: [],
      },
    })),
  },
}));

vi.mock('ai', () => ({
  convertToModelMessages: vi.fn().mockResolvedValue([]),
  isStepCount: vi.fn(() => vi.fn(() => false)),
  streamText: vi.fn().mockReturnValue({ stream: new ReadableStream() }),
  toUIMessageStream: vi.fn().mockReturnValue(new ReadableStream()),
  pipeUIMessageStreamToResponse: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/pipili/tools.js', () => ({
  createToolRegistry: vi.fn(() => ({})),
}));

import pipiliChat from '../pipili/vercel.js';

describe('pipili Vercel adapter', () => {
  it('handles GET with 405 method not allowed', async () => {
    const res = mockRes();
    await pipiliChat(mockReq({ method: 'GET' }), res as unknown as ServerResponse);
    expect(res.writeHead).toHaveBeenCalledWith(405, expect.any(Object));
    const body = JSON.parse(res.end.mock.calls[0]![0] as string) as Record<string, unknown>;
    expect(body).toEqual({ error: 'METHOD_NOT_ALLOWED' });
  });

  it('responds with error on a malformed body', async () => {
    const res = mockRes();
    const req = mockReq();
    const events = captureEvents(req);
    const promise = pipiliChat(req, res as unknown as ServerResponse);
    events['data']!('not json');
    events['end']!();
    await promise;
    const body = JSON.parse(res.end.mock.calls[0]![0] as string) as Record<string, unknown>;
    expect(body.error).toBe('INVALID_JSON');
  });

  it('streams a response for a valid request body', async () => {
    const res = mockRes();
    const req = mockReq();
    const events = captureEvents(req);
    const promise = pipiliChat(req, res as unknown as ServerResponse);
    events['data']!(VALID_BODY);
    events['end']!();
    await promise;
    const { pipeUIMessageStreamToResponse } = await import('ai');
    expect(pipeUIMessageStreamToResponse).toHaveBeenCalled();
  });
});
