import { describe, it, expect, vi } from 'vitest';
import type { UIMessage, UIMessageChunk } from 'ai';
import { createHostedChatTransport } from './StudioChatProvider';
import type { CourseDraftResult, AiItemAddResult, AiItemEditResult } from './types';

function makeUserMessage(content: string): UIMessage {
  return {
    id: `user-${content.slice(0, 10)}`,
    role: 'user',
    parts: [{ type: 'text', text: content, state: 'done' }],
  };
}

async function readStream(stream: ReadableStream<UIMessageChunk>): Promise<UIMessageChunk[]> {
  const reader = stream.getReader();
  const chunks: UIMessageChunk[] = [];
  let finished = false;
  while (!finished) {
    const { done, value } = await reader.read();
    if (done) {
      finished = true;
    } else {
      chunks.push(value);
    }
  }
  return chunks;
}

function finishMeta(chunks: UIMessageChunk[]): Record<string, unknown> | undefined {
  const finish = chunks.find((c) => c.type === 'finish');
  return (finish as { messageMetadata?: Record<string, unknown> } | undefined)?.messageMetadata;
}

function streamText(chunks: UIMessageChunk[]): string {
  return chunks
    .filter((c): c is Extract<UIMessageChunk, { type: 'text-delta' }> => c.type === 'text-delta')
    .map((c) => c.delta)
    .join('');
}

