import { ProgressBadge } from './ProgressBadge.js';
import type { PackageManifest, ProgressSnapshot } from '@open-edu/schemas';

export interface CourseCardProps {
  manifest: PackageManifest;
  nodeCount: number;
  badgeCount: number;
  earnedBadgeCount: number;
  progress: ProgressSnapshot | null;
  onStart: (packageDir: string) => void;
}

export function CourseCard({
  manifest,
  nodeCount,
  badgeCount,
  earnedBadgeCount,
  progress,
  onStart,
}: CourseCardProps): JSX.Element {
  const percentComplete = progress
    ? Math.round((progress.visitedNodes.length / Math.max(nodeCount, 1)) * 100)
    : 0;
  const isCompleted = progress?.isCompleted ?? false;

  let buttonClass: string;
  let buttonLabel: string;
  let disabled = false;

  if (progress === null) {
    buttonClass = 'bg-primary text-on-primary';
    buttonLabel = 'Start';
  } else if (isCompleted) {
    buttonClass = 'bg-secondary text-on-secondary opacity-70';
    buttonLabel = 'Completed';
    disabled = true;
  } else {
    buttonClass = 'bg-amber-600 text-white';
    buttonLabel = 'Continue';
  }

  return (
    <article
      className="border border-outline-variant rounded-lg p-md bg-white shadow-sm font-body-md"
      data-testid="course-card"
    >
      <h2 className="text-xl font-bold m-0 mb-1">{manifest.title}</h2>
      <p className="text-body-ui text-on-surface-variant m-0 mb-3">{manifest.author}</p>
      <p className="text-body-ui text-on-surface-variant m-0">{nodeCount} lessons</p>
      {badgeCount > 0 && (
        <p className="text-body-ui text-on-surface-variant m-0">
          {earnedBadgeCount > 0
            ? `${earnedBadgeCount} earned / ${badgeCount}`
            : `${badgeCount} badges available`}
        </p>
      )}
      <div className="mt-2">
        <ProgressBadge percentComplete={percentComplete} isCompleted={isCompleted} />
      </div>
      <button
        type="button"
        className={`border-none rounded-lg px-md py-sm text-body-ui font-semibold mt-3 ${buttonClass} ${isCompleted ? 'cursor-default' : 'cursor-pointer'}`}
        disabled={disabled}
        aria-label={`${buttonLabel} ${manifest.title}`}
        onClick={() => onStart(manifest.entry)}
      >
        {buttonLabel}
      </button>
    </article>
  );
}
