import * as React from 'react';
import { cn } from '../lib/utils.js';

export type PipiliMood = 'idle' | 'thinking' | 'curious' | 'content';

export interface PipiliProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  mood?: PipiliMood;
}

const sizeMap = {
  xs: 20,
  sm: 28,
  md: 40,
  lg: 56,
  xl: 80,
};

const moodClasses: Record<PipiliMood, string> = {
  idle: '',
  thinking: 'animate-pulse',
  curious: 'animate-bounce',
  content: 'scale-110',
};

export const Pipili = React.forwardRef<HTMLDivElement, PipiliProps>(
  ({ size = 'md', mood = 'idle', className, ...props }, ref) => {
    const px = sizeMap[size];

    return (
      <div
        ref={ref}
        className={cn('relative inline-flex items-center justify-center', className)}
        style={{ width: px, height: px }}
        role="img"
        aria-label={`Pipili — ${mood}`}
        {...props}
      >
        <div
          className={cn(
            'relative w-full h-full motion-reduce:animate-none motion-reduce:transform-none',
            moodClasses[mood],
          )}
        >
          {/* Head — tilted circle */}
          <svg
            width={px}
            height={px}
            viewBox="0 0 20 20"
            fill="currentColor"
            className="text-primary transition-transform duration-500"
            style={{
              transform: mood === 'curious' ? 'rotate(-12deg)' : 'rotate(0deg)',
            }}
          >
            <circle cx="10" cy="10" r="8" />
          </svg>

          {/* Eye left */}
          <svg
            width={px * 0.15}
            height={px * 0.15}
            viewBox="0 0 20 20"
            fill="white"
            className="absolute"
            style={{
              top: '28%',
              left: '38%',
              transform: mood === 'curious' ? 'rotate(12deg)' : 'rotate(0deg)',
              transformOrigin: 'center',
            }}
          >
            <circle cx="10" cy="10" r="8" />
          </svg>

          {/* Eye right */}
          <svg
            width={px * 0.15}
            height={px * 0.15}
            viewBox="0 0 20 20"
            fill="white"
            className="absolute"
            style={{
              top: '28%',
              right: '38%',
              transform: mood === 'curious' ? 'rotate(12deg)' : 'rotate(0deg)',
              transformOrigin: 'center',
            }}
          >
            <circle cx="10" cy="10" r="8" />
          </svg>
        </div>
      </div>
    );
  },
);
Pipili.displayName = 'Pipili';
