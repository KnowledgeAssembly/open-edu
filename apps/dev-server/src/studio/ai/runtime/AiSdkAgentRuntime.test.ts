import { describe, it, expect, vi, beforeEach } from 'vitest';
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

function streamOf(parts: Array<{ type: string; text?: string }>) {
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
});
