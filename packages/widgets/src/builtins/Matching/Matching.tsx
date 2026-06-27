import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { z } from 'zod';
import type { WidgetDefinition } from '../../types';
import { ThemedButton } from '../../themed-button';
import { useObserveMode } from '../../use-observe-mode';

export const matchingSchema = z.object({
  description: z.string().optional(),
  pairs: z.array(
    z.object({
      id: z.string().optional(),
      itemA: z.string(),
      itemB: z.string(),
    }),
  ),
  hints: z.array(z.string()).optional(),
  hint: z.string().optional(),
  interactive: z.boolean().optional().default(false),
});

export type MatchingConfig = z.infer<typeof matchingSchema>;

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

function getPairId(pair: { id?: string }, index: number): string {
  return pair.id ?? `pair-${index}`;
}

function MatchingComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number) => void;
}) {
  const { config: rawConfig, emitInteraction, complete } = props;
  const parsed = matchingSchema.safeParse(rawConfig);
  const content = parsed.success ? parsed.data : null;
  const hasValidContent = parsed.success && content && content.pairs.length > 0;

  const [submitted, setSubmitted] = useState(false);
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [connections, setConnections] = useState<Map<string, string>>(new Map());
  const [hintIndex, setHintIndex] = useState(0);
  const [connectorPositions, setConnectorPositions] = useState<
    Array<{ x1: number; y1: number; x2: number; y2: number; leftId: string; rightId: string }>
  >([]);

  const isObserve = content?.interactive !== true;
  const pairs = content?.pairs ?? [];

  const shuffledRightPairs = useMemo(() => {
    if (!content) return [];
    return shuffleArray(content.pairs);
  }, [content]);

  const containerRef = useRef<HTMLDivElement>(null);

  const { handleAcknowledge: handleObserveAcknowledge, showAcknowledgeButton } = useObserveMode({
    isObserve: isObserve && hasValidContent,
    onComplete: complete,
    onInteract: emitInteraction,
    widgetId: 'open-edu.matching',
  });

  const updateConnectorPositions = useCallback(() => {
    if (!containerRef.current) return;
    const positions: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      leftId: string;
      rightId: string;
    }> = [];
    const containerRect = containerRef.current.getBoundingClientRect();

    for (const [leftId, rightId] of connections.entries()) {
      const leftEl = containerRef.current.querySelector(`[data-connector-left="${leftId}"]`);
      const rightEl = containerRef.current.querySelector(`[data-connector-right="${rightId}"]`);
      if (leftEl && rightEl) {
        const leftRect = leftEl.getBoundingClientRect();
        const rightRect = rightEl.getBoundingClientRect();
        positions.push({
          x1: leftRect.right - containerRect.left,
          y1: leftRect.top + leftRect.height / 2 - containerRect.top,
          x2: rightRect.left - containerRect.left,
          y2: rightRect.top + rightRect.height / 2 - containerRect.top,
          leftId,
          rightId,
        });
      }
    }
    setConnectorPositions(positions);
  }, [connections]);

  useEffect(() => {
    updateConnectorPositions();
  }, [connections, updateConnectorPositions]);

  useEffect(() => {
    const handleResize = () => updateConnectorPositions();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateConnectorPositions]);

  const handleLeftItemClick = useCallback(
    (pairId: string) => {
      if (submitted) return;
      if (connections.has(pairId)) {
        setConnections((prev) => {
          const next = new Map(prev);
          next.delete(pairId);
          return next;
        });
        setSelectedLeftId(pairId);
        return;
      }
      setSelectedLeftId((prev) => (prev === pairId ? null : pairId));
    },
    [submitted, connections],
  );

  const handleRightItemClick = useCallback(
    (rightPairId: string) => {
      if (submitted || selectedLeftId === null) return;
      setConnections((prev) => {
        const next = new Map(prev);
        next.set(selectedLeftId, rightPairId);
        return next;
      });
      setSelectedLeftId(null);
    },
    [submitted, selectedLeftId],
  );

  const handleRemoveConnection = useCallback(
    (leftPairId: string) => {
      if (submitted) return;
      setConnections((prev) => {
        const next = new Map(prev);
        next.delete(leftPairId);
        return next;
      });
    },
    [submitted],
  );

  const handleSubmit = useCallback(() => {
    if (submitted || !content) return;
    const totalPairs = content.pairs.length;
    const results: Array<{ id: string; correct: boolean }> = [];

    for (const pair of content.pairs) {
      const pairId = getPairId(pair, content.pairs.indexOf(pair));
      const connectedRight = connections.get(pairId);
      results.push({ id: pairId, correct: connectedRight === pairId });
    }

    const correctCount = results.filter((r) => r.correct).length;
    const allCorrect = correctCount === totalPairs;
    const accuracy = totalPairs > 0 ? correctCount / totalPairs : 0;
    const score = Math.round(accuracy * 100);

    emitInteraction({
      type: 'widget.interaction',
      action: 'submit',
      pairs: results,
      correct: allCorrect,
      accuracy,
      widgetId: 'open-edu.matching',
    });
    complete(score);
    setSubmitted(true);
  }, [submitted, content, connections, emitInteraction, complete]);

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

  const allLeftConnected = pairs.every((pair, idx) => {
    const pairId = getPairId(pair, idx);
    return connections.has(pairId);
  });

  if (isObserve) {
    return (
      <div data-testid="matching" aria-label="Matching activity">
        <div role="status" aria-live="polite">
          {content.description && <p>{content.description}</p>}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: '1rem',
              alignItems: 'start',
            }}
          >
            <div>
              {pairs.map((pair, idx) => {
                const pairId = getPairId(pair, idx);
                return (
                  <div
                    key={pairId}
                    data-testid={`observe-left-${pairId}`}
                    data-observe-left={pairId}
                    style={{ padding: '0.5rem', margin: '0.25rem 0' }}
                    aria-label={pair.itemA}
                  >
                    {pair.itemA}
                  </div>
                );
              })}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              <svg
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
                aria-hidden="true"
              >
                {pairs.map((pair, idx) => {
                  const pairId = getPairId(pair, idx);
                  return (
                    <line
                      key={pairId}
                      x1="0%"
                      y1={`${(idx / Math.max(pairs.length - 1, 1)) * 100}%`}
                      x2="100%"
                      y2={`${(idx / Math.max(pairs.length - 1, 1)) * 100}%`}
                      stroke="var(--oe-primary, #3b82f6)"
                      strokeWidth={2}
                    />
                  );
                })}
              </svg>
              {pairs.map((pair, idx) => {
                const pairId = getPairId(pair, idx);
                return (
                  <div
                    key={pairId}
                    style={{
                      width: '2rem',
                      height: '2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0.25rem 0',
                    }}
                  />
                );
              })}
            </div>
            <div>
              {pairs.map((pair, idx) => {
                const pairId = getPairId(pair, idx);
                return (
                  <div
                    key={pairId}
                    data-testid={`observe-right-${pairId}`}
                    data-observe-right={pairId}
                    style={{ padding: '0.5rem', margin: '0.25rem 0' }}
                    aria-label={pair.itemB}
                  >
                    {pair.itemB}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {!showAcknowledgeButton && (
          <div role="status" aria-live="assertive" data-testid="observe-complete">
            <p>Content acknowledged.</p>
          </div>
        )}
        {showAcknowledgeButton && (
          <div className="flex items-center justify-center p-md border-t border-outline-variant mt-md">
            <ThemedButton
              variant="primary"
              onClick={handleObserveAcknowledge}
              data-testid="observe-acknowledge"
            >
              Mark as seen ✓
            </ThemedButton>
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-testid="matching" aria-label="Matching activity" ref={containerRef}>
      {content.description && <p>{content.description}</p>}

      <div style={{ position: 'relative' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: '1rem',
            alignItems: 'start',
          }}
          role="group"
          aria-label="Matching columns"
        >
          <div role="list" aria-label="Items to match">
            {pairs.map((pair, idx) => {
              const pairId = getPairId(pair, idx);
              const isSelected = selectedLeftId === pairId;
              const isConnected = connections.has(pairId);
              return (
                <div
                  key={pairId}
                  role="listitem"
                  data-testid={`left-item-${pairId}`}
                  data-connector-left={pairId}
                  tabIndex={0}
                  aria-label={`Match ${pair.itemA}`}
                  aria-selected={isSelected}
                  onClick={() => handleLeftItemClick(pairId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleLeftItemClick(pairId);
                    }
                  }}
                  style={{
                    padding: '0.5rem',
                    margin: '0.25rem 0',
                    border: isSelected
                      ? '2px solid var(--oe-primary, #3b82f6)'
                      : isConnected
                        ? '2px solid var(--oe-success, #22c55e)'
                        : '1px solid var(--oe-outline-variant, #d1d5db)',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    backgroundColor: isSelected
                      ? 'var(--oe-primary-container, #eff6ff)'
                      : isConnected
                        ? 'var(--oe-success-container, #f0fdf4)'
                        : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{pair.itemA}</span>
                  {isConnected && (
                    <ThemedButton
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveConnection(pairId);
                      }}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        color: 'var(--oe-on-surface-variant, #6b7280)',
                        padding: '0 0.25rem',
                        borderRadius: '0.25rem',
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.backgroundColor =
                          'var(--oe-surface-variant, #f3f4f6)';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                      aria-label={`Remove match for ${pair.itemA}`}
                    >
                      ✕
                    </ThemedButton>
                  )}
                </div>
              );
            })}
          </div>

          <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            aria-hidden="true"
          >
            {pairs.map((pair, idx) => {
              const pairId = getPairId(pair, idx);
              return (
                <div
                  key={pairId}
                  style={{
                    width: '2rem',
                    height: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0.25rem 0',
                  }}
                />
              );
            })}
          </div>

          <div role="list" aria-label="Target items">
            {shuffledRightPairs.map((pair) => {
              const pairId = getPairId(pair, pairs.indexOf(pair));
              const isMatched = Array.from(connections.values()).includes(pairId);
              return (
                <div
                  key={pairId}
                  role="listitem"
                  data-testid={`right-item-${pairId}`}
                  data-connector-right={pairId}
                  tabIndex={selectedLeftId !== null ? 0 : -1}
                  aria-label={`Match with ${pair.itemB}`}
                  onClick={() => handleRightItemClick(pairId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRightItemClick(pairId);
                    }
                  }}
                  style={{
                    padding: '0.5rem',
                    margin: '0.25rem 0',
                    border: isMatched
                      ? '2px solid var(--oe-success, #22c55e)'
                      : '1px solid var(--oe-outline-variant, #d1d5db)',
                    borderRadius: '0.25rem',
                    cursor: selectedLeftId !== null ? 'pointer' : 'default',
                    backgroundColor: isMatched
                      ? 'var(--oe-success-container, #f0fdf4)'
                      : 'transparent',
                    opacity: isMatched ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{pair.itemB}</span>
                  {isMatched && <span style={{ color: 'var(--oe-success, #22c55e)' }}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>

        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          {connectorPositions.map((conn, i) => (
            <line
              key={`${conn.leftId}-${conn.rightId}-${i}`}
              x1={conn.x1}
              y1={conn.y1}
              x2={conn.x2}
              y2={conn.y2}
              stroke="var(--oe-primary, #3b82f6)"
              strokeWidth={2}
              strokeDasharray={conn.leftId === conn.rightId ? 'none' : '4 2'}
            />
          ))}
        </svg>
      </div>

      <div role="status" aria-live="polite" aria-atomic="true" style={{ marginTop: '0.5rem' }}>
        {connections.size > 0 && (
          <p data-testid="connections-status">
            {connections.size} of {pairs.length} pairs connected
          </p>
        )}
      </div>

      {!submitted && content.hints && content.hints.length > 0 && content.hints[hintIndex] && (
        <div
          role="status"
          aria-live="polite"
          style={{ marginTop: '0.5rem', color: 'var(--oe-on-surface-variant, #6b7280)' }}
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
          style={{ marginTop: '0.5rem', color: 'var(--oe-on-surface-variant, #6b7280)' }}
        >
          <p>{content.hint}</p>
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        {!submitted ? (
          <ThemedButton variant="primary" onClick={handleSubmit} disabled={!allLeftConnected}>
            Submit
          </ThemedButton>
        ) : null}
      </div>

      {submitted && (
        <div role="status" aria-live="assertive" data-testid="feedback">
          {Array.from(connections.entries()).every(([leftId, rightId]) => leftId === rightId) ? (
            <p>Correct! All pairs matched.</p>
          ) : (
            <p>Some pairs are not matched correctly.</p>
          )}
        </div>
      )}
    </div>
  );
}

const MatchingWidget: WidgetDefinition = {
  id: 'open-edu.matching',
  version: '0.1.0',
  render: MatchingComponent,
};

export { MatchingWidget as matching };
export default MatchingWidget;
