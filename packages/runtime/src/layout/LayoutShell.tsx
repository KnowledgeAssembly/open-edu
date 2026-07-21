import { type ReactNode } from 'react';
import { useRuntime } from '../context/RuntimeContext';
import { NodeRenderer } from '../renderers/NodeRenderer';
import { ProgressBar } from './ProgressBar';
import { useTranslation } from '@open-edu/i18n';
import { Button } from '@open-edu/design-system';

export interface LayoutShellProps {
  children?: ReactNode;
  headerTitle?: string;
  hideHeader?: boolean;
  nextLabel?: string;
  backLabel?: string;
  completedLabel?: string;
  sidebar?: ReactNode;
  onBack?: () => void;
  canGoBack?: boolean;
  currentStep?: number;
  totalSteps?: number;
}

export function LayoutShell({
  children,
  headerTitle,
  hideHeader = false,
  nextLabel,
  backLabel,
  completedLabel,
  sidebar,
  onBack,
  canGoBack = false,
  currentStep,
  totalSteps,
}: LayoutShellProps): JSX.Element {
  const { t } = useTranslation();
  const { loadedPackage, currentNode, isCompleted, visitedNodes, completeNode } = useRuntime();

  const resolvedNext = nextLabel ?? t('runtime.layout.next');
  const resolvedBack = backLabel ?? t('runtime.layout.back');
  const resolvedCompleted = completedLabel ?? t('runtime.layout.completed');

  const title = headerTitle ?? loadedPackage.manifest.title ?? 'Untitled package';

  const total = totalSteps ?? loadedPackage.nodes.length;
  const current = currentStep ?? visitedNodes.length;

  const isLesson = currentNode?.node.type === 'lesson';
  const isQuiz = currentNode?.node.type === 'quiz';
  const showNextButton = isLesson && !isCompleted && currentNode !== null;
  const nextDisabled = isQuiz && !isCompleted;

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  const shellContent = (
    <section
      className="font-body-md text-on-surface bg-surface max-w-reading gap-lg p-lg mx-auto flex min-h-full w-full flex-col"
      data-testid="layout-shell"
    >
      {!hideHeader && (
        <header className="gap-sm border-outline-variant flex flex-col border-b pb-4">
          <h1 className="text-h1 font-display m-0">{title}</h1>
          <ProgressBar current={current} total={total} />
        </header>
      )}

      <main aria-live="polite" className="min-h-0 flex-1">
        {children ?? <NodeRenderer node={currentNode} onComplete={completeNode} />}
      </main>

      <footer className="border-outline-variant flex items-center justify-between gap-4 border-t pt-4">
        <div className="flex gap-2">
          {onBack && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={!canGoBack}
              data-testid="layout-shell-back"
            >
              {resolvedBack}
            </Button>
          )}
          {isCompleted ? (
            <p role="status" className="text-on-success-container py-2.5 font-semibold">
              {resolvedCompleted}
            </p>
          ) : showNextButton && !nextDisabled ? (
            <Button onClick={() => completeNode()} data-testid="layout-shell-next">
              {resolvedNext}
            </Button>
          ) : (
            <span className="text-on-surface-variant text-body-ui">
              {t('runtime.layout.submit_to_continue')}
            </span>
          )}
        </div>
        <span className="text-on-surface-variant text-body-ui">
          {current} / {total}
        </span>
      </footer>
    </section>
  );

  if (sidebar) {
    return (
      <div className="flex h-full">
        <div className="border-outline-variant w-[var(--oe-space-panel-nav)] shrink-0 overflow-y-auto border-r">
          {sidebar}
        </div>
        <div className="min-w-0 flex-1">{shellContent}</div>
      </div>
    );
  }

  return shellContent;
}
