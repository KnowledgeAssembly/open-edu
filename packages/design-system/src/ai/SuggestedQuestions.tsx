import { cn } from '../lib/utils.js';

export interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
  className?: string;
}

export function SuggestedQuestions({
  questions,
  onSelect,
  className,
}: SuggestedQuestionsProps): JSX.Element {
  return (
    <div className={cn('', className)} data-testid="suggested-questions">
      <h3 className="text-on-surface-muted mb-2 text-sm font-medium">Suggested questions</h3>
      <div className="grid grid-cols-2 gap-2">
        {questions.map((question, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(question)}
            className={cn(
              'border-primary bg-surface-container text-on-surface rounded-md border-l-2 px-3 py-2 text-left text-sm',
              'hover:bg-surface-container-high transition-colors',
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
