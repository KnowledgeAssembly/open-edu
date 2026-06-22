import { type CSSProperties, type ReactNode } from 'react';
import { useRuntime } from '../context/RuntimeContext';
import { NodeRenderer } from '../renderers/NodeRenderer';
import { ProgressBar } from './ProgressBar';

export interface LayoutShellProps {
  children?: ReactNode;
  headerTitle?: string;
  nextLabel?: string;
  completedLabel?: string;
}

export function LayoutShell({
  children,
  headerTitle,
  nextLabel = 'Next',
  completedLabel = 'You have completed this learning experience.',
}: LayoutShellProps): JSX.Element {
  const { loadedPackage, currentNode, isCompleted, visitedNodes, completeNode } = useRuntime();

  const title = headerTitle ?? loadedPackage.manifest.title ?? 'Untitled package';

  const total = loadedPackage.nodes.length;
  const current = visitedNodes.length;

  const isLesson = currentNode?.node.type === 'lesson';
  const showNextButton = isLesson && !isCompleted && currentNode !== null;

  const sectionStyle: CSSProperties = {
    fontFamily: 'var(--oe-font-sans, system-ui, sans-serif)',
    color: 'var(--oe-color-fg, #1a1a1a)',
    backgroundColor: 'var(--oe-color-bg, #ffffff)',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    padding: 'calc(var(--oe-spacing, 1rem) * 1.5)',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    borderBottom: `1px solid var(--oe-color-border, #e5e7eb)`,
    paddingBottom: '1rem',
  };

  const contentStyle: CSSProperties = {
    flex: 1,
    minHeight: 0,
  };

  const footerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    borderTop: `1px solid var(--oe-color-border, #e5e7eb)`,
    paddingTop: '1rem',
  };

  const nextButtonStyle: CSSProperties = {
    backgroundColor: 'var(--oe-color-primary, #2563eb)',
    color: 'var(--oe-color-primary-fg, #ffffff)',
    border: 'none',
    borderRadius: 'var(--oe-radius, 8px)',
    padding: '0.625rem 1.25rem',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  };

  const completedStyle: CSSProperties = {
    color: 'var(--oe-color-success, #16a34a)',
    fontWeight: 600,
    padding: '0.625rem 0',
  };

  return (
    <section className="open-edu-runtime" style={sectionStyle} data-testid="layout-shell">
      <header style={headerStyle}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{title}</h1>
        <ProgressBar current={current} total={total} />
      </header>

      <main aria-live="polite" style={contentStyle}>
        {children ?? <NodeRenderer node={currentNode} onComplete={completeNode} />}
      </main>

      <footer style={footerStyle}>
        {isCompleted ? (
          <p role="status" style={completedStyle}>
            {completedLabel}
          </p>
        ) : showNextButton ? (
          <button type="button" onClick={() => completeNode()} style={nextButtonStyle}>
            {nextLabel}
          </button>
        ) : (
          <span style={{ color: 'var(--oe-color-muted, #6b7280)', fontSize: '0.875rem' }}>
            Submit your answer above to continue
          </span>
        )}
        <span style={{ color: 'var(--oe-color-muted, #6b7280)', fontSize: '0.875rem' }}>
          {current} / {total}
        </span>
      </footer>
    </section>
  );
}
