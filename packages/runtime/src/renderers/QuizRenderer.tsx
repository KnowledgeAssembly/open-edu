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
        className={`border border-outline-variant rounded-lg p-[calc(var(--oe-space-md)*1.5)] m-0 ${className ?? ''}`}
        data-testid="quiz-renderer"
        disabled={submitted}
      >
        <legend className="font-bold text-lg px-2">{node.question}</legend>

        <div role="radiogroup" aria-label="Answer options" className="mt-3">
          {options.map((option) => (
            <label
              key={option.id}
              className={`flex items-start gap-sm px-3 py-2 rounded-[calc(var(--oe-radius-lg)-2px)] ${
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
            className="bg-primary text-on-primary border-none rounded-lg px-5 py-2.5 text-base cursor-pointer font-semibold disabled:cursor-default mt-3"
          >
            Submit
          </button>
        ) : (
          <div
            aria-live="polite"
            role="status"
            className={`mt-3 px-4 py-3 rounded-lg font-semibold ${
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
