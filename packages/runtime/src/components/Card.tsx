import { type CardDefinition, type CardType } from '@open-edu/schemas';
import { cn } from '@open-edu/design-system';
import { BookOpen, Brain, Award, Compass, Heart, Star, Lock } from 'lucide-react';

const typeConfig: Record<CardType, { icon: typeof BookOpen; gradient: string; ring: string }> = {
  knowledge: {
    icon: BookOpen,
    gradient: 'from-emerald-500/20 to-emerald-600/10',
    ring: 'ring-emerald-500/30',
  },
  skill: {
    icon: Brain,
    gradient: 'from-indigo-500/20 to-purple-600/10',
    ring: 'ring-indigo-500/30',
  },
  achievement: {
    icon: Award,
    gradient: 'from-amber-500/20 to-orange-600/10',
    ring: 'ring-amber-500/30',
  },
  exploration: {
    icon: Compass,
    gradient: 'from-teal-500/20 to-cyan-600/10',
    ring: 'ring-teal-500/30',
  },
  mentor: { icon: Heart, gradient: 'from-rose-500/20 to-pink-600/10', ring: 'ring-rose-500/30' },
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
        'group relative rounded-xl border border-outline-variant/50 p-4 cursor-pointer',
        'bg-surface/60 backdrop-blur-sm transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        isLocked
          ? 'opacity-50 grayscale cursor-default'
          : 'hover:scale-[1.02] hover:shadow-md hover:border-outline-variant',
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
              'flex items-center justify-center w-10 h-10 rounded-lg',
              'bg-gradient-to-br shadow-sm',
              isLocked ? 'from-muted/50 to-muted/30' : config.gradient,
              !isLocked && config.ring,
            )}
          >
            {isLocked ? (
              <Lock className="w-5 h-5 text-muted-foreground" />
            ) : (
              <IconComponent className="w-5 h-5 text-on-surface" />
            )}
          </div>

          {!isLocked && (
            <div className="flex gap-0.5">
              {Array.from({ length: maxLevel }, (_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'w-3.5 h-3.5',
                    i < level ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30',
                  )}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {card.type}
          </span>
          <h3
            className={cn(
              'font-semibold text-sm leading-tight text-on-surface',
              isLocked && 'text-muted-foreground',
            )}
          >
            {card.title}
          </h3>
          <p
            className={cn(
              'text-xs text-on-surface-variant line-clamp-2',
              isLocked && 'text-muted-foreground/60',
            )}
          >
            {isLocked ? 'Unlock to discover' : card.summary}
          </p>
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
            {card.category}
          </span>
          {isLocked && level === 0 ? (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Lock className="w-3 h-3" /> Locked
            </span>
          ) : (
            <span className="text-[10px] font-medium text-muted-foreground">Lv.{level}</span>
          )}
        </div>
      </div>
    </div>
  );
}
