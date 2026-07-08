import { describe, it, expect, vi, beforeEach } from 'vitest';
import { llmProxyHandler } from './index';

const mockGenerateStructured = vi.fn();

vi.mock('@open-edu/llm-config', () => ({
  loadConfig: vi.fn(() => ({
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: '',
    maxTokens: 4096,
    temperature: 0.3,
  })),
  createLlmProvider: vi.fn((config?: { provider?: string }) => {
    const provider = config?.provider ?? 'openai';
    if (!['openai', 'openrouter'].includes(provider)) {
      throw new Error(`Unknown LLM provider: ${provider}. Supported: openai, openrouter`);
    }
    return {
      generateStructured: mockGenerateStructured,
    };
  }),
}));

interface MockRes {
  statusCode: number;
  setHeader: (key: string, value: string) => void;
  end: (...args: unknown[]) => void;
}

function createMockReq(
  method: string,
  url: string,
  body?: string,
  origin?: string,
): Record<string, unknown> {
  return {
    method,
    url,
    socket: { remoteAddress: '127.0.0.1' },
    headers: {
      'content-type': body ? 'application/json' : undefined,
      origin: origin ?? 'http://localhost:4001',
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
    destroy: vi.fn(),
  };
}

function createMockRes(): MockRes {
  return {
    statusCode: 200,
    setHeader: vi.fn(),
    end: vi.fn(),
  };
}

describe('llmProxyHandler', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('passes through non-POST requests to proxy path', () => {
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

  it('handles OPTIONS preflight with CORS headers', () => {
    const req = createMockReq('OPTIONS', '/api/llm/chat', undefined, 'http://localhost:4001');
    const res = createMockRes();
    const next = vi.fn();

    llmProxyHandler(req as never, res as never, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(204);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      'http://localhost:4001',
    );
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST, OPTIONS');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '86400');
    expect(res.end).toHaveBeenCalled();
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

    await vi.waitFor(() => {
      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(503);
    });
  });

  it('returns 200 on successful LLM response', async () => {
    const { loadConfig } = await import('@open-edu/llm-config');
    vi.mocked(loadConfig).mockReturnValue({
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: 'sk-test',
      maxTokens: 4096,
      temperature: 0.3,
    });
    mockGenerateStructured.mockResolvedValue({ text: 'Hello world', citations: [] });

    const req = createMockReq('POST', '/api/llm/chat', JSON.stringify({ prompt: 'Hi' }));
    const res = createMockRes();
    const next = vi.fn();

    llmProxyHandler(req as never, res as never, next);

    await vi.waitFor(() => {
      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:4001',
      );
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    });

    const endData = vi.mocked(res.end).mock.calls[0]?.[0];
    expect(endData).toBeDefined();
    const sentBody = JSON.parse(endData as string);
    expect(sentBody).toHaveProperty('content');
    expect(JSON.parse(sentBody.content)).toEqual({ text: 'Hello world', citations: [] });
  });

  it('returns 400 for empty prompt validation error', async () => {
    const { loadConfig } = await import('@open-edu/llm-config');
    vi.mocked(loadConfig).mockReturnValue({
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: 'sk-test',
      maxTokens: 4096,
      temperature: 0.3,
    });

    const req = createMockReq('POST', '/api/llm/chat', JSON.stringify({ prompt: '' }));
    const res = createMockRes();
    const next = vi.fn();

    llmProxyHandler(req as never, res as never, next);

    await vi.waitFor(() => {
      expect(res.statusCode).toBe(400);
      expect(res.end).toHaveBeenCalledWith(expect.stringContaining('VALIDATION_ERROR'));
    });
  });

  it('returns 400 for invalid JSON body', async () => {
    const { loadConfig } = await import('@open-edu/llm-config');
    vi.mocked(loadConfig).mockReturnValue({
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: 'sk-test',
      maxTokens: 4096,
      temperature: 0.3,
    });

    const req = createMockReq('POST', '/api/llm/chat', 'not-json');
    const res = createMockRes();
    const next = vi.fn();

    llmProxyHandler(req as never, res as never, next);

    await vi.waitFor(() => {
      expect(res.statusCode).toBe(400);
      expect(res.end).toHaveBeenCalledWith(expect.stringContaining('Invalid JSON'));
    });
  });

  it('returns 500 when provider creation fails', async () => {
    const { loadConfig } = await import('@open-edu/llm-config');
    vi.mocked(loadConfig).mockReturnValue({
      provider: 'unsupported',
      model: 'gpt-4o-mini',
      apiKey: 'sk-test',
      maxTokens: 4096,
      temperature: 0.3,
    });

    const req = createMockReq('POST', '/api/llm/chat', JSON.stringify({ prompt: 'Hello' }));
    const res = createMockRes();
    const next = vi.fn();

    llmProxyHandler(req as never, res as never, next);

    await vi.waitFor(() => {
      expect(res.statusCode).toBe(500);
      expect(res.end).toHaveBeenCalledWith(expect.stringContaining('PROVIDER_ERROR'));
    });
  });

  it('returns 504 on LLM request timeout', async () => {
    const { loadConfig } = await import('@open-edu/llm-config');
    vi.mocked(loadConfig).mockReturnValue({
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: 'sk-test',
      maxTokens: 4096,
      temperature: 0.3,
    });

    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockGenerateStructured.mockRejectedValue(abortError);

    const req = createMockReq('POST', '/api/llm/chat', JSON.stringify({ prompt: 'Hello' }));
    const res = createMockRes();
    const next = vi.fn();

    llmProxyHandler(req as never, res as never, next);

    await vi.waitFor(() => {
      expect(res.statusCode).toBe(504);
      expect(res.end).toHaveBeenCalledWith(expect.stringContaining('TIMEOUT'));
    });
  });

  it('returns 502 on LLM auth error', async () => {
    const { loadConfig } = await import('@open-edu/llm-config');
    vi.mocked(loadConfig).mockReturnValue({
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: 'sk-test',
      maxTokens: 4096,
      temperature: 0.3,
    });

    mockGenerateStructured.mockRejectedValue(new Error('Incorrect API key provided'));

    const req = createMockReq('POST', '/api/llm/chat', JSON.stringify({ prompt: 'Hello' }));
    const res = createMockRes();
    const next = vi.fn();

    llmProxyHandler(req as never, res as never, next);

    await vi.waitFor(() => {
      expect(res.statusCode).toBe(502);
      expect(res.end).toHaveBeenCalledWith(expect.stringContaining('AUTH_ERROR'));
    });
  });

  it('returns 502 on LLM provider rate limit', async () => {
    const { loadConfig } = await import('@open-edu/llm-config');
    vi.mocked(loadConfig).mockReturnValue({
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: 'sk-test',
      maxTokens: 4096,
      temperature: 0.3,
    });

    mockGenerateStructured.mockRejectedValue(new Error('429 Too Many Requests'));

    const req = createMockReq('POST', '/api/llm/chat', JSON.stringify({ prompt: 'Hello' }));
    const res = createMockRes();
    const next = vi.fn();

    llmProxyHandler(req as never, res as never, next);

    await vi.waitFor(() => {
      expect(res.statusCode).toBe(502);
      expect(res.end).toHaveBeenCalledWith(expect.stringContaining('PROVIDER_RATE_LIMIT'));
    });
  });

  it('returns 502 on unknown LLM error', async () => {
    const { loadConfig } = await import('@open-edu/llm-config');
    vi.mocked(loadConfig).mockReturnValue({
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: 'sk-test',
      maxTokens: 4096,
      temperature: 0.3,
    });

    mockGenerateStructured.mockRejectedValue(new Error('Something went wrong'));

    const req = createMockReq('POST', '/api/llm/chat', JSON.stringify({ prompt: 'Hello' }));
    const res = createMockRes();
    const next = vi.fn();

    llmProxyHandler(req as never, res as never, next);

    await vi.waitFor(() => {
      expect(res.statusCode).toBe(502);
      expect(res.end).toHaveBeenCalledWith(expect.stringContaining('LLM_ERROR'));
    });
  });
});
