import { useState } from 'react';
import { useTranslation } from '@open-edu/i18n';
import { Button, cn } from '@open-edu/design-system';

const OPTIONS = [4, 5, 6] as const;
const CORRECT_ANSWER = 5;

type Feedback = 'success' | 'error' | null;

export function QuizDemo(): JSX.Element {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const answered = feedback !== null;

  const choose = (value: number): void => {
    setSelected(value);
    setFeedback(value === CORRECT_ANSWER ? 'success' : 'error');
  };

  const reset = (): void => {
    setSelected(null);
    setFeedback(null);
  };

  return (
    <div>
      <p className="text-on-surface text-sm font-medium">{t('website.quiz.question')}</p>
      <div
        role="group"
        aria-label={t('website.quiz.question')}
        className="mt-4 grid grid-cols-3 gap-2"
      >
        {OPTIONS.map((option) => {
          const isActive = selected === option;
          const isCorrect = option === CORRECT_ANSWER;
          return (
            <button
              key={option}
              type="button"
              onClick={() => choose(option)}
              disabled={answered}
              aria-pressed={isActive}
              className={cn(
                'h-12 rounded-lg border-2 text-lg font-semibold transition-colors',
                'focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2',
                isActive &&
                  isCorrect &&
                  'border-success bg-[var(--oe-color-success-container)] text-[var(--oe-color-on-success-container)]',
                isActive &&
                  !isCorrect &&
                  'border-error bg-[var(--oe-color-error-container)] text-[var(--oe-color-on-error-container)]',
                !isActive && 'border-outline text-on-surface hover:border-primary',
                answered && !isActive && 'opacity-50',
              )}
            >
              {option}
            </button>
          );
        })}
      </div>

      {feedback ? (
        <p
          role="status"
          className={cn(
            'mt-4 rounded-lg px-3 py-2 text-sm font-medium',
            feedback === 'success'
              ? 'bg-[var(--oe-color-success-container)] text-[var(--oe-color-on-success-container)]'
              : 'bg-[var(--oe-color-error-container)] text-[var(--oe-color-on-error-container)]',
          )}
        >
          {feedback === 'success' ? t('website.quiz.correct') : t('website.quiz.incorrect')}
        </p>
      ) : null}

      {answered ? (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={reset}>
            {t('website.quiz.reset')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

QuizDemo.displayName = 'QuizDemo';
