import { useState, useCallback, useEffect } from 'react';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@open-edu/design-system';
import { FileText, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import { useRuntimeOptional } from '@open-edu/runtime';
import { useCompanion, usePipiliChat, PipiliChat, ExplanationStylePicker } from './ai';
import { NotePanel } from './notes/NotePanel';
import type { AppView } from './AppShell';

export interface CourseRightSidebarProps {
  onNavigate?: (view: AppView) => void;
  width?: number;
}

function SidebarContent({ onNavigate, width = 320 }: CourseRightSidebarProps): JSX.Element | null {
  const { t } = useTranslation();
  const runtime = useRuntimeOptional();
  const { panelState, setPanelState, rewardMessages, clearPendingReward } = useCompanion();
  const { messages, sendMessage, status, stop, regenerate, clearError, error } = usePipiliChat();
  const [activeTab, setActiveTab] = useState<'pipili' | 'notepad'>('pipili');

  const courseId = runtime?.loadedPackage.manifest.id ?? '';
  const lessonId = runtime?.currentNodeId ?? '';

  const isOpen = panelState !== 'closed';
  const isStreaming = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    if (isOpen) {
      clearPendingReward();
    }
  }, [isOpen, clearPendingReward]);

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

  const handleRetry = useCallback(() => {
    clearError();
    void regenerate();
  }, [clearError, regenerate]);

  if (!isOpen) {
    return (
      <aside
        className="border-outline-variant bg-surface flex w-12 flex-col border-l"
        aria-label={t('learner.right_sidebar.open')}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPanelState('floating')}
          aria-label={t('learner.right_sidebar.open')}
        >
          <ChevronLeft className="text-on-surface-variant h-5 w-5" />
        </Button>
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPanelState('closed')}
            aria-label={t('learner.right_sidebar.close')}
          >
            <ChevronRight className="text-on-surface-variant h-5 w-5" />
          </Button>
        </div>

        <TabsContent
          value="pipili"
          className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <div className="border-outline-variant shrink-0 border-b px-3 py-2">
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
            suggestedQuestions={messages.length === 0 ? suggestedQuestions : undefined}
            onSuggestedQuestionSelect={messages.length === 0 ? handleSuggestedQuestion : undefined}
            rewardMessages={rewardMessages}
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
