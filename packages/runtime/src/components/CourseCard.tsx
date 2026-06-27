import { ProgressBar } from '../layout/ProgressBar.js';
import type { PackageManifest, ProgressSnapshot } from '@open-edu/schemas';

export interface CourseCardProps {
  manifest: PackageManifest;
  nodeCount: number;
  badgeCount: number;
  earnedBadgeCount: number;
  progress: ProgressSnapshot | null;
  onStart: () => void;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function BadgeIcons({ total, earned }: { total: number; earned: number }): JSX.Element {
  const displayCount = Math.min(total, 5);
  return (
    <div className="flex items-center gap-0.5" aria-label={`${earned} of ${total} badges earned`}>
      {Array.from({ length: displayCount }, (_, i) => (
        <svg
          key={i}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={i < earned ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          className={i < earned ? 'text-amber-500' : 'text-outline-variant'}
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
}: CourseCardProps): JSX.Element {
  const isCompleted = progress?.isCompleted ?? false;
  const isStarted = !!progress;

  const hue = simpleHash(manifest.title ?? manifest.id) % 360;
  const gradient = `linear-gradient(90deg, hsl(${hue}, 60%, 50%), hsl(${(hue + 40) % 360}, 60%, 50%))`;

  let buttonClass: string;
  let buttonLabel: string;

  if (!isStarted) {
    buttonClass = 'bg-primary text-on-primary';
    buttonLabel = 'Start';
  } else if (isCompleted) {
    buttonClass = 'bg-secondary-container text-on-secondary-container';
    buttonLabel = 'Review';
  } else {
    buttonClass = 'bg-primary text-on-primary';
    buttonLabel = 'Continue';
  }

  return (
    <article
      className="border border-outline-variant rounded-lg bg-surface-container-lowest shadow-sm font-body-md overflow-hidden"
      data-testid="course-card"
    >
      <div className="h-2 w-full" style={{ background: gradient }} aria-hidden="true" />
      <div className="p-md">
        <h2 className="text-xl font-bold m-0 mb-1 text-on-surface">{manifest.title}</h2>
        {manifest.author && (
          <p className="text-body-ui text-on-surface-variant m-0 mb-2">by {manifest.author}</p>
        )}
        <div className="flex items-center gap-md text-sm text-on-surface-variant mb-2">
          <span>{nodeCount} lessons</span>
          {badgeCount > 0 && <BadgeIcons total={badgeCount} earned={earnedBadgeCount} />}
        </div>
        {isStarted && (
          <ProgressBar current={progress.visitedNodes.length} total={nodeCount} showLabel={false} />
        )}
        <button
          type="button"
          className={`border-none rounded-lg px-md py-sm text-body-ui font-semibold mt-3 w-full cursor-pointer ${buttonClass}`}
          aria-label={`${buttonLabel} ${manifest.title}`}
          onClick={() => onStart()}
        >
          {buttonLabel}
        </button>
      </div>
    </article>
  );
}
