import { type ReactNode } from 'react';
import { useRuntime } from '../context/RuntimeContext';
import { NodeRenderer } from '../renderers/NodeRenderer';
import { ProgressBar } from './ProgressBar';

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
  nextLabel = 'Next',
  backLabel = 'Back',
  completedLabel = 'You have completed this learning experience.',
  sidebar,
  onBack,
  canGoBack = false,
  currentStep,
  totalSteps,
}: LayoutShellProps): JSX.Element {
  const { loadedPackage, currentNode, isCompleted, visitedNodes, completeNode } = useRuntime();

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
      className="font-body-md text-on-surface bg-surface flex min-h-full flex-col gap-6 p-[calc(var(--oe-space-md)*1.5)]"
      data-testid="layout-shell"
    >
      {!hideHeader && (
        <header className="gap-sm border-outline-variant flex flex-col border-b pb-4">
          <h1 className="m-0 text-[1.5rem] font-bold">{title}</h1>
          <ProgressBar current={current} total={total} />
        </header>
      )}

      <main aria-live="polite" className="min-h-0 flex-1">
        {children ?? <NodeRenderer node={currentNode} onComplete={completeNode} />}
      </main>

      <footer className="border-outline-variant flex items-center justify-between gap-4 border-t pt-4">
        <div className="flex gap-2">
          {onBack && (
            <button
              type="button"
              onClick={handleBack}
              disabled={!canGoBack}
              className="bg-surface-container-high text-on-surface border-outline-variant cursor-pointer rounded-lg border px-4 py-2.5 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              data-testid="layout-shell-back"
            >
              {backLabel}
            </button>
          )}
          {isCompleted ? (
            <p role="status" className="text-secondary py-2.5 font-semibold">
              {completedLabel}
            </p>
          ) : showNextButton && !nextDisabled ? (
            <button
              type="button"
              onClick={() => completeNode()}
              className="bg-primary text-on-primary cursor-pointer rounded-lg border-none px-5 py-2.5 text-base font-semibold"
              data-testid="layout-shell-next"
            >
              {nextLabel}
            </button>
          ) : (
            <span className="text-on-surface-variant text-body-ui">
              Submit your answer above to continue
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
        <div className="border-outline-variant flex-[0_0_280px] overflow-y-auto border-r">
          {sidebar}
        </div>
        <div className="min-w-0 flex-1">{shellContent}</div>
      </div>
    );
  }

  return shellContent;
}
