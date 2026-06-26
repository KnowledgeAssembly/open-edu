import { useState } from 'react';
import { useRuntime } from '../context/RuntimeContext.js';
import { Sidebar } from '../layout/Sidebar.js';

export function CourseOutline(): JSX.Element {
  const { loadedPackage, visitedNodes } = useRuntime();
  const [isOpen, setIsOpen] = useState(true);
  const nodes = loadedPackage.nodes;
  const current = visitedNodes.length;
  const total = nodes.length;

  return (
    <div className="flex flex-col h-full font-body-md" data-testid="course-outline">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="bg-transparent border border-outline-variant rounded-lg px-2 py-1 cursor-pointer text-base self-end mb-1"
        aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        data-testid="outline-toggle"
      >
        {isOpen ? '\u2715' : '\u2630'}
      </button>
      {isOpen && (
        <>
          <Sidebar nodes={nodes} />
          <p className="text-on-surface-variant text-xs px-md py-2 border-t border-outline-variant">
            {current} of {total} complete
          </p>
        </>
      )}
    </div>
  );
}
