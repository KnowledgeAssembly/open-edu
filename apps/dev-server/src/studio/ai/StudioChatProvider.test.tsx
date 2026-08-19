import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState, type ReactNode } from 'react';
import { I18nProvider } from '@open-edu/i18n';
import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { StudioAssistantProvider, useStudioAssistant } from './StudioAssistantProvider';
import { StudioChatProvider, useStudioChat } from './StudioChatProvider';
import { EditorBridgeProvider } from './EditorBridgeContext';
import { ConversationStore } from './ConversationStore';
import { setConversationId } from './assistantStorage';
import type { StudioContextSnapshot } from './context';
import type { CourseDraftResult, DraftItem } from './types';
import type { StudioApi } from '../studioApi';
import { BrowserStudioApiError } from '../browserStudioApi';

interface ChatApi {
  messages: unknown[];
  sendMessage: ReturnType<typeof vi.fn>;
  regenerate: ReturnType<typeof vi.fn>;
  status: string;
  stop: ReturnType<typeof vi.fn>;
  clearError: ReturnType<typeof vi.fn>;
  setMessages: (m: unknown[]) => void;
  error: undefined;
}

const { capturedUseChatOptions } = vi.hoisted(() => ({
  capturedUseChatOptions: { current: undefined as undefined | Record<string, unknown> },
}));

vi.mock('@ai-sdk/react', () => ({
  useChat: (options: Record<string, unknown>) => {
    capturedUseChatOptions.current = options as Record<string, unknown>;
    const [messages, setMessages] = useState<unknown[]>([]);
    const api: ChatApi = {
      messages,
      sendMessage: vi.fn(),
      regenerate: vi.fn(),
      status: 'ready',
      stop: vi.fn(),
      clearError: vi.fn(),
      setMessages,
      error: undefined,
    };
    return api;
  },
}));

function ContextSeeder({
  snapshot,
  children,
}: {
  snapshot: StudioContextSnapshot;
  children: ReactNode;
}) {
  const { setContext } = useStudioAssistant();
  useEffect(() => {
    setContext(snapshot);
  }, [setContext, snapshot]);
  return <>{children}</>;
}

const snapshot: StudioContextSnapshot = {
  view: 'outline',
  locale: 'en',
  aiAvailable: true,
  course: {
    id: 'course-x',
    title: 'Course',
    activityCount: 2,
    outline: [
      { title: 'A', kind: 'lesson', path: 'nodes/a.md' },
      { title: 'B', kind: 'quiz', path: 'nodes/b.json' },
    ],
  },
};

