import { useState, type CSSProperties } from 'react';
import { useRuntime } from '../context/RuntimeContext.js';
import { Sidebar } from '../layout/Sidebar.js';

export function CourseOutline(): JSX.Element {
  const { loadedPackage, visitedNodes } = useRuntime();
  const [isOpen, setIsOpen] = useState(true);
  const nodes = loadedPackage.nodes;
  const current = visitedNodes.length;
  const total = nodes.length;

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily: 'var(--oe-font-sans, system-ui, sans-serif)',
  };

  const toggleStyle: CSSProperties = {
    background: 'none',
    border: `1px solid var(--oe-color-border, #e5e7eb)`,
    borderRadius: 'var(--oe-radius, 8px)',
    padding: '0.25rem 0.5rem',
    cursor: 'pointer',
    fontSize: '1rem',
    alignSelf: 'flex-end',
    marginBottom: '0.25rem',
  };

  const summaryStyle: CSSProperties = {
    color: 'var(--oe-color-muted, #6b7280)',
    fontSize: '0.75rem',
    padding: '0.5rem 1rem',
    borderTop: `1px solid var(--oe-color-border, #e5e7eb)`,
  };

  return (
    <div style={containerStyle} data-testid="course-outline">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={toggleStyle}
        aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        data-testid="outline-toggle"
      >
        {isOpen ? '\u2715' : '\u2630'}
      </button>
      {isOpen && (
        <>
          <Sidebar nodes={nodes} />
          <p style={summaryStyle}>
            {current} of {total} complete
          </p>
        </>
      )}
    </div>
  );
}
