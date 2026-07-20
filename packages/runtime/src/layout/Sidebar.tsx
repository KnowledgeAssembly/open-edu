import { useRuntime } from '../context/RuntimeContext.js';
import type { LoadedNode } from '@open-edu/core';
import { useTranslation } from '@open-edu/i18n';

export interface SidebarProps {
  nodes: LoadedNode[];
}

export function Sidebar({ nodes }: SidebarProps): JSX.Element {
  const { loadedPackage, currentNodeId, visitedNodes } = useRuntime();
  const { t } = useTranslation();
  const title = loadedPackage.manifest.title;
  const total = nodes.length;

  return (
    <nav
      aria-label="Course outline"
      className="border-outline-variant p-md font-body-md box-border h-full w-[280px] overflow-y-auto border-r"
      data-testid="sidebar"
    >
      <h2 className="text-on-surface m-0 mb-4 text-lg font-bold">{title}</h2>
      {nodes.length === 0 ? (
        <p className="text-on-surface-variant mt-4 text-xs">{t('runtime.sidebar.no_lessons')}</p>
      ) : (
        <ol className="m-0 list-none p-0">
          {nodes.map((node) => {
            const nodeTitle =
              node.node.title ?? node.relativePath.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
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
                className={`gap-sm flex cursor-default items-center rounded-lg p-2 ${isCurrent ? 'bg-primary text-on-primary' : 'text-on-surface bg-transparent'}`}
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
      <p className="text-on-surface-variant mt-4 text-xs">
        {visitedNodes.length} of {total} complete
      </p>
    </nav>
  );
}