function Consumer() {
  const { messages, clearMessages } = useStudioChat();
  return (
    <div>
      <button type="button" onClick={clearMessages}>
        New conversation
      </button>
      {messages.length === 0 ? (
        <p data-testid="empty">empty</p>
      ) : (
        <ul>
          {messages.map((m) => (
            <li key={m.id} data-testid="message">
              {m.content}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function wrap() {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      <StudioAssistantProvider>
        <EditorBridgeProvider>
          <StudioChatProvider courseId="course-x">
            <ContextSeeder snapshot={snapshot}>
              <Consumer />
            </ContextSeeder>
          </StudioChatProvider>
        </EditorBridgeProvider>
      </StudioAssistantProvider>
    </I18nProvider>,
  );
}

describe('StudioChatProvider new conversation', () => {
  let store: ConversationStore;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    store = new ConversationStore();
    await store.saveMessages('course-x', [
      { id: 'user-1', role: 'user', content: 'Old question', createdAt: 1 },
      { id: 'assistant-1', role: 'assistant', content: 'Old answer', createdAt: 2 },
    ]);
    setConversationId('course-x', 'old-thread');
  });

  afterEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    try {
      await store.clearMessages('course-x');
    } catch {
      // ignore
    }
  });

  it('starts a fresh chat after a single New conversation click without showing old messages', async () => {
    const user = userEvent.setup();
    wrap();

    // History hydrates from the pre-seeded store.
    await waitFor(() => {
      expect(screen.getByText('Old question')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'New conversation' }));

    // A single click must produce an empty thread (no stale messages reappear).
    await waitFor(() => {
      expect(screen.getByTestId('empty')).toBeInTheDocument();
    });
    expect(screen.queryAllByTestId('message')).toHaveLength(0);
  });
});

const COURSE_NOTES =
  'Help me create a course from my notes. Course for School students. Exploring different states of India. Capital cities & key historical places. It needs to be interactive & should be engaging.';

const editSnapshot: StudioContextSnapshot = {
  ...snapshot,
  activity: {
    path: 'nodes/lesson.md',
    kind: 'lesson',
    title: 'Lesson',
    contentExcerpt: '# Original\n\nBody',
  },
};

function makeUserMessage(content: string): UIMessage {
  return {
    id: `user-${content.slice(0, 10)}`,
    role: 'user',
    parts: [{ type: 'text', text: content, state: 'done' }],
  };
}

async function readChunks(stream: ReadableStream<UIMessageChunk>): Promise<UIMessageChunk[]> {
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

function finishMetadata(chunks: UIMessageChunk[]): Record<string, unknown> | undefined {
  const finish = chunks.find((c) => c.type === 'finish');
  return (finish as { messageMetadata?: Record<string, unknown> } | undefined)?.messageMetadata;
}

function chunkText(chunks: UIMessageChunk[]): string {
  return chunks
    .filter((c): c is Extract<UIMessageChunk, { type: 'text-delta' }> => c.type === 'text-delta')
    .map((c) => c.delta)
    .join('');
}

describe('StudioChatProvider browser-mode intent routing', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    capturedUseChatOptions.current = undefined;
  });

  async function renderBrowserChat(
    api: Partial<StudioApi>,
    context: StudioContextSnapshot = snapshot,
  ) {
    render(
      <I18nProvider
        locale="en"
        dictionaries={{ en: { studio: studioEn as Record<string, string> } }}
      >
        <StudioAssistantProvider>
          <EditorBridgeProvider>
            <StudioChatProvider
              courseId="course-x"
              api={api as StudioApi}
              chatApiUrl="/api/ai/chat"
            >
              <ContextSeeder snapshot={context}>
                <div />
              </ContextSeeder>
            </StudioChatProvider>
          </EditorBridgeProvider>
        </StudioAssistantProvider>
      </I18nProvider>,
    );
    await waitFor(() => expect(capturedUseChatOptions.current).toBeDefined());
    await act(async () => {});
  }

  async function sendViaTransport(content: string, chatId = 'chat-1'): Promise<UIMessageChunk[]> {
    const transport = capturedUseChatOptions.current
      ?.transport as unknown as ChatTransport<UIMessage>;
    const stream = await transport.sendMessages({
      trigger: 'submit-message',
      messageId: undefined,
      messages: [makeUserMessage(content)],
      chatId,
      abortSignal: undefined,
    });
    return readChunks(stream);
  }

  it('routes a course-generation message to generateCourseDraft and emits a course_draft', async () => {
    const courseDraft: CourseDraftResult = {
      success: true,
      draftId: 'draft-1',
      title: 'States of India',
      outlinePreview: [{ title: 'Introduction', kind: 'lesson' }],
      quality: [{ id: 'q1', labelKey: 'quality.ok', passed: true }],
    };
    const generateCourseDraft = vi.fn().mockResolvedValue(courseDraft);
    await renderBrowserChat({ generateCourseDraft });

    const chunks = await sendViaTransport(COURSE_NOTES);
    const meta = finishMetadata(chunks) as Record<string, unknown> & {
      courseDraft?: CourseDraftResult;
      drafts?: DraftItem[];
      suggestedNextSteps?: string[];
    };

    expect(generateCourseDraft).toHaveBeenCalledWith(COURSE_NOTES);
    expect(meta?.mode).toBe('course_draft');
    expect(meta?.courseDraft).toEqual(courseDraft);
    expect(Array.isArray(meta?.suggestedNextSteps)).toBe(true);
  });

  it('routes a create-quiz message to generateItemAdd and emits a draft card', async () => {
    const generateItemAdd = vi.fn().mockResolvedValue({
      ok: true,
      item: { kind: 'quiz', title: 'Photosynthesis Quiz', content: '{}' },
    });
    await renderBrowserChat({ generateItemAdd });

    const chunks = await sendViaTransport('create a quiz about photosynthesis');
    const meta = finishMetadata(chunks) as Record<string, unknown> & { drafts?: DraftItem[] };

    expect(generateItemAdd).toHaveBeenCalledWith('quiz', 'create a quiz about photosynthesis');
    expect(meta?.mode).toBe('draft');
    expect(meta?.drafts).toHaveLength(1);
    expect((meta?.drafts as DraftItem[])[0]).toMatchObject({ kind: 'quiz' });
  });

  it('routes an edit message to generateItemEdit with the active activity context', async () => {
    const generateItemEdit = vi.fn().mockResolvedValue({
      ok: true,
      items: [{ kind: 'lesson', title: 'Simpler', content: '# Simpler' }],
    });
    await renderBrowserChat({ generateItemEdit }, editSnapshot);

    const chunks = await sendViaTransport('Make this simpler');
    const meta = finishMetadata(chunks) as Record<string, unknown> & { drafts?: DraftItem[] };

    expect(generateItemEdit).toHaveBeenCalledWith('lesson', 'difficulty', '# Original\n\nBody', {
      direction: 'easier',
    });
    expect(meta?.mode).toBe('draft');
    expect(meta?.drafts).toHaveLength(1);
  });

  it('prompts to open an activity when an edit is requested without an open activity', async () => {
    const generateItemEdit = vi.fn();
    await renderBrowserChat({ generateItemEdit });

    const chunks = await sendViaTransport('Rewrite this to be simpler');
    const meta = finishMetadata(chunks) as Record<string, unknown>;

    expect(generateItemEdit).not.toHaveBeenCalled();
    expect(meta?.mode).toBe('explain');
    expect(chunkText(chunks)).toContain('Open an activity first');
  });

  it('shows a localized course prompt when course generation fails with no-active-course', async () => {
    const generateCourseDraft = vi
      .fn()
      .mockRejectedValue(new BrowserStudioApiError('no-active-course', 'No course is open'));
    await renderBrowserChat({ generateCourseDraft });

    const chunks = await sendViaTransport(COURSE_NOTES);
    const meta = finishMetadata(chunks) as Record<string, unknown>;

    expect(meta?.mode).toBe('explain');
    expect(chunkText(chunks)).toContain('Open a course first');
  });

  it('emits a friendly failure when a draft-new request fails', async () => {
    const generateItemAdd = vi.fn().mockResolvedValue({
      ok: false,
      code: 'item-retry-failed',
      error: 'provider down',
    });
    await renderBrowserChat({ generateItemAdd });

    const chunks = await sendViaTransport('create a lesson about fractions');
    const meta = finishMetadata(chunks) as Record<string, unknown>;

    expect(meta?.mode).toBe('explain');
    expect(chunkText(chunks)).toContain("couldn't create");
  });
});
