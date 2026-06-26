import type { PackageSummary, LoadedPackage } from '@open-edu/core';
import { getOrderedNodes } from '@open-edu/workflow';
import { type AppView } from './LeftNav';
import { getAllProgress } from './progressStorage';

export interface ProgressDashboardProps {
  onNavigate: (view: AppView) => void;
  catalogPackages?: PackageSummary[];
  packageEntries?: Record<string, LoadedPackage>;
}

export function ProgressDashboard({
  onNavigate,
  catalogPackages = [],
  packageEntries = {},
}: ProgressDashboardProps): JSX.Element {
  const allProgress = getAllProgress();
  const entries = Object.entries(allProgress);

  if (entries.length === 0) {
    return (
      <div className="p-xl max-w-4xl mx-auto" data-testid="progress-dashboard">
        <h1 className="text-h1 font-display text-on-surface font-bold mb-lg">My Progress</h1>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg text-center">
          <p className="text-on-surface-variant mb-lg">
            No progress yet. Start a course to track your learning.
          </p>
          <button
            onClick={() => onNavigate({ view: 'catalog' })}
            className="bg-primary text-on-primary px-lg py-sm rounded-lg font-semibold"
          >
            Browse Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-xl max-w-5xl mx-auto" data-testid="progress-dashboard">
      <h1 className="text-h1 font-display text-on-surface font-bold mb-lg">My Progress</h1>

      <div className="flex flex-col gap-md">
        {entries.map(([packageId, snap]) => {
          const pkg = packageEntries[packageId];
          const summary = catalogPackages.find((s) => s.manifest.id === packageId);
          const title = pkg?.manifest.title ?? summary?.manifest.title ?? packageId;
          const totalNodes =
            pkg?.workflow && pkg?.manifest.entry
              ? getOrderedNodes(pkg.workflow, pkg.manifest.entry).length
              : snap.visitedNodes.length;
          const percent =
            totalNodes > 0 ? Math.round((snap.visitedNodes.length / totalNodes) * 100) : 0;
          const lastNode = snap.currentNodeId
            ? pkg?.nodes.find((n) => n.relativePath === snap.currentNodeId)
            : null;
          const lastTitle = lastNode
            ? ((lastNode.node as { title?: string }).title ?? snap.currentNodeId)
            : (snap.currentNodeId ?? 'Not started');

          return (
            <div
              key={packageId}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md"
              data-testid={`progress-card-${packageId}`}
            >
              <div className="flex-1 w-full">
                <h2 className="text-h2 font-title text-on-surface">{title}</h2>
                <div className="flex items-center gap-md mt-sm text-sm text-on-surface-variant">
                  <span>
                    {snap.visitedNodes.length} of {totalNodes} steps
                  </span>
                  <span>Last: {lastTitle}</span>
                </div>
                <div className="mt-sm w-full bg-surface-variant rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-md flex-shrink-0">
                <span className="text-h2 font-display text-primary font-bold">{percent}%</span>
                {snap.isCompleted ? (
                  <span className="bg-success-container text-on-success-container px-sm py-xs rounded text-xs font-semibold">
                    Completed
                  </span>
                ) : (
                  <button
                    onClick={() => onNavigate({ view: 'course', packageId })}
                    className="bg-primary text-on-primary px-lg py-sm rounded-lg font-semibold text-sm"
                  >
                    Continue
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
