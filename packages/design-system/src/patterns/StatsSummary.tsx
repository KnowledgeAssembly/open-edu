import * as React from 'react';
import { cn } from '../lib/utils.js';

export interface StatsSummaryItem {
  value: number;
  label: string;
  color?: 'primary' | 'success' | 'tertiary';
  icon?: React.ReactNode;
}

export interface StatsSummaryProps extends React.HTMLAttributes<HTMLDivElement> {
  items: StatsSummaryItem[];
  columns?: 2 | 3 | 4;
  animated?: boolean;
}

const colorMap: Record<string, string> = {
  primary: 'text-primary',
  success: 'text-success',
  tertiary: 'text-tertiary',
};

const gridCols: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

export function StatsSummary({
  items,
  columns = 3,
  animated = false,
  className,
  ...props
}: StatsSummaryProps): JSX.Element {
  return (
    <div
      className={cn('grid', gridCols[columns] ?? 'grid-cols-3', 'gap-md', className)}
      data-testid="stats-summary"
      {...props}
    >
      {items.map((item, i) => {
        const colorClass = colorMap[item.color ?? 'primary'];
        return (
          <div
            key={i}
            className={cn(
              'bg-surface-container-lowest border-outline-variant flex items-center gap-3 rounded-xl border px-4 py-3',
              animated && 'animate-orbit-float',
            )}
            data-testid={`stats-item-${i}`}
          >
            {item.icon && <span className={cn('shrink-0', colorClass)}>{item.icon}</span>}
            <div>
              <p className={cn('text-h2 font-display', colorClass)}>{item.value}</p>
              <p className="text-on-surface-variant text-caption">{item.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
StatsSummary.displayName = 'StatsSummary';
