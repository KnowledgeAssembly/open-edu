import * as React from 'react';
import { cn } from '../lib/utils.js';
import { OpenModule } from '../primitives/open-module.js';

export type BundleModuleStatus = 'locked' | 'unlocked' | 'in-progress' | 'completed';

export interface BundleModuleIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  status: BundleModuleStatus;
  completionPercent?: number;
}

const statusConfig: Record<BundleModuleStatus, { satellites: number; opacityClass: string }> = {
  locked: { satellites: 2, opacityClass: 'opacity-30' },
  unlocked: { satellites: 3, opacityClass: 'opacity-50' },
  'in-progress': { satellites: 4, opacityClass: 'opacity-70' },
  completed: { satellites: 5, opacityClass: 'opacity-100' },
};

export function BundleModuleIndicator({
  status,
  completionPercent = 0,
  className,
  ...props
}: BundleModuleIndicatorProps): JSX.Element {
  const config = statusConfig[status];

  return (
    <div className={cn('flex items-center gap-sm', className)} {...props}>
      <OpenModule
        size="sm"
        satellites={config.satellites}
        className={cn('transition-opacity duration-200', config.opacityClass)}
        aria-hidden="true"
      />
      {status === 'in-progress' && completionPercent > 0 && (
        <span className="text-xs text-on-surface-variant">{completionPercent}%</span>
      )}
    </div>
  );
}
