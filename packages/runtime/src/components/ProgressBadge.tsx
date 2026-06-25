import { type CSSProperties } from 'react';

export interface ProgressBadgeProps {
  percentComplete: number;
  isCompleted: boolean;
}

export function ProgressBadge({ percentComplete, isCompleted }: ProgressBadgeProps): JSX.Element {
  let label: string;
  let backgroundColor: string;

  if (isCompleted) {
    label = 'Complete';
    backgroundColor = 'var(--oe-color-success, #16a34a)';
  } else if (percentComplete > 0) {
    label = 'In progress';
    backgroundColor = '#d97706';
  } else {
    label = 'Not started';
    backgroundColor = 'var(--oe-color-primary, #2563eb)';
  }

  const style: CSSProperties = {
    fontSize: '0.75rem',
    padding: '0.125rem 0.5rem',
    borderRadius: 'var(--oe-radius, 8px)',
    display: 'inline-block',
    color: '#ffffff',
    backgroundColor,
    fontWeight: 600,
  };

  return <span style={style}>{label}</span>;
}
