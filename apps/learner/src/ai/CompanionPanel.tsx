import { useCallback, useEffect } from 'react';
import { AIChat } from '@open-edu/design-system';
import { cn } from '@open-edu/design-system';
import { X } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import { useCompanion } from './CompanionProvider';
import { usePipiliChat } from './PipiliChatProvider';

const suggestedQuestions = [
  'Can you explain what I just read?',
  'Summarize this lesson for me',
  'Give me a practice question',
  'What are the key concepts here?',
];

function PipiliCompanionContent(): JSX.Element {
  const { t } = useTranslation();
  const { panelState, setPanelState, messages: companionMessages } = useCompanion();
  const { messages, sendMessage, status, stop, regenerate, clearError, error } = usePipiliChat();

  const isOpen = panelState !== 'closed';
  const isLoading = status === 'submitted' || status === 'streaming';

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
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClose]);

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
          <button
            type="button"
            className="hover:bg-surface-container-high text-on-surface-variant rounded-md p-1 transition-colors"
            onClick={handleClose}
            aria-label="Close companion panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 px-4 py-2">
            {isLoading && (
              <button
                type="button"
                onClick={stop}
                className="text-destructive text-xs"
                data-testid="pipili-stop"
              >
                {t('pipili.stop')}
              </button>
            )}
            {(error || status === 'ready') && messages.length > 0 && (
              <button
                type="button"
                onClick={handleRetry}
                className="text-xs"
                data-testid="pipili-retry"
              >
                {t('pipili.retry')}
              </button>
            )}
          </div>
          <AIChat
            messages={messages.map(
              (m: { role: string; content: string; annotations?: unknown[] }) => ({
                role: m.role === 'assistant' ? 'ai' : 'user',
                text: m.content ?? '',
                citations:
                  Array.isArray(m.annotations) && m.annotations.length > 0
                    ? (
                        m.annotations[m.annotations.length - 1] as {
                          citations?: Array<{ source: string; text: string }>;
                        }
                      )?.citations
                    : undefined,
              }),
            )}
            onSend={handleSend}
            isThinking={isLoading}
            suggestedQuestions={companionMessages.length === 0 ? suggestedQuestions : undefined}
            onSuggestedQuestionSelect={
              companionMessages.length === 0 ? handleSuggestedQuestion : undefined
            }
            placeholder="Ask a question about this lesson..."
            className="min-h-0 flex-1"
          />
        </div>
      </div>
    </>
  );
}

export function CompanionPanel(): JSX.Element | null {
  return <PipiliCompanionContent />;
}
