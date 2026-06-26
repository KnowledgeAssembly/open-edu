import { type ReactNode } from 'react';
import { useRuntime } from '../context/RuntimeContext';
import { NodeRenderer } from '../renderers/NodeRenderer';
import { ProgressBar } from './ProgressBar';

export interface LayoutShellProps {
  children?: ReactNode;
  headerTitle?: string;
  nextLabel?: string;
  completedLabel?: string;
  sidebar?: ReactNode;
}

export function LayoutShell({
  children,
  headerTitle,
  nextLabel = 'Next',
  completedLabel = 'You have completed this learning experience.',
  sidebar,
}: LayoutShellProps): JSX.Element {
  const { loadedPackage, currentNode, isCompleted, visitedNodes, completeNode } = useRuntime();

  const title = headerTitle ?? loadedPackage.manifest.title ?? 'Untitled package';

  const total = loadedPackage.nodes.length;
  const current = visitedNodes.length;

  const isLesson = currentNode?.node.type === 'lesson';
  const showNextButton = isLesson && !isCompleted && currentNode !== null;

  const shellContent = (
    <section
      className="open-edu-runtime font-body-md text-on-surface bg-surface min-h-full flex flex-col gap-6 p-[calc(var(--oe-space-md)*1.5)]"
      data-testid="layout-shell"
    >
      <header className="flex flex-col gap-sm border-b border-outline-variant pb-4">
        <h1 className="m-0 text-h2 font-bold">{title}</h1>
        <ProgressBar current={current} total={total} />
      </header>

      <main aria-live="polite" className="flex-1 min-h-0">
        {children ?? <NodeRenderer node={currentNode} onComplete={completeNode} />}
      </main>

      <footer className="flex justify-between items-center gap-4 border-t border-outline-variant pt-4">
        {isCompleted ? (
          <p role="status" className="text-secondary font-semibold py-2.5">
            {completedLabel}
          </p>
        ) : showNextButton ? (
          <button
            type="button"
            onClick={() => completeNode()}
            className="bg-primary text-on-primary border-none rounded-lg px-5 py-2.5 text-base font-semibold cursor-pointer"
          >
            {nextLabel}
          </button>
        ) : (
          <span className="text-on-surface-variant text-body-ui">
            Submit your answer above to continue
          </span>
        )}
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
