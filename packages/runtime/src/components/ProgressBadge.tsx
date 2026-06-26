export interface ProgressBadgeProps {
  percentComplete: number;
  isCompleted: boolean;
}

export function ProgressBadge({ percentComplete, isCompleted }: ProgressBadgeProps): JSX.Element {
  let label: string;
  let bgClass: string;

  if (isCompleted) {
    label = 'Complete';
    bgClass = 'bg-secondary';
  } else if (percentComplete > 0) {
    label = 'In progress';
    bgClass = 'bg-amber-600';
  } else {
    label = 'Not started';
    bgClass = 'bg-primary';
  }

  return (
    <span
      className={`${bgClass} text-xs px-1 py-0.5 rounded-lg inline-block text-white font-semibold`}
    >
      {label}
    </span>
  );
}
