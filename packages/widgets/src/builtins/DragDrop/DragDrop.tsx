import { useState, useCallback } from 'react';
import { z } from 'zod';
import type { WidgetDefinition } from '../../types';
import { Button } from '@open-edu/design-system';
import { useObserveMode } from '../../use-observe-mode';

const itemSchema = z.object({
  id: z.string(),
  label: z.string(),
  emoji: z.string().optional(),
});

const targetSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const dragDropSchema = z.object({
  description: z.string().optional(),
  items: z.array(itemSchema).min(1),
  targets: z.array(targetSchema).min(1),
  expectedPositions: z.record(z.string(), z.string()),
  hints: z.array(z.string()).optional(),
  hint: z.string().optional(),
  interactive: z.boolean().optional().default(false),
});

export type DragDropConfig = z.infer<typeof dragDropSchema>;

function DragDropComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number) => void;
}) {
  const { config: rawConfig, emitInteraction, complete } = props;
  const parsed = dragDropSchema.safeParse(rawConfig);
  const content = parsed.success ? parsed.data : null;
  const hasValidContent =
    parsed.success && content && content.items.length > 0 && content.targets.length > 0;

  const [submitted, setSubmitted] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [placedItems, setPlacedItems] = useState<Record<string, string>>({});
  const [hintIndex, setHintIndex] = useState(0);

  const isObserve = content?.interactive !== true;
  const items = content?.items ?? [];
  const targets = content?.targets ?? [];

  const unplacedItemIds = items.map((item) => item.id).filter((id) => !(id in placedItems));

  const { handleAcknowledge: handleObserveAcknowledge, showAcknowledgeButton } = useObserveMode({
    isObserve: isObserve && hasValidContent,
    onComplete: complete,
    onInteract: emitInteraction,
    widgetId: 'open-edu.drag-drop',
  });

  const handleItemClick = useCallback(
    (itemId: string) => {
      if (submitted || isObserve) return;
      setSelectedItemId((prev) => (prev === itemId ? null : itemId));
    },
    [submitted, isObserve],
  );

  const handleTargetClick = useCallback(
    (targetId: string) => {
      if (submitted || isObserve || selectedItemId === null) return;
      setPlacedItems((prev) => ({
        ...prev,
        [selectedItemId]: targetId,
      }));
      setSelectedItemId(null);
    },
    [submitted, isObserve, selectedItemId],
  );

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      if (submitted || isObserve) return;
      setPlacedItems((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    },
    [submitted, isObserve],
  );

  const handleSubmit = useCallback(() => {
    if (submitted || !content) return;
    const totalItems = content.items.length;
    let correctCount = 0;

    for (const item of content.items) {
      const placed = placedItems[item.id];
      const expected = content.expectedPositions[item.id];
      if (placed && placed === expected) {
        correctCount++;
      }
    }

    const allCorrect = correctCount === totalItems;
    const accuracy = totalItems > 0 ? correctCount / totalItems : 0;
    const score = Math.round(accuracy * 100);

    emitInteraction({
      type: 'widget.interaction',
      action: 'submit',
      droppedPositions: placedItems,
      correct: allCorrect,
      accuracy,
      widgetId: 'open-edu.drag-drop',
    });
    complete(score);
    setSubmitted(true);
  }, [submitted, content, placedItems, emitInteraction, complete]);

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
        className="border-outline-variant bg-surface-container-lowest p-md rounded-xl border text-center"
      >
        <p className="text-on-surface font-semibold">This activity could not be loaded.</p>
      </div>
    );
  }

  const allItemsPlaced = items.every((item) => item.id in placedItems);

  if (isObserve) {
    const observePositions: Record<string, string> = {};
    if (content) {
      for (const item of content.items) {
        const targetId = content.expectedPositions[item.id];
        if (targetId) {
          observePositions[item.id] = targetId;
        }
      }
    }

    return (
      <div data-testid="drag-drop" aria-label="Drag and drop activity">
        <div role="status" aria-live="polite">
          {content.description && <p>{content.description}</p>}
          <div
            role="group"
            aria-label="Drop zones with items"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              marginTop: '0.5rem',
            }}
          >
            {targets.map((target) => {
              const itemsInTarget = items.filter((item) => observePositions[item.id] === target.id);
              return (
                <div
                  key={target.id}
                  data-testid={`observe-target-${target.id}`}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid var(--oe-color-outline-variant, #d1d5db)',
                    borderRadius: '0.375rem',
                    backgroundColor: 'var(--oe-color-surface-container-lowest, #f9fafb)',
                    minHeight: '2.5rem',
                  }}
                  aria-label={`Target: ${target.label}`}
                >
                  <strong>{target.label}</strong>
                  {itemsInTarget.map((item) => (
                    <div
                      key={item.id}
                      data-testid={`observe-item-${item.id}`}
                      style={{ marginTop: '0.25rem', padding: '0.25rem 0.5rem' }}
                      aria-label={`Item: ${item.label}`}
                    >
                      {item.emoji && <span>{item.emoji} </span>}
                      {item.label}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
        {showAcknowledgeButton && (
          <div className="p-md border-outline-variant mt-md flex items-center justify-center border-t">
            <Button
              variant="default"
              onClick={handleObserveAcknowledge}
              data-testid="observe-acknowledge"
            >
              Mark as seen ✓
            </Button>
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
    <div data-testid="drag-drop" aria-label="Drag and drop activity">
      {content.description && <p>{content.description}</p>}

      <div
        data-testid="unplaced-items"
        role="group"
        aria-label="Unplaced items"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginTop: '0.75rem',
          marginBottom: '0.75rem',
          padding: '0.75rem',
          border: '1px dashed var(--oe-color-outline-variant, #d1d5db)',
          borderRadius: '0.375rem',
          minHeight: '2.5rem',
          backgroundColor: 'var(--oe-color-surface-container-lowest, #f9fafb)',
        }}
      >
        {unplacedItemIds.length === 0 && (
          <span
            style={{ color: 'var(--oe-color-on-surface-variant, #9ca3af)', fontStyle: 'italic' }}
          >
            All items placed
          </span>
        )}
        {unplacedItemIds.map((itemId) => {
          const item = items.find((i) => i.id === itemId);
          if (!item) return null;
          const isSelected = selectedItemId === itemId;
          return (
            <div
              key={itemId}
              data-testid={`unplaced-item-${itemId}`}
              role="button"
              tabIndex={0}
              aria-label={`Item ${item.label}${item.emoji ? ` ${item.emoji}` : ''}`}
              aria-selected={isSelected}
              onClick={() => handleItemClick(itemId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleItemClick(itemId);
                }
              }}
              style={{
                padding: '0.375rem 0.75rem',
                border: isSelected
                  ? '2px solid var(--oe-color-primary, #3b82f6)'
                  : '1px solid var(--oe-color-outline-variant, #d1d5db)',
                borderRadius: '1rem',
                cursor: isSelected ? 'grabbing' : 'pointer',
                backgroundColor: isSelected
                  ? 'var(--oe-color-primary-container, #eff6ff)'
                  : 'var(--oe-color-surface, #ffffff)',
                userSelect: 'none',
                boxShadow: isSelected
                  ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)'
                  : 'none',
                transform: isSelected ? 'translateY(-2px)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {item.emoji && <span>{item.emoji} </span>}
              {item.label}
            </div>
          );
        })}
      </div>

      <div
        role="group"
        aria-label="Drop zones"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
      >
        {targets.map((target) => {
          const itemsInTarget = items.filter((item) => placedItems[item.id] === target.id);
          const hasItem = itemsInTarget.length > 0;
          const shouldHighlight = selectedItemId !== null && !hasItem;
          return (
            <div
              key={target.id}
              data-testid={`target-${target.id}`}
              role="button"
              tabIndex={selectedItemId !== null ? 0 : -1}
              aria-label={`Drop zone: ${target.label}`}
              onClick={() => handleTargetClick(target.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleTargetClick(target.id);
                }
              }}
              style={{
                padding: '0.75rem',
                border: shouldHighlight
                  ? '2px dashed var(--oe-color-primary, #3b82f6)'
                  : hasItem
                    ? '1px solid var(--oe-color-outline-variant, #d1d5db)'
                    : '1px solid var(--oe-color-outline-variant, #d1d5db)',
                borderRadius: '0.375rem',
                minHeight: '2.5rem',
                backgroundColor: shouldHighlight
                  ? 'var(--oe-color-primary-container, #eff6ff)'
                  : 'var(--oe-color-surface-container-lowest, #f9fafb)',
                cursor: selectedItemId !== null && !hasItem ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
              }}
            >
              <strong>{target.label}</strong>
              {itemsInTarget.map((item) => (
                <div
                  key={item.id}
                  data-testid={`placed-item-${item.id}`}
                  style={{
                    marginTop: '0.25rem',
                    padding: '0.25rem 0.5rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    border: '1px solid var(--oe-color-outline-variant, #d1d5db)',
                    borderRadius: '0.25rem',
                    backgroundColor: 'var(--oe-color-surface, #ffffff)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {item.emoji && <span>{item.emoji}</span>}
                  <span>{item.label}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveItem(item.id);
                    }}
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
                    aria-label={`Remove ${item.label} from ${target.label}`}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div role="status" aria-live="polite" aria-atomic="true" style={{ marginTop: '0.5rem' }}>
        {Object.keys(placedItems).length > 0 && (
          <p data-testid="placement-status">
            {Object.keys(placedItems).length} of {items.length} items placed
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
            <Button variant="ghost" size="sm" onClick={handleHintClick}>
              More help
            </Button>
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
          <Button variant="default" onClick={handleSubmit} disabled={!allItemsPlaced}>
            Submit
          </Button>
        ) : null}
      </div>

      {submitted && (
        <div role="status" aria-live="assertive" data-testid="feedback">
          {(() => {
            const totalItems = items.length;
            let correctCount = 0;
            for (const item of items) {
              const placed = placedItems[item.id];
              const expected = content!.expectedPositions[item.id];
              if (placed && placed === expected) {
                correctCount++;
              }
            }
            return correctCount === totalItems ? (
              <p>Correct! All items placed correctly.</p>
            ) : (
              <p>
                {correctCount} of {totalItems} items placed correctly.
              </p>
            );
          })()}
        </div>
      )}
    </div>
  );
}

const DragDropWidget: WidgetDefinition = {
  id: 'open-edu.drag-drop',
  version: '0.1.0',
  render: DragDropComponent,
};

export { DragDropWidget as dragDrop };
export default DragDropWidget;