describe('createHostedChatTransport', () => {
  it('short-circuits course-generation intent to generateDraft in browser mode', async () => {
    const courseDraft: CourseDraftResult = {
      success: true,
      draftId: 'draft-123',
      title: 'States of India',
      outlinePreview: [{ title: 'Introduction', kind: 'lesson' }],
      quality: [{ id: 'q1', labelKey: 'quality.interactive', passed: true }],
    };
    const generateDraft = vi.fn().mockResolvedValue(courseDraft);

    const transport = createHostedChatTransport({
      api: '/api/ai/chat',
      buildBody: () => ({ messages: [] }),
      generateDraft,
      courseDraftReadyMessage: 'Course draft ready.',
    });

    const content =
      'Help me create a course from my notes. Course for School students. Exploring different states of India. Capital cities & key historical places. It needs to be interactive & should be engaging.';
    const stream = await transport.sendMessages({
      trigger: 'submit-message',
      messageId: undefined,
      messages: [makeUserMessage(content)],
      chatId: 'chat-1',
      abortSignal: undefined,
    });

    expect(generateDraft).toHaveBeenCalledWith(content);
    expect(stream).toBeInstanceOf(ReadableStream);

    const chunks = await readStream(stream);
    const finishChunk = chunks.find((c) => c.type === 'finish');
    expect(finishChunk).toBeDefined();
    expect(
      (finishChunk as { messageMetadata?: { courseDraft: CourseDraftResult } }).messageMetadata,
    ).toBeDefined();
    expect(
      (finishChunk as { messageMetadata?: { courseDraft: CourseDraftResult } }).messageMetadata
        ?.courseDraft,
    ).toEqual(courseDraft);
  });

  it('falls back to the chat endpoint when no generateDraft callback is provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ terminal: 'finished', content: 'Hello!' }),
    });

    const transport = createHostedChatTransport({
      api: '/api/ai/chat',
      buildBody: () => ({ messages: [] }),
    });

    const stream = await transport.sendMessages({
      trigger: 'submit-message',
      messageId: undefined,
      messages: [makeUserMessage('Summarize this course')],
      chatId: 'chat-2',
      abortSignal: undefined,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/ai/chat',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it('falls back to the chat endpoint when the message is not a course-generation request', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ terminal: 'finished', content: 'Here is a summary.' }),
    });

    const generateDraft = vi.fn();
    const transport = createHostedChatTransport({
      api: '/api/ai/chat',
      buildBody: () => ({ messages: [] }),
      generateDraft,
      courseDraftReadyMessage: 'Course draft ready.',
    });

    const stream = await transport.sendMessages({
      trigger: 'submit-message',
      messageId: undefined,
      messages: [makeUserMessage('What is the capital of France?')],
      chatId: 'chat-3',
      abortSignal: undefined,
    });

    expect(generateDraft).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalled();
    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it('routes a draft-new intent to generateItemAdd and emits a draft card', async () => {
    const generateItemAdd = vi.fn().mockResolvedValue({
      ok: true,
      item: { kind: 'quiz', title: 'Photosynthesis Quiz', content: '{}' },
    } satisfies AiItemAddResult);
    const transport = createHostedChatTransport({
      api: '/api/ai/chat',
      buildBody: () => ({ messages: [] }),
      generateItemAdd,
      draftReadyMessage: (kind) => `Here is a draft ${kind}.`,
      getSuggestedNextSteps: (mode) =>
        mode === 'draft' ? ['Apply this draft', 'Make it easier'] : [],
    });

    const stream = await transport.sendMessages({
      trigger: 'submit-message',
      messageId: undefined,
      messages: [makeUserMessage('create a quiz about photosynthesis')],
      chatId: 'chat-4',
      abortSignal: undefined,
    });

    expect(generateItemAdd).toHaveBeenCalledWith('quiz', 'create a quiz about photosynthesis');
    const chunks = await readStream(stream);
    const meta = finishMeta(chunks) as { drafts?: unknown[]; suggestedNextSteps?: string[] };
    expect(meta?.drafts).toHaveLength(1);
    expect(meta?.drafts?.[0]).toMatchObject({ kind: 'quiz' });
    expect(meta?.suggestedNextSteps).toEqual(['Apply this draft', 'Make it easier']);
    expect(streamText(chunks)).toBe('Here is a draft quiz.');
  });

  it('routes an edit intent to generateItemEdit with the active activity context', async () => {
    const generateItemEdit = vi.fn().mockResolvedValue({
      ok: true,
      items: [{ kind: 'lesson', title: 'Simpler', content: '# Simpler' }],
    } satisfies AiItemEditResult);
    const transport = createHostedChatTransport({
      api: '/api/ai/chat',
      buildBody: () => ({ messages: [] }),
      generateItemEdit,
      editReadyMessage: 'Here is the updated version.',
      getCurrentActivity: () => ({
        path: 'nodes/lesson.md',
        kind: 'lesson',
        title: 'Lesson',
        contentExcerpt: '# Original\n\nBody',
      }),
    });

    const stream = await transport.sendMessages({
      trigger: 'submit-message',
      messageId: undefined,
      messages: [makeUserMessage('Make this simpler')],
      chatId: 'chat-5',
      abortSignal: undefined,
    });

    expect(generateItemEdit).toHaveBeenCalledWith('lesson', 'difficulty', '# Original\n\nBody', {
      direction: 'easier',
    });
    const chunks = await readStream(stream);
    const meta = finishMeta(chunks) as { drafts?: unknown[] };
    expect(meta?.drafts).toHaveLength(1);
  });

  it('uses a plain-string draftReadyMessage when draftReadyMessage is a string', async () => {
    const generateItemAdd = vi.fn().mockResolvedValue({
      ok: true,
      item: { kind: 'lesson', title: 'Photosynthesis Lesson', content: '{}' },
    } satisfies AiItemAddResult);
    const transport = createHostedChatTransport({
      api: '/api/ai/chat',
      buildBody: () => ({ messages: [] }),
      generateItemAdd,
      draftReadyMessage: 'Here is your draft.',
    });

    const stream = await transport.sendMessages({
      trigger: 'submit-message',
      messageId: undefined,
      messages: [makeUserMessage('create a lesson about photosynthesis')],
      chatId: 'chat-string-draft',
      abortSignal: undefined,
    });

    expect(generateItemAdd).toHaveBeenCalledWith(
      'lesson',
      'create a lesson about photosynthesis',
    );
    const chunks = await readStream(stream);
    const meta = finishMeta(chunks) as { drafts?: unknown[] };
    expect(meta?.drafts).toHaveLength(1);
    expect(streamText(chunks)).toBe('Here is your draft.');
  });

  it('prompts to open an activity when an edit is requested without an active activity', async () => {
    const generateItemEdit = vi.fn();
    const transport = createHostedChatTransport({
      api: '/api/ai/chat',
      buildBody: () => ({ messages: [] }),
      generateItemEdit,
      getCurrentActivity: () => undefined,
      messages: { needOpenActivity: 'Open an activity first, please.' },
    });

    const stream = await transport.sendMessages({
      trigger: 'submit-message',
      messageId: undefined,
      messages: [makeUserMessage('Rewrite this to be simpler')],
      chatId: 'chat-6',
      abortSignal: undefined,
    });

    expect(generateItemEdit).not.toHaveBeenCalled();
    const chunks = await readStream(stream);
    expect(finishMeta(chunks)?.mode).toBe('explain');
    expect(streamText(chunks)).toContain('Open an activity first');
  });

  it('shows a localized course prompt when course generation reports no active course', async () => {
    const generateDraft = vi.fn().mockRejectedValue({ code: 'no-active-course' });
    const transport = createHostedChatTransport({
      api: '/api/ai/chat',
      buildBody: () => ({ messages: [] }),
      generateDraft,
      messages: { needOpenCourse: 'Open a course first.' },
    });

    const stream = await transport.sendMessages({
      trigger: 'submit-message',
      messageId: undefined,
      messages: [makeUserMessage(COURSE_NOTES)],
      chatId: 'chat-7',
      abortSignal: undefined,
    });

    const chunks = await readStream(stream);
    expect(finishMeta(chunks)?.mode).toBe('explain');
    expect(streamText(chunks)).toContain('Open a course first.');
  });

  it('emits a friendly failure when generateItemAdd reports a failure', async () => {
    const generateItemAdd = vi.fn().mockResolvedValue({
      ok: false,
      code: 'item-retry-failed',
      error: 'provider error',
    });
    const transport = createHostedChatTransport({
      api: '/api/ai/chat',
      buildBody: () => ({ messages: [] }),
      generateItemAdd,
      messages: { draftFailed: "I couldn't create that draft." },
    });

    const stream = await transport.sendMessages({
      trigger: 'submit-message',
      messageId: undefined,
      messages: [makeUserMessage('create a lesson about fractions')],
      chatId: 'chat-8',
      abortSignal: undefined,
    });

    const chunks = await readStream(stream);
    expect(finishMeta(chunks)?.mode).toBe('explain');
    expect(streamText(chunks)).toContain("couldn't create");
  });
});

const COURSE_NOTES =
  'Help me create a course from my notes. Course for School students. Exploring different states of India. Capital cities & key historical places. It needs to be interactive & should be engaging.';
