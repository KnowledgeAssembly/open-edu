import * as React from 'react';
import { cn } from '../lib/utils.js';
import { OpenModule } from '../primitives/open-module.js';

export interface CourseCardWithModuleProps extends React.HTMLAttributes<HTMLDivElement> {
  progress: {
    visitedNodes: string[];
    isCompleted: boolean;
  } | null;
  badgeCount?: number;
  children: React.ReactNode;
}

export function getProgressSatellites(
  progress: CourseCardWithModuleProps['progress'],
  badgeCount: number,
): number {
  if (badgeCount > 0) return 6;
  if (!progress) return 2;
  if (progress.isCompleted) return 5;
  if (progress.visitedNodes.length > 0) {
    return 3 + Math.min(progress.visitedNodes.length, 2);
  }
  return 2;
}

export function CourseCardWithModule({
  progress,
  badgeCount = 0,
  children,
  className,
  ...props
}: CourseCardWithModuleProps): JSX.Element {
  const satellites = getProgressSatellites(progress, badgeCount);

  return (
    <div className={cn('relative', className)} {...props}>
      <OpenModule
        size="sm"
        satellites={satellites}
        className="absolute top-2 right-2 z-10"
        aria-hidden="true"
      />
      {children}
    </div>
  );
}
