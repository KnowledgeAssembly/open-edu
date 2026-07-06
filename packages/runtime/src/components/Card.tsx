import { type CardDefinition, type CardType } from '@open-edu/schemas';
import { cn } from '@open-edu/design-system';
import { BookOpen, Brain, Award, Compass, Heart, Star, Lock } from 'lucide-react';

const typeConfig: Record<CardType, { icon: typeof BookOpen; gradient: string; ring: string }> = {
  knowledge: {
    icon: BookOpen,
    gradient: 'from-success/20 to-success/10',
    ring: 'ring-success/30',
  },
  skill: {
    icon: Brain,
    gradient: 'from-primary/20 to-primary/10',
    ring: 'ring-primary/30',
  },
  achievement: {
    icon: Award,
    gradient: 'from-tertiary/20 to-tertiary/10',
    ring: 'ring-tertiary/30',
  },
  exploration: {
    icon: Compass,
    gradient: 'from-accent/20 to-accent/10',
    ring: 'ring-accent/30',
  },
  mentor: {
    icon: Heart,
    gradient: 'from-primary-container/20 to-primary-container/10',
    ring: 'ring-primary-container/30',
  },
};

export interface CardProps {
  card: CardDefinition;
  level: number;
  isLocked?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Card({
  card,
  level,
  isLocked = false,
  onClick,
  className,
}: CardProps): JSX.Element {
  const config = (typeConfig[card.type] ?? typeConfig.knowledge)!;
  const IconComponent = config.icon;
  const maxLevel = card.maximumLevel;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      role="button"
      tabIndex={isLocked ? -1 : 0}
      aria-label={`${card.title}${isLocked ? ' (locked)' : ` — Level ${level}${level < maxLevel ? ` of ${maxLevel}` : ''}`}`}
      aria-disabled={isLocked}
      onClick={isLocked ? undefined : onClick}
      onKeyDown={isLocked ? undefined : handleKeyDown}
      className={cn(
        'border-outline-variant/50 group relative cursor-pointer rounded-xl border p-4',
        'bg-surface/60 backdrop-blur-sm transition-all duration-300',
        'focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-2',
        isLocked
          ? 'cursor-default opacity-50 grayscale'
          : 'hover:border-outline-variant hover:scale-[1.02] hover:shadow-md',
        'motion-safe:transition-all motion-safe:duration-300',
        className,
      )}
      data-testid={`card-${card.id}`}
      data-locked={isLocked}
    >
      <div
        className={cn(
          'absolute inset-0 rounded-xl bg-gradient-to-br opacity-50',
          config.gradient,
          isLocked ? 'opacity-20' : '',
        )}
      />

      <div className="relative z-10 flex flex-col gap-2">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              'bg-gradient-to-br shadow-sm',
              isLocked ? 'from-muted/50 to-muted/30' : config.gradient,
              !isLocked && config.ring,
            )}
          >
            {isLocked ? (
              <Lock className="text-on-surface-variant size-5" />
            ) : (
              <IconComponent className="text-on-surface size-5" />
            )}
          </div>

          {!isLocked && (
            <div className="flex gap-0.5">
              {Array.from({ length: maxLevel }, (_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'h-3.5 w-3.5',
                    i < level
                      ? 'fill-tertiary text-tertiary'
                      : 'text-on-surface-variant opacity-30',
                  )}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-on-surface-variant text-xs font-medium uppercase tracking-wider">
            {card.type}
          </span>
          <h3
            className={cn(
              'text-on-surface text-sm font-semibold leading-tight',
              isLocked && 'text-on-surface-variant',
            )}
          >
            {card.title}
          </h3>
          <p
            className={cn(
              'text-on-surface-variant line-clamp-2 text-xs',
              isLocked && 'text-on-surface-variant opacity-60',
            )}
          >
            {isLocked ? 'Unlock to discover' : card.summary}
          </p>
        </div>

        <div className="mt-1 flex items-center justify-between">
          <span className="text-on-surface-variant bg-muted/50 rounded-full px-2 py-0.5 text-[10px] font-medium">
            {card.category}
          </span>
          {isLocked && level === 0 ? (
            <span className="text-on-surface-variant flex items-center gap-1 text-[10px]">
              <Lock className="size-3" /> Locked
            </span>
          ) : (
            <span className="text-on-surface-variant text-[10px] font-medium">Lv.{level}</span>
          )}
        </div>
      </div>
    </div>
  );
}
