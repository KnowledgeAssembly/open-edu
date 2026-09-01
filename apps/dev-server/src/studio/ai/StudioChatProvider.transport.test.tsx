import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { UIMessage } from 'ai';
import { HttpCompanionClient } from './HttpCompanionClient';
import type { CompanionTransportEvent } from './CompanionClient';

function makeUserMessage(content: string): UIMessage {
  return {
    id: `user-${content.slice(0, 8)}`,
    role: 'user',
    parts: [{ type: 'text', text: content, state: 'done' }],
  };
}

function sseResponse(chunks: Array<Record<string, unknown>>): Response {
  const body = chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join('');
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

async function collect(
  iterable: AsyncIterable<CompanionTransportEvent>,
): Promise<CompanionTransportEvent[]> {
  const events: CompanionTransportEvent[] = [];
  for await (const event of iterable) {
    events.push(event);
  }
  return events;
}

describe('HttpCompanionClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs to the single /api/studio/ai/chat endpoint with the shared buildBody', async () => {
    fetchMock.mockResolvedValue(
      sseResponse([
        { type: 'start', messageId: 'm1', role: 'assistant' },
        { type: 'text-start', id: 't1' },
        { type: 'text-delta', id: 't1', delta: 'Ok' },
        { type: 'text-end', id: 't1' },
        { type: 'finish', finishReason: 'stop' },
      ]),
    );

    const client = new HttpCompanionClient({
      api: '/api/studio/ai/chat',
      buildBody: (messages, chatId) => ({
        conversationId: chatId,
        messages: messages.map((m) => ({ role: m.role, content: extractText(m) })),
        context: { view: 'outline', locale: 'en', aiAvailable: true },
      }),
    });

    const events = await collect(
      client.run(
        {
          message: 'Summarize',
          context: { view: 'outline', locale: 'en', aiAvailable: true },
          conversationId: 'chat-1',
          permissions: { allowed: [], requireApprovalFor: [] },
        },
        { messages: [makeUserMessage('Summarize this course')], chatId: 'chat-1' },
      ),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/studio/ai/chat');
    expect((init as RequestInit).method).toBe('POST');
    const body = JSON.parse((init as RequestInit).body as string) as {
      conversationId: string;
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.conversationId).toBe('chat-1');
    expect(body.messages).toEqual([{ role: 'user', content: 'Summarize this course' }]);

    expect(events).toContainEqual({ type: 'message.delta', text: 'Ok' });
    expect(events.at(-1)).toEqual({ type: 'message.complete' });
  });

  it('does not branch on intent: a tool-intent message is POSTed to the loop endpoint', async () => {
    fetchMock.mockResolvedValue(sseResponse([{ type: 'start', messageId: 'm1' }]));

    const client = new HttpCompanionClient({
      api: '/api/studio/ai/chat',
      buildBody: (messages, chatId) => ({
        conversationId: chatId,
        messages: messages.map((m) => ({ role: m.role, content: extractText(m) })),
      }),
    });

    const events = await collect(
      client.run(
        {
          message: 'Add this quiz to course',
          context: { view: 'outline', locale: 'en', aiAvailable: true },
          conversationId: 'chat-2',
          permissions: { allowed: [], requireApprovalFor: [] },
        },
        { messages: [makeUserMessage('Add this quiz to course')], chatId: 'chat-2' },
      ),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/studio/ai/chat');
    expect(events.at(-1)).toEqual({ type: 'message.complete' });
  });

  it('throws a readable error when the endpoint is unavailable', async () => {
    fetchMock.mockResolvedValue(new Response('ai-unavailable', { status: 503 }));

    const client = new HttpCompanionClient({
      api: '/api/studio/ai/chat',
      buildBody: () => ({ messages: [] }),
    });

    await expect(
      collect(
        client.run(
          {
            message: 'hi',
            context: { view: 'home', locale: 'en', aiAvailable: true },
            conversationId: 'c',
            permissions: { allowed: [], requireApprovalFor: [] },
          },
          { messages: [makeUserMessage('hi')], chatId: 'c' },
        ),
      ),
    ).rejects.toThrow('ai-unavailable');
  });
});

/** Mirror of the shared fromUIMessage flattening used only to build the wire body. */
function extractText(msg: {
  parts?: Array<{ type: string; text?: string }>;
  content?: string;
}): string {
  if (msg.parts?.length) {
    return msg.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('');
  }
  return msg.content ?? '';
}
