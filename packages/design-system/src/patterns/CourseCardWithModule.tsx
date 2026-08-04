import * as React from 'react';
import { cn } from '../lib/utils.js';
import { OpenModule } from '../primitives/open-module.js';
import type { CourseCardProps } from '../learning/CourseCard.js';

export interface CourseCardWithModuleProps {
  progress: {
    visitedNodes: string[];
    isCompleted: boolean;
  } | null;
  badgeCount?: number;
  children: React.ReactNode;
  className?: string;
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

function isCourseCard(child: React.ReactNode): boolean {
  return (
    React.isValidElement(child) &&
    typeof child.type === 'function' &&
    'manifest' in (child.props as Record<string, unknown>)
  );
}

export function CourseCardWithModule({
  progress,
  badgeCount = 0,
  children,
  className,
}: CourseCardWithModuleProps): JSX.Element {
  const satellites = getProgressSatellites(progress, badgeCount);

  const indicator = <OpenModule size="xs" satellites={satellites} aria-hidden="true" />;

  const mapped = React.Children.map(children, (child) => {
    if (isCourseCard(child)) {
      return React.cloneElement(child as React.ReactElement<CourseCardProps>, {
        indicator,
      });
    }
    return child;
  });

  const hasCourseCard = React.Children.toArray(children).some(isCourseCard);

  if (hasCourseCard) {
    return <div className={cn('flex h-full flex-col', className)}>{mapped}</div>;
  }

  return (
    <div className={cn('relative flex h-full flex-col pr-16', className)}>
      <div className="absolute right-4 top-4 z-10">{indicator}</div>
      {children}
    </div>
  );
}
