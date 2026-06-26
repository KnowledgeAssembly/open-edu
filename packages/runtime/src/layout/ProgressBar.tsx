export interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showLabel?: boolean;
}

export function ProgressBar({
  current,
  total,
  label,
  showLabel = true,
}: ProgressBarProps): JSX.Element {
  const clampedCurrent = Math.max(0, Math.min(current, total));
  const safeTotal = Math.max(1, total);
  const percent = Math.round((clampedCurrent / safeTotal) * 100);
  const ariaLabel = label ?? `Progress: ${clampedCurrent} of ${total}`;

  return (
    <div className="flex items-center gap-sm w-full">
      <div
        role="progressbar"
        aria-valuenow={clampedCurrent}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={ariaLabel}
        className="flex-1 h-2 rounded-full bg-outline-variant overflow-hidden"
        data-testid="progress-bar"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-body-ui text-on-surface-variant whitespace-nowrap">
          {clampedCurrent} / {total}
        </span>
      )}
    </div>
  );
}
