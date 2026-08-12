import { describe, it, expect, vi } from 'vitest';
import type { StudioContextSnapshot } from '../context';

const mockGenerateText = vi.fn().mockResolvedValue({ text: 'Mocked AI response' });

vi.mock('ai', () => ({
  generateText: mockGenerateText,
}));

vi.mock('@open-edu/llm-config', () => ({
  createModelFactoryFromEnv: vi.fn().mockReturnValue({
    getModel: vi.fn().mockReturnValue('mock-model'),
  }),
}));

const { createStudioAssistantHandler } = await import('./handler');

describe('createStudioAssistantHandler', () => {
  const mockContext: Partial<StudioContextSnapshot> = {
    view: 'home',
    locale: 'en',
    aiAvailable: true,
  };

  const validRequest = {
    conversationId: 'test-conv',
    messages: [{ role: 'user', content: 'Hello' }],
    context: mockContext,
  };

  it('returns 200 and assistant response for valid request', async () => {
    const result = await createStudioAssistantHandler(validRequest);
    expect(result.status).toBe(200);
    expect(result.body.content).toBe('Mocked AI response');
    expect((result.body as any).metadata.mode).toBe('explain');
  });

  it('returns 400 for invalid request body', async () => {
    const invalidRequest = { messages: [] };
    const result = await createStudioAssistantHandler(invalidRequest);
    expect(result.status).toBe(400);
  });

  it('handles LLM errors with 500 and safe message', async () => {
    mockGenerateText.mockRejectedValueOnce(new Error('LLM Failure'));
    const result = await createStudioAssistantHandler(validRequest);
    expect(result.status).toBe(500);
    expect(result.body.error).toBe('LLM Failure');
  });

  it('returns 400 when messages exceed MAX_MESSAGES', async () => {
    const tooManyMessages = Array.from({ length: 51 }, (_, i) => ({
      role: 'user' as const,
      content: `Message ${i}`,
    }));
    const result = await createStudioAssistantHandler({
      ...validRequest,
      messages: tooManyMessages,
    });
    expect(result.status).toBe(400);
    expect(result.body.error).toContain('Too many messages');
  });

  it('sanitizes non-Error exceptions to safe message', async () => {
    mockGenerateText.mockRejectedValueOnce('string error');
    const result = await createStudioAssistantHandler(validRequest);
    expect(result.status).toBe(500);
    expect(result.body.error).toBe('An error occurred');
  });
});