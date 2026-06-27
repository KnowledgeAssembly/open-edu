import type { JSX } from 'react';

export type ModuleStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';

export interface BundleOverviewModule {
  id: string;
  title: string;
  chapterCode?: string;
  status: ModuleStatus;
  nodeCount: number;
  completedNodeCount: number;
  estimatedDuration?: number;
  prerequisiteLabel?: string;
}

export interface BundleOverviewProps {
  bundleTitle: string;
  bundleId: string;
  description?: string;
  modules: BundleOverviewModule[];
  onStartModule: (moduleId: string) => void;
  onContinueModule?: (moduleId: string) => void;
  onBackToCatalog: () => void;
}

function ModuleProgressBar({ current, total }: { current: number; total: number }): JSX.Element {
  const clampedCurrent = Math.max(0, Math.min(current, total));
  const safeTotal = Math.max(1, total);
  const percent = Math.round((clampedCurrent / safeTotal) * 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={clampedCurrent}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`Progress: ${clampedCurrent} of ${total}`}
      className="h-2 rounded-full bg-outline-variant overflow-hidden"
      style={{ width: '100%' }}
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-200"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function OverallProgressBar({ modules }: { modules: BundleOverviewModule[] }): JSX.Element {
  const totalNodes = modules.reduce((sum, m) => sum + m.nodeCount, 0);
  const completedNodes = modules.reduce((sum, m) => sum + m.completedNodeCount, 0);

  if (totalNodes === 0) {
    return (
      <div className="w-full h-2 rounded-full bg-outline-variant" data-testid="overall-progress" />
    );
  }

  const percent = Math.round((completedNodes / totalNodes) * 100);

  return (
    <div className="w-full" data-testid="overall-progress">
      <div
        role="progressbar"
        aria-valuenow={completedNodes}
        aria-valuemin={0}
        aria-valuemax={totalNodes}
        aria-label={`Overall progress: ${completedNodes} of ${totalNodes}`}
        className="h-2.5 rounded-full bg-outline-variant overflow-hidden"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-sm text-on-surface-variant mt-1">
        {completedNodes} of {totalNodes} activities completed
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: ModuleStatus }): JSX.Element {
  const config: Record<ModuleStatus, { label: string; className: string }> = {
    locked: {
      label: 'Locked',
      className: 'bg-surface-variant text-on-surface-variant',
    },
    unlocked: {
      label: 'Ready',
      className: 'bg-primary-container text-on-primary-container',
    },
    in_progress: {
      label: 'In Progress',
      className: 'bg-tertiary-container text-on-tertiary-container',
    },
    completed: {
      label: 'Completed',
      className: 'bg-success-container text-on-success-container',
    },
  };

  const c = config[status];
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.className}`}
      data-testid={`module-status-${status}`}
    >
      {c.label}
    </span>
  );
}

export function BundleOverview(props: BundleOverviewProps): JSX.Element {
  const { bundleTitle, description, modules, onStartModule, onContinueModule, onBackToCatalog } =
    props;

  return (
    <div className="p-xl max-w-4xl mx-auto" data-testid="bundle-overview">
      <button
        type="button"
        onClick={onBackToCatalog}
        className="mb-md text-sm text-primary bg-transparent border-none cursor-pointer font-semibold"
        data-testid="back-to-catalog"
      >
        ← Back to Catalog
      </button>

      <h1
        className="text-h1 font-display text-on-surface font-bold mb-sm"
        data-testid="bundle-title"
      >
        {bundleTitle}
      </h1>

      {description && (
        <p className="text-body-reading text-on-surface-variant mb-lg">{description}</p>
      )}

      <div className="mb-xl">
        <h2 className="text-h3 font-display font-bold text-on-surface mb-md">Overall Progress</h2>
        <OverallProgressBar modules={modules} />
      </div>

      <div className="flex flex-col gap-md" aria-label="Bundle modules" data-testid="module-list">
        {modules.map((mod) => (
          <div
            key={mod.id}
            role="region"
            aria-labelledby={`module-title-${mod.id}`}
            className={`border border-outline-variant rounded-xl p-md transition-colors ${
              mod.status === 'locked' ? 'opacity-60' : ''
            }`}
            data-testid="module-card"
            data-status={mod.status}
          >
            <div className="flex items-start justify-between mb-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-sm mb-xs">
                  {mod.chapterCode && (
                    <span className="text-xs font-bold text-primary bg-primary-container px-2 py-0.5 rounded">
                      {mod.chapterCode}
                    </span>
                  )}
                  <h3
                    id={`module-title-${mod.id}`}
                    className="text-h3 font-title text-on-surface font-bold truncate m-0"
                  >
                    {mod.title}
                  </h3>
                </div>
                {mod.status === 'locked' && mod.prerequisiteLabel && (
                  <p className="text-sm text-on-surface-variant mt-xs">{mod.prerequisiteLabel}</p>
                )}
              </div>
              <StatusBadge status={mod.status} />
            </div>

            {mod.nodeCount > 0 && mod.status !== 'locked' && (
              <div className="mb-sm">
                <ModuleProgressBar current={mod.completedNodeCount} total={mod.nodeCount} />
                <span className="text-xs text-on-surface-variant mt-0.5 block">
                  {mod.completedNodeCount} of {mod.nodeCount} activities completed
                </span>
              </div>
            )}

            {mod.nodeCount === 0 && mod.status !== 'locked' && (
              <p className="text-xs text-on-surface-variant mb-sm">No activities</p>
            )}

            {mod.estimatedDuration && mod.status !== 'completed' && (
              <p className="text-xs text-on-surface-variant mb-sm">~{mod.estimatedDuration} min</p>
            )}

            <div className="flex gap-sm">
              {mod.status === 'unlocked' && (
                <button
                  type="button"
                  onClick={() => onStartModule(mod.id)}
                  className="bg-primary text-on-primary px-lg py-sm rounded-lg font-semibold text-sm border-none cursor-pointer hover:bg-primary-hover transition-colors"
                  data-testid={`start-module-${mod.id}`}
                >
                  Start
                </button>
              )}
              {mod.status === 'in_progress' && onContinueModule && (
                <button
                  type="button"
                  onClick={() => onContinueModule(mod.id)}
                  className="bg-tertiary text-on-tertiary px-lg py-sm rounded-lg font-semibold text-sm border-none cursor-pointer hover:bg-tertiary-hover transition-colors"
                  data-testid={`continue-module-${mod.id}`}
                >
                  Continue
                </button>
              )}
              {mod.status === 'completed' && (
                <span className="text-success font-semibold text-sm flex items-center gap-xs">
                  ✓ Completed
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {modules.length === 0 && (
        <p className="text-on-surface-variant py-lg text-center">No modules in this bundle.</p>
      )}
    </div>
  );
}
