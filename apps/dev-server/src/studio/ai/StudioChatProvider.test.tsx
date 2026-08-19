import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useState, type ReactNode } from 'react';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { StudioAssistantProvider, useStudioAssistant } from './StudioAssistantProvider';
import { StudioChatProvider, useStudioChat } from './StudioChatProvider';
import { EditorBridgeProvider } from './EditorBridgeContext';
import { ConversationStore } from './ConversationStore';
import { setConversationId } from './assistantStorage';
import type { StudioContextSnapshot } from './context';

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

vi.mock('@ai-sdk/react', () => ({
  useChat: () => {
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
