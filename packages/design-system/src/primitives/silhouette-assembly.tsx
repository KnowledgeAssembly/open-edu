import * as React from 'react';
import { cn } from '../lib/utils.js';

export type SilhouetteProportion = 'tall' | 'med' | 'short' | 'wide' | 'narrow';
export type SilhouettePalette = 1 | 2 | 3 | 4 | 5;

export interface SilhouetteAssemblyProps extends React.HTMLAttributes<HTMLDivElement> {
  proportion?: SilhouetteProportion;
  palette?: SilhouettePalette;
  animated?: boolean;
}

const proportionConfig: Record<
  SilhouetteProportion,
  { head: number; torsoW: number; torsoH: number }
> = {
  tall: { head: 22, torsoW: 28, torsoH: 40 },
  med: { head: 20, torsoW: 26, torsoH: 34 },
  short: { head: 18, torsoW: 24, torsoH: 28 },
  wide: { head: 22, torsoW: 34, torsoH: 32 },
  narrow: { head: 16, torsoW: 20, torsoH: 36 },
};

const paletteColors: Record<SilhouettePalette, string> = {
  1: 'var(--oe-color-primary)',
  2: 'var(--oe-color-secondary-container)',
  3: '#b45309',
  4: 'var(--oe-color-primary-fixed)',
  5: 'var(--oe-color-success)',
};

const animationStyles = (
  <style>{`
    @keyframes silhouette-breath {
      0%, 100% { opacity: 0.25; }
      50% { opacity: 0.30; }
    }
    @media (prefers-reduced-motion: reduce) {
      .silhouette-breath { animation: none !important; }
    }
  `}</style>
);

export const SilhouetteAssembly = React.forwardRef<HTMLDivElement, SilhouetteAssemblyProps>(
  ({ proportion = 'med', palette = 1, animated = false, className, ...props }, ref) => {
    const prop = proportionConfig[proportion];
    const color = paletteColors[palette];

    return (
      <div
        ref={ref}
        className={cn('inline-flex flex-col items-center', className)}
        role="img"
        aria-label={`Person — ${proportion}`}
        {...props}
      >
        {animated && animationStyles}
        <div
          className="rounded-full"
          style={{
            width: prop.head,
            height: prop.head,
            backgroundColor: color,
            opacity: 0.7,
            marginBottom: -4,
            flexShrink: 0,
          }}
        />
        <div
          className={cn('rounded-[50%_50%_30%_30%]', animated && 'silhouette-breath')}
          style={{
            width: prop.torsoW,
            height: prop.torsoH,
            backgroundColor: color,
            opacity: 0.25,
            ...(animated ? { animation: 'silhouette-breath 4s ease-in-out infinite' } : {}),
          }}
        />
      </div>
    );
  },
);
SilhouetteAssembly.displayName = 'SilhouetteAssembly';
