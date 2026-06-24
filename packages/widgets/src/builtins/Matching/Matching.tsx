import { useState, useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';
import type { WidgetDefinition } from '../../types';

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

  const isObserve = content?.interactive !== true;
  const pairs = content?.pairs ?? [];

  const shuffledRightPairs = useMemo(() => {
    if (!content) return [];
    return shuffleArray(content.pairs);
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

  const handleLeftItemClick = useCallback(
    (pairId: string) => {
      if (submitted) return;
      setSelectedLeftId((prev) => (prev === pairId ? null : pairId));
    },
    [submitted],
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
      <div role="alert" data-testid="widget-config-error">
        <p>Invalid widget configuration.</p>
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
                    style={{ padding: '0.5rem', margin: '0.25rem 0' }}
                    aria-label={pair.itemA}
                  >
                    {pair.itemA}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                  >
                    ───
                  </div>
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
        {submitted && (
          <div role="status" aria-live="assertive" data-testid="observe-complete">
            <p>Observed.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-testid="matching" aria-label="Matching activity">
      {content.description && <p>{content.description}</p>}

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
                    ? '2px solid #3b82f6'
                    : isConnected
                      ? '2px solid #22c55e'
                      : '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#eff6ff' : isConnected ? '#f0fdf4' : 'transparent',
                }}
              >
                {pair.itemA}
                {isConnected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveConnection(pairId);
                    }}
                    style={{
                      marginLeft: '0.5rem',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      color: '#ef4444',
                    }}
                    aria-label={`Remove match for ${pair.itemA}`}
                  >
                    ✕
                  </button>
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
            const isConnected = connections.has(pairId);
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
                  color: isConnected ? '#22c55e' : '#d1d5db',
                }}
              >
                {isConnected ? '───' : '   '}
              </div>
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
                  border: isMatched ? '2px solid #22c55e' : '1px solid #d1d5db',
                  borderRadius: '0.25rem',
                  cursor: selectedLeftId !== null ? 'pointer' : 'default',
                  backgroundColor: isMatched ? '#f0fdf4' : 'transparent',
                  opacity: isMatched && selectedLeftId === null ? 0.7 : 1,
                }}
              >
                {pair.itemB}
              </div>
            );
          })}
        </div>
      </div>

      <div role="status" aria-live="polite" aria-atomic="true" style={{ marginTop: '0.5rem' }}>
        {connections.size > 0 && (
          <p data-testid="connections-status">
            {connections.size} of {pairs.length} pairs connected
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
          <button onClick={handleSubmit} disabled={!allLeftConnected}>
            Submit
          </button>
        ) : (
          <button disabled data-testid="result-display">
            {Array.from(connections.entries()).every(([leftId, rightId]) => leftId === rightId)
              ? 'Correct!'
              : 'Incorrect'}
          </button>
        )}
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
