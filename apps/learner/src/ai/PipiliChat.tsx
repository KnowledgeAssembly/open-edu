import * as React from 'react';
import { Button, Textarea, cn } from '@open-edu/design-system';
import { SuggestedQuestions, ThinkingIndicator } from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';
import type { UIMessage } from 'ai';
import type { PipiliResponseMetadata } from '@open-edu/ai-companion';
import { PipiliMessage } from './PipiliMessage.js';

export interface PipiliChatProps {
  messages: UIMessage<PipiliResponseMetadata>[];
  onSend: (message: string) => void;
  onStop?: () => void;
  onRetry?: () => void;
  showStop?: boolean;
  showRetry?: boolean;
  placeholder?: string;
  isStreaming?: boolean;
  suggestedQuestions?: string[];
  onSuggestedQuestionSelect?: (question: string) => void;
  className?: string;
}

/**
 * Pipili chat surface: message list (rendered via `PipiliMessage`, which
 * surfaces AI SDK v7 `UIMessage.parts` + `message.metadata`), the streaming
 * indicator, suggested questions, and a composer built from design-system
 * primitives (`Textarea` + `Button`). Replaces the generic `AIChat` so the
 * Pipili metadata (citations / hint level / next steps) is rendered.
 */
export const PipiliChat = React.forwardRef<HTMLDivElement, PipiliChatProps>(function PipiliChat(
  {
    messages,
    onSend,
    onStop,
    onRetry,
    showStop = false,
    showRetry = false,
    placeholder,
    isStreaming = false,
    suggestedQuestions,
    onSuggestedQuestionSelect,
    className,
  },
  ref,
): JSX.Element {
  const { t } = useTranslation();
  const [input, setInput] = React.useState('');

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const lastMessageId = messages.at(-1)?.id;
  const showSuggestedQuestions =
    suggestedQuestions &&
    suggestedQuestions.length > 0 &&
    onSuggestedQuestionSelect &&
    (messages.length === 0 || !isStreaming);

  return (
    <div ref={ref} className={cn('flex flex-col', className)} data-testid="ai-chat">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message) => (
          <PipiliMessage
            key={message.id}
            role={message.role}
            parts={message.parts}
            metadata={message.metadata}
            isStreaming={
              isStreaming && message.role === 'assistant' && message.id === lastMessageId
            }
          />
        ))}
        {isStreaming && <ThinkingIndicator label={t('learner.pipili.thinking')} />}
        {showSuggestedQuestions && (
          <SuggestedQuestions questions={suggestedQuestions} onSelect={onSuggestedQuestionSelect} />
        )}
      </div>
      {(showStop || showRetry) && (
        <div className="border-outline-variant flex items-center gap-2 border-t px-4 py-2">
          {showStop && isStreaming && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onStop}
              className="text-destructive"
              data-testid="pipili-stop"
              aria-label={t('learner.pipili.stop')}
            >
              {t('learner.pipili.stop')}
            </Button>
          )}
          {showRetry && !isStreaming && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRetry}
              data-testid="pipili-retry"
              aria-label={t('learner.pipili.retry')}
            >
              {t('learner.pipili.retry')}
            </Button>
          )}
        </div>
      )}
      <div className="border-outline-variant flex items-end gap-2 border-t p-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? t('learner.right_sidebar.chat_placeholder')}
          rows={2}
          className="min-h-11 resize-none"
          data-testid="ai-chat-input"
        />
        <Button
          type="button"
          onClick={handleSend}
          disabled={!input.trim()}
          data-testid="ai-chat-send"
        >
          {t('learner.pipili.send')}
        </Button>
      </div>
    </div>
  );
});
PipiliChat.displayName = 'PipiliChat';
