import { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import type { WidgetDefinition } from '../../types';
import { ThemedButton } from '../../themed-button';
import { useObserveMode } from '../../use-observe-mode';

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

  const { handleAcknowledge: handleObserveAcknowledge, showAcknowledgeButton } = useObserveMode({
    isObserve: isObserve && hasValidContent,
    onComplete: complete,
    onInteract: emitInteraction,
    widgetId: 'open-edu.sequencing',
  });

  const handleAvailableItemClick = useCallback(
    (itemId: string) => {
      if (submitted || isObserve) return;
      setUserOrder((prev) => [...prev, itemId]);
    },
    [submitted, isObserve],
  );

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      if (submitted || isObserve) return;
      setUserOrder((prev) => prev.filter((id) => id !== itemId));
    },
    [submitted, isObserve],
  );

  const moveItem = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (submitted || isObserve) return;
      if (toIndex < 0 || toIndex >= userOrder.length) return;
      setUserOrder((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved!);
        return next;
      });
    },
    [submitted, isObserve, userOrder.length],
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
      <div
        role="alert"
        data-testid="widget-config-error"
        className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md text-center"
      >
        <p className="text-on-surface font-semibold">This activity could not be loaded.</p>
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
                    border: '1px solid var(--oe-color-outline-variant, #d1d5db)',
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
        {!showAcknowledgeButton && (
          <div role="status" aria-live="assertive" data-testid="observe-complete">
            <p>Content acknowledged.</p>
          </div>
        )}
        {showAcknowledgeButton && !submitted && (
          <div style={{ marginTop: '1rem' }}>
            <ThemedButton variant="primary" onClick={handleObserveAcknowledge}>
              Acknowledge
            </ThemedButton>
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
            border: '1px dashed var(--oe-color-outline-variant, #d1d5db)',
            borderRadius: '0.375rem',
            minHeight: '2.5rem',
            backgroundColor: 'var(--oe-color-surface-container-lowest, #f9fafb)',
          }}
        >
          {availableItems.length === 0 && (
            <span
              style={{ color: 'var(--oe-color-on-surface-variant, #9ca3af)', fontStyle: 'italic' }}
            >
              All items placed
            </span>
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
                border: '1px solid var(--oe-color-outline-variant, #d1d5db)',
                borderRadius: '1rem',
                cursor: 'pointer',
                backgroundColor: 'var(--oe-color-surface, #ffffff)',
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
            border: '2px solid var(--oe-color-primary, #3b82f6)',
            borderRadius: '0.375rem',
            minHeight: '2.5rem',
            backgroundColor: 'var(--oe-color-primary-container, #eff6ff)',
          }}
        >
          {userOrder.length === 0 && (
            <span
              style={{ color: 'var(--oe-color-on-surface-variant, #9ca3af)', fontStyle: 'italic' }}
            >
              Click items above to build your sequence
            </span>
          )}
          {correctOrder.map((correctItemId, slotIndex) => {
            const placedItem = placedItems[slotIndex];
            const isCorrectPosition = submitted && placedItem?.id === correctItemId;
            const isIncorrectPosition = submitted && placedItem && placedItem.id !== correctItemId;

            return (
              <div
                key={`slot-${slotIndex}`}
                data-testid={placedItem ? `placed-item-${placedItem.id}` : `slot-${slotIndex}`}
                style={{
                  padding: '0.5rem',
                  border: '1px solid var(--oe-color-outline-variant, #d1d5db)',
                  borderRadius: '0.25rem',
                  backgroundColor: isCorrectPosition
                    ? 'var(--oe-color-success-container, #dcfce7)'
                    : isIncorrectPosition
                      ? 'var(--oe-color-error-container, #fee2e2)'
                      : 'var(--oe-color-surface, #ffffff)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  transition: 'all 0.2s ease',
                }}
              >
                <span
                  style={{
                    fontWeight: 'bold',
                    color: 'var(--oe-color-primary, #3b82f6)',
                    minWidth: '1.5rem',
                  }}
                >
                  {slotIndex + 1}.
                </span>
                {placedItem ? (
                  <>
                    {placedItem.emoji && <span>{placedItem.emoji}</span>}
                    <span className="flex-1">{placedItem.label}</span>
                    {isCorrectPosition && (
                      <span style={{ color: 'var(--oe-success, #22c55e)' }}>✓</span>
                    )}
                    {isIncorrectPosition && (
                      <span style={{ color: 'var(--oe-error, #ef4444)' }}>✗</span>
                    )}
                    {!submitted && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          marginLeft: 'auto',
                        }}
                      >
                        <ThemedButton
                          variant="ghost"
                          size="sm"
                          onClick={() => moveItem(slotIndex, slotIndex - 1)}
                          disabled={slotIndex === 0}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: slotIndex === 0 ? 'default' : 'pointer',
                            fontSize: '0.875rem',
                            padding: '0 0.25rem',
                            opacity: slotIndex === 0 ? 0.4 : 1,
                          }}
                          aria-label={`Move ${placedItem.label} up`}
                        >
                          ↑
                        </ThemedButton>
                        <ThemedButton
                          variant="ghost"
                          size="sm"
                          onClick={() => moveItem(slotIndex, slotIndex + 1)}
                          disabled={slotIndex === userOrder.length - 1}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: slotIndex === userOrder.length - 1 ? 'default' : 'pointer',
                            fontSize: '0.875rem',
                            padding: '0 0.25rem',
                            opacity: slotIndex === userOrder.length - 1 ? 0.4 : 1,
                          }}
                          aria-label={`Move ${placedItem.label} down`}
                        >
                          ↓
                        </ThemedButton>
                        <ThemedButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(placedItem.id)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            color: 'var(--oe-color-on-surface-variant, #6b7280)',
                            padding: '0 0.25rem',
                            borderRadius: '0.25rem',
                          }}
                          onMouseEnter={(e) => {
                            (e.target as HTMLElement).style.backgroundColor =
                              'var(--oe-color-surface-variant, #f3f4f6)';
                          }}
                          onMouseLeave={(e) => {
                            (e.target as HTMLElement).style.backgroundColor = 'transparent';
                          }}
                          aria-label="Remove from sequence"
                        >
                          ✕
                        </ThemedButton>
                      </div>
                    )}
                  </>
                ) : (
                  <span
                    style={{
                      color: 'var(--oe-color-on-surface-variant, #9ca3af)',
                      fontStyle: 'italic',
                    }}
                  >
                    ___
                  </span>
                )}
              </div>
            );
          })}
          {submitted &&
            correctOrder.map((correctItemId, slotIndex) => {
              const placedItem = placedItems[slotIndex];
              const isIncorrectPosition = placedItem && placedItem.id !== correctItemId;
              if (!isIncorrectPosition) return null;
              const correctItem = items.find((i) => i.id === correctItemId);
              return (
                <div
                  key={`correction-${slotIndex}`}
                  style={{
                    padding: '0.25rem 0.5rem',
                    marginLeft: '1.5rem',
                    fontSize: '0.875rem',
                    color: 'var(--oe-color-on-surface-variant, #6b7280)',
                    fontStyle: 'italic',
                  }}
                >
                  Correct: {correctItem?.emoji && <span>{correctItem.emoji} </span>}
                  {correctItem?.label}
                </div>
              );
            })}
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
        <div
          role="status"
          aria-live="polite"
          style={{ marginTop: '0.5rem', color: 'var(--oe-color-on-surface-variant, #6b7280)' }}
        >
          <p>{content.hints[hintIndex]}</p>
          {hintIndex < content.hints.length - 1 && (
            <ThemedButton variant="ghost" size="sm" onClick={handleHintClick}>
              More help
            </ThemedButton>
          )}
        </div>
      )}

      {!submitted && content.hint && !content.hints && (
        <div
          role="status"
          aria-live="polite"
          style={{ marginTop: '0.5rem', color: 'var(--oe-color-on-surface-variant, #6b7280)' }}
        >
          <p>{content.hint}</p>
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        {!submitted ? (
          <ThemedButton variant="primary" onClick={handleSubmit} disabled={!allItemsPlaced}>
            Submit
          </ThemedButton>
        ) : null}
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
