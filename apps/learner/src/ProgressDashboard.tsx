import { useMemo } from 'react';
import type { PackageSummary, LoadedPackage } from '@open-edu/core';
import { getOrderedNodes } from '@open-edu/workflow';
import { type AppView } from './LeftNav';
import { getAllProgress } from './progressStorage';
import { getAllBadges } from './badgesStorage';

export interface ProgressDashboardProps {
  onNavigate: (view: AppView) => void;
  catalogPackages?: PackageSummary[];
  packageEntries?: Record<string, LoadedPackage>;
}

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
}

function humanizeNodeId(nodeId: string): string {
  return nodeId.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
}

export function ProgressDashboard({
  onNavigate,
  catalogPackages = [],
  packageEntries = {},
}: ProgressDashboardProps): JSX.Element {
  const allProgress = getAllProgress();
  const allBadges = getAllBadges();
  const entries = Object.entries(allProgress);

  const nodeTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    Object.values(packageEntries).forEach((pkg) => {
      pkg.nodes.forEach((n) => {
        const title = (n.node as { title?: string }).title;
        if (title) map[n.relativePath] = title;
      });
    });
    return map;
  }, [packageEntries]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      const aTime = a[1].updatedAt ? new Date(a[1].updatedAt).getTime() : 0;
      const bTime = b[1].updatedAt ? new Date(b[1].updatedAt).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      if (a[1].isCompleted !== b[1].isCompleted) return a[1].isCompleted ? 1 : -1;
      return 0;
    });
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="p-xl max-w-4xl mx-auto" data-testid="progress-dashboard">
        <h1 className="text-h1 font-display text-on-surface font-bold mb-lg">My Progress</h1>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl text-center">
          <span className="text-5xl block mb-md" aria-hidden="true">
            📚
          </span>
          <p className="text-h2 font-title text-on-surface mb-sm">
            Your learning journey starts here!
          </p>
          <p className="text-body-ui text-on-surface-variant mb-lg">
            Begin a course and your progress will appear here.
          </p>
          <button
            type="button"
            onClick={() => onNavigate({ view: 'catalog' })}
            className="bg-primary text-on-primary px-lg py-sm rounded-lg font-semibold cursor-pointer border-none"
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
        {sortedEntries.map(([packageId, snap]) => {
          const pkg = packageEntries[packageId];
          const summary = catalogPackages.find((s) => s.manifest.id === packageId);
          const title = pkg?.manifest.title ?? summary?.manifest.title ?? packageId;
          const totalNodes =
            pkg?.workflow && pkg?.manifest.entry
              ? getOrderedNodes(pkg.workflow, pkg.manifest.entry).length
              : snap.visitedNodes.length;
          const percent =
            totalNodes > 0 ? Math.round((snap.visitedNodes.length / totalNodes) * 100) : 0;

          const lastTitle = snap.currentNodeId
            ? (nodeTitleMap[snap.currentNodeId] ?? humanizeNodeId(snap.currentNodeId))
            : 'Not started';

          const lastStudied = relativeTime(snap.updatedAt);

          const packageBadges = allBadges[packageId] ?? [];
          const badgeCount = packageBadges.length;

          return (
            <div
              key={packageId}
              className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md ${
                snap.isCompleted ? 'border-l-4 border-l-success opacity-80' : ''
              }`}
              data-testid={`progress-card-${packageId}`}
            >
              <div className="flex-1 w-full">
                <h2 className="text-h2 font-title text-on-surface">{title}</h2>
                <div className="flex items-center gap-md mt-sm text-sm text-on-surface-variant flex-wrap">
                  <span>
                    {snap.visitedNodes.length} of {totalNodes} steps
                  </span>
                  <span>Last: {lastTitle}</span>
                  {lastStudied && <span className="text-on-surface-variant/70">{lastStudied}</span>}
                  {badgeCount > 0 && (
                    <span className="text-tertiary font-medium">
                      {badgeCount} badge{badgeCount > 1 ? 's' : ''}
                    </span>
                  )}
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
                  <span className="bg-secondary-container text-on-secondary-container px-sm py-xs rounded text-xs font-semibold">
                    Completed ✓
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigate({ view: 'course', packageId })}
                    className="bg-primary text-on-primary px-lg py-sm rounded-lg font-semibold text-sm cursor-pointer border-none"
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
