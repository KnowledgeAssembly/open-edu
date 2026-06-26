import { useRuntime } from '../context/RuntimeContext.js';
import type { LoadedNode } from '@open-edu/core';

export interface SidebarProps {
  nodes: LoadedNode[];
}

export function Sidebar({ nodes }: SidebarProps): JSX.Element {
  const { loadedPackage, currentNodeId, visitedNodes } = useRuntime();
  const title = loadedPackage.manifest.title;
  const total = nodes.length;

  return (
    <nav
      aria-label="Course outline"
      className="w-[280px] border-r border-outline-variant p-md overflow-y-auto font-body-md h-full box-border"
      data-testid="sidebar"
    >
      <h2 className="text-lg font-bold m-0 mb-4 text-on-surface">{title}</h2>
      {nodes.length === 0 ? (
        <p className="text-on-surface-variant text-xs mt-4">No lessons</p>
      ) : (
        <ol className="list-none p-0 m-0">
          {nodes.map((node) => {
            const nodeTitle =
              (node.node as { title?: string }).title ?? node.relativePath.replace('.md', '');
            const isCurrent = node.relativePath === currentNodeId;
            const isVisited = visitedNodes.includes(node.relativePath);

            let icon: string;
            let iconClass: string;
            if (isCurrent) {
              icon = '\u25CF';
              iconClass = 'text-on-primary';
            } else if (isVisited) {
              icon = '\u25CF';
              iconClass = 'text-on-surface-variant';
            } else {
              icon = '\u25CB';
              iconClass = 'text-on-surface-variant';
            }

            return (
              <li
                key={node.relativePath}
                className={`p-2 rounded-lg flex items-center gap-sm cursor-default ${isCurrent ? 'bg-primary text-on-primary' : 'bg-transparent text-on-surface'}`}
                aria-current={isCurrent ? 'step' : undefined}
                data-testid={`sidebar-node-${node.relativePath}`}
              >
                <span className={`${iconClass} shrink-0`}>{icon}</span>
                <span>{nodeTitle}</span>
              </li>
            );
          })}
        </ol>
      )}
      <p className="text-on-surface-variant text-xs mt-4">
        {visitedNodes.length} of {total} complete
      </p>
    </nav>
  );
}
