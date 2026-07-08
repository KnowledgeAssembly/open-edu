import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIProviderImpl } from './AIProviderImpl';
import type { ExplanationRequest } from '@open-edu/ai-companion';

function createMockFetch(success: boolean, data?: Record<string, unknown>) {
  return vi.fn().mockImplementation(async (_url: string, _options?: Record<string, unknown>) => {
    if (!success) {
      return {
        ok: false,
        status: 503,
        json: async () => ({ error: 'LLM proxy not available' }),
      };
    }
    return {
      ok: true,
      json: async () =>
        data ?? { content: JSON.stringify({ text: 'Mock response', citations: [] }) },
    };
  });
}

describe('AIProviderImpl', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('explain returns AIResponse with text and citations', async () => {
    globalThis.fetch = createMockFetch(true, {
      content: JSON.stringify({ text: 'Photosynthesis is...', citations: [] }),
    });
    const provider = new AIProviderImpl();

    const request: ExplanationRequest = {
      text: 'What is photosynthesis?',
      context: { courseTitle: 'Biology 101' },
      style: 'simple',
    };

    const response = await provider.explain(request);
    expect(response.text).toBe('Photosynthesis is...');
    expect(Array.isArray(response.citations)).toBe(true);
    expect(typeof response.timestamp).toBe('number');
  });

  it('ask returns AIResponse', async () => {
    globalThis.fetch = createMockFetch(true, {
      content: JSON.stringify({
        text: 'The answer is 42.',
        citations: [{ source: 'Book', text: 'Life' }],
      }),
    });
    const provider = new AIProviderImpl();

    const response = await provider.ask('What is the meaning?', {});
    expect(response.text).toBe('The answer is 42.');
    expect(response.citations).toHaveLength(1);
    expect(response.citations?.[0]?.source).toBe('Book');
  });

  it('simplify returns simplified text', async () => {
    globalThis.fetch = createMockFetch(true, {
      content: JSON.stringify({ simplified: 'Simple version.' }),
    });
    const provider = new AIProviderImpl();

    const result = await provider.simplify('Complex text here', 'child');
    expect(result).toBe('Simple version.');
  });

  it('handles proxy error gracefully for ask', async () => {
    globalThis.fetch = createMockFetch(false);
    const provider = new AIProviderImpl();
    const response = await provider.ask('test', {});
    expect(response.text).toContain('not available');
    expect(response.citations).toEqual([]);
  });

  it('handles proxy error gracefully for explain', async () => {
    globalThis.fetch = createMockFetch(false);
    const provider = new AIProviderImpl();
    const request: ExplanationRequest = {
      text: 'test',
      context: {},
      style: 'simple',
    };
    const response = await provider.explain(request);
    expect(response.text).toContain('not available');
  });

  it('handles proxy error gracefully for simplify', async () => {
    globalThis.fetch = createMockFetch(false);
    const provider = new AIProviderImpl();
    const result = await provider.simplify('Complex text', 'child');
    expect(result).toBe('Complex text');
  });
});
