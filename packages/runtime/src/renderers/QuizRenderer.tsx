import { useState } from 'react';
import type { QuizNode, QuizAnswer } from '@open-edu/schemas';
import { FocusTrap } from '@open-edu/accessibility';
import { useTranslation } from '@open-edu/i18n';
import { Button } from '@open-edu/design-system';

export interface QuizRendererProps {
  node: QuizNode;
  onSubmit: (score: number, optionId: string) => void;
  storedAnswer?: QuizAnswer;
  onAnswer?: (answer: QuizAnswer) => void;
  className?: string;
}

export interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
}

export function QuizRenderer({
  node,
  onSubmit,
  storedAnswer,
  onAnswer,
  className,
}: QuizRendererProps): JSX.Element {
  const { t } = useTranslation();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
    storedAnswer?.type === 'quiz' ? storedAnswer.selectedOptionId : null,
  );
  const [submitted, setSubmitted] = useState<boolean>(storedAnswer?.type === 'quiz');
  const [score, setScore] = useState<number | null>(
    storedAnswer?.type === 'quiz' ? storedAnswer.score : null,
  );

  const options: QuizOption[] = node.options;

  const handleSubmit = () => {
    if (selectedOptionId === null) return;
    const selected = options.find((o) => o.id === selectedOptionId);
    const computedScore = selected?.correct ? 100 : 0;
    setScore(computedScore);
    setSubmitted(true);
    const answer: QuizAnswer = { type: 'quiz', selectedOptionId, score: computedScore };
    onAnswer?.(answer);
    onSubmit(computedScore, selectedOptionId);
  };

  const labelText = (option: QuizOption) => {
    if (!submitted) return option.text;
    if (option.correct) return `${option.text}${t('runtime.quiz.correct_answer')}`;
    if (option.id === selectedOptionId)
      return `${option.text}${t('runtime.quiz.your_answer_incorrect')}`;
    return option.text;
  };

  const optionBgClass = (option: QuizOption): string => {
    if (!submitted) {
      return selectedOptionId === option.id ? 'bg-primary-container' : 'bg-transparent';
    }
    if (option.correct) return 'bg-success-container';
    if (option.id === selectedOptionId) return 'bg-error-container';
    return 'bg-transparent';
  };

  return (
    <FocusTrap active={!submitted}>
      <fieldset
        className={`border-outline-variant m-0 rounded-lg border p-[calc(var(--oe-space-md)*1.5)] ${className ?? ''}`}
        data-testid="quiz-renderer"
        disabled={submitted}
      >
        <legend className="text-h3 font-display px-2">{node.question}</legend>

        <div role="radiogroup" aria-label={t('runtime.quiz.answer_options')} className="mt-3">
          {options.map((option) => (
            <label
              key={option.id}
              className={`gap-sm flex items-start rounded-[calc(var(--oe-radius-lg)-2px)] px-3 py-2 ${
                submitted ? 'cursor-default' : 'cursor-pointer'
              } ${optionBgClass(option)}`}
            >
              <input
                type="radio"
                name="quiz-option"
                value={option.id}
                checked={selectedOptionId === option.id}
                onChange={() => setSelectedOptionId(option.id)}
                disabled={submitted}
                aria-label={option.text}
                className="accent-primary"
              />
              <span>{labelText(option)}</span>
            </label>
          ))}
        </div>

        {!submitted ? (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={selectedOptionId === null}
            className="mt-3"
          >
            {t('runtime.quiz.submit')}
          </Button>
        ) : (
          <div
            aria-live="polite"
            role="status"
            className={`mt-3 rounded-lg px-4 py-3 font-semibold ${
              score === 100
                ? 'text-on-success-container bg-success-container'
                : 'text-on-error-container bg-error-container'
            }`}
          >
            {score === 100 ? t('runtime.quiz.correct') : t('runtime.quiz.incorrect')}
          </div>
        )}
      </fieldset>
    </FocusTrap>
  );
}
