import { cn } from '../lib/utils.js';
import { Button } from '../primitives/button.js';
import { Badge } from '../primitives/badge.js';
import { Progress } from '../primitives/progress.js';
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

const statusBadgeConfig: Record<
  ModuleStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  locked: { label: 'Locked', variant: 'outline' },
  unlocked: { label: 'Ready', variant: 'default' },
  in_progress: { label: 'In Progress', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'default' },
};

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

export function BundleOverview(props: BundleOverviewProps): JSX.Element {
  const { bundleTitle, description, modules, onStartModule, onContinueModule, onBackToCatalog } =
    props;

  return (
    <div className="p-xl max-w-4xl mx-auto" data-testid="bundle-overview">
      <Button
        variant="link"
        onClick={onBackToCatalog}
        className="mb-md"
        data-testid="back-to-catalog"
      >
        ← Back to Catalog
      </Button>

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

      <ul
        className="flex flex-col gap-md list-none m-0 p-0"
        role="list"
        aria-label="Bundle modules"
        data-testid="module-list"
      >
        {modules.map((mod) => {
          const badgeCfg = statusBadgeConfig[mod.status];

          return (
            <li
              key={mod.id}
              aria-labelledby={`module-title-${mod.id}`}
              className={cn(
                'border border-outline-variant rounded-xl p-md transition-colors list-none',
                mod.status === 'locked' && 'opacity-60',
              )}
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
                <Badge variant={badgeCfg.variant} data-testid={`module-status-${mod.status}`}>
                  {badgeCfg.label}
                </Badge>
              </div>

              {mod.nodeCount > 0 && mod.status !== 'locked' && (
                <div className="mb-sm">
                  <Progress current={mod.completedNodeCount} total={mod.nodeCount} size="sm" />
                  <span className="text-xs text-on-surface-variant mt-0.5 block">
                    {mod.completedNodeCount} of {mod.nodeCount} activities completed
                  </span>
                </div>
              )}

              {mod.nodeCount === 0 && mod.status !== 'locked' && (
                <p className="text-xs text-on-surface-variant mb-sm">No activities</p>
              )}

              {mod.estimatedDuration && mod.status !== 'completed' && (
                <p className="text-xs text-on-surface-variant mb-sm">
                  ~{mod.estimatedDuration} min
                </p>
              )}

              <div className="flex gap-sm">
                {mod.status === 'unlocked' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onStartModule(mod.id)}
                    data-testid={`start-module-${mod.id}`}
                  >
                    Start
                  </Button>
                )}
                {mod.status === 'in_progress' && onContinueModule && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onContinueModule(mod.id)}
                    data-testid={`continue-module-${mod.id}`}
                  >
                    Continue
                  </Button>
                )}
                {mod.status === 'completed' && (
                  <span
                    className="text-success font-semibold text-sm flex items-center gap-xs"
                    data-testid={`completed-module-${mod.id}`}
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Completed
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {modules.length === 0 && (
        <p className="text-on-surface-variant py-lg text-center">No modules in this bundle.</p>
      )}
    </div>
  );
}

BundleOverview.displayName = 'BundleOverview';
