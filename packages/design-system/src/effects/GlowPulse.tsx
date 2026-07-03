import { type ReactNode } from 'react';
import { motionSafe } from '../tokens/motion.js';
import { cn } from '../lib/utils.js';

export interface GlowPulseProps {
  children: ReactNode;
  color?: string;
  duration?: number;
  intensity?: number;
  className?: string;
}

export function GlowPulse({
  children,
  color = 'var(--oe-color-primary)',
  duration = 1.2,
  intensity = 1,
  className,
}: GlowPulseProps): JSX.Element {
  return (
    <div
      className={cn('relative inline-block', className)}
      data-testid="glow-pulse"
      style={{ animation: `glow-pulse ${duration}s ease-out` } as React.CSSProperties}
    >
      <style>
        {motionSafe(`
        @keyframes glow-pulse {
          0% { box-shadow: 0 0 0 0 ${color}66; }
          50% { box-shadow: 0 0 ${20 * intensity}px ${8 * intensity}px ${color}44; }
          100% { box-shadow: 0 0 0 0 ${color}00; }
        }
      `)}
      </style>
      {children}
    </div>
  );
}

GlowPulse.displayName = 'GlowPulse';
