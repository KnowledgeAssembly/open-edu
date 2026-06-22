import type { CSSProperties } from 'react';

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

  const wrapperStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    width: '100%',
  };

  const trackStyle: CSSProperties = {
    flex: 1,
    height: '0.5rem',
    borderRadius: '9999px',
    backgroundColor: 'var(--oe-color-border, #e5e7eb)',
    overflow: 'hidden',
  };

  const fillStyle: CSSProperties = {
    height: '100%',
    width: `${percent}%`,
    borderRadius: '9999px',
    backgroundColor: 'var(--oe-color-primary, #2563eb)',
    transition: 'width 200ms ease',
  };

  return (
    <div style={wrapperStyle}>
      <div
        role="progressbar"
        aria-valuenow={clampedCurrent}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={ariaLabel}
        style={trackStyle}
        data-testid="progress-bar"
      >
        <div style={fillStyle} />
      </div>
      {showLabel && (
        <span
          style={{
            color: 'var(--oe-color-muted, #6b7280)',
            fontSize: '0.875rem',
            whiteSpace: 'nowrap',
          }}
        >
          {clampedCurrent} / {total}
        </span>
      )}
    </div>
  );
}
