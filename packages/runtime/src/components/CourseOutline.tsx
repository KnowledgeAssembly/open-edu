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
    <div className="font-body-md flex h-full flex-col" data-testid="course-outline">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="border-outline-variant text-body-ui mb-1 cursor-pointer self-end rounded-lg border bg-transparent px-2 py-1"
        aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        data-testid="outline-toggle"
      >
        {isOpen ? '\u2715' : '\u2630'}
      </button>
      {isOpen && (
        <>
          <Sidebar nodes={nodes} />
          <p className="text-on-surface-variant px-md border-outline-variant text-caption border-t py-2">
            {current} of {total} complete
          </p>
        </>
      )}
    </div>
  );
}
