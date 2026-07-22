import { Progress } from '../primitives/progress.js';
import type { JSX, ReactNode } from 'react';

interface PackageManifest {
  id: string;
  title: string;
  version: string;
  author: string;
  entry: string;
  tags?: string[];
}

interface ProgressSnapshot {
  packageId: string;
  packageVersion: string;
  currentNodeId: string;
  visitedNodes: string[];
  scores: Record<string, number>;
  isCompleted: boolean;
  updatedAt: string;
}

export interface CourseCardProps {
  manifest: PackageManifest;
  nodeCount: number;
  badgeCount: number;
  earnedBadgeCount: number;
  progress: ProgressSnapshot | null;
  onStart: () => void;
  indicator?: ReactNode;
}

function BadgeIcons({ total, earned }: { total: number; earned: number }): JSX.Element {
  const displayCount = Math.min(total, 5);
  return (
    <div
      className="flex items-center gap-0.5"
      role="group"
      aria-label={`${earned} of ${total} badges earned`}
    >
      {Array.from({ length: displayCount }, (_, i) => (
        <svg
          key={i}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={i < earned ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          className={i < earned ? 'text-tertiary' : 'text-outline-variant'}
          aria-hidden="true"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      {total > 5 && <span className="text-on-surface-variant ml-0.5 text-xs">+{total - 5}</span>}
    </div>
  );
}

export function CourseCard({
  manifest,
  nodeCount,
  badgeCount,
  earnedBadgeCount,
  progress,
  onStart,
  indicator,
}: CourseCardProps): JSX.Element {
  const isCompleted = progress?.isCompleted ?? false;
  const isStarted = !!progress;

  return (
    <article
      className="bg-surface-container-low shadow-elevation-raised font-body-md hover:shadow-elevation-overlay relative cursor-pointer rounded-2xl transition-shadow duration-200"
      data-testid="course-card"
      onClick={onStart}
    >
      {indicator && <div className="absolute right-4 top-4 z-10">{indicator}</div>}
      <div className="p-5 pr-16">
        <h2 className="text-on-surface m-0 mb-2 text-base font-semibold">{manifest.title}</h2>
        {manifest.author && (
          <p className="text-on-surface-variant m-0 mb-3 text-sm leading-relaxed">
            by {manifest.author}
          </p>
        )}
        <div className="text-on-surface-variant mb-3 flex items-center gap-3 text-xs">
          {isCompleted ? (
            <span>
              {new Set(progress!.visitedNodes).size} of {nodeCount} lessons
            </span>
          ) : (
            <span>{nodeCount} lessons</span>
          )}
          {badgeCount > 0 && <BadgeIcons total={badgeCount} earned={earnedBadgeCount} />}
          {isCompleted && (
            <span className="text-success flex items-center gap-0.5">
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
        {isStarted && !isCompleted && (
          <Progress
            current={new Set(progress.visitedNodes).size}
            total={nodeCount}
            showLabel={false}
            size="xs"
            className="mt-3"
          />
        )}
        {isCompleted && earnedBadgeCount > 0 && (
          <div className="mt-1 flex items-center gap-1">
            <span className="text-tertiary text-xs font-semibold">Badge earned</span>
          </div>
        )}
      </div>
    </article>
  );
}

CourseCard.displayName = 'CourseCard';
