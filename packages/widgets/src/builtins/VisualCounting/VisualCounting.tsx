import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import type { WidgetDefinition } from '../../types';

export const visualCountingSchema = z.object({
  description: z.string().optional(),
  items: z.array(z.string()).optional(),
  count: z.number().optional(),
  text: z.string().optional(),
  hint: z.string().optional(),
  hints: z.array(z.string()).optional(),
  left: z.union([z.array(z.string()), z.number()]).optional(),
  right: z.union([z.array(z.string()), z.number()]).optional(),
  sum: z.number().optional(),
  emoji: z.string().optional(),
  size: z.enum(['sm', 'md', 'lg']).optional(),
});

export type VisualCountingConfig = z.infer<typeof visualCountingSchema>;

const SIZE_MAP = { sm: '2rem', md: '3rem', lg: '4rem' } as const;

function isAdditionMode(c: VisualCountingConfig): boolean {
  return c.left !== undefined || c.right !== undefined;
}

function getEmojiLabel(emoji: string, position: number, total: number): string {
  return `${emoji} ${position} of ${total}`;
}

function VisualCountingComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number) => void;
}) {
  const { config: rawConfig, emitInteraction, complete } = props;
  const parsed = visualCountingSchema.safeParse(rawConfig);
  const fallbackContent: VisualCountingConfig = {};
  const content = parsed.success ? parsed.data : fallbackContent;
  const isAddition = parsed.success && isAdditionMode(content);
  const hasValidContent =
    parsed.success &&
    (isAddition
      ? content.left !== undefined || content.right !== undefined
      : content.items !== undefined || content.count !== undefined);

  const [phase, setPhase] = useState<'observe' | 'interactive' | 'done'>('observe');
  const [hintIndex, setHintIndex] = useState(0);
  const [selectedCount, setSelectedCount] = useState<number | null>(null);

  const displayItems = content.items ?? [];
  const leftItems = Array.isArray(content.left) ? content.left : [];
  const rightItems = Array.isArray(content.right) ? content.right : [];
  const leftCount = typeof content.left === 'number' ? content.left : leftItems.length;
  const rightCount = typeof content.right === 'number' ? content.right : rightItems.length;
  const expected = isAddition ? (content.sum ?? leftCount + rightCount) : (content.count ?? 0);
  const emojiSize = SIZE_MAP[content.size ?? 'md'];
  const labelName = content.text ?? 'item';

  useEffect(() => {
    if (phase !== 'observe') return;
    const timer = setTimeout(() => {
      emitInteraction({ type: 'widget.interaction', action: 'observe', observed: true, correct: true });
      complete(100);
      setPhase('interactive');
    }, 1500);
    return () => clearTimeout(timer);
  }, [phase, emitInteraction, complete]);

  const handleNumberClick = useCallback(
    (num: number) => {
      if (phase !== 'interactive') return;
      setSelectedCount(num);
    },
    [phase],
  );

  const handleSubmit = useCallback(() => {
    if (selectedCount === null || phase !== 'interactive') return;
    const correct = selectedCount === expected;
    const accuracy =
      expected > 0 ? Math.max(0, 1 - Math.abs(selectedCount - expected) / expected) : 0;
    emitInteraction({
      type: 'widget.interaction',
      action: 'submit',
      count: selectedCount,
      correct,
      accuracy,
      widgetId: 'open-edu.visual-counting',
    });
    complete(accuracy * 100);
    setPhase('done');
  }, [selectedCount, phase, expected, emitInteraction, complete]);

  const handleHintClick = useCallback(() => {
    if (content.hints && hintIndex < content.hints.length - 1) {
      setHintIndex((i) => i + 1);
    }
  }, [content.hints, hintIndex]);

  if (!hasValidContent) {
    return (
      <div role="alert" data-testid="widget-config-error">
        <p>Invalid widget configuration.</p>
      </div>
    );
  }

  const start = Math.max(1, expected - 3);
  const end = expected + 3;
  const numberButtons: number[] = [];
  for (let i = start; i <= end; i++) {
    numberButtons.push(i);
  }

  const renderItems = (items: string[]) => {
    const displayEmoji = content.emoji ?? undefined;
    return (
      <ul
        style={{ listStyle: 'none', display: 'flex', gap: '0.5rem', padding: 0, margin: 0 }}
        role="list"
        aria-label={labelName}
      >
        {items.map((item, idx) => (
          <li key={idx} role="listitem" aria-label={getEmojiLabel(displayEmoji || item, idx + 1, items.length)}>
            <span role="img" aria-hidden="true" style={{ fontSize: emojiSize }}>
              {displayEmoji || item}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  const renderAddition = (showTotal: boolean) => (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}
      role="group"
      aria-label="Addition counting"
    >
      {leftItems.length > 0 && renderItems(leftItems)}
      {leftCount > 0 && leftItems.length === 0 && (
        <span style={{ fontSize: emojiSize }}>{leftCount} items</span>
      )}
      <span role="img" aria-label="plus" style={{ fontSize: emojiSize }}>
        +
      </span>
      {rightItems.length > 0 && renderItems(rightItems)}
      {rightCount > 0 && rightItems.length === 0 && (
        <span style={{ fontSize: emojiSize }}>{rightCount} items</span>
      )}
      {showTotal && (
        <>
          <span role="img" aria-label="equals" style={{ fontSize: emojiSize }}>
            =
          </span>
          <span style={{ fontSize: emojiSize, fontWeight: 'bold' }}>{expected}</span>
        </>
      )}
    </div>
  );

  return (
    <div data-testid="visual-counting" aria-label="Visual counting activity">
      {phase === 'observe' && (
        <div role="status" aria-live="polite">
          {content.description && <p>{content.description}</p>}
          {isAddition ? (
            renderAddition(true)
          ) : (
            <>
              {displayItems.length > 0 && renderItems(displayItems)}
              {content.text && (
                <p>
                  There are {content.count} {content.text}.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {(phase === 'interactive' || phase === 'done') && (
        <div>
          {content.description && <p>{content.description}</p>}
          {isAddition
            ? renderAddition(false)
            : displayItems.length > 0 && renderItems(displayItems)}

          {displayItems.length === 0 && !isAddition && <p role="status">No items to count.</p>}

          {phase === 'interactive' && (
            <div role="group" aria-label="Count selection" style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {numberButtons.map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNumberClick(num)}
                    aria-pressed={selectedCount === num}
                    aria-label={`Count ${num}`}
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '1rem',
                      fontWeight: selectedCount === num ? 'bold' : 'normal',
                      backgroundColor: selectedCount === num ? '#3b82f6' : '#e5e7eb',
                      color: selectedCount === num ? 'white' : 'black',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                    }}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === 'interactive' &&
            content.hints &&
            content.hints.length > 0 &&
            content.hints[hintIndex] && (
              <div
                role="status"
                aria-live="polite"
                style={{ marginTop: '0.5rem', color: '#6b7280' }}
              >
                <p>{content.hints[hintIndex]}</p>
                {hintIndex < content.hints.length - 1 && (
                  <button onClick={handleHintClick} style={{ fontSize: '0.8rem' }}>
                    More help
                  </button>
                )}
              </div>
            )}

          {phase === 'interactive' && content.hint && !content.hints && (
            <div role="status" aria-live="polite" style={{ marginTop: '0.5rem', color: '#6b7280' }}>
              <p>{content.hint}</p>
            </div>
          )}

          <div style={{ marginTop: '1rem' }}>
            {phase === 'interactive' ? (
              <button onClick={handleSubmit} disabled={selectedCount === null}>
                Submit
              </button>
            ) : (
              <button disabled>{selectedCount === expected ? 'Correct!' : 'Incorrect'}</button>
            )}
          </div>

          {selectedCount !== null && phase === 'interactive' && (
            <div role="status" aria-live="polite" aria-atomic="true">
              <p>Selected: {selectedCount}</p>
            </div>
          )}

          {phase === 'done' && (
            <div role="status" aria-live="assertive">
              {selectedCount === expected ? (
                <p>Correct! The answer is {expected}.</p>
              ) : (
                <p>Not quite. The correct answer is {expected}.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const VisualCountingWidget: WidgetDefinition = {
  id: 'open-edu.visual-counting',
  version: '0.1.0',
  render: VisualCountingComponent,
};

export { VisualCountingWidget as visualCounting };
export default VisualCountingWidget;
