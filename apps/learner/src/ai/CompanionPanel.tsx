import { useCallback, useEffect } from 'react';
import { Button, cn } from '@open-edu/design-system';
import { X } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import { useCompanion } from './CompanionProvider';
import { usePipiliChat } from './PipiliChatProvider';
import { PipiliChat } from './PipiliChat';
import { ExplanationStylePicker } from './ExplanationStylePicker.js';

const suggestedQuestions = [
  'Can you explain what I just read?',
  'Summarize this lesson for me',
  'Give me a practice question',
  'What are the key concepts here?',
];

function PipiliCompanionContent(): JSX.Element {
  const { t } = useTranslation();
  const {
    panelState,
    setPanelState,
    messages: companionMessages,
    rewardMessages,
    clearPendingReward,
  } = useCompanion();
  const { messages, sendMessage, status, stop, regenerate, clearError, error } = usePipiliChat();

  const isOpen = panelState !== 'closed';
  const isStreaming = status === 'submitted' || status === 'streaming';

  const handleSend = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage],
  );

  const handleSuggestedQuestion = useCallback(
    (question: string) => {
      sendMessage(question);
    },
    [sendMessage],
  );

  const handleClose = useCallback(() => {
    setPanelState('closed');
  }, [setPanelState]);

  const handleRetry = useCallback(() => {
    clearError();
    void regenerate();
  }, [clearError, regenerate]);

  useEffect(() => {
    if (!isOpen) return;
    clearPendingReward();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClose, clearPendingReward]);

  const showSuggestions = companionMessages.length === 0;

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/50 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'bg-background fixed right-0 top-0 z-50 flex h-full w-[90vw] max-w-md flex-col border-l shadow-xl transition-transform duration-300 ease-in-out sm:w-96',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
        data-testid="companion-panel"
        role="dialog"
        aria-modal={isOpen}
        aria-label={t('learner.ai.companion')}
      >
        <div className="border-outline-variant flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-h3 font-display">{t('learner.ai.companion')}</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClose}
            aria-label={t('learner.right_sidebar.close')}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="border-outline-variant shrink-0 border-b px-4 py-2">
          <ExplanationStylePicker />
        </div>
        <PipiliChat
          messages={messages}
          onSend={handleSend}
          onStop={stop}
          onRetry={handleRetry}
          showStop
          showRetry={Boolean(error || status === 'ready')}
          isStreaming={isStreaming}
          suggestedQuestions={showSuggestions ? suggestedQuestions : undefined}
          onSuggestedQuestionSelect={showSuggestions ? handleSuggestedQuestion : undefined}
          rewardMessages={rewardMessages}
          placeholder={t('learner.right_sidebar.chat_placeholder')}
          className="min-h-0 flex-1"
        />
      </div>
    </>
  );
}

export function CompanionPanel(): JSX.Element | null {
  return <PipiliCompanionContent />;
}
