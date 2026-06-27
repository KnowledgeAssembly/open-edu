import { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import type { WidgetDefinition } from '../../types';
import { ThemedButton } from '../../themed-button';
import { useObserveMode } from '../../use-observe-mode';

export const gridAreaSchema = z.object({
  rows: z.number().min(1).max(20),
  cols: z.number().min(1).max(20),
  mode: z.enum(['area', 'perimeter']).default('area'),
  highlighted: z.array(z.object({ row: z.number(), col: z.number() })).optional(),
  interactive: z.boolean().optional().default(false),
  maxHighlights: z.number().min(1).optional(),
  cellSize: z.number().min(10).max(100).optional().default(40),
  showCount: z.boolean().optional().default(true),
  description: z.string().optional(),
});

export type GridAreaConfig = z.infer<typeof gridAreaSchema>;

type CellKey = `${number},${number}`;

function toKey(row: number, col: number): CellKey {
  return `${row},${col}`;
}

function parseKey(key: CellKey): { row: number; col: number } {
  const parts = key.split(',').map(Number);
  return { row: parts[0] ?? 0, col: parts[1] ?? 0 };
}

function computePerimeter(highlighted: Set<CellKey>): Set<CellKey> {
  const perimeter = new Set<CellKey>();
  for (const key of highlighted) {
    const { row, col } = parseKey(key);
    const hasEmptyNeighbor = [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ].some((pair) => !highlighted.has(toKey(pair[0]!, pair[1]!)));
    if (hasEmptyNeighbor) {
      perimeter.add(key);
    }
  }
  return perimeter;
}

function GridAreaComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number) => void;
}) {
  const { config: rawConfig, emitInteraction, complete } = props;
  const parsed = gridAreaSchema.safeParse(rawConfig);
  const config = parsed.success ? parsed.data : null;

  const expectedCells = useMemo(() => {
    if (!config) return new Set<CellKey>();
    return new Set<CellKey>((config.highlighted ?? []).map((c) => toKey(c.row, c.col)));
  }, [config]);

  const [highlighted, setHighlighted] = useState<Set<CellKey>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  const isObserve = !config?.interactive;

  const displayHighlighted = useMemo(() => {
    if (!config) return new Set<CellKey>();
    const source = isObserve ? expectedCells : highlighted;
    if (config.mode === 'perimeter') {
      return computePerimeter(source);
    }
    return source;
  }, [config, isObserve, expectedCells, highlighted]);

  const count = displayHighlighted.size;

  const expectedCount = useMemo(() => {
    if (!config) return 0;
    if (config.mode === 'perimeter') {
      return computePerimeter(expectedCells).size;
    }
    return expectedCells.size;
  }, [config, expectedCells]);

  const { acknowledged, handleAcknowledge: handleObserveAcknowledge, showAcknowledgeButton } = useObserveMode({
    isObserve: isObserve && !!config,
    onComplete: complete,
    onInteract: emitInteraction,
    widgetId: 'open-edu.grid-area',
  });

  const toggleCell = useCallback(
    (row: number, col: number) => {
      if (submitted || !config?.interactive) return;
      setHighlighted((prev) => {
        const next = new Set(prev);
        const key = toKey(row, col);
        if (next.has(key)) {
          next.delete(key);
        } else {
          if (config.maxHighlights && next.size >= config.maxHighlights) {
            return prev;
          }
          next.add(key);
        }
        return next;
      });
    },
    [submitted, config],
  );

  const handleSubmit = useCallback(() => {
    if (submitted || !config) return;
    const correct = count === expectedCount;

    emitInteraction({
      type: 'widget.interaction',
      action: 'submit',
      count,
      expected: expectedCount,
      correct,
      mode: config.mode,
      widgetId: 'open-edu.grid-area',
    });
    complete(correct ? 100 : 0);
    setSubmitted(true);
  }, [submitted, config, count, expectedCount, emitInteraction, complete]);

  if (!config) {
    return (
      <div role="alert" data-testid="widget-config-error" className="rounded-lg border border-error bg-error/10 p-md text-on-surface">
        <p className="font-semibold">Unable to load grid configuration</p>
        <p className="text-sm opacity-80">Please check the widget settings and try again.</p>
      </div>
    );
  }

  const cellSizePx = config.cellSize ?? 40;

  const renderGrid = () => {
    const cells: React.ReactNode[] = [];
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        const key = toKey(r, c);
        const isHighlighted = displayHighlighted.has(key);
        cells.push(
          <button
            key={key}
            role="gridcell"
            aria-label={`Row ${r + 1}, Column ${c + 1}${isHighlighted ? ', highlighted' : ''}`}
            aria-pressed={isHighlighted}
            onClick={() => toggleCell(r, c)}
            disabled={isObserve || submitted}
            data-highlighted={isHighlighted}
            style={{
              width: cellSizePx,
              height: cellSizePx,
              border: '1px solid #94a3b8',
              backgroundColor: isHighlighted ? '#3b82f6' : '#ffffff',
              cursor: config.interactive && !submitted ? 'pointer' : 'default',
              padding: 0,
              outline: 'none',
            }}
          />,
        );
      }
    }
    return cells;
  };

  const label = `Grid: ${config.rows} rows by ${config.cols} columns`;
  const modeLabel = config.mode === 'perimeter' ? 'Perimeter' : 'Area';

  return (
    <div data-testid="grid-area" aria-label={`${label}, ${modeLabel} mode`}>
      {config.description && <p>{config.description}</p>}

      <div
        role="grid"
        aria-label={label}
        data-rows={config.rows}
        data-cols={config.cols}
        style={{
          display: 'inline-grid',
          gridTemplateColumns: `repeat(${config.cols}, ${cellSizePx}px)`,
          gap: 0,
          border: '2px solid #475569',
        }}
      >
        {renderGrid()}
      </div>

      {config.showCount && !submitted && (
        <div role="status" aria-live="polite" aria-atomic="true" data-testid="count-display">
          <p>
            {modeLabel} count: {count}
          </p>
        </div>
      )}

      {config.interactive && !submitted && (
        <div style={{ marginTop: '0.5rem' }}>
          <ThemedButton variant="primary" onClick={handleSubmit} data-testid="submit-button">
            Submit
          </ThemedButton>
        </div>
      )}

      {showAcknowledgeButton && (
        <div role="status" aria-live="assertive" data-testid="observe-acknowledge-container">
          <ThemedButton variant="primary" onClick={handleObserveAcknowledge} data-testid="observe-acknowledge">
            Acknowledge
          </ThemedButton>
        </div>
      )}

      {!showAcknowledgeButton && acknowledged && (
        <div role="status" aria-live="assertive" data-testid="observe-complete">
          <p>Content acknowledged.</p>
        </div>
      )}

      {submitted && config.interactive && (
        <div role="status" aria-live="assertive" data-testid="feedback">
          {count === expectedCount ? (
            <p>
              Correct! The {modeLabel.toLowerCase()} count is {count}.
            </p>
          ) : (
            <p>
              Not quite. The correct {modeLabel.toLowerCase()} count is {expectedCount}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const GridAreaWidget: WidgetDefinition = {
  id: 'open-edu.grid-area',
  version: '0.1.0',
  render: GridAreaComponent,
};

export { GridAreaWidget as gridArea };
export default GridAreaWidget;
