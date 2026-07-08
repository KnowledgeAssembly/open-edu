import { describe, it, expect, vi } from 'vitest';
import { AIProviderImpl } from './AIProviderImpl';
import type { ExplanationRequest } from '@open-edu/ai-companion';

function createMockProvider() {
  return {
    generateStructured: vi.fn(),
  };
}

describe('AIProviderImpl', () => {
  it('explain returns AIResponse with text and citations', async () => {
    const mock = createMockProvider();
    mock.generateStructured.mockResolvedValue({ text: 'Photosynthesis is...', citations: [] });
    const provider = new AIProviderImpl(mock as never);

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
    const mock = createMockProvider();
    mock.generateStructured.mockResolvedValue({
      text: 'The answer is 42.',
      citations: [{ source: 'Book', text: 'Life' }],
    });
    const provider = new AIProviderImpl(mock as never);

    const response = await provider.ask('What is the meaning?', {});
    expect(response.text).toBe('The answer is 42.');
    expect(response.citations).toHaveLength(1);
    expect(response.citations?.[0]?.source).toBe('Book');
  });

  it('simplify returns simplified text', async () => {
    const mock = createMockProvider();
    mock.generateStructured.mockResolvedValue({ simplified: 'Simple version.' });
    const provider = new AIProviderImpl(mock as never);

    const result = await provider.simplify('Complex text here', 'child');
    expect(result).toBe('Simple version.');
  });

  it('handles missing provider gracefully', async () => {
    const provider = new AIProviderImpl();
    const response = await provider.ask('test', {});
    expect(response.text).toContain('not configured');
  });

  it('handles missing provider for explain', async () => {
    const provider = new AIProviderImpl();
    const request: ExplanationRequest = {
      text: 'test',
      context: {},
      style: 'simple',
    };
    const response = await provider.explain(request);
    expect(response.text).toContain('not configured');
  });
});
