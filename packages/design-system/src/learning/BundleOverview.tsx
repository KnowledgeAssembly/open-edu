import { cn } from '../lib/utils.js';
import { Button } from '../primitives/button.js';
import { Progress } from '../primitives/progress.js';
import { PageHeader } from '../patterns/PageHeader.js';
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
    <div className="p-xl max-w-content mx-auto w-full" data-testid="bundle-overview">
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
          const isClickable =
            mod.status === 'unlocked' || mod.status === 'in_progress' || mod.status === 'completed';
          const handleCardClick = () => {
            if (mod.status === 'unlocked') onStartModule(mod.id);
            else if (mod.status === 'in_progress' && onContinueModule) onContinueModule(mod.id);
            else if (mod.status === 'completed') onStartModule(mod.id);
          };

          return (
            <li key={mod.id} aria-labelledby={`module-title-${mod.id}`} className="list-none">
              <div
                className={cn(
                  'bg-surface-container-low font-body-md shadow-elevation-raised relative rounded-2xl transition-shadow duration-200',
                  isClickable && 'hover:shadow-elevation-overlay cursor-pointer',
                )}
                data-testid="module-card"
                data-status={mod.status}
                onClick={isClickable ? handleCardClick : undefined}
              >
                <div className="p-5 pr-16">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        {mod.chapterCode && (
                          <span className="bg-primary-container text-on-primary-container rounded px-2 py-0.5 text-xs font-bold">
                            {mod.chapterCode}
                          </span>
                        )}
                        <h3
                          id={`module-title-${mod.id}`}
                          className="text-on-surface m-0 truncate text-base font-semibold"
                        >
                          {mod.title}
                        </h3>
                      </div>
                    </div>
                    {mod.status === 'completed' && (
                      <span className="text-success flex flex-shrink-0 items-center gap-0.5 text-xs">
                        <svg
                          width="14"
                          height="14"
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

                  <div className="text-on-surface-variant mb-3 flex items-center gap-3 text-xs">
                    {mod.nodeCount > 0 && (
                      <span>
                        {mod.completedNodeCount} of {mod.nodeCount} activities
                      </span>
                    )}
                    {mod.estimatedDuration && (
                      <span className="text-on-surface-variant/70">
                        ~{mod.estimatedDuration} min
                      </span>
                    )}
                  </div>

                  {mod.nodeCount > 0 && (
                    <Progress current={mod.completedNodeCount} total={mod.nodeCount} size="xs" />
                  )}

                  <div className="mt-3 flex items-center gap-3">
                    {mod.status === 'unlocked' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartModule(mod.id);
                        }}
                        data-testid={`start-module-${mod.id}`}
                      >
                        Start
                      </Button>
                    )}
                    {mod.status === 'in_progress' && onContinueModule && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onContinueModule(mod.id);
                        }}
                        data-testid={`continue-module-${mod.id}`}
                      >
                        Continue
                      </Button>
                    )}
                  </div>
                </div>
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
