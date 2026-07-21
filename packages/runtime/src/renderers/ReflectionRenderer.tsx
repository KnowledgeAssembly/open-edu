import { useState, useId } from 'react';
import type { ReflectionNode, ReflectionAnswer } from '@open-edu/schemas';
import { useTranslation } from '@open-edu/i18n';
import { Button } from '@open-edu/design-system';

export interface ReflectionRendererProps {
  node: ReflectionNode;
  onSubmit: (text: string) => void;
  storedAnswer?: ReflectionAnswer;
  onAnswer?: (answer: ReflectionAnswer) => void;
  className?: string;
  minLength?: number;
  maxLength?: number;
  showCharCount?: boolean;
}

export function ReflectionRenderer({
  node,
  onSubmit,
  storedAnswer,
  onAnswer,
  className,
  minLength = 1,
  maxLength = 4096,
  showCharCount = true,
}: ReflectionRendererProps): JSX.Element {
  const { t } = useTranslation();
  const [text, setText] = useState<string>(
    storedAnswer?.type === 'reflection' ? storedAnswer.text : '',
  );
  const [submitted, setSubmitted] = useState<boolean>(storedAnswer?.type === 'reflection');
  const hintId = useId();

  const trimmedLength = text.trim().length;
  const isValid = trimmedLength >= minLength && text.length <= maxLength;

  const handleSubmit = () => {
    if (!isValid || submitted) return;
    setSubmitted(true);
    const answer: ReflectionAnswer = { type: 'reflection', text };
    onAnswer?.(answer);
    onSubmit(text);
  };

  return (
    <div
      className={`border-outline-variant rounded-lg border p-[calc(var(--oe-space-md)*1.5)] ${className ?? ''}`}
      data-testid="reflection-renderer"
    >
      <label htmlFor={hintId} className="text-h3 font-display mb-2 block">
        {node.prompt}
      </label>

      <textarea
        id={hintId}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, maxLength))}
        readOnly={submitted}
        placeholder={t('runtime.reflection.placeholder')}
        aria-label={node.prompt}
        aria-describedby={showCharCount ? `${hintId}-count` : undefined}
        className="border-outline-variant font-body-md bg-surface text-on-surface text-body-ui min-h-[8rem] w-full resize-y rounded-[calc(var(--oe-radius-lg)-2px)] border p-2.5"
      />

      <div className="gap-sm mt-3 flex items-center justify-between">
        {!submitted ? (
          <Button type="button" onClick={handleSubmit} disabled={!isValid}>
            {t('runtime.quiz.submit')}
          </Button>
        ) : (
          <div
            aria-live="polite"
            role="status"
            className="text-on-secondary-container bg-secondary-container mt-3 rounded-lg px-4 py-2.5 font-semibold"
          >
            {t('runtime.reflection.saved')}
          </div>
        )}

        {showCharCount && (
          <span id={`${hintId}-count`} className="text-on-surface-variant text-body-ui">
            {t('runtime.reflection.char_count', {
              count: String(text.length),
              max: String(maxLength),
            })}
          </span>
        )}
      </div>
    </div>
  );
}
