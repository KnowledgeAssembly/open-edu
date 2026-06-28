import * as React from 'react';
import { cn } from '../lib/utils.js';

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
} as const;

export interface SpinnerProps {
  size?: keyof typeof sizeClasses;
  className?: string;
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 'md', className }, ref) => (
    <div
      ref={ref}
      role="status"
      aria-label="Loading"
      className={cn('motion-safe:animate-spin text-muted-foreground', sizeClasses[size], className)}
    >
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          className="opacity-25"
        />
        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </div>
  ),
);
Spinner.displayName = 'Spinner';

export { Spinner };
