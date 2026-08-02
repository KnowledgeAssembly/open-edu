import { describe, it, expect } from 'vitest';
import { z as z4 } from 'zod/v4';
import { convertToModelMessages, modelMessageSchema, type UIMessage } from 'ai';
import { pipiliMessageSchema, pipiliRequestSchema } from '../config.js';

describe('pipiliMessageSchema', () => {
  it('preserves tool part fields when validating a turn-1 assistant message', () => {
    const parsed = pipiliMessageSchema.parse({
      id: 'a1',
      role: 'assistant',
      parts: [
        { type: 'text', text: 'Let me check.' },
        {
          type: 'tool-searchNotes',
          toolCallId: 'call_1',
          state: 'output-available',
          input: { query: 'atoms' },
          output: { results: [] },
          providerExecuted: true,
        },
      ],
    });

    const toolPart = parsed.parts!.find((p) => p.type.startsWith('tool-')) as {
      type: string;
      toolCallId?: string;
      state?: string;
      input?: unknown;
      output?: unknown;
      providerExecuted?: boolean;
    };
    expect(toolPart.toolCallId).toBe('call_1');
    expect(toolPart.state).toBe('output-available');
    expect(toolPart.input).toEqual({ query: 'atoms' });
    expect(toolPart.output).toEqual({ results: [] });
    expect(toolPart.providerExecuted).toBe(true);
  });
});

describe('pipiliRequestSchema → convertToModelMessages', () => {
  it('produces valid model messages when a tool-using assistant turn is sent back', async () => {
    const request = pipiliRequestSchema.parse({
      conversationId: 'c1',
      messages: [
        { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Explain atoms.' }] },
        {
          id: 'a1',
          role: 'assistant',
          parts: [
            { type: 'text', text: 'Let me check.' },
            {
              type: 'tool-searchNotes',
              toolCallId: 'call_1',
              state: 'output-available',
              input: { query: 'atoms' },
              output: { results: [] },
              providerExecuted: true,
            },
            { type: 'text', text: 'Atoms are the smallest unit of matter.' },
          ],
        },
        { id: 'u2', role: 'user', parts: [{ type: 'text', text: 'Tell me more.' }] },
      ],
      context: {},
    });

    const modelMessages = await convertToModelMessages(request.messages as UIMessage[]);
    const result = z4.array(modelMessageSchema).safeParse(modelMessages);

    expect(result.success).toBe(true);
    const assistant = modelMessages.find((m) => m.role === 'assistant') as {
      content: Array<{ type: string; toolName?: string }>;
    };
    const toolCall = assistant.content.find((p) => p.type === 'tool-call');
    expect(toolCall).toBeDefined();
    expect(toolCall?.toolName).toBe('searchNotes');
  });
});
