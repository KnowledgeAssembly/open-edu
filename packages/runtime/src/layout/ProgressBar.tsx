import { Progress } from '@open-edu/design-system';

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
  return (
    <Progress
      current={current}
      total={total}
      label={label}
      showLabel={showLabel}
      size="sm"
      data-testid="progress-bar"
    />
  );
}
