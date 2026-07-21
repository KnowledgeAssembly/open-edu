import { useState, useEffect } from 'react';
import { Pipili as PipiliPrimitive } from '@open-edu/design-system';
import { cn } from '@open-edu/design-system';
import type { PipiliMood } from '@open-edu/design-system';

export interface PipiliProps {
  mood?: PipiliMood;
  visible?: boolean;
  onClick?: () => void;
  hasUnread?: boolean;
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
  hasUnread = false,
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
          'flex h-14 w-14 items-center justify-center rounded-full',
          'bg-surface-container shadow-md',
          'transition-all duration-300',
        )}
      >
        <PipiliPrimitive size="lg" mood={effectiveMood} />
        {hasUnread && (
          <span
            className="bg-primary text-label absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full font-bold text-white"
            aria-label="New messages available"
          >
            !
          </span>
        )}
      </div>
    </div>
  );
}
