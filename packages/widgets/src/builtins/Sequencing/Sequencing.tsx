import { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import type { WidgetDefinition } from '../../types';
import { Button } from '@open-edu/design-system';
import { useObserveMode } from '../../use-observe-mode';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

function SortableItem({
  item,
  index,
  submitted,
  correctOrder,
}: {
  item: { id: string; label: string; emoji?: string };
  index: number;
  submitted: boolean;
  correctOrder: string[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const isCorrectPosition = submitted && correctOrder[index] === item.id;
  const isIncorrectPosition = submitted && correctOrder[index] !== item.id;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: `${transition || ''}`,
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
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="listitem"
      data-testid={`sortable-item-${item.id}`}
      aria-label={`Step ${index + 1}: ${item.label}`}
    >
      <span
        style={{
          fontWeight: 'bold',
          color: 'var(--oe-color-primary, #3b82f6)',
          minWidth: '1.5rem',
        }}
      >
        {index + 1}.
      </span>
      {item.emoji && <span>{item.emoji}</span>}
      <span>{item.label}</span>
      {isCorrectPosition && (
        <span style={{ marginLeft: 'auto', color: 'var(--oe-success, #22c55e)' }}>✓</span>
      )}
      {isIncorrectPosition && (
        <span style={{ marginLeft: 'auto', color: 'var(--oe-error, #ef4444)' }}>✗</span>
      )}
    </div>
  );
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
  const [hintIndex, setHintIndex] = useState(0);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const isObserve = content?.interactive !== true;
  const items = content?.items ?? [];
  const correctOrder = useMemo(() => content?.correctOrder ?? [], [content]);

  const [itemOrder, setItemOrder] = useState<string[]>(() => {
    if (!content) return [];
    return shuffleArray(content.items).map((item) => item.id);
  });

  const { handleAcknowledge: handleObserveAcknowledge, showAcknowledgeButton } = useObserveMode({
    isObserve: isObserve && hasValidContent,
    onComplete: complete,
    onInteract: emitInteraction,
    widgetId: 'open-edu.sequencing',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveDragId(String(event.active.id));
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activeId = String(event.active.id);
      const overId = event.over ? String(event.over.id) : null;
      setActiveDragId(null);
      if (submitted || isObserve) return;
      if (overId && activeId !== overId) {
        setItemOrder((prev) => {
          const oldIndex = prev.indexOf(activeId);
          const newIndex = prev.indexOf(overId);
          if (oldIndex === -1 || newIndex === -1) return prev;
          return arrayMove(prev, oldIndex, newIndex);
        });
      }
    },
    [submitted, isObserve],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  const handleSubmit = useCallback(() => {
    if (submitted || !content) return;

    const correct =
      correctOrder.length === itemOrder.length &&
      correctOrder.every((id, i) => id === itemOrder[i]);
    const accuracy =
      itemOrder.filter((id, i) => id === correctOrder[i]).length / correctOrder.length;
    const score = Math.round(accuracy * 100);

    emitInteraction({
      type: 'widget.interaction',
      action: 'submit',
      userOrder: itemOrder,
      correct,
      accuracy,
      widgetId: 'open-edu.sequencing',
    });
    complete(score);
    setSubmitted(true);
  }, [submitted, content, itemOrder, correctOrder, emitInteraction, complete]);

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
        className="border-outline-variant bg-surface-container-lowest p-md rounded-lg border text-center"
      >
        <p className="text-on-surface font-semibold">This activity could not be loaded.</p>
      </div>
    );
  }

  const activeDragItem = activeDragId ? items.find((i) => i.id === activeDragId) : null;

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
            <Button variant="default" onClick={handleObserveAcknowledge}>
              Acknowledge
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div data-testid="sequencing" aria-label="Sequencing activity">
        {content.description && <p>{content.description}</p>}

        <div style={{ marginTop: '1rem' }}>
          <div
            data-testid="sortable-list"
            role="group"
            aria-label="Reorder the items"
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
            <SortableContext
              items={itemOrder}
              strategy={verticalListSortingStrategy}
            >
              {itemOrder.map((id, index) => {
                const item = items.find((i) => i.id === id);
                if (!item) return null;
                return (
                  <SortableItem
                    key={item.id}
                    item={item}
                    index={index}
                    submitted={submitted}
                    correctOrder={correctOrder}
                  />
                );
              })}
            </SortableContext>
          </div>
        </div>

        {submitted &&
          correctOrder.map((correctItemId, slotIndex) => {
            const placedItemId = itemOrder[slotIndex];
            const isIncorrectPosition =
              placedItemId && placedItemId !== correctItemId;
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

        <div role="status" aria-live="polite" aria-atomic="true" style={{ marginTop: '0.5rem' }}>
          {itemOrder.length > 0 && (
            <p data-testid="sequencing-status">
              {itemOrder.length} of {items.length} items in sequence
            </p>
          )}
        </div>

        {!submitted &&
          content.hints &&
          content.hints.length > 0 &&
          content.hints[hintIndex] && (
            <div
              role="status"
              aria-live="polite"
              style={{
                marginTop: '0.5rem',
                color: 'var(--oe-color-on-surface-variant, #6b7280)',
              }}
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
            style={{
              marginTop: '0.5rem',
              color: 'var(--oe-color-on-surface-variant, #6b7280)',
            }}
          >
            <p>{content.hint}</p>
          </div>
        )}

        <div style={{ marginTop: '1rem' }}>
          {!submitted ? (
            <Button variant="default" onClick={handleSubmit} disabled={false}>
              Submit
            </Button>
          ) : null}
        </div>

        {submitted && (
          <div role="status" aria-live="assertive" data-testid="feedback">
            {(() => {
              const correct =
                correctOrder.length === itemOrder.length &&
                correctOrder.every((id, i) => id === itemOrder[i]);
              const correctCount = itemOrder.filter(
                (id, i) => id === correctOrder[i],
              ).length;
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

      <DragOverlay>
        {activeDragItem ? (
          <div
            style={{
              padding: '0.5rem',
              border: '2px solid var(--oe-color-primary, #3b82f6)',
              borderRadius: '0.375rem',
              backgroundColor: 'var(--oe-color-primary-container, #eff6ff)',
              cursor: 'grabbing',
              userSelect: 'none',
              boxShadow:
                '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            {activeDragItem.emoji && <span>{activeDragItem.emoji}</span>}
            <span>{activeDragItem.label}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

const SequencingWidget: WidgetDefinition = {
  id: 'open-edu.sequencing',
  version: '0.1.0',
  render: SequencingComponent,
};

export { SequencingWidget as sequencing };
export default SequencingWidget;
