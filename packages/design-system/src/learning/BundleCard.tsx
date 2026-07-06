import { cn } from '../lib/utils.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../primitives/card.js';
import { Badge } from '../primitives/badge.js';
import { Progress } from '../primitives/progress.js';
import type { JSX } from 'react';

export interface BundleCardProps {
  title: string;
  description?: string;
  moduleCount: number;
  activityCount: number;
  completedModules: number;
  totalModules: number;
  isStarted: boolean;
  onStart: () => void;
  className?: string;
}

export function BundleCard({
  title,
  description,
  moduleCount,
  activityCount,
  completedModules,
  totalModules,
  isStarted,
  onStart,
  className,
}: BundleCardProps): JSX.Element {
  const percent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  return (
    <Card
      data-testid="bundle-card"
      onClick={onStart}
      className={cn('cursor-pointer shadow-sm transition-shadow hover:shadow-md', className)}
    >
      <CardHeader>
        <div className="mb-1 flex items-center gap-2">
          <Badge variant="secondary">Bundle</Badge>
          <CardTitle className="text-h4 font-display truncate">{title}</CardTitle>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
        {!description && <CardDescription>{moduleCount} modules</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="text-on-surface-variant flex gap-4 text-xs">
          <span>{moduleCount} modules</span>
          <span>{activityCount} activities</span>
        </div>
        {isStarted && (
          <div className="mt-2">
            <Progress
              value={percent}
              className="h-2"
              label={`${completedModules} of ${totalModules} complete`}
            />
            <span className="text-on-surface-variant mt-1 block text-xs">
              {completedModules} of {totalModules} complete
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

BundleCard.displayName = 'BundleCard';
