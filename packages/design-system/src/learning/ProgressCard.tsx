import * as React from 'react';
import { Button } from '../primitives/button.js';
import { Progress } from '../primitives/progress.js';
import { cn } from '../lib/utils.js';
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

  return (
    <div
      className={cn(
        'bg-surface-container-low font-body-md shadow-elevation-raised hover:shadow-elevation-overlay relative cursor-pointer rounded-2xl transition-shadow duration-200',
        className,
      )}
      data-testid="progress-card"
      onClick={onContinue}
      {...props}
    >
      <div className="p-5 pr-16">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h2 className="text-on-surface m-0 text-base font-semibold">{title}</h2>
          {isCompleted && (
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
          <span>
            {currentSteps} of {totalSteps} steps
          </span>
          {lastTitle && <span className="text-on-surface-variant/70">Last: {lastTitle}</span>}
          {lastStudied && <span className="text-on-surface-variant/70">{lastStudied}</span>}
          {badgeCount > 0 && (
            <span className="text-tertiary font-medium">
              {badgeCount} badge{badgeCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {!isCompleted && (
          <Progress
            value={percent}
            className="h-2"
            label={`${currentSteps} of ${totalSteps} steps`}
          />
        )}
        <div className="mt-3 flex items-center gap-3">
          {isCompleted && onReview && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onReview();
              }}
            >
              Review
            </Button>
          )}
          {!isCompleted && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onContinue();
              }}
            >
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

ProgressCard.displayName = 'ProgressCard';
