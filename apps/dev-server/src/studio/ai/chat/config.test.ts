import { describe, it, expect } from 'vitest';
import {
  StudioChatRequestSchema,
  MAX_CONTEXT_CHARS,
  MAX_MESSAGES,
  MAX_REQUEST_SIZE_BYTES,
  type StudioChatRequest,
} from './config.js';

describe('chat/config facade re-export', () => {
  it('resolves the shared schema and constants from @open-edu/companion/chat', () => {
    const parsed = StudioChatRequestSchema.parse({
      messages: [{ role: 'assistant', content: '' }],
      context: { view: 'outline', locale: 'en', aiAvailable: true },
    });
    expect(parsed.messages[0]!.content).toBe('');
    expect(typeof MAX_CONTEXT_CHARS).toBe('number');
    expect(MAX_MESSAGES).toBe(50);
    expect(MAX_REQUEST_SIZE_BYTES).toBeGreaterThan(0);
  });

  it('exposes the inferred request type', () => {
    const request: StudioChatRequest = {
      conversationId: 'c',
      messages: [{ role: 'user', content: 'hi' }],
      context: { view: 'home', locale: 'en', aiAvailable: true },
    };
    expect(request.conversationId).toBe('c');
  });
});
