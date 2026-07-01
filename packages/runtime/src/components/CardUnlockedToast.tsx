import { useEffect, useCallback, useRef } from 'react';
import { type CardDefinition, type CardType } from '@open-edu/schemas';
import { cn } from '@open-edu/design-system';
import { BookOpen, Brain, Award, Compass, Heart, X } from 'lucide-react';

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
}: CardUnlockedToastProps): JSX.Element {
  const IconComponent = typeIcons[card.type] ?? BookOpen;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const handleDismiss = useCallback(() => {
    onDismissRef.current();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(handleDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [visible, autoDismissMs, handleDismiss]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleDismiss();
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${type === 'unlock' ? 'Card unlocked' : 'Level up'}: ${card.title}`}
      onKeyDown={handleKeyDown}
      className={cn(
        'fixed bottom-4 right-4 z-[9999] max-w-sm',
        'transition-all duration-300 motion-safe:transition-all motion-safe:duration-300',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none',
      )}
      data-testid="card-unlocked-toast"
    >
      <div
        className={cn(
          'flex items-start gap-3 p-4 rounded-xl shadow-lg',
          'bg-surface border border-outline-variant',
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg shrink-0',
            'bg-gradient-to-br from-primary/20 to-primary/10',
          )}
        >
          <IconComponent className="w-5 h-5 text-primary" />
        </div>

        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className="text-sm font-semibold text-on-surface">
            {type === 'levelUp' ? `Level Up! ★ ${newLevel}` : 'Card Unlocked!'}
          </span>
          <span className="text-sm text-on-surface-variant truncate">{card.title}</span>
          {type === 'levelUp' && (
            <span className="text-xs text-on-surface-variant">{card.summary}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onView && (
            <button
              onClick={onView}
              className={cn(
                'text-xs font-medium px-2.5 py-1.5 rounded-lg',
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
              'flex items-center justify-center w-7 h-7 rounded-lg',
              'text-muted-foreground hover:text-on-surface hover:bg-muted/50',
              'transition-colors',
            )}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
