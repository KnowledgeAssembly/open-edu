import { useState, useCallback } from 'react';
import { AIChat, cn } from '@open-edu/design-system';
import type { ChatMessage } from '@open-edu/design-system';
import { FileText, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import { useCompanion } from './ai';
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

export function CourseRightSidebar(): JSX.Element | null {
  const { messages, isLoading, sendMessage, panelState, setPanelState } = useCompanion();
  const [activeTab, setActiveTab] = useState<'pipili' | 'notepad'>('pipili');

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

  if (!isOpen) {
    return (
      <div className="border-outline-variant bg-surface flex w-12 flex-col border-l">
        <button
          onClick={() => setPanelState('floating')}
          className="hover:bg-surface-container flex h-12 w-12 items-center justify-center transition-colors"
          aria-label="Open sidebar"
        >
          <ChevronLeft className="text-on-surface-variant h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="border-outline-variant bg-surface flex w-80 flex-col border-l shadow-sm transition-all duration-300">
      <div className="border-outline-variant flex h-16 shrink-0 items-center justify-between border-b px-3">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('pipili')}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              activeTab === 'pipili'
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container',
            )}
          >
            <Sparkles className="h-4 w-4" />
            Pipili
          </button>
          <button
            onClick={() => setActiveTab('notepad')}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              activeTab === 'notepad'
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container',
            )}
          >
            <FileText className="h-4 w-4" />
            Notepad
          </button>
        </div>
        <button
          onClick={() => setPanelState('closed')}
          className="hover:bg-surface-container rounded-md p-1.5 transition-colors"
          aria-label="Close sidebar"
        >
          <ChevronRight className="text-on-surface-variant h-5 w-5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {activeTab === 'pipili' && (
          <AIChat
            messages={messages.map(toChatMessage)}
            onSend={handleSend}
            isThinking={isLoading}
            suggestedQuestions={messages.length === 0 ? suggestedQuestions : undefined}
            onSuggestedQuestionSelect={messages.length === 0 ? handleSuggestedQuestion : undefined}
            placeholder="Ask a question about this lesson..."
            className="min-h-0 flex-1 border-none"
          />
        )}
        {activeTab === 'notepad' && (
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <p className="text-on-surface-variant text-sm">Notepad feature coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
