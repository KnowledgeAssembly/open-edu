import { Badge } from '../primitives/badge.js';
import type { JSX } from 'react';

export interface ProgressBadgeProps {
  percentComplete: number;
  isCompleted: boolean;
}

export function ProgressBadge({ percentComplete, isCompleted }: ProgressBadgeProps): JSX.Element {
  let label: string;
  let variant: 'default' | 'secondary' | 'outline';

  if (isCompleted) {
    label = 'Complete';
    variant = 'default';
  } else if (percentComplete > 0) {
    label = 'In progress';
    variant = 'secondary';
  } else {
    label = 'Not started';
    variant = 'outline';
  }

  return (
    <Badge variant={variant} data-testid="progress-badge">
      {label}
    </Badge>
  );
}

ProgressBadge.displayName = 'ProgressBadge';
