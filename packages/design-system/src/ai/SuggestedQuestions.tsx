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
      <h3 className="mb-2 text-sm font-medium text-on-surface-muted">Suggested questions</h3>
      <div className="grid grid-cols-2 gap-2">
        {questions.map((question, index) => (
          <button
            key={index}
            onClick={() => onSelect(question)}
            className={cn(
              'rounded-md border-l-2 border-primary bg-surface-container px-3 py-2 text-left text-sm text-on-surface',
              'transition-colors hover:bg-surface-container-high',
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
