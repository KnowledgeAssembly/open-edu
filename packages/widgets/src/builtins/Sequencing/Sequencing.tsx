import { useState, useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';
import type { WidgetDefinition } from '../../types';

const sequencingItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  emoji: z.string().optional(),
});

export const sequencingSchema = z.object({
  description: z.string().optional(),
  items: z.array(sequencingItemSchema).min(1),
  correctOrder: z.array(z.string()).min(1),
  hints: z.array(z.string()).optional(),
  hint: z.string().optional(),
  interactive: z.boolean().optional().default(false),
});

export type SequencingConfig = z.infer<typeof sequencingSchema>;

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp;
  }
  return shuffled;
}

function SequencingComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number) => void;
}) {
  const { config: rawConfig, emitInteraction, complete } = props;
  const parsed = sequencingSchema.safeParse(rawConfig);
  const content = parsed.success ? parsed.data : null;
  const hasValidContent =
    parsed.success && content && content.items.length > 0 && content.correctOrder.length > 0;

  const [submitted, setSubmitted] = useState(false);
  const [userOrder, setUserOrder] = useState<string[]>([]);
  const [hintIndex, setHintIndex] = useState(0);

  const isObserve = content?.interactive !== true;
  const items = content?.items ?? [];
  const correctOrder = useMemo(() => content?.correctOrder ?? [], [content]);

  const shuffledItems = useMemo(() => {
    if (!content) return [];
    return shuffleArray(content.items);
  }, [content]);

  useEffect(() => {
    if (!isObserve || submitted || !hasValidContent) return;
    const timer = setTimeout(() => {
      emitInteraction({
        type: 'widget.interaction',
        action: 'observe',
        observed: true,
        correct: true,
      });
      complete(100);
      setSubmitted(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [isObserve, submitted, hasValidContent, emitInteraction, complete]);

  const handleAvailableItemClick = useCallback(
    (itemId: string) => {
      if (submitted || isObserve) return;
      setUserOrder((prev) => [...prev, itemId]);
    },
    [submitted, isObserve],
  );

  const handlePlacedItemClick = useCallback(
    (itemId: string) => {
      if (submitted || isObserve) return;
      setUserOrder((prev) => prev.filter((id) => id !== itemId));
    },
    [submitted, isObserve],
  );

  const handleSubmit = useCallback(() => {
    if (submitted || !content) return;

    const correct =
      correctOrder.length === userOrder.length &&
      correctOrder.every((id, i) => id === userOrder[i]);
    const accuracy =
      userOrder.filter((id, i) => id === correctOrder[i]).length / correctOrder.length;
    const score = Math.round(accuracy * 100);

    emitInteraction({
      type: 'widget.interaction',
      action: 'submit',
      userOrder,
      correct,
      accuracy,
      widgetId: 'open-edu.sequencing',
    });
    complete(score);
    setSubmitted(true);
  }, [submitted, content, userOrder, correctOrder, emitInteraction, complete]);

  const handleHintClick = useCallback(() => {
    if (content?.hints && hintIndex < content.hints.length - 1) {
      setHintIndex((i) => i + 1);
    }
  }, [content?.hints, hintIndex]);

  if (!hasValidContent) {
    return (
      <div role="alert" data-testid="widget-config-error">
        <p>Invalid widget configuration.</p>
      </div>
    );
  }

  const availableItems = shuffledItems.filter((item) => !userOrder.includes(item.id));
  const placedItems = userOrder
    .map((id) => items.find((item) => item.id === id))
    .filter((x): x is (typeof items)[number] => x !== undefined);
  const allItemsPlaced = userOrder.length === items.length;

  if (isObserve) {
    return (
      <div data-testid="sequencing" aria-label="Sequencing activity">
        <div role="status" aria-live="polite">
          {content.description && <p>{content.description}</p>}
          <div role="list" aria-label="Correct sequence">
            {correctOrder.map((id, idx) => {
              const item = items.find((i) => i.id === id);
              if (!item) return null;
              return (
                <div
                  key={item.id}
                  data-testid={`observe-item-${item.id}`}
                  role="listitem"
                  aria-label={`Step ${idx + 1}: ${item.label}`}
                  style={{
                    padding: '0.5rem',
                    margin: '0.25rem 0',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.25rem',
                  }}
                >
                  {item.emoji && <span>{item.emoji} </span>}
                  {item.label}
                </div>
              );
            })}
          </div>
        </div>
        {submitted && (
          <div role="status" aria-live="assertive" data-testid="observe-complete">
            <p>Observed.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-testid="sequencing" aria-label="Sequencing activity">
      {content.description && <p>{content.description}</p>}

      <div role="group" aria-label="Available items" style={{ marginTop: '1rem' }}>
        <p>Click items to build your sequence:</p>
        <div
          data-testid="available-items"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            padding: '0.75rem',
            border: '1px dashed #d1d5db',
            borderRadius: '0.375rem',
            minHeight: '2.5rem',
            backgroundColor: '#f9fafb',
          }}
        >
          {availableItems.length === 0 && (
            <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>All items placed</span>
          )}
          {availableItems.map((item) => (
            <div
              key={item.id}
              data-testid={`available-item-${item.id}`}
              role="button"
              tabIndex={0}
              aria-label={`Add ${item.label} to sequence`}
              onClick={() => handleAvailableItemClick(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleAvailableItemClick(item.id);
                }
              }}
              style={{
                padding: '0.375rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '1rem',
                cursor: 'pointer',
                backgroundColor: '#ffffff',
                userSelect: 'none',
              }}
            >
              {item.emoji && <span>{item.emoji} </span>}
              {item.label}
            </div>
          ))}
        </div>
      </div>

      <div role="group" aria-label="Your sequence" style={{ marginTop: '1rem' }}>
        <p>Your sequence:</p>
        <div
          data-testid="user-sequence"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            padding: '0.75rem',
            border: '2px solid #3b82f6',
            borderRadius: '0.375rem',
            minHeight: '2.5rem',
            backgroundColor: '#eff6ff',
          }}
        >
          {userOrder.length === 0 && (
            <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>
              Click items above to build your sequence
            </span>
          )}
          {placedItems.map((item, idx) => (
            <div
              key={item.id}
              data-testid={`placed-item-${item.id}`}
              role="button"
              tabIndex={0}
              aria-label={`Step ${idx + 1}: ${item.label}. Click to remove`}
              onClick={() => handlePlacedItemClick(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handlePlacedItemClick(item.id);
                }
              }}
              style={{
                padding: '0.5rem',
                border: '1px solid #93c5fd',
                borderRadius: '0.25rem',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontWeight: 'bold', color: '#3b82f6', minWidth: '1.5rem' }}>
                {idx + 1}.
              </span>
              {item.emoji && <span>{item.emoji}</span>}
              <span>{item.label}</span>
              <span style={{ marginLeft: 'auto', color: '#ef4444', fontSize: '0.75rem' }}>✕</span>
            </div>
          ))}
        </div>
      </div>

      <div role="status" aria-live="polite" aria-atomic="true" style={{ marginTop: '0.5rem' }}>
        {userOrder.length > 0 && (
          <p data-testid="sequencing-status">
            {userOrder.length} of {items.length} items in sequence
          </p>
        )}
      </div>

      {!submitted && content.hints && content.hints.length > 0 && content.hints[hintIndex] && (
        <div role="status" aria-live="polite" style={{ marginTop: '0.5rem', color: '#6b7280' }}>
          <p>{content.hints[hintIndex]}</p>
          {hintIndex < content.hints.length - 1 && (
            <button onClick={handleHintClick} style={{ fontSize: '0.8rem' }}>
              More help
            </button>
          )}
        </div>
      )}

      {!submitted && content.hint && !content.hints && (
        <div role="status" aria-live="polite" style={{ marginTop: '0.5rem', color: '#6b7280' }}>
          <p>{content.hint}</p>
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        {!submitted ? (
          <button onClick={handleSubmit} disabled={!allItemsPlaced}>
            Submit
          </button>
        ) : (
          <button disabled data-testid="result-display">
            {(() => {
              const correct =
                correctOrder.length === userOrder.length &&
                correctOrder.every((id, i) => id === userOrder[i]);
              return correct ? 'Correct!' : 'Incorrect';
            })()}
          </button>
        )}
      </div>

      {submitted && (
        <div role="status" aria-live="assertive" data-testid="feedback">
          {(() => {
            const correct =
              correctOrder.length === userOrder.length &&
              correctOrder.every((id, i) => id === userOrder[i]);
            const correctCount = userOrder.filter((id, i) => id === correctOrder[i]).length;
            if (correct) {
              return <p>Correct! The sequence is in the right order.</p>;
            }
            return (
              <p>
                {correctCount} of {correctOrder.length} items in the right position.
              </p>
            );
          })()}
        </div>
      )}
    </div>
  );
}

const SequencingWidget: WidgetDefinition = {
  id: 'open-edu.sequencing',
  version: '0.1.0',
  render: SequencingComponent,
};

export { SequencingWidget as sequencing };
export default SequencingWidget;
