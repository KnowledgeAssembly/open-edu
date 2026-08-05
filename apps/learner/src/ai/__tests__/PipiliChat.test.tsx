import { describe, it, expect, vi } from 'vitest';

vi.mock('@ai-sdk/react', () => ({
  useChat: () => ({
    messages: [],
    sendMessage: vi.fn(),
    regenerate: vi.fn(),
    status: 'ready',
    error: undefined,
    stop: vi.fn(),
    clearError: vi.fn(),
    setMessages: vi.fn(),
  }),
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { PipiliChat } from '../PipiliChat';
import { CompanionProvider, PipiliChatProvider } from '../index';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';
import type { UIMessage } from 'ai';
import type { PipiliResponseMetadata } from '@open-edu/ai-companion';

const suggestedQuestions = ['Can you explain what I just read?', 'Summarize this lesson for me'];

function message(
  overrides: Partial<UIMessage<PipiliResponseMetadata>>,
): UIMessage<PipiliResponseMetadata> {
  return {
    id: 'm1',
    role: 'user',
    parts: [{ type: 'text', text: 'Hello' }],
    metadata: undefined,
    ...overrides,
  } as UIMessage<PipiliResponseMetadata>;
}

function renderChat(
  props: Partial<React.ComponentProps<typeof PipiliChat>> = {},
  messages: UIMessage<PipiliResponseMetadata>[] = [],
) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      <CompanionProvider>
        <PipiliChatProvider>
          <PipiliChat
            messages={messages}
            onSend={vi.fn()}
            suggestedQuestions={suggestedQuestions}
            onSuggestedQuestionSelect={vi.fn()}
            {...props}
          />
        </PipiliChatProvider>
      </CompanionProvider>
    </I18nProvider>,
  );
}

describe('PipiliChat suggested questions', () => {
  it('shows suggested questions with an empty message history', () => {
    renderChat();
    expect(screen.getByTestId('suggested-questions')).toBeInTheDocument();
    expect(screen.getByText('Can you explain what I just read?')).toBeInTheDocument();
  });

  it('keeps suggested questions available after the first message', () => {
    renderChat({}, [message({ id: 'm1' })]);
    expect(screen.getByTestId('suggested-questions')).toBeInTheDocument();
  });

  it('keeps suggested questions available after several exchanges', () => {
    renderChat({}, [
      message({ id: 'm1', role: 'user' }),
      message({ id: 'm2', role: 'assistant' }),
      message({ id: 'm3', role: 'user' }),
    ]);
    expect(screen.getByTestId('suggested-questions')).toBeInTheDocument();
  });

  it('calls onSuggestedQuestionSelect when a suggestion is clicked after use', () => {
    const onSelect = vi.fn();
    renderChat({ onSuggestedQuestionSelect: onSelect }, [message({ id: 'm1' })]);
    fireEvent.click(screen.getByText('Summarize this lesson for me'));
    expect(onSelect).toHaveBeenCalledWith('Summarize this lesson for me');
  });

  it('hides suggested questions while streaming', () => {
    renderChat({ isStreaming: true }, [message({ id: 'm1' })]);
    expect(screen.queryByTestId('suggested-questions')).not.toBeInTheDocument();
  });

  it('renders suggested questions inside the composer region above the textarea', () => {
    const { container } = renderChat();
    const suggestions = screen.getByTestId('suggested-questions');
    const textarea = screen.getByTestId('ai-chat-input');
    const list = container.querySelector('[data-testid="ai-chat"]');
    expect(list).toBeInTheDocument();
    expect(
      suggestions.compareDocumentPosition(textarea) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
