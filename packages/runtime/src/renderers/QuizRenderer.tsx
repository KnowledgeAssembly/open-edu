import { useState, type CSSProperties } from 'react';
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

  const fieldsetStyle: CSSProperties = {
    border: `1px solid var(--oe-color-border, #e5e7eb)`,
    borderRadius: 'var(--oe-radius, 8px)',
    padding: 'calc(var(--oe-spacing, 1rem) * 1.5)',
    margin: 0,
  };

  const labelStyle = (option: QuizOption): CSSProperties => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    borderRadius: 'calc(var(--oe-radius, 8px) - 2px)',
    cursor: submitted ? 'default' : 'pointer',
    backgroundColor: submitted
      ? option.correct
        ? 'color-mix(in srgb, var(--oe-color-success, #16a34a) 12%, transparent)'
        : option.id === selectedOptionId
          ? 'color-mix(in srgb, var(--oe-color-error, #dc2626) 12%, transparent)'
          : 'transparent'
      : selectedOptionId === option.id
        ? 'color-mix(in srgb, var(--oe-color-primary, #2563eb) 10%, transparent)'
        : 'transparent',
  });

  const buttonStyle: CSSProperties = {
    backgroundColor: 'var(--oe-color-primary, #2563eb)',
    color: 'var(--oe-color-primary-fg, #ffffff)',
    border: 'none',
    borderRadius: 'var(--oe-radius, 8px)',
    padding: '0.625rem 1.25rem',
    fontSize: '1rem',
    cursor: submitted ? 'default' : 'pointer',
    fontWeight: 600,
  };

  const feedbackStyle: CSSProperties = {
    marginTop: '0.75rem',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--oe-radius, 8px)',
    fontWeight: 600,
    backgroundColor:
      score === 100
        ? 'color-mix(in srgb, var(--oe-color-success, #16a34a) 14%, transparent)'
        : 'color-mix(in srgb, var(--oe-color-error, #dc2626) 14%, transparent)',
    color: score === 100 ? 'var(--oe-color-success, #16a34a)' : 'var(--oe-color-error, #dc2626)',
  };

  return (
    <FocusTrap active={!submitted}>
      <fieldset
        className={className}
        data-testid="quiz-renderer"
        style={fieldsetStyle}
        disabled={submitted}
      >
        <legend style={{ fontWeight: 700, fontSize: '1.125rem', padding: '0 0.5rem' }}>
          {node.question}
        </legend>

        <div role="radiogroup" aria-label="Answer options" style={{ marginTop: '0.75rem' }}>
          {options.map((option) => (
            <label key={option.id} style={labelStyle(option)}>
              <input
                type="radio"
                name="quiz-option"
                value={option.id}
                checked={selectedOptionId === option.id}
                onChange={() => setSelectedOptionId(option.id)}
                disabled={submitted}
                aria-label={option.text}
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
            style={buttonStyle}
          >
            Submit
          </button>
        ) : (
          <div aria-live="polite" role="status" style={feedbackStyle}>
            {score === 100
              ? 'Correct! Well done.'
              : 'Incorrect. The correct answer is highlighted.'}
          </div>
        )}
      </fieldset>
    </FocusTrap>
  );
}
