import { useState, useId } from 'react';
import type { ReflectionNode } from '@open-edu/schemas';

export interface ReflectionRendererProps {
  node: ReflectionNode;
  onSubmit: (text: string) => void;
  className?: string;
  minLength?: number;
  maxLength?: number;
  showCharCount?: boolean;
}

export function ReflectionRenderer({
  node,
  onSubmit,
  className,
  minLength = 1,
  maxLength = 4096,
  showCharCount = true,
}: ReflectionRendererProps): JSX.Element {
  const [text, setText] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const hintId = useId();

  const trimmedLength = text.trim().length;
  const isValid = trimmedLength >= minLength && text.length <= maxLength;

  const handleSubmit = () => {
    if (!isValid || submitted) return;
    setSubmitted(true);
    onSubmit(text);
  };

  return (
    <div
      className={`border border-outline-variant rounded-lg p-[calc(var(--oe-space-md)*1.5)] ${className ?? ''}`}
      data-testid="reflection-renderer"
    >
      <label htmlFor={hintId} className="block font-semibold text-lg mb-2">
        {node.prompt}
      </label>

      <textarea
        id={hintId}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, maxLength))}
        readOnly={submitted}
        placeholder="Type your reflection here…"
        aria-label={node.prompt}
        aria-describedby={showCharCount ? `${hintId}-count` : undefined}
        className="w-full min-h-[8rem] p-2.5 rounded-[calc(var(--oe-radius-lg)-2px)] border border-outline-variant font-body-md text-base resize-y bg-surface text-on-surface"
      />

      <div className="flex items-center justify-between mt-3 gap-sm">
        {!submitted ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid}
            className="bg-primary text-on-primary border-none rounded-lg px-5 py-2.5 text-base font-semibold disabled:cursor-default enabled:cursor-pointer"
          >
            Submit
          </button>
        ) : (
          <div
            aria-live="polite"
            role="status"
            className="mt-3 px-4 py-2.5 rounded-lg font-semibold text-secondary bg-secondary/15"
          >
            Saved — thank you for your reflection.
          </div>
        )}

        {showCharCount && (
          <span id={`${hintId}-count`} className="text-on-surface-variant text-body-ui">
            {text.length} / {maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
