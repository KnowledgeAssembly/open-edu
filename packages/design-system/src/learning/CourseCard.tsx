import { Button } from '../primitives/button.js';
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
      {total > 5 && <span className="text-xs text-on-surface-variant ml-0.5">+{total - 5}</span>}
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

  let buttonLabel: string;

  if (!isStarted) {
    buttonLabel = 'Start';
  } else if (isCompleted) {
    buttonLabel = 'Review';
  } else {
    buttonLabel = 'Continue';
  }

  return (
    <article
      className="relative rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] font-body-md transition-shadow duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
      data-testid="course-card"
    >
      {indicator && (
        <div className="absolute top-4 right-4 z-10">{indicator}</div>
      )}
      <div className="p-5 pr-16">
        <h2 className="text-base font-semibold m-0 mb-2 text-on-surface">{manifest.title}</h2>
        {manifest.author && (
          <p className="text-sm text-on-surface-variant m-0 mb-3 leading-relaxed">by {manifest.author}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-on-surface-variant mb-3">
          <span>{nodeCount} lessons</span>
          {badgeCount > 0 && <BadgeIcons total={badgeCount} earned={earnedBadgeCount} />}
        </div>
        {isStarted && (
          <Progress
            current={progress.visitedNodes.length}
            total={nodeCount}
            showLabel={false}
            size="xs"
            className="mt-3"
          />
        )}
        <Button
          variant={isCompleted ? 'secondary' : 'default'}
          size="sm"
          className="w-full mt-3 h-8 px-4 text-sm"
          aria-label={`${buttonLabel} ${manifest.title}`}
          onClick={() => onStart()}
        >
          {buttonLabel}
        </Button>
      </div>
    </article>
  );
}

CourseCard.displayName = 'CourseCard';
