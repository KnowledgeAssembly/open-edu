import { describe, it, expect } from 'vitest';
import {
  StudioChatRequestSchema,
  MAX_CONTEXT_CHARS,
  MAX_MESSAGES,
  MAX_REQUEST_SIZE_BYTES,
  toAiSdkMessages,
  fromUIMessage,
} from './chat.js';
import type { AgentRuntimeMessage } from './runtime.js';

const context = {
  view: 'outline' as const,
  locale: 'en',
  aiAvailable: true,
};

describe('StudioChatRequestSchema', () => {
  it('accepts the same message arrays as the dev-server handler', () => {
    const parsed = StudioChatRequestSchema.parse({
      conversationId: 'conv-1',
      messages: [
        { role: 'user', content: 'Create a quiz' },
        { role: 'assistant', content: 'Here is a draft' },
        { role: 'system', content: 'You are the assistant' },
      ],
      context,
    });
    expect(parsed.messages).toHaveLength(3);
  });

  it('allows empty assistant content (tool-call turns are valid)', () => {
    const parsed = StudioChatRequestSchema.parse({
      messages: [{ role: 'assistant', content: '' }],
      context,
    });
    expect(parsed.messages[0]!.content).toBe('');
  });

  it('requires a context snapshot', () => {
    const result = StudioChatRequestSchema.safeParse({ messages: [] });
    expect(result.success).toBe(false);
  });

  it('does not enforce the message cap (the handler does)', () => {
    const messages = Array.from({ length: MAX_MESSAGES + 10 }, (_, i) => ({
      role: 'user' as const,
      content: `m${i}`,
    }));
    const parsed = StudioChatRequestSchema.parse({ messages, context });
    expect(parsed.messages).toHaveLength(MAX_MESSAGES + 10);
  });

  it('exposes the shared constants', () => {
    expect(MAX_CONTEXT_CHARS).toBeTypeOf('number');
    expect(MAX_MESSAGES).toBe(50);
    expect(MAX_REQUEST_SIZE_BYTES).toBeGreaterThan(0);
  });
});

describe('toAiSdkMessages', () => {
  it('keeps plain assistant content non-null when empty', () => {
    const messages: AgentRuntimeMessage[] = [
      { role: 'user', content: 'create a quiz' },
      { role: 'assistant', content: '' },
    ];
    const out = toAiSdkMessages(messages);
    const assistant = out[1] as { role: string; content: string };
    expect(assistant.role).toBe('assistant');
    expect(assistant.content).toBeTruthy();
  });

  it('keeps assistant tool-call content non-null when text is empty', () => {
    const messages: AgentRuntimeMessage[] = [
      { role: 'user', content: 'create a quiz' },
      {
        role: 'assistant',
        content: '',
        toolCalls: [{ toolCallId: 'call-1', tool: 'generate_item', input: { kind: 'quiz' } }],
      },
    ];
    const out = toAiSdkMessages(messages);
    const assistant = out[1] as { role: string; content: Array<{ type: string; text?: string }> };
    const textPart = assistant.content.find((p) => p.type === 'text');
    expect(textPart?.text).toBeTruthy();
    expect(textPart?.text).toContain('generate_item');
  });

  it('maps tool role into a tool-result part with resolved toolName', () => {
    const messages: AgentRuntimeMessage[] = [
      { role: 'user', content: 'create a quiz' },
      {
        role: 'assistant',
        content: 'Called generate_item',
        toolCalls: [{ toolCallId: 'call-1', tool: 'generate_item', input: { kind: 'quiz' } }],
      },
      { role: 'tool', toolCallId: 'call-1', content: '{}' },
    ];
    const out = toAiSdkMessages(messages);
    const tool = out[2] as { role: string; content: Array<Record<string, unknown>> };
    expect(tool.role).toBe('tool');
    expect(tool.content[0]).toMatchObject({
      type: 'tool-result',
      toolCallId: 'call-1',
      toolName: 'generate_item',
      output: { type: 'text', value: '{}' },
    });
  });

  it('falls back to a generic toolName for unknown tool results', () => {
    const messages: AgentRuntimeMessage[] = [
      { role: 'tool', toolCallId: 'unknown', content: '{}' },
    ];
    const out = toAiSdkMessages(messages);
    const tool = out[0] as { content: Array<Record<string, unknown>> };
    expect(tool.content[0]).toMatchObject({ toolName: 'tool' });
  });
});

describe('fromUIMessage', () => {
  it('joins text parts from a v7 UIMessage-shaped object', () => {
    expect(
      fromUIMessage({
        role: 'user',
        parts: [
          { type: 'text', text: 'Create ' },
          { type: 'text', text: 'a quiz' },
        ],
      }),
    ).toEqual({ role: 'user', content: 'Create a quiz' });
  });

  it('falls back to content when no parts exist', () => {
    expect(fromUIMessage({ role: 'assistant', content: 'Hi' })).toEqual({
      role: 'assistant',
      content: 'Hi',
    });
  });

  it('prefers parts when both parts and a content fallback are present', () => {
    expect(
      fromUIMessage({
        role: 'assistant',
        parts: [{ type: 'text', text: 'from parts' }],
        content: 'from content',
      }),
    ).toEqual({ role: 'assistant', content: 'from parts' });
  });

  it('returns empty content for tool-call turns', () => {
    expect(
      fromUIMessage({
        role: 'assistant',
        parts: [
          {
            type: 'tool-call',
            toolCallId: 'c1',
            toolName: 'generate_item',
            args: {},
          } as unknown as { type: string; text?: string },
        ],
      }),
    ).toEqual({ role: 'assistant', content: '' });
  });

  it('defaults an unknown/missing role to user', () => {
    expect(fromUIMessage({ parts: [{ type: 'text', text: 'hello' }] })).toEqual({
      role: 'user',
      content: 'hello',
    });
  });
});
