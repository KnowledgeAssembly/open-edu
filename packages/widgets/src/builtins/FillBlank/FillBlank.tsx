import { useState, useCallback } from 'react';
import { z } from 'zod';
import type { WidgetDefinition } from '../../types';
import { ThemedButton } from '../../themed-button';
import { useObserveMode } from '../../use-observe-mode';

const blankItemSchema = z.object({
  id: z.string(),
  position: z.number().int().min(0),
  correctAnswer: z.union([z.string(), z.number()]),
  options: z.array(z.union([z.string(), z.number()])).optional(),
});

const fillBlankSchema = z.object({
  description: z.string().optional(),
  template: z.string().optional(),
  blanks: z.array(blankItemSchema).optional(),
  mode: z.enum(['select', 'type']).optional().default('select'),
  hints: z.array(z.string()).optional(),
  hint: z.string().optional(),
  interactive: z.boolean().optional().default(false),
  prompt: z.string().optional(),
  statement: z.string().optional(),
  answers: z.array(z.union([z.string(), z.number()])).optional(),
});

export type FillBlankConfig = z.infer<typeof fillBlankSchema>;
type BlankItem = z.infer<typeof blankItemSchema>;
type ResolvedFillBlankConfig = FillBlankConfig &
  Required<Pick<FillBlankConfig, 'template' | 'blanks'>>;

function convertPipeline(
  statement: string,
  answers: (string | number)[],
): { template: string; blanks: BlankItem[] } {
  const blanks = answers.map((answer, idx) => ({
    id: `blank-${idx}`,
    position: idx,
    correctAnswer: answer,
  }));
  return { template: statement, blanks };
}

function FillBlankComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number) => void;
}) {
  const { config: rawConfig, emitInteraction, complete } = props;
  const parsed = fillBlankSchema.safeParse(rawConfig);

  const [submitted, setSubmitted] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, string | number>>({});
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [hintIndex, setHintIndex] = useState(0);

  let config: ResolvedFillBlankConfig | null = null;
  if (parsed.success) {
    const data = parsed.data;
    if (data.template && data.blanks && data.blanks.length > 0) {
      config = data as unknown as ResolvedFillBlankConfig;
    } else if (data.statement && data.answers && data.answers.length > 0) {
      const converted = convertPipeline(data.statement, data.answers);
      config = { ...data, ...converted } as unknown as ResolvedFillBlankConfig;
    }
  }

  const hasValidContent = config !== null;
  const isObserve = config?.interactive !== true;
  const sortedBlanks = config ? [...config.blanks].sort((a, b) => a.position - b.position) : [];
  const segments = config ? config.template.split('___') : [];

  const { handleAcknowledge: handleObserveAcknowledge, showAcknowledgeButton } = useObserveMode({
    isObserve: isObserve && hasValidContent,
    onComplete: complete,
    onInteract: emitInteraction,
    widgetId: 'open-edu.fill-blank',
  });

  const handleSelect = useCallback(
    (blankId: string, value: string | number) => {
      if (submitted) return;
      setUserAnswers((prev) => ({ ...prev, [blankId]: value }));
      setOpenDropdownId(null);
    },
    [submitted],
  );

  const handleTypeChange = useCallback(
    (blankId: string, value: string) => {
      if (submitted) return;
      setUserAnswers((prev) => ({ ...prev, [blankId]: value }));
    },
    [submitted],
  );

  const handleSubmit = useCallback(() => {
    if (submitted || !config) return;

    const correct = sortedBlanks.every(
      (b) => String(userAnswers[b.id]) === String(b.correctAnswer),
    );
    const correctCount = sortedBlanks.filter(
      (b) => String(userAnswers[b.id]) === String(b.correctAnswer),
    ).length;
    const accuracy = correctCount / sortedBlanks.length;
    const score = Math.round(accuracy * 100);

    emitInteraction({
      type: 'widget.interaction',
      widgetId: 'open-edu.fill-blank',
      action: 'submit',
      answers: userAnswers,
      correct,
      accuracy,
      correctCount,
      totalBlanks: sortedBlanks.length,
    });
    complete(score);
    setSubmitted(true);
  }, [submitted, config, sortedBlanks, userAnswers, emitInteraction, complete]);

  const handleHintClick = useCallback(() => {
    if (config?.hints && hintIndex < config.hints.length - 1) {
      setHintIndex((i) => i + 1);
    }
  }, [config?.hints, hintIndex]);

  if (!hasValidContent) {
    return (
      <div role="alert" data-testid="widget-config-error" className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md text-center">
        <p className="text-on-surface font-semibold">This activity could not be loaded.</p>
      </div>
    );
  }

  const c = config!;
  const displayDescription = c.description || c.prompt;
  const allBlanksAnswered = sortedBlanks.every(
    (b) => userAnswers[b.id] !== undefined && userAnswers[b.id] !== '',
  );

  function renderBlankControl(blank: BlankItem, idx: number) {
    const userAnswer = userAnswers[blank.id];
    const isAnswerCorrect = submitted && String(userAnswer) === String(blank.correctAnswer);
    const borderColor = submitted ? (isAnswerCorrect ? '#16a34a' : '#dc2626') : '#d1d5db';

    if (c.mode === 'type') {
      return (
        <input
          key={blank.id}
          type="text"
          data-testid={`blank-input-${blank.id}`}
          value={String(userAnswer ?? '')}
          onChange={(e) => handleTypeChange(blank.id, e.target.value)}
          disabled={submitted}
          aria-label={`Blank ${idx + 1}`}
          style={{
            display: 'inline-block',
            width: '6rem',
            padding: '0.125rem 0.25rem',
            border: `2px solid ${borderColor}`,
            borderRadius: '0.25rem',
            margin: '0 0.125rem',
            fontSize: 'inherit',
          }}
        />
      );
    }

    return (
      <span key={blank.id} style={{ position: 'relative', display: 'inline-block' }}>
        <button
          data-testid={`blank-select-${blank.id}`}
          onClick={() => {
            if (submitted) return;
            setOpenDropdownId(openDropdownId === blank.id ? null : blank.id);
          }}
          disabled={submitted}
          aria-label={`Blank ${idx + 1}`}
          aria-expanded={openDropdownId === blank.id}
          role="combobox"
          style={{
            border: `2px solid ${borderColor}`,
            borderRadius: '0.25rem',
            padding: '0.125rem 0.5rem',
            margin: '0 0.125rem',
            fontSize: 'inherit',
            cursor: submitted ? 'default' : 'pointer',
            backgroundColor: '#ffffff',
            minWidth: '4rem',
          }}
        >
          {userAnswer !== undefined ? String(userAnswer) : '?'}
        </button>
        {openDropdownId === blank.id && blank.options && blank.options.length > 0 && (
          <span
            data-testid={`dropdown-${blank.id}`}
            role="listbox"
            aria-label={`Options for blank ${idx + 1}`}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              zIndex: 10,
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {blank.options.map((opt, optIdx) => (
              <button
                key={optIdx}
                data-testid={`option-${blank.id}-${optIdx}`}
                role="option"
                aria-selected={String(userAnswers[blank.id]) === String(opt)}
                onClick={() => handleSelect(blank.id, opt)}
                style={{
                  padding: '0.25rem 0.75rem',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 'inherit',
                  fontWeight: String(userAnswers[blank.id]) === String(opt) ? 'bold' : 'normal',
                }}
              >
                {String(opt)}
              </button>
            ))}
          </span>
        )}
      </span>
    );
  }

  if (isObserve) {
    return (
      <div data-testid="fill-blank" aria-label="Fill in the blank activity">
        <div role="status" aria-live="polite">
          {displayDescription && <p>{displayDescription}</p>}
          <p>
            {segments.map((segment, idx) => (
              <span key={idx}>
                {segment}
                {idx < sortedBlanks.length && (
                  <span
                    data-testid={`observe-blank-${sortedBlanks[idx]!.id}`}
                    style={{
                      display: 'inline-block',
                      padding: '0 0.25rem',
                      fontWeight: 'bold',
                      color: '#16a34a',
                      borderBottom: '2px solid #16a34a',
                      margin: '0 0.125rem',
                    }}
                  >
                    {String(sortedBlanks[idx]!.correctAnswer)}
                  </span>
                )}
              </span>
            ))}
          </p>
        </div>
        {showAcknowledgeButton && (
          <div className="flex items-center justify-center p-md border-t border-outline-variant mt-md">
            <ThemedButton variant="primary" onClick={handleObserveAcknowledge} data-testid="observe-acknowledge">
              Mark as seen ✓
            </ThemedButton>
          </div>
        )}
        {!showAcknowledgeButton && (
          <div role="status" aria-live="assertive" data-testid="observe-complete">
            <p>Content acknowledged.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-testid="fill-blank" aria-label="Fill in the blank activity">
      {displayDescription && <p>{displayDescription}</p>}

      <div role="group" aria-label="Fill in the blanks text">
        <p>
          {segments.map((segment, idx) => (
            <span key={idx}>
              {segment}
              {idx < sortedBlanks.length && renderBlankControl(sortedBlanks[idx]!, idx)}
            </span>
          ))}
        </p>
      </div>

      {!submitted && c.hints && c.hints.length > 0 && c.hints[hintIndex] && (
        <div role="status" aria-live="polite" style={{ marginTop: '0.5rem', color: '#6b7280' }}>
          <p>{c.hints[hintIndex]}</p>
          {hintIndex < c.hints.length - 1 && (
            <ThemedButton variant="ghost" size="sm" onClick={handleHintClick}>
              More help
            </ThemedButton>
          )}
        </div>
      )}

      {!submitted && c.hint && !c.hints && (
        <div role="status" aria-live="polite" style={{ marginTop: '0.5rem', color: '#6b7280' }}>
          <p>{c.hint}</p>
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        {!submitted ? (
          <ThemedButton variant="primary" onClick={handleSubmit} disabled={!allBlanksAnswered}>
            Submit
          </ThemedButton>
        ) : (
          <ThemedButton variant="outline" disabled data-testid="result-display">
            {(() => {
              const correct = sortedBlanks.every(
                (b) => String(userAnswers[b.id]) === String(b.correctAnswer),
              );
              return correct ? 'Correct!' : 'Incorrect';
            })()}
          </ThemedButton>
        )}
      </div>

      {submitted && (
        <div role="status" aria-live="assertive" data-testid="feedback">
          {(() => {
            const correct = sortedBlanks.every(
              (b) => String(userAnswers[b.id]) === String(b.correctAnswer),
            );
            const correctCount = sortedBlanks.filter(
              (b) => String(userAnswers[b.id]) === String(b.correctAnswer),
            ).length;
            if (correct) {
              return <p>Correct! All blanks filled correctly.</p>;
            }
            return (
              <p>
                {correctCount} of {sortedBlanks.length} blanks correct.
              </p>
            );
          })()}
        </div>
      )}
    </div>
  );
}

const FillBlankWidget: WidgetDefinition = {
  id: 'open-edu.fill-blank',
  version: '0.1.0',
  render: FillBlankComponent,
};

export { FillBlankWidget as fillBlank };
export default FillBlankWidget;
