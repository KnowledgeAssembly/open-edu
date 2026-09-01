import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import type { AgentRuntimeEvent } from '@open-edu/companion';

const { streamTextMock } = vi.hoisted(() => ({ streamTextMock: vi.fn() }));

vi.mock('ai', () => ({
  streamText: (opts: unknown) => streamTextMock(opts),
}));

vi.mock('@open-edu/llm-config', () => ({
  createModelFactoryFromEnv: () => ({
    getModel: (tier: string) => ({ id: `model-${tier}` }),
  }),
}));

import { AiSdkAgentRuntime } from './AiSdkAgentRuntime';

async function collect(iterable: AsyncIterable<AgentRuntimeEvent>): Promise<AgentRuntimeEvent[]> {
  const events: AgentRuntimeEvent[] = [];
  for await (const event of iterable) {
    events.push(event);
  }
  return events;
}

function streamOf(parts: Array<Record<string, unknown>>) {
  return {
    stream: (async function* () {
      for (const part of parts) {
        yield part;
      }
    })(),
  };
}

describe('AiSdkAgentRuntime', () => {
  beforeEach(() => {
    streamTextMock.mockReset();
  });

  it('yields text.delta events and a final text.complete', async () => {
    streamTextMock.mockReturnValue(
      streamOf([
        { type: 'text-delta', text: 'Hello ' },
        { type: 'text-delta', text: 'world' },
      ]),
    );

    const events = await collect(
      new AiSdkAgentRuntime().run({
        messages: [{ role: 'user', content: 'hi' }],
        systemPrompt: 'you are helpful',
      }),
    );

    expect(events).toEqual([
      { type: 'text.delta', text: 'Hello ' },
      { type: 'text.delta', text: 'world' },
      { type: 'text.complete' },
    ]);
  });

  it('passes the system prompt and messages through to streamText', async () => {
    streamTextMock.mockReturnValue(streamOf([]));

    const request = {
      messages: [{ role: 'user', content: 'Question?' } as const],
      systemPrompt: 'system prompt',
    };
    await collect(new AiSdkAgentRuntime().run(request));

    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        system: 'system prompt',
        messages: request.messages,
        model: expect.objectContaining({ id: 'model-fast' }),
      }),
    );
  });

  it('yields nothing but text.complete when the model returns no deltas', async () => {
    streamTextMock.mockReturnValue(streamOf([]));

    const events = await collect(
      new AiSdkAgentRuntime().run({ messages: [{ role: 'user', content: 'hi' }] }),
    );

    expect(events).toEqual([{ type: 'text.complete' }]);
  });

  it('maps a tool-call stream part into a runtime tool.call event', async () => {
    streamTextMock.mockReturnValue(
      streamOf([
        {
          type: 'tool-call',
          toolCallId: 'call-1',
          toolName: 'generate_item',
          input: { kind: 'quiz' },
        },
        { type: 'text-delta', text: 'done' },
      ]),
    );

    const events = await collect(
      new AiSdkAgentRuntime().run({ messages: [{ role: 'user', content: 'create a quiz' }] }),
    );

    expect(events).toContainEqual({
      type: 'tool.call',
      toolCallId: 'call-1',
      tool: 'generate_item',
      input: { kind: 'quiz' },
    });
    expect(events.at(-1)).toEqual({ type: 'text.complete' });
  });

  it('surfaces an error stream part as a runtime error event', async () => {
    streamTextMock.mockReturnValue(
      streamOf([{ type: 'error', error: new Error('provider down') }]),
    );

    const events = await collect(
      new AiSdkAgentRuntime().run({ messages: [{ role: 'user', content: 'hi' }] }),
    );

    expect(events).toContainEqual({ type: 'error', error: 'provider down' });
  });

  it('forwards declared tools to streamText', async () => {
    streamTextMock.mockReturnValue(streamOf([]));

    await collect(
      new AiSdkAgentRuntime().run({
        messages: [{ role: 'user', content: 'hi' }],
        tools: [{ name: 'generate_item', description: 'Draft an item', inputSchema: z.any() }],
      }),
    );

    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: {
          generate_item: {
            description: 'Draft an item',
            inputSchema: expect.anything(),
          },
        },
      }),
    );
  });

  it('maps tool-role messages into AI SDK tool-call / tool-result content', async () => {
    streamTextMock.mockReturnValue(streamOf([]));

    await collect(
      new AiSdkAgentRuntime().run({
        messages: [
          { role: 'user', content: 'create a quiz' },
          {
            role: 'assistant',
            content: 'Called tool generate_item',
            toolCalls: [{ toolCallId: 'call-1', tool: 'generate_item', input: { kind: 'quiz' } }],
          },
          { role: 'tool', toolCallId: 'call-1', content: '{}' },
        ],
      }),
    );

    const callArgs = streamTextMock.mock.calls[0]![0] as {
      messages: Array<Record<string, unknown>>;
    };
    expect(callArgs.messages[1]).toMatchObject({
      role: 'assistant',
      content: [
        { type: 'text', text: 'Called tool generate_item' },
        {
          type: 'tool-call',
          toolCallId: 'call-1',
          toolName: 'generate_item',
          input: { kind: 'quiz' },
        },
      ],
    });
    expect(callArgs.messages[2]).toMatchObject({
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: 'call-1',
          toolName: 'generate_item',
          output: { type: 'text', value: '{}' },
        },
      ],
    });
  });

  it('keeps assistant tool-call content non-null even when empty', async () => {
    streamTextMock.mockReturnValue(streamOf([]));

    await collect(
      new AiSdkAgentRuntime().run({
        messages: [
          { role: 'user', content: 'create a quiz' },
          {
            role: 'assistant',
            content: '',
            toolCalls: [{ toolCallId: 'call-1', tool: 'generate_item', input: { kind: 'quiz' } }],
          },
        ],
      }),
    );

    const callArgs = streamTextMock.mock.calls[0]![0] as {
      messages: Array<Record<string, unknown>>;
    };
    const content = callArgs.messages[1]!.content as Array<{ type: string; text?: string }>;
    const textPart = content.find((part) => part.type === 'text');
    expect(textPart?.text).toBeTruthy();
    expect(textPart?.text).toContain('generate_item');
  });

  it('keeps plain assistant history content non-null when empty', async () => {
    streamTextMock.mockReturnValue(streamOf([]));

    // A prior tool-call turn in the conversation history is stored as a plain
    // assistant message with empty text. Providers serialize assistant `content`
    // as `text || null`, so an empty string would become `null` and be rejected.
    await collect(
      new AiSdkAgentRuntime().run({
        messages: [
          { role: 'user', content: 'create a quiz' },
          { role: 'assistant', content: '' },
          { role: 'tool', toolCallId: 'call-1', content: '{}' },
        ],
      }),
    );

    const callArgs = streamTextMock.mock.calls[0]![0] as {
      messages: Array<Record<string, unknown>>;
    };
    expect(callArgs.messages[1]).toMatchObject({
      role: 'assistant',
      content: expect.any(String) as unknown,
    });
    expect((callArgs.messages[1] as { content: string }).content.length).toBeGreaterThan(0);
  });
});
