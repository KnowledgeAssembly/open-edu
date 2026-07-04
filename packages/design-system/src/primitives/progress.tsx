import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '../lib/utils.js';

export interface ProgressProps extends Omit<
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
  'value'
> {
  value?: number;
  current?: number;
  total?: number;
  showLabel?: boolean;
  label?: string;
  size?: 'xs' | 'sm' | 'md';
}

const Progress = React.forwardRef<React.ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  ({ className, value, current, total, showLabel = false, label, size, ...props }, ref) => {
    const clampedCurrent = current != null ? Math.max(0, Math.min(current, total ?? current)) : 0;
    const safeTotal = Math.max(1, total ?? 100);
    const pct =
      current != null && total != null
        ? Math.round((clampedCurrent / safeTotal) * 100)
        : Math.min(100, Math.max(0, value ?? 0));
    const ariaLabel =
      label ?? (current != null ? `Progress: ${clampedCurrent} of ${safeTotal}` : undefined);
    const sizeClass = size === 'xs' ? 'h-1' : size === 'sm' ? 'h-2' : 'h-4';

    const bar = (
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          'bg-secondary relative w-full overflow-hidden rounded-full',
          sizeClass,
          className,
        )}
        aria-valuenow={current != null ? clampedCurrent : pct}
        aria-valuemin={0}
        aria-valuemax={total ?? 100}
        aria-label={ariaLabel}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className="bg-primary h-full w-full flex-1 transition-all"
          style={{ transform: `translateX(-${100 - pct}%)` }}
        />
      </ProgressPrimitive.Root>
    );

    if (showLabel) {
      return (
        <div className="gap-sm flex w-full items-center">
          {bar}
          <span className="text-on-surface-variant whitespace-nowrap text-sm">
            {current != null ? `${clampedCurrent} / ${safeTotal}` : `${pct}%`}
          </span>
        </div>
      );
    }

    return bar;
  },
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
