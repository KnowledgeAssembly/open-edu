import { useState, useEffect } from 'react';
import { Pipili as PipiliPrimitive } from '@open-edu/design-system';
import { cn } from '@open-edu/design-system';
import type { PipiliMood } from '@open-edu/design-system';

export interface PipiliProps {
  mood?: PipiliMood;
  visible?: boolean;
  onClick?: () => void;
  className?: string;
}

const moodLabels: Record<PipiliMood, string> = {
  idle: 'Pipili is here',
  thinking: 'Pipili is thinking',
  curious: 'Pipili is curious',
  content: 'Pipili is happy',
};

export function Pipili({
  mood = 'idle',
  visible = true,
  onClick,
  className,
}: PipiliProps): JSX.Element | null {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (!visible) return null;

  const effectiveMood =
    prefersReducedMotion && (mood === 'thinking' || mood === 'curious') ? 'idle' : mood;

  return (
    <div
      className={cn('fixed bottom-6 right-6 z-50', onClick && 'cursor-pointer', className)}
      role={onClick ? 'button' : 'status'}
      aria-label={moodLabels[mood]}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={onClick ? 0 : undefined}
    >
      <div
        className={cn(
          'flex items-center justify-center w-14 h-14 rounded-full',
          'bg-surface-container shadow-md',
          'transition-all duration-300',
        )}
      >
        <PipiliPrimitive size="lg" mood={effectiveMood} />
      </div>
    </div>
  );
}
