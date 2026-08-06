import { cn } from '../lib/utils.js';

export interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
  className?: string;
  /** Compact chip layout for narrow panels (e.g. Pipili sidebar). */
  variant?: 'default' | 'compact';
}

export function SuggestedQuestions({
  questions,
  onSelect,
  className,
  variant = 'default',
}: SuggestedQuestionsProps): JSX.Element {
  const isCompact = variant === 'compact';

  return (
    <div className={cn('', className)} data-testid="suggested-questions">
      <h3
        className={cn(
          'text-on-surface-muted font-medium',
          isCompact ? 'text-caption mb-1' : 'mb-2 text-sm',
        )}
      >
        Suggested questions
      </h3>
      <div
        className={cn(isCompact ? 'flex flex-wrap gap-1.5' : 'grid grid-cols-2 gap-2')}
        data-testid={isCompact ? 'suggested-questions-compact' : undefined}
      >
        {questions.map((question, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(question)}
            className={cn(
              'border-primary bg-surface-container text-on-surface rounded-md border-l-2 text-left',
              'hover:bg-surface-container-high transition-colors',
              isCompact ? 'text-caption px-2 py-1 leading-snug' : 'px-3 py-2 text-sm',
            )}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
SuggestedQuestions.displayName = 'SuggestedQuestions';
