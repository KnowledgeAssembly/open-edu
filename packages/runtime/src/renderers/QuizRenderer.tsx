import { useState } from 'react';
import type { QuizNode } from '@open-edu/schemas';
import { FocusTrap } from '@open-edu/accessibility';

export interface QuizRendererProps {
  node: QuizNode;
  onSubmit: (score: number, optionId: string) => void;
  className?: string;
}

export interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
}

export function QuizRenderer({ node, onSubmit, className }: QuizRendererProps): JSX.Element {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [score, setScore] = useState<number | null>(null);

  const options: QuizOption[] = node.options;

  const handleSubmit = () => {
    if (selectedOptionId === null) return;
    const selected = options.find((o) => o.id === selectedOptionId);
    const computedScore = selected?.correct ? 100 : 0;
    setScore(computedScore);
    setSubmitted(true);
    onSubmit(computedScore, selectedOptionId);
  };

  const labelText = (option: QuizOption) => {
    if (!submitted) return option.text;
    if (option.correct) return `${option.text} — Correct answer`;
    if (option.id === selectedOptionId) return `${option.text} — Your answer (incorrect)`;
    return option.text;
  };

  const optionBgClass = (option: QuizOption): string => {
    if (!submitted) {
      return selectedOptionId === option.id ? 'bg-primary/10' : 'bg-transparent';
    }
    if (option.correct) return 'bg-secondary/15';
    if (option.id === selectedOptionId) return 'bg-error/15';
    return 'bg-transparent';
  };

  return (
    <FocusTrap active={!submitted}>
      <fieldset
        className={`border-outline-variant m-0 rounded-lg border p-[calc(var(--oe-space-md)*1.5)] ${className ?? ''}`}
        data-testid="quiz-renderer"
        disabled={submitted}
      >
        <legend className="px-2 text-lg font-bold">{node.question}</legend>

        <div role="radiogroup" aria-label="Answer options" className="mt-3">
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
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selectedOptionId === null}
            className="bg-primary text-on-primary mt-3 cursor-pointer rounded-lg border-none px-5 py-2.5 text-base font-semibold disabled:cursor-default"
          >
            Submit
          </button>
        ) : (
          <div
            aria-live="polite"
            role="status"
            className={`mt-3 rounded-lg px-4 py-3 font-semibold ${
              score === 100 ? 'text-secondary bg-secondary/15' : 'text-error bg-error/15'
            }`}
          >
            {score === 100
              ? 'Correct! Well done.'
              : 'Incorrect. The correct answer is highlighted.'}
          </div>
        )}
      </fieldset>
    </FocusTrap>
  );
}
