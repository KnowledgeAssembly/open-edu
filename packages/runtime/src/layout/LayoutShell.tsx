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
      className="font-body-md text-on-surface bg-surface min-h-full flex flex-col gap-6 p-[calc(var(--oe-space-md)*1.5)]"
      data-testid="layout-shell"
    >
      {!hideHeader && (
        <header className="flex flex-col gap-sm border-b border-outline-variant pb-4">
          <h1 className="m-0 text-[1.5rem] font-bold">{title}</h1>
          <ProgressBar current={current} total={total} />
        </header>
      )}

      <main aria-live="polite" className="flex-1 min-h-0">
        {children ?? <NodeRenderer node={currentNode} onComplete={completeNode} />}
      </main>

      <footer className="flex justify-between items-center gap-4 border-t border-outline-variant pt-4">
        <div className="flex gap-2">
          {onBack && (
            <button
              type="button"
              onClick={handleBack}
              disabled={!canGoBack}
              className="bg-surface-container-high text-on-surface border border-outline-variant rounded-lg px-4 py-2.5 text-base font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="layout-shell-back"
            >
              {backLabel}
            </button>
          )}
          {isCompleted ? (
            <p role="status" className="text-secondary font-semibold py-2.5">
              {completedLabel}
            </p>
          ) : showNextButton && !nextDisabled ? (
            <button
              type="button"
              onClick={() => completeNode()}
              className="bg-primary text-on-primary border-none rounded-lg px-5 py-2.5 text-base font-semibold cursor-pointer"
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
        <div className="flex-[0_0_280px] overflow-y-auto border-r border-outline-variant">
          {sidebar}
        </div>
        <div className="flex-1 min-w-0">{shellContent}</div>
      </div>
    );
  }

  return shellContent;
}
