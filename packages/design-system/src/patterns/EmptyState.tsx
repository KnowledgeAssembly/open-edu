import * as React from 'react';
import { cn } from '../lib/utils.js';
import { OpenModule } from '../primitives/open-module.js';
import { SilhouetteGroup, type SilhouetteFigureProps } from '../primitives/silhouette-assembly.js';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  heading: string;
  description: string;
  action?: React.ReactNode;
  variant?: 'default' | 'no-courses' | 'no-progress' | 'no-badges' | 'no-results';
  figures?: SilhouetteFigureProps[];
}

type EmptyStateVariant = 'default' | 'no-courses' | 'no-progress' | 'no-badges' | 'no-results';

const variantConfig: Record<
  EmptyStateVariant,
  { figures: SilhouetteFigureProps[]; satellites: number }
> = {
  default: {
    figures: [
      { proportion: 'tall', palette: 1 },
      { proportion: 'med', palette: 3 },
      { proportion: 'short', palette: 2 },
    ],
    satellites: 2,
  },
  'no-courses': {
    figures: [
      { proportion: 'tall', palette: 1 },
      { proportion: 'med', palette: 3 },
      { proportion: 'short', palette: 2 },
    ],
    satellites: 2,
  },
  'no-progress': {
    figures: [
      { proportion: 'med', palette: 1 },
      { proportion: 'short', palette: 4 },
    ],
    satellites: 2,
  },
  'no-badges': {
    figures: [
      { proportion: 'short', palette: 2 },
      { proportion: 'med', palette: 1 },
      { proportion: 'tall', palette: 5 },
    ],
    satellites: 2,
  },
  'no-results': {
    figures: [{ proportion: 'med', palette: 3 }],
    satellites: 2,
  },
};

export function EmptyState({
  heading,
  description,
  action,
  variant = 'default',
  figures,
  className,
  ...props
}: EmptyStateProps): JSX.Element {
  const config = variantConfig[variant] ?? variantConfig.default;

  const activeFigures = figures ?? config.figures;

  return (
    <div
      className={cn('flex flex-col items-center text-center py-xl px-md', className)}
      data-testid="empty-state"
      {...props}
    >
      <OpenModule size="lg" satellites={config.satellites} className="mb-lg" aria-hidden="true" />

      <SilhouetteGroup figures={activeFigures} className="mb-md" aria-hidden="true" />

      <h2 className="text-lg font-semibold text-on-surface mb-sm">{heading}</h2>
      <p className="text-sm text-on-surface-variant max-w-[280px] mb-md">{description}</p>

      {action && <div>{action}</div>}
    </div>
  );
}
