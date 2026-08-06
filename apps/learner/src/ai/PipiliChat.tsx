import * as React from 'react';
import { Button, Textarea, cn, Pipili } from '@open-edu/design-system';
import { SuggestedQuestions, ThinkingIndicator } from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';
import type { UIMessage } from 'ai';
import type { PipiliResponseMetadata } from '@open-edu/ai-companion';
import { PipiliMessage } from './PipiliMessage.js';
import type { RewardMessage } from './CompanionProvider.js';
import { usePipiliChat } from './PipiliChatProvider.js';
import { Award, BookOpen } from 'lucide-react';

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
  rewardMessages?: RewardMessage[];
  onViewBadge?: (badgeName: string) => void;
  onViewCard?: (cardTitle: string) => void;
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
    rewardMessages,
    onViewBadge,
    onViewCard,
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
    !!suggestedQuestions &&
    suggestedQuestions.length > 0 &&
    !!onSuggestedQuestionSelect &&
    !isStreaming;

  const { getMessageTimestamp } = usePipiliChat();

  const sortedItems = React.useMemo(() => {
    const chatItems = messages.map((m, i) => ({
      kind: 'chat' as const,
      data: m,
      ts: getMessageTimestamp(m.id) ?? Date.now() + i,
    }));
    const rewardItems = (rewardMessages ?? []).map((r) => ({
      kind: 'reward' as const,
      data: r,
      ts: r.timestamp,
    }));
    const items = [...chatItems, ...rewardItems];
    items.sort((a, b) => a.ts - b.ts);
    return items;
  }, [messages, rewardMessages, getMessageTimestamp]);

  return (
    <div ref={ref} className={cn('flex flex-col', className)} data-testid="ai-chat">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {sortedItems.map((item) =>
          item.kind === 'chat' ? (
            <PipiliMessage
              key={item.data.id}
              role={item.data.role}
              parts={item.data.parts}
              metadata={item.data.metadata}
              isStreaming={
                isStreaming && item.data.role === 'assistant' && item.data.id === lastMessageId
              }
            />
          ) : (
            <div
              key={item.data.id}
              className="animate-pipili-reward-enter flex items-start gap-2 motion-reduce:animate-none"
              role="status"
              aria-live="polite"
              aria-label={
                item.data.type === 'badge'
                  ? t('learner.pipili.reward.badgeTitle')
                  : t('learner.pipili.reward.cardTitle')
              }
              data-testid={`reward-message-${item.data.type}`}
            >
              <div className="bg-primary-container flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                <RewardPipiliAvatar />
              </div>
              <div className="bg-surface-container border-outline-variant text-on-surface text-caption max-w-[75%] rounded-lg border px-2.5 py-2 leading-snug">
                <RewardCardBody
                  reward={item.data}
                  onViewBadge={onViewBadge}
                  onViewCard={onViewCard}
                  t={t}
                />
              </div>
            </div>
          ),
        )}
        {isStreaming && <ThinkingIndicator label={t('learner.pipili.thinking')} />}
      </div>
      {(showStop || showRetry || showSuggestedQuestions) && (
        <div className="border-outline-variant flex flex-col gap-2 border-t px-4 py-2">
          {(showStop || showRetry) && (
            <div className="flex items-center gap-2">
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
          {showSuggestedQuestions && (
            <SuggestedQuestions
              questions={suggestedQuestions}
              onSelect={onSuggestedQuestionSelect}
              variant="compact"
            />
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

function RewardPipiliAvatar(): JSX.Element {
  const [settled, setSettled] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setSettled(true), 600);
    return () => clearTimeout(timer);
  }, []);

  return <Pipili size="xs" mood={settled ? 'content' : 'surprised'} />;
}

function RewardCardBody({
  reward,
  onViewBadge,
  onViewCard,
  t,
}: {
  reward: RewardMessage;
  onViewBadge?: (badgeName: string) => void;
  onViewCard?: (cardTitle: string) => void;
  t: (key: string, params?: Record<string, string>) => string;
}): JSX.Element {
  if (reward.type === 'badge') {
    return (
      <div>
        <div className="flex items-start gap-1.5">
          <Award className="text-tertiary mt-px h-3.5 w-3.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-tertiary text-caption font-semibold">
              {t('learner.pipili.reward.badgeTitle')}
            </p>
            <p className="text-on-surface text-caption mt-0.5">
              {t('learner.pipili.reward.badgeMessage', { name: reward.badgeName })}
            </p>
          </div>
        </div>
        {onViewBadge && (
          <button
            type="button"
            className="text-label text-primary mt-1.5 hover:underline"
            aria-label={t('learner.pipili.reward.viewBadge')}
            onClick={() => onViewBadge(reward.badgeName)}
          >
            {t('learner.pipili.reward.viewBadge')} →
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start gap-1.5">
        <BookOpen className="text-primary mt-px h-3.5 w-3.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-primary text-caption font-semibold">
            {reward.type === 'cardLevelUp'
              ? t('learner.pipili.reward.cardLevelUp')
              : t('learner.pipili.reward.cardTitle')}
          </p>
          <p className="text-on-surface text-caption mt-0.5">{reward.cardTitle}</p>
          <p className="text-on-surface-variant text-caption mt-0.5">
            {reward.type === 'cardLevelUp'
              ? t('learner.pipili.reward.cardLevelUpMessage', {
                  title: reward.cardTitle,
                  level: String(reward.cardLevel),
                })
              : t('learner.pipili.reward.cardMessage')}
          </p>
        </div>
      </div>
      {onViewCard && (
        <button
          type="button"
          className="text-label text-primary mt-1.5 hover:underline"
          aria-label={t('learner.pipili.reward.viewCard')}
          onClick={() => onViewCard(reward.cardTitle)}
        >
          {t('learner.pipili.reward.viewCard')} →
        </button>
      )}
    </div>
  );
}
