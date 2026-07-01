import { type CardDefinition } from '@open-edu/schemas';
import { cn } from '@open-edu/design-system';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@open-edu/design-system';
import { BookOpen, Brain, Award, Compass, Heart, ExternalLink } from 'lucide-react';

const typeIcons: Record<string, typeof BookOpen> = {
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
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div
              className={cn(
                'flex items-center justify-center w-12 h-12 rounded-xl',
                'bg-gradient-to-br from-primary/20 to-primary/10',
              )}
            >
              <IconComponent className="w-6 h-6 text-primary" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-h3 font-display text-on-surface">
                {card.title}
              </DialogTitle>
              {card.subtitle && (
                <span className="text-sm text-on-surface-variant">{card.subtitle}</span>
              )}
            </div>
          </div>
          <DialogDescription className="text-sm text-on-surface-variant leading-relaxed">
            {card.summary}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 px-6">
          <span className="text-xs font-medium bg-muted text-muted-foreground px-2.5 py-1 rounded-full capitalize">
            {card.type}
          </span>
          <span className="text-xs font-medium bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
            {card.category}
          </span>
          {card.difficulty && (
            <span className="text-xs font-medium bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
              {card.difficulty}
            </span>
          )}
        </div>

        {card.detailedExplanation && (
          <div className="px-6">
            <p className="text-sm text-on-surface leading-relaxed">{card.detailedExplanation}</p>
          </div>
        )}

        {card.tags && card.tags.length > 0 && (
          <div className="px-6">
            <div className="flex flex-wrap gap-1.5">
              {card.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-medium bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="px-6">
          <h4 className="text-sm font-semibold text-on-surface mb-3">Mastery Levels</h4>
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
                    'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                    isCurrent
                      ? 'border-primary bg-primary/5'
                      : isUnlocked
                        ? 'border-outline-variant bg-surface'
                        : 'border-outline-variant/50 bg-muted/30 opacity-60',
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-xs font-bold',
                      isUnlocked ? 'bg-primary text-on-primary' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {lvl}
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isUnlocked ? 'text-on-surface' : 'text-muted-foreground',
                        )}
                      >
                        {isUnlocked ? 'Unlocked' : 'Locked'}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant">{defaults[0]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {card.relatedLessons && card.relatedLessons.length > 0 && (
          <div className="px-6">
            <h4 className="text-sm font-semibold text-on-surface mb-2">Related Lessons</h4>
            <div className="flex flex-col gap-1.5">
              {card.relatedLessons.map((lessonId) => (
                <button
                  key={lessonId}
                  onClick={() => onRelatedLessonClick?.(lessonId)}
                  className={cn(
                    'flex items-center gap-2 text-sm text-primary hover:text-primary/80',
                    'transition-colors text-left',
                  )}
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {lessonId.replace(/\.(md|json)$/, '').replace(/[-_/]/g, ' ')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {card.relatedQuizzes && card.relatedQuizzes.length > 0 && (
          <div className="px-6 pb-6">
            <h4 className="text-sm font-semibold text-on-surface mb-2">Related Quizzes</h4>
            <div className="flex flex-col gap-1.5">
              {card.relatedQuizzes.map((quizId) => (
                <button
                  key={quizId}
                  onClick={() => onRelatedLessonClick?.(quizId)}
                  className={cn(
                    'flex items-center gap-2 text-sm text-primary hover:text-primary/80',
                    'transition-colors text-left',
                  )}
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {quizId.replace(/\.(md|json)$/, '').replace(/[-_/]/g, ' ')}
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
