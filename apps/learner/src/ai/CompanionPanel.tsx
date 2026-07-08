import { useCallback, useEffect } from 'react';
import { AIChat } from '@open-edu/design-system';
import type { ChatMessage } from '@open-edu/design-system';
import { cn } from '@open-edu/design-system';
import { X } from 'lucide-react';
import { useCompanion } from './CompanionProvider';
import type { ConversationMessage } from '@open-edu/ai-companion';

function toChatMessage(msg: ConversationMessage): ChatMessage {
  return {
    role: msg.role === 'system' ? 'ai' : msg.role,
    text: msg.text,
    citations: msg.citations,
  };
}

const suggestedQuestions = [
  'Can you explain what I just read?',
  'Summarize this lesson for me',
  'Give me a practice question',
  'What are the key concepts here?',
];

export function CompanionPanel(): JSX.Element | null {
  const { panelState, setPanelState, messages, isLoading, sendMessage } = useCompanion();

  const isOpen = panelState !== 'closed';

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
          'fixed right-0 top-0 z-50 flex h-full flex-col border-l bg-background shadow-xl transition-transform duration-300 ease-in-out w-[90vw] max-w-md sm:w-96',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
        data-testid="companion-panel"
        role="dialog"
        aria-modal={isOpen}
        aria-label="AI Companion"
      >
        <div className="border-outline-variant flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-semibold">AI Companion</h2>
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
          <AIChat
            messages={messages.map(toChatMessage)}
            onSend={handleSend}
            isThinking={isLoading}
            suggestedQuestions={messages.length === 0 ? suggestedQuestions : undefined}
            onSuggestedQuestionSelect={messages.length === 0 ? handleSuggestedQuestion : undefined}
            placeholder="Ask a question about this lesson..."
            className="min-h-0 flex-1"
          />
        </div>
      </div>
    </>
  );
}
