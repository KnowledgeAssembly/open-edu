import * as React from 'react';
import { Button } from '../primitives/button.js';
import { Badge } from '../primitives/badge.js';
import { Progress } from '../primitives/progress.js';
import { BundleModuleIndicator } from '../patterns/BundleModuleIndicator.js';
import type { BundleModuleStatus } from '../patterns/BundleModuleIndicator.js';
import { cn } from '../lib/utils.js';
import { CheckCircle2 } from 'lucide-react';
import type { JSX } from 'react';

export interface ProgressCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  status: 'in-progress' | 'completed';
  currentSteps: number;
  totalSteps: number;
  percent: number;
  lastTitle: string;
  lastStudied?: string;
  badgeCount: number;
  onContinue: () => void;
  onReview?: () => void;
}

export function ProgressCard({
  title,
  status,
  currentSteps,
  totalSteps,
  percent,
  lastTitle,
  lastStudied,
  badgeCount,
  onContinue,
  onReview,
  className,
  ...props
}: ProgressCardProps): JSX.Element {
  const isCompleted = status === 'completed';
  const moduleStatus: BundleModuleStatus = isCompleted ? 'completed' : 'in-progress';

  return (
    <div
      className={cn(
        'bg-surface-container-lowest border-outline-variant p-md relative flex flex-col gap-4 rounded-xl border sm:flex-row sm:items-start',
        isCompleted && 'opacity-80',
        className,
      )}
      data-testid="progress-card"
      {...props}
    >
      <div className="flex flex-shrink-0 items-center gap-3" aria-hidden="true">
        <BundleModuleIndicator status={moduleStatus} completionPercent={percent} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-h3 font-display text-on-surface">{title}</h2>
          </div>
          <div className="gap-md flex flex-shrink-0 items-center">
            {isCompleted ? (
              <Badge variant="secondary">
                Completed <CheckCircle2 className="ml-1 inline h-3 w-3" />
              </Badge>
            ) : (
              <Button size="sm" onClick={onContinue}>
                Continue
              </Button>
            )}
          </div>
        </div>
        <div className="gap-md mt-sm text-on-surface-variant flex flex-wrap items-center text-sm">
          <span>
            {currentSteps} of {totalSteps} steps
          </span>
          <span>Last: {lastTitle}</span>
          {lastStudied && <span className="text-on-surface-variant/70">{lastStudied}</span>}
          {badgeCount > 0 && (
            <span className="text-tertiary font-medium">
              {badgeCount} badge{badgeCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="mt-sm w-full">
          <Progress
            value={percent}
            className="h-2"
            label={`${currentSteps} of ${totalSteps} steps`}
          />
        </div>
        <div className="mt-sm flex items-center gap-3">
          {isCompleted && onReview && (
            <Button variant="outline" size="sm" onClick={onReview}>
              Review
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

ProgressCard.displayName = 'ProgressCard';
