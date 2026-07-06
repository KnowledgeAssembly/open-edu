import { cn } from '../lib/utils.js';
import { Button } from '../primitives/button.js';
import { Progress } from '../primitives/progress.js';
import { PageHeader } from '../patterns/PageHeader.js';
import { BundleModuleIndicator } from '../patterns/BundleModuleIndicator.js';
import { SectionDivider } from '../patterns/SectionDivider.js';
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

function moduleStatusToIndicatorStatus(
  status: ModuleStatus,
): 'locked' | 'unlocked' | 'in-progress' | 'completed' {
  if (status === 'in_progress') return 'in-progress';
  return status;
}

function OverallProgressBar({ modules }: { modules: BundleOverviewModule[] }): JSX.Element {
  const totalNodes = modules.reduce((sum, m) => sum + m.nodeCount, 0);
  const completedNodes = modules.reduce((sum, m) => sum + m.completedNodeCount, 0);

  if (totalNodes === 0) {
    return (
      <div className="bg-outline-variant h-2 w-full rounded-full" data-testid="overall-progress" />
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
        className="bg-outline-variant h-2.5 overflow-hidden rounded-full"
      >
        <div
          className="bg-primary h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-on-surface-variant mt-1 text-sm">
        {completedNodes} of {totalNodes} activities completed
      </p>
    </div>
  );
}

export function BundleOverview(props: BundleOverviewProps): JSX.Element {
  const { bundleTitle, description, modules, onStartModule, onContinueModule, onBackToCatalog } =
    props;

  return (
    <div className="p-xl mx-auto max-w-4xl" data-testid="bundle-overview">
      <Button
        variant="link"
        onClick={onBackToCatalog}
        className="mb-md"
        data-testid="back-to-catalog"
      >
        ← Back to Catalog
      </Button>

      <PageHeader
        title={bundleTitle}
        subtitle={description}
        eyebrow={
          <>
            <span className="bg-primary-container text-on-primary-container text-caption mr-2 rounded-full px-2 py-0.5 font-semibold">
              Bundle
            </span>
            Learning Path
          </>
        }
        className="mb-lg"
      />

      <div className="mb-xl">
        <h2 className="text-h3 font-display text-on-surface mb-md font-bold">Overall Progress</h2>
        <OverallProgressBar modules={modules} />
      </div>

      <SectionDivider density="minimal" className="mb-xl" />

      <ul
        className="gap-md m-0 flex list-none flex-col p-0"
        role="list"
        aria-label="Bundle modules"
        data-testid="module-list"
      >
        {modules.map((mod) => {
          return (
            <li
              key={mod.id}
              aria-labelledby={`module-title-${mod.id}`}
              className={cn(
                'p-md list-none rounded-xl transition-colors',
                mod.status === 'in_progress'
                  ? 'border-primary border-2'
                  : 'border-outline-variant border',
                mod.status === 'locked' && 'opacity-40',
                mod.status === 'unlocked' && 'opacity-60',
              )}
              data-testid="module-card"
              data-status={mod.status}
            >
              <div className="mb-sm flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="gap-sm mb-xs flex items-center">
                    {mod.chapterCode && (
                      <span className="text-primary bg-primary-container rounded px-2 py-0.5 text-xs font-bold">
                        {mod.chapterCode}
                      </span>
                    )}
                    <h3
                      id={`module-title-${mod.id}`}
                      className="text-h3 font-title text-on-surface m-0 truncate font-bold"
                    >
                      {mod.title}
                    </h3>
                  </div>
                  {mod.status === 'locked' && mod.prerequisiteLabel && (
                    <p className="text-on-surface-variant mt-xs text-sm">{mod.prerequisiteLabel}</p>
                  )}
                </div>
                <BundleModuleIndicator
                  status={moduleStatusToIndicatorStatus(mod.status)}
                  completionPercent={
                    mod.nodeCount > 0
                      ? Math.round((mod.completedNodeCount / mod.nodeCount) * 100)
                      : 0
                  }
                  data-testid={`module-status-${mod.status}`}
                />
              </div>

              {mod.nodeCount > 0 && mod.status !== 'locked' && (
                <div className="mb-sm">
                  <Progress current={mod.completedNodeCount} total={mod.nodeCount} size="sm" />
                  <span className="text-on-surface-variant mt-0.5 block text-xs">
                    {mod.completedNodeCount} of {mod.nodeCount} activities completed
                  </span>
                </div>
              )}

              {mod.nodeCount === 0 && mod.status !== 'locked' && (
                <p className="text-on-surface-variant mb-sm text-xs">No activities</p>
              )}

              {mod.status === 'unlocked' && (
                <p className="text-outline mb-sm text-xs">
                  {mod.estimatedDuration && `~${mod.estimatedDuration} min`}
                  {mod.estimatedDuration && mod.nodeCount > 0 && ' · '}
                  {mod.nodeCount > 0 && `${mod.nodeCount} activities`}
                </p>
              )}

              <div className="gap-sm flex">
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
                    className="text-success gap-xs flex items-center text-sm font-semibold"
                    data-testid={`completed-module-${mod.id}`}
                  >
                    <svg
                      className="h-4 w-4"
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
