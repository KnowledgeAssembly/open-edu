import { useState, useCallback } from 'react';
import { AIChat, Tabs, TabsList, TabsTrigger, TabsContent } from '@open-edu/design-system';
import type { ChatMessage } from '@open-edu/design-system';
import { FileText, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import { useCompanion } from './ai';
import type { ConversationMessage } from '@open-edu/ai-companion';

function toChatMessage(msg: ConversationMessage): ChatMessage {
  return {
    role: msg.role === 'system' ? 'ai' : msg.role,
    text: msg.text,
    citations: msg.citations,
  };
}

export function CourseRightSidebar(): JSX.Element | null {
  const { t } = useTranslation();
  const { messages, isLoading, sendMessage, panelState, setPanelState } = useCompanion();
  const [activeTab, setActiveTab] = useState<'pipili' | 'notepad'>('pipili');

  const isOpen = panelState !== 'closed';

  const suggestedQuestions = [
    t('learner.right_sidebar.suggest_explain'),
    t('learner.right_sidebar.suggest_summarize'),
    t('learner.right_sidebar.suggest_practice'),
    t('learner.right_sidebar.suggest_concepts'),
  ];

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
      <aside
        className="border-outline-variant bg-surface flex w-12 flex-col border-l"
        aria-label={t('learner.right_sidebar.open')}
      >
        <button
          onClick={() => setPanelState('floating')}
          className="hover:bg-surface-container flex h-12 w-12 items-center justify-center transition-colors"
          aria-label={t('learner.right_sidebar.open')}
        >
          <ChevronLeft className="text-on-surface-variant h-5 w-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="border-outline-variant bg-surface flex w-80 flex-col border-l shadow-sm transition-all duration-300"
      aria-label={t('learner.right_sidebar.label')}
    >
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'pipili' | 'notepad')}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="border-outline-variant flex h-16 shrink-0 items-center justify-between border-b px-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pipili">
              <Sparkles className="mr-1.5 h-4 w-4" />
              {t('learner.right_sidebar.tab_pipili')}
            </TabsTrigger>
            <TabsTrigger value="notepad">
              <FileText className="mr-1.5 h-4 w-4" />
              {t('learner.right_sidebar.tab_notepad')}
            </TabsTrigger>
          </TabsList>
          <button
            onClick={() => setPanelState('closed')}
            className="hover:bg-surface-container rounded-md p-1.5 transition-colors"
            aria-label={t('learner.right_sidebar.close')}
          >
            <ChevronRight className="text-on-surface-variant h-5 w-5" />
          </button>
        </div>

        <TabsContent value="pipili" className="flex min-h-0 flex-1 flex-col">
          <AIChat
            messages={messages.map(toChatMessage)}
            onSend={handleSend}
            isThinking={isLoading}
            suggestedQuestions={messages.length === 0 ? suggestedQuestions : undefined}
            onSuggestedQuestionSelect={messages.length === 0 ? handleSuggestedQuestion : undefined}
            placeholder={t('learner.right_sidebar.chat_placeholder')}
            className="min-h-0 flex-1 border-none"
          />
        </TabsContent>
        <TabsContent
          value="notepad"
          className="flex flex-1 items-center justify-center p-6 text-center"
        >
          <p className="text-on-surface-variant text-body-ui">
            {t('learner.right_sidebar.notepad_coming_soon')}
          </p>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
