import { describe, it, expect, vi, beforeEach } from 'vitest';
import { llmProxyHandler } from './index';

vi.mock('@open-edu/llm-config', () => ({
  loadConfig: vi.fn(() => ({
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: '',
    maxTokens: 4096,
    temperature: 0.3,
  })),
  createLlmProvider: vi.fn(),
}));

interface MockRes {
  statusCode: number;
  setHeader: (key: string, value: string) => void;
  end: (...args: unknown[]) => void;
}

function createMockReq(method: string, url: string, body?: string): Record<string, unknown> {
  return {
    method,
    url,
    socket: { remoteAddress: '127.0.0.1' },
    headers: {
      'content-type': body ? 'application/json' : undefined,
    },
    on: vi.fn((event: string, handler: (chunk?: string) => void) => {
      if (event === 'data' && body) {
        handler(body);
      }
      if (event === 'end') {
        handler();
      }
      return { on: vi.fn() };
    }),
  };
}

function createMockRes(): MockRes {
  const headers: Record<string, string> = {};
  return {
    statusCode: 200,
    setHeader: vi.fn((key: string, value: string) => {
      headers[key] = value;
    }),
    end: vi.fn(),
  };
}

describe('llmProxyHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes through non-POST requests', () => {
    const req = createMockReq('GET', '/api/llm/chat');
    const res = createMockRes();
    const next = vi.fn();

    llmProxyHandler(req as never, res as never, next);
    expect(next).toHaveBeenCalled();
  });

  it('passes through non-matching URLs', () => {
    const req = createMockReq('POST', '/api/something');
    const res = createMockRes();
    const next = vi.fn();

    llmProxyHandler(req as never, res as never, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 503 when no API key configured', async () => {
    const { loadConfig } = await import('@open-edu/llm-config');
    vi.mocked(loadConfig).mockReturnValue({
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: '',
      maxTokens: 4096,
      temperature: 0.3,
    });

    const req = createMockReq('POST', '/api/llm/chat', JSON.stringify({ prompt: 'Hello' }));
    const res = createMockRes();
    const next = vi.fn();

    llmProxyHandler(req as never, res as never, next);

    await new Promise((r) => setTimeout(r, 100));

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(503);
  });
});
