import { type CardDefinition, type CardType } from '@open-edu/schemas';
import { cn } from '@open-edu/design-system';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@open-edu/design-system';
import { BookOpen, Brain, Award, Compass, Heart, ExternalLink } from 'lucide-react';

const typeIcons: Record<CardType, typeof BookOpen> = {
  knowledge: BookOpen,
  skill: Brain,
  achievement: Award,
  exploration: Compass,
  mentor: Heart,
};

const levelDescriptions: Record<string, string[]> = {
  '1': ['Introduced to the concept.'],
  '2': ['Understand core ideas.'],
  '3': ['Can explain in detail.'],
  '4': ['Can apply and analyze.'],
  '5': ['Mastered — can teach others.'],
};

export interface CardViewerProps {
  card: CardDefinition;
  level: number;
  onClose: () => void;
  onRelatedLessonClick?: (nodeId: string) => void;
}

export function CardViewer({
  card,
  level,
  onClose,
  onRelatedLessonClick,
}: CardViewerProps): JSX.Element {
  const IconComponent = typeIcons[card.type] ?? BookOpen;
  const maxLevel = card.maximumLevel;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl',
                'from-primary/20 to-primary/10 bg-gradient-to-br',
              )}
            >
              <IconComponent className="text-primary size-6" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-h3 font-display text-on-surface">
                {card.title}
              </DialogTitle>
              {card.subtitle && (
                <span className="text-on-surface-variant text-sm">{card.subtitle}</span>
              )}
            </div>
          </div>
          <DialogDescription className="text-on-surface-variant text-sm leading-relaxed">
            {card.summary}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 px-6">
          <span className="bg-muted text-on-surface-variant rounded-full px-2.5 py-1 text-xs font-medium capitalize">
            {card.type}
          </span>
          <span className="bg-muted text-on-surface-variant rounded-full px-2.5 py-1 text-xs font-medium">
            {card.category}
          </span>
          {card.difficulty && (
            <span className="bg-muted text-on-surface-variant rounded-full px-2.5 py-1 text-xs font-medium">
              {card.difficulty}
            </span>
          )}
        </div>

        {card.detailedExplanation && (
          <div className="px-6">
            <p className="text-on-surface text-sm leading-relaxed">{card.detailedExplanation}</p>
          </div>
        )}

        {card.tags && card.tags.length > 0 && (
          <div className="px-6">
            <div className="flex flex-wrap gap-1.5">
              {card.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-surface-container-high text-on-surface-variant rounded px-2 py-0.5 text-[10px] font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="px-6">
          <h4 className="text-on-surface mb-3 text-sm font-semibold">Mastery Levels</h4>
          <div className="flex flex-col gap-2">
            {Array.from({ length: maxLevel }, (_, i) => {
              const lvl = i + 1;
              const isCurrent = lvl === level;
              const isUnlocked = lvl <= level;
              const defaults = levelDescriptions[String(lvl)] ?? ['Continue learning to advance.'];
              return (
                <div
                  key={lvl}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                    isCurrent
                      ? 'border-primary bg-primary/5'
                      : isUnlocked
                        ? 'border-outline-variant bg-surface'
                        : 'border-outline-variant/50 bg-muted/30 opacity-60',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      isUnlocked
                        ? 'bg-primary text-on-primary'
                        : 'bg-muted text-on-surface-variant',
                    )}
                  >
                    {lvl}
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isUnlocked ? 'text-on-surface' : 'text-on-surface-variant',
                        )}
                      >
                        {isUnlocked ? 'Unlocked' : 'Locked'}
                      </span>
                      {isCurrent && (
                        <span className="text-primary bg-primary/10 rounded-full px-2 py-0.5 text-[10px] font-medium">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-on-surface-variant text-xs">{defaults[0]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {card.relatedLessons && card.relatedLessons.length > 0 && (
          <div className="px-6">
            <h4 className="text-on-surface mb-2 text-sm font-semibold">Related Lessons</h4>
            <div className="flex flex-col gap-1.5">
              {card.relatedLessons.map((lessonId) => (
                <button
                  key={lessonId}
                  onClick={() => onRelatedLessonClick?.(lessonId)}
                  className={cn(
                    'text-primary hover:text-primary/80 flex items-center gap-2 text-sm',
                    'text-left transition-colors',
                  )}
                >
                  <ExternalLink className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {lessonId
                      .replace(/^.*[/\\]/, '')
                      .replace(/\.(md|json)$/, '')
                      .replace(/[-_]/g, ' ')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {card.relatedQuizzes && card.relatedQuizzes.length > 0 && (
          <div className="px-6 pb-6">
            <h4 className="text-on-surface mb-2 text-sm font-semibold">Related Quizzes</h4>
            <div className="flex flex-col gap-1.5">
              {card.relatedQuizzes.map((quizId) => (
                <button
                  key={quizId}
                  onClick={() => onRelatedLessonClick?.(quizId)}
                  className={cn(
                    'text-primary hover:text-primary/80 flex items-center gap-2 text-sm',
                    'text-left transition-colors',
                  )}
                >
                  <ExternalLink className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {quizId
                      .replace(/^.*[/\\]/, '')
                      .replace(/\.(md|json)$/, '')
                      .replace(/[-_]/g, ' ')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
