import { describe, it, expect } from 'vitest';
import type { UIMessage, UIMessageChunk } from 'ai';
import { CompanionChatTransport } from './CompanionChatTransport';
import type { CompanionClient, CompanionTransportEvent } from './CompanionClient';
import { DEFAULT_PERMISSIONS } from './CompanionClient';
import { companionEventsToUIMessageChunks } from './companionToUIMessage';
import { uiStreamToCompanionEvents } from './uiStreamToCompanionEvents';
import type { StudioContextSnapshot } from './context';

async function readChunks(stream: ReadableStream<UIMessageChunk>): Promise<UIMessageChunk[]> {
  const reader = stream.getReader();
  const chunks: UIMessageChunk[] = [];
  let done = false;
  while (!done) {
    const { done: finished, value } = await reader.read();
    if (finished) {
      done = true;
    } else {
      chunks.push(value);
    }
  }
  return chunks;
}

function chunkText(chunks: UIMessageChunk[]): string {
  return chunks
    .filter((c): c is Extract<UIMessageChunk, { type: 'text-delta' }> => c.type === 'text-delta')
    .map((c) => c.delta)
    .join('');
}

function chunkMeta(chunks: UIMessageChunk[]): Record<string, unknown> | undefined {
  const finish = chunks.find((c) => c.type === 'finish') as
    | { messageMetadata?: Record<string, unknown> }
    | undefined;
  return finish?.messageMetadata;
}

const snapshot: StudioContextSnapshot = {
  view: 'outline',
  locale: 'en',
  aiAvailable: true,
  course: {
    id: 'c1',
    title: 'Fractions',
    activityCount: 1,
    outline: [{ title: 'A', kind: 'lesson', path: 'nodes/a.md' }],
  },
};

function makeUserMessage(content: string): UIMessage {
  return {
    id: `user-${content.slice(0, 8)}`,
    role: 'user',
    parts: [{ type: 'text', text: content, state: 'done' }],
  };
}

describe('companionEventsToUIMessageChunks', () => {
  it('maps message.delta events to text-delta chunks and emits finish', async () => {
    async function* events(): AsyncGenerator<CompanionTransportEvent> {
      yield { type: 'message.delta', text: 'Hello' };
      yield { type: 'message.delta', text: ' world' };
      yield { type: 'message.complete' };
    }

    const chunks = await readChunks(companionEventsToUIMessageChunks(events()));
    expect(chunkText(chunks)).toBe('Hello world');
    expect(chunkMeta(chunks)).toBeUndefined();
    expect(chunks.some((c) => c.type === 'finish')).toBe(true);
  });

  it('preserves the ui.finish bridge metadata on the finish chunk', async () => {
    async function* events(): AsyncGenerator<CompanionTransportEvent> {
      yield { type: 'message.delta', text: 'Here is a draft' };
      yield { type: 'ui.finish', messageMetadata: { mode: 'draft', drafts: [{ kind: 'quiz' }] } };
    }

    const chunks = await readChunks(companionEventsToUIMessageChunks(events()));
    expect(chunkText(chunks)).toBe('Here is a draft');
    expect(chunkMeta(chunks)).toMatchObject({ mode: 'draft', drafts: [{ kind: 'quiz' }] });
  });

  it('emits a stream even when no events are produced', async () => {
    async function* events(): AsyncGenerator<CompanionTransportEvent> {}
    const chunks = await readChunks(companionEventsToUIMessageChunks(events()));
    expect(chunks.some((c) => c.type === 'start')).toBe(true);
    expect(chunks.some((c) => c.type === 'finish')).toBe(true);
  });
});

describe('uiStreamToCompanionEvents', () => {
  it('converts a transport UI stream back into Companion events', async () => {
    function stream(): ReadableStream<UIMessageChunk> {
      const textId = 't1';
      return new ReadableStream<UIMessageChunk>({
        start(controller) {
          controller.enqueue({ type: 'text-start', id: textId });
          controller.enqueue({ type: 'text-delta', id: textId, delta: 'Hi' });
          controller.enqueue({ type: 'text-end', id: textId });
          controller.enqueue({
            type: 'finish',
            finishReason: 'stop',
            messageMetadata: { mode: 'explain' },
          } as UIMessageChunk);
          controller.close();
        },
      });
    }

    const output: CompanionTransportEvent[] = [];
    for await (const event of uiStreamToCompanionEvents(stream())) {
      output.push(event);
    }
    expect(output).toContainEqual({ type: 'message.delta', text: 'Hi' });
    expect(output).toContainEqual({ type: 'ui.finish', messageMetadata: { mode: 'explain' } });
    expect(output.at(-1)).toEqual({ type: 'message.complete' });
  });
});

describe('CompanionChatTransport', () => {
  it('builds the CompanionRequest and maps client events to UI chunks', async () => {
    const client: CompanionClient = {
      run: (request, transport) => {
        if (!transport) throw new Error('transport input missing');
        return (async function* () {
          expect(request.message).toBe('make a quiz');
          expect(request.context.course?.id).toBe('c1');
          expect(request.conversationId).toBe('chat-9');
          expect(request.permissions).toEqual(DEFAULT_PERMISSIONS);
          yield { type: 'message.delta', text: 'Quiz ready' };
          yield {
            type: 'ui.finish',
            messageMetadata: { mode: 'draft', drafts: [{ kind: 'quiz' }] },
          };
        })();
      },
    };

    const transport = new CompanionChatTransport<UIMessage>({
      client,
      buildRequest: () => ({
        message: 'make a quiz',
        context: snapshot,
        permissions: DEFAULT_PERMISSIONS,
      }),
    });

    const chunks = await readChunks(
      await transport.sendMessages({
        trigger: 'submit-message',
        messageId: undefined,
        messages: [makeUserMessage('make a quiz')],
        chatId: 'chat-9',
        abortSignal: undefined,
      }),
    );

    expect(chunkText(chunks)).toBe('Quiz ready');
    expect(chunkMeta(chunks)).toMatchObject({ mode: 'draft', drafts: [{ kind: 'quiz' }] });
  });
});
