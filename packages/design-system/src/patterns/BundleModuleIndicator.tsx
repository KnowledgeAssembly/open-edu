import * as React from 'react';
import { cn } from '../lib/utils.js';
import { OpenModule } from '../primitives/open-module.js';

export type BundleModuleStatus = 'locked' | 'unlocked' | 'in-progress' | 'completed';

export interface BundleModuleIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  status: BundleModuleStatus;
  completionPercent?: number;
}

const statusConfig: Record<BundleModuleStatus, { satellites: number; opacity: number }> = {
  locked: { satellites: 2, opacity: 0.3 },
  unlocked: { satellites: 3, opacity: 0.5 },
  'in-progress': { satellites: 4, opacity: 0.7 },
  completed: { satellites: 5, opacity: 1 },
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
        className="transition-opacity duration-200"
        style={{ opacity: config.opacity }}
        aria-hidden="true"
      />
      {status === 'in-progress' && completionPercent > 0 && (
        <span className="text-xs text-on-surface-variant">{completionPercent}%</span>
      )}
    </div>
  );
}
