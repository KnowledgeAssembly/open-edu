import { useMemo } from 'react';
import { useRuntimeOptional } from '@open-edu/runtime';
import { getOrderedNodes } from '@open-edu/workflow';

export type AppView =
  | { view: 'home' }
  | { view: 'catalog' }
  | { view: 'progress' }
  | { view: 'settings' }
  | { view: 'course'; packageId: string };

export interface LeftNavProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onBackToCatalog?: () => void;
}

const navItems: Array<{ view: AppView; label: string; icon: string }> = [
  { view: { view: 'home' }, label: 'Home', icon: '\uD83C\uDFE0' },
  { view: { view: 'progress' }, label: 'My Progress', icon: '\uD83D\uDCC8' },
  { view: { view: 'catalog' }, label: 'Course Catalog', icon: '\uD83D\uDCDA' },
  { view: { view: 'settings' }, label: 'Settings', icon: '\u2699\uFE0F' },
];

function isSameView(a: AppView, b: AppView): boolean {
  return a.view === b.view;
}

export function LeftNav({ currentView, onNavigate, onBackToCatalog }: LeftNavProps): JSX.Element {
  const runtime = useRuntimeOptional();
  const isInCourse = runtime !== null && currentView.view === 'course';

  return (
    <aside
      className="w-[260px] h-full flex flex-col bg-surface-container border-r border-outline-variant overflow-hidden"
      data-testid="left-nav"
      aria-label="Main navigation"
    >
      <div className="px-4 pt-5 pb-3 border-b border-outline-variant">
        <h1 className="text-lg font-bold m-0 text-on-surface">OpenEdu</h1>
        <p className="text-xs text-on-surface-variant mt-0.5">Interactive learning platform</p>
      </div>

      <nav className="p-2 flex flex-col gap-0.5" aria-label="App navigation">
        {navItems.map((item) => {
          const isActive = isSameView(currentView, item.view);
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate(item.view)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-r-lg text-left text-sm font-sans transition-colors duration-200 border-l-2 ${
                isActive
                  ? 'border-l-primary bg-primary-container text-on-primary-container font-medium'
                  : 'border-l-transparent bg-transparent text-on-surface-variant hover:bg-surface-variant'
              } ${isInCourse && !isActive ? 'opacity-50' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              data-testid={`leftnav-${item.view.view}`}
            >
              <span className="flex-shrink-0 text-base w-5 text-center" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {isInCourse && runtime && (
        <>
          <hr className="border-outline-variant mx-4 my-2" aria-hidden="true" />
          <div className="flex-1 overflow-y-auto px-2 py-1">
            <div className="px-3 py-1.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant m-0">
                {runtime.loadedPackage.manifest.title}
              </h2>
            </div>
            <CourseStepList />
            {onBackToCatalog && (
              <div className="px-2 pt-2 pb-3">
                <button
                  type="button"
                  onClick={onBackToCatalog}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-high text-on-surface text-sm font-medium border border-outline-variant cursor-pointer hover:bg-surface-variant transition-colors duration-200"
                  data-testid="leftnav-back-to-catalog"
                  aria-label="Back to course catalog"
                >
                  {'\u2190'} Back to Catalog
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

function CourseStepList(): JSX.Element {
  const { loadedPackage, currentNodeId, visitedNodes, navigateToNode } = useRuntimeOptional()!;

  const orderedIds = useMemo(() => {
    if (!loadedPackage.workflow || !loadedPackage.manifest.entry) return [];
    return getOrderedNodes(loadedPackage.workflow, loadedPackage.manifest.entry);
  }, [loadedPackage]);

  return (
    <ol
      className="list-none p-0 m-0"
      data-testid="course-step-list"
      role="list"
      aria-label="Course steps"
    >
      {orderedIds.map((nodeId, idx) => {
        const node = loadedPackage.nodes.find((n) => n.relativePath === nodeId);
        const title = node
          ? ((node.node as { title?: string }).title ?? nodeId.replace('.md', ''))
          : nodeId;
        const isCurrent = nodeId === currentNodeId;
        const isVisited = visitedNodes.includes(nodeId);
        const isFuture = !isCurrent && !isVisited;
        const isLast = idx === orderedIds.length - 1;

        const stateLabel = isCurrent ? ' (current)' : isVisited ? ' (completed)' : ' (future)';

        let indicator: JSX.Element;
        if (isCurrent) {
          indicator = (
            <span className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
              {idx + 1}
            </span>
          );
        } else if (isVisited) {
          indicator = (
            <span
              className="w-6 h-6 rounded-full bg-success-container text-on-success-container flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              {'\u2713'}
            </span>
          );
        } else {
          indicator = (
            <span
              className="w-6 h-6 rounded-full border-2 border-outline-variant flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            />
          );
        }

        return (
          <li key={nodeId} className="flex">
            <div className="flex flex-col items-center w-6 flex-shrink-0">
              {indicator}
              {!isLast && (
                <div
                  className={`w-0.5 h-full min-h-[8px] ${isFuture ? 'bg-outline-variant' : 'bg-primary'}`}
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="flex-1 ml-2.5 pb-2">
              <button
                type="button"
                disabled={isFuture}
                title={title}
                onClick={() => {
                  if (isVisited && !isCurrent) {
                    navigateToNode(nodeId);
                  }
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm font-sans transition-colors duration-200 ${
                  isCurrent
                    ? 'bg-primary text-on-primary'
                    : isVisited
                      ? 'bg-transparent text-on-surface hover:bg-surface-variant cursor-pointer'
                      : 'bg-transparent text-on-surface-variant/50 cursor-not-allowed'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Step ${idx + 1}: ${title}${stateLabel}`}
                data-testid={`step-${nodeId}`}
              >
                <span className="flex-1 truncate">{title}</span>
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
