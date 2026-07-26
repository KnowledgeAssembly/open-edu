import { useState, useCallback } from 'react';
import { AIChat, Tabs, TabsList, TabsTrigger, TabsContent } from '@open-edu/design-system';
import { FileText, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import { useRuntimeOptional } from '@open-edu/runtime';
import { useCompanion, usePipiliChat } from './ai';
import { NotePanel } from './notes/NotePanel';
import type { AppView } from './AppShell';

export interface CourseRightSidebarProps {
  onNavigate?: (view: AppView) => void;
  width?: number;
}

function SidebarContent({ onNavigate, width = 320 }: CourseRightSidebarProps): JSX.Element | null {
  const { t } = useTranslation();
  const runtime = useRuntimeOptional();
  const { panelState, setPanelState } = useCompanion();
  const { messages, sendMessage, status } = usePipiliChat();
  const [activeTab, setActiveTab] = useState<'pipili' | 'notepad'>('pipili');

  const courseId = runtime?.loadedPackage.manifest.id ?? '';
  const lessonId = runtime?.currentNodeId ?? '';

  const isOpen = panelState !== 'closed';
  const isLoading = status === 'submitted' || status === 'streaming';

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
      className="border-outline-variant bg-surface flex flex-col border-l shadow-sm"
      style={{ width: `${width}px` }}
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

        <TabsContent
          value="pipili"
          className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
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
            suggestedQuestions={messages.length === 0 ? suggestedQuestions : undefined}
            onSuggestedQuestionSelect={messages.length === 0 ? handleSuggestedQuestion : undefined}
            placeholder={t('learner.right_sidebar.chat_placeholder')}
            className="min-h-0 flex-1 border-none"
          />
        </TabsContent>
        <TabsContent
          value="notepad"
          className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <NotePanel
            courseId={courseId}
            lessonId={lessonId}
            onOpenInNotes={onNavigate ? () => onNavigate({ view: 'notes' }) : undefined}
          />
        </TabsContent>
      </Tabs>
    </aside>
  );
}

export function CourseRightSidebar(props: CourseRightSidebarProps): JSX.Element | null {
  return <SidebarContent {...props} />;
}
