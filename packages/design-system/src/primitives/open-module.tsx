import * as React from 'react';
import { cn } from '../lib/utils.js';

export type OpenModuleSize = 'xs' | 'sm' | 'md' | 'lg';
export type OpenModuleState = 'default' | 'hover' | 'active';

export interface OpenModuleProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: OpenModuleSize;
  satellites?: number;
  progress?: number;
  state?: OpenModuleState;
}

export function progressToSatellites(progress: number): number {
  const clamped = Math.max(0, Math.min(100, progress));
  if (clamped === 0) return 2;
  if (clamped <= 33) return 3;
  if (clamped <= 66) return 4;
  if (clamped <= 99) return 5;
  return 6;
}

const sizeConfig: Record<
  OpenModuleSize,
  { total: number; core: number; orbit: number; satellite: number }
> = {
  xs: { total: 48, core: 12, orbit: 36, satellite: 6 },
  sm: { total: 80, core: 18, orbit: 56, satellite: 9 },
  md: { total: 120, core: 26, orbit: 84, satellite: 12 },
  lg: { total: 180, core: 38, orbit: 128, satellite: 16 },
};

function getSatellitePositions(
  count: number,
  orbitRadius: number,
  center: number,
): Array<{ x: number; y: number }> {
  const clamped = Math.max(2, Math.min(6, count));
  const minSpread = 140;
  const maxSpread = 210;
  const spread = minSpread + ((clamped - 2) / 4) * (maxSpread - minSpread);
  const startAngle = -spread / 2;
  const positions: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < clamped; i++) {
    const angle = (startAngle + (i / Math.max(clamped - 1, 1)) * spread) * (Math.PI / 180);
    positions.push({
      x: center + orbitRadius * Math.cos(angle),
      y: center + orbitRadius * Math.sin(angle),
    });
  }
  return positions;
}

export const OpenModule = React.forwardRef<HTMLDivElement, OpenModuleProps>(
  ({ size = 'md', satellites, progress, state = 'default', className, ...props }, ref) => {
    const config = sizeConfig[size];
    const center = config.total / 2;
    const orbitRadius = config.orbit / 2;
    const satCount = satellites ?? (progress !== undefined ? progressToSatellites(progress) : 3);
    const positions = getSatellitePositions(satCount, orbitRadius, center);
    const satelliteOpacity = state === 'hover' ? 0.85 : 0.7;

    return (
      <div
        ref={ref}
        className={cn('inline-flex items-center justify-center', className)}
        aria-hidden="true"
        {...props}
      >
        <svg
          width={config.total}
          height={config.total}
          viewBox={`0 0 ${config.total} ${config.total}`}
          aria-hidden="true"
        >
          <circle
            cx={center}
            cy={center}
            r={orbitRadius}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            className="text-primary"
            style={{ opacity: 0.18 }}
          />
          {positions.map((pos, i) => (
            <circle
              key={i}
              cx={pos.x}
              cy={pos.y}
              r={config.satellite / 2}
              fill="currentColor"
              className="text-primary-container transition-opacity duration-200"
              style={{ opacity: satelliteOpacity }}
            />
          ))}
          {state === 'active' && (
            <circle
              cx={center}
              cy={center}
              r={config.core / 2 + 3}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary"
            />
          )}
          <circle
            cx={center}
            cy={center}
            r={config.core / 2}
            fill="currentColor"
            className="text-primary"
          />
        </svg>
      </div>
    );
  },
);
OpenModule.displayName = 'OpenModule';
