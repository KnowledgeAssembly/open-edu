import { useState, useId, type CSSProperties } from 'react';
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

  const wrapperStyle: CSSProperties = {
    border: `1px solid var(--oe-color-border, #e5e7eb)`,
    borderRadius: 'var(--oe-radius, 8px)',
    padding: 'calc(var(--oe-spacing, 1rem) * 1.5)',
  };

  const textareaStyle: CSSProperties = {
    width: '100%',
    minHeight: '8rem',
    padding: '0.625rem',
    borderRadius: 'calc(var(--oe-radius, 8px) - 2px)',
    border: `1px solid var(--oe-color-border, #e5e7eb)`,
    fontFamily: 'var(--oe-font-sans, system-ui, sans-serif)',
    fontSize: '1rem',
    resize: 'vertical',
    backgroundColor: 'var(--oe-color-bg, #ffffff)',
    color: 'var(--oe-color-fg, #1a1a1a)',
  };

  const buttonStyle: CSSProperties = {
    backgroundColor: 'var(--oe-color-primary, #2563eb)',
    color: 'var(--oe-color-primary-fg, #ffffff)',
    border: 'none',
    borderRadius: 'var(--oe-radius, 8px)',
    padding: '0.625rem 1.25rem',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: submitted || !isValid ? 'default' : 'pointer',
  };

  const savedStyle: CSSProperties = {
    marginTop: '0.75rem',
    padding: '0.625rem 1rem',
    borderRadius: 'var(--oe-radius, 8px)',
    fontWeight: 600,
    color: 'var(--oe-color-success, #16a34a)',
    backgroundColor: 'color-mix(in srgb, var(--oe-color-success, #16a34a) 14%, transparent)',
  };

  return (
    <div className={className} data-testid="reflection-renderer" style={wrapperStyle}>
      <label
        htmlFor={hintId}
        style={{ display: 'block', fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.5rem' }}
      >
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
        style={textareaStyle}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '0.75rem',
          gap: '0.75rem',
        }}
      >
        {!submitted ? (
          <button type="button" onClick={handleSubmit} disabled={!isValid} style={buttonStyle}>
            Submit
          </button>
        ) : (
          <div aria-live="polite" role="status" style={savedStyle}>
            Saved — thank you for your reflection.
          </div>
        )}

        {showCharCount && (
          <span
            id={`${hintId}-count`}
            style={{
              color: 'var(--oe-color-muted, #6b7280)',
              fontSize: '0.875rem',
            }}
          >
            {text.length} / {maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
