import { useEffect, useCallback, useRef, useState } from 'react';
import { type CardDefinition, type CardType } from '@open-edu/schemas';
import { cn, GlowPulse, ConfettiBurst } from '@open-edu/design-system';
import { BookOpen, Brain, Award, Compass, Heart, Star, X } from 'lucide-react';

const typeIcons: Record<CardType, typeof BookOpen> = {
  knowledge: BookOpen,
  skill: Brain,
  achievement: Award,
  exploration: Compass,
  mentor: Heart,
};

export interface CardUnlockedToastProps {
  card: CardDefinition;
  newLevel: number;
  visible: boolean;
  onDismiss: () => void;
  onView?: () => void;
  autoDismissMs?: number;
  type: 'unlock' | 'levelUp';
}

export function CardUnlockedToast({
  card,
  newLevel,
  visible,
  onDismiss,
  onView,
  autoDismissMs = 4000,
  type,
}: CardUnlockedToastProps): JSX.Element | null {
  const IconComponent = typeIcons[card.type] ?? BookOpen;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      onDismissRef.current();
      setShouldRender(false);
      setIsAnimatingOut(false);
      setIsAnimatingIn(false);
    }, 300);
  }, []);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      setIsAnimatingOut(false);
      const raf = requestAnimationFrame(() => {
        setIsAnimatingIn(true);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !shouldRender) return;
    const timer = setTimeout(handleDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [visible, shouldRender, autoDismissMs, handleDismiss]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleDismiss();
    }
  };

  if (!shouldRender) return null;

  const animClass = isAnimatingOut
    ? 'translate-x-full opacity-0 pointer-events-none'
    : isAnimatingIn
      ? 'translate-x-0 opacity-100'
      : 'translate-x-8 opacity-0';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${type === 'unlock' ? 'Card unlocked' : 'Level up'}: ${card.title}`}
      onKeyDown={handleKeyDown}
      className={cn('max-w-sm', 'motion-safe:transition-all motion-safe:duration-300', animClass)}
      data-testid="card-unlocked-toast"
    >
      <div className="relative">
        {type === 'unlock' && (
          <div className="pointer-events-none absolute -top-6 left-0">
            <ConfettiBurst particleCount={8} duration={1} />
          </div>
        )}
        <div
          className={cn(
            'flex items-start gap-3 rounded-xl p-4 shadow-lg',
            'bg-surface border-outline-variant border',
          )}
        >
          <GlowPulse duration={1.2}>
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                'from-primary/20 to-primary/10 bg-gradient-to-br',
              )}
            >
              <IconComponent className="text-primary size-5" />
            </div>
          </GlowPulse>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-on-surface text-sm font-semibold">
              {type === 'levelUp' ? (
                <span className="flex items-center gap-1">
                  Level Up! <Star className="size-3.5 fill-amber-400 text-amber-400" /> Level{' '}
                  {newLevel}
                </span>
              ) : (
                'Card Unlocked!'
              )}
            </span>
            <span className="text-on-surface-variant truncate text-sm font-medium">
              {card.title}
            </span>
            <span className="text-on-surface-variant line-clamp-1 text-xs">{card.summary}</span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {onView && (
              <button
                onClick={onView}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-xs font-medium',
                  'bg-primary text-on-primary hover:bg-primary/90',
                  'transition-colors',
                )}
              >
                View
              </button>
            )}
            <button
              onClick={handleDismiss}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg',
                'text-on-surface-variant hover:text-on-surface hover:bg-muted/50',
                'transition-colors',
              )}
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

CardUnlockedToast.displayName = 'CardUnlockedToast';
