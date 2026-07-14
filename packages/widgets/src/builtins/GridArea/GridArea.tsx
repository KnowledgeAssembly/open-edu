import { useState, useCallback, useMemo, useEffect } from 'react';
import { z } from 'zod';
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';
import { Button } from '@open-edu/design-system';
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

const GridAreaStateSchema = z.object({
  submitted: z.boolean(),
  highlighted: z.array(z.string()),
});

function GridAreaComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number, state?: unknown) => void;
  storedState?: unknown;
}) {
  const { config: rawConfig, emitInteraction, complete, storedState } = props;
  const parsed = gridAreaSchema.safeParse(rawConfig);
  const config = parsed.success ? parsed.data : null;

  const expectedCells = useMemo(() => {
    if (!config) return new Set<CellKey>();
    return new Set<CellKey>((config.highlighted ?? []).map((c) => toKey(c.row, c.col)));
  }, [config]);

  const parsedState = useMemo(() => {
    const result = GridAreaStateSchema.safeParse(storedState);
    return result.success ? result.data : null;
  }, [storedState]);

  const [highlighted, setHighlighted] = useState<Set<CellKey>>(
    () => new Set(parsedState?.highlighted as CellKey[] | undefined),
  );
  const [submitted, setSubmitted] = useState(parsedState?.submitted ?? false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);

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

  const {
    acknowledged,
    handleAcknowledge: handleObserveAcknowledge,
    showAcknowledgeButton,
  } = useObserveMode({
    isObserve: isObserve && !!config,
    onComplete: complete,
    onInteract: emitInteraction,
    widgetId: 'math.grid-area',
  });

  const totalCells = config ? config.rows * config.cols : 0;
  const isLargeGrid = totalCells > 100;

  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

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
            setStatusMessage(`Maximum ${config.maxHighlights} cells selected`);
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
      widgetId: 'math.grid-area',
    });
    complete(correct ? 100 : 0, { submitted: true, highlighted: Array.from(highlighted) });
    setSubmitted(true);
  }, [submitted, config, count, expectedCount, highlighted, emitInteraction, complete]);

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isLargeGrid || !config?.interactive || submitted) return;

      let currentRow: number;
      let currentCol: number;

      if (focusedCell) {
        currentRow = focusedCell.row;
        currentCol = focusedCell.col;
      } else {
        const active = document.activeElement;
        const cellKey = active?.getAttribute('data-cell-key');
        if (!cellKey) return;
        const parsed = parseKey(cellKey as CellKey);
        currentRow = parsed.row;
        currentCol = parsed.col;
      }

      let nextRow = currentRow;
      let nextCol = currentCol;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          nextRow = Math.max(0, currentRow - 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          nextRow = Math.min(config.rows - 1, currentRow + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          nextCol = Math.max(0, currentCol - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextCol = Math.min(config.cols - 1, currentCol + 1);
          break;
        default:
          return;
      }

      setFocusedCell({ row: nextRow, col: nextCol });
      const cellKey = toKey(nextRow, nextCol);
      const button = document.querySelector(
        `[data-cell-key="${cellKey}"]`,
      ) as HTMLButtonElement | null;
      button?.focus();
    },
    [isLargeGrid, config, submitted, focusedCell],
  );

  if (!config) {
    return (
      <div
        role="alert"
        data-testid="widget-config-error"
        className="border-outline-variant bg-surface-container-lowest p-md rounded-xl border text-center"
      >
        <p className="text-on-surface font-semibold">Unable to load grid configuration</p>
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
            data-cell-key={key}
            role="gridcell"
            aria-label={`Row ${r + 1}, Column ${c + 1}${isHighlighted ? ', highlighted' : ''}`}
            aria-pressed={isHighlighted}
            onClick={() => toggleCell(r, c)}
            onFocus={() => setFocusedCell({ row: r, col: c })}
            disabled={isObserve || submitted}
            data-highlighted={isHighlighted}
            className={`border-outline-variant border ${isHighlighted ? 'bg-primary' : 'bg-surface hover:bg-primary-container/30'} focus-visible:ring-primary transition-colors focus-visible:ring-2 focus-visible:ring-offset-2`}
            style={{
              width: cellSizePx,
              height: cellSizePx,
              cursor: config.interactive && !submitted ? 'pointer' : 'default',
              padding: 0,
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
        onKeyDown={handleGridKeyDown}
        style={{
          display: 'inline-grid',
          gridTemplateColumns: `repeat(${config.cols}, ${cellSizePx}px)`,
          gap: 0,
          border: '2px solid var(--oe-color-on-surface, #475569)',
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

      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          data-testid="max-highlights-message"
          className="text-on-surface-variant bg-surface-container-high p-xs mt-xs rounded text-sm"
        >
          {statusMessage}
        </div>
      )}

      {config.interactive && !submitted && (
        <div style={{ marginTop: '0.5rem' }}>
          <Button variant="default" onClick={handleSubmit} data-testid="submit-button">
            Submit
          </Button>
        </div>
      )}

      {showAcknowledgeButton && (
        <div role="status" aria-live="assertive" data-testid="observe-acknowledge-container">
          <Button
            variant="default"
            onClick={handleObserveAcknowledge}
            data-testid="observe-acknowledge"
          >
            Acknowledge
          </Button>
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

const GridAreaWidget: WidgetDefinitionV2 = {
  id: 'math.grid-area',
  name: 'Grid Area',
  description: 'Calculate and visualize area using grid models',
  domain: 'math',
  version: '1.0.0',
  render: GridAreaComponent,
  learningIntents: [LearningIntent.Practice, LearningIntent.Apply],
  capabilities: {
    supportsKeyboard: true,
    supportsScreenReader: true,
    supportsHints: true,
    supportsRetry: true,
    supportsScoring: true,
    supportsTouch: true,
    supportsMouse: true,
    supportsAnalytics: true,
    supportsRewards: true,
    supportsAccessibility: true,
    supportsOffline: true,
    supportsObserveMode: true,
  },
  accessibility: {
    highContrast: true,
    keyboardOnly: true,
    screenReader: true,
    tts: true,
    focusManagement: true,
    ariaSupport: true,
  },
  analytics: {
    trackAttempts: true,
    trackCompletionTime: true,
    trackSuccessRate: true,
    trackHints: true,
    trackRetries: true,
  },
  reward: { completionXP: 10, confetti: true, achievement: 'first-area' },
  ai: {
    difficulty: 'medium',
    estimatedMinutes: 4,
    bloomsLevel: 'apply',
    cognitiveLoad: 'moderate',
    subjectTags: ['math', 'geometry', 'area'],
    authoringPrompt: 'Create a grid-area calculation exercise',
    recommendedAge: [7, 12],
    readingLevel: 'grade-3',
    learningObjectives: [
      'Calculate the area of a shape by counting grid squares',
      'Understand area as the number of covered unit squares',
      'Distinguish between area and perimeter measurements',
    ],
    commonMisconceptions: [
      'Counting grid lines instead of grid squares',
      'Confusing perimeter count with area count',
      'Double-counting squares shared between adjacent shapes',
    ],
    generationHints: [
      'Keep grids under 10x10 for visual clarity',
      'Use maxHighlights to limit interactive cell selections',
      'Provide pre-highlighted shapes for observe/learn mode',
    ],
    exampleConfigs: [
      { rows: 5, cols: 5, highlights: [[0,0],[0,1],[1,0],[1,1]], mode: 'area' },
      { rows: 4, cols: 4, highlights: [[0,0],[0,1],[0,2],[1,0],[1,2],[2,0],[2,1],[2,2]], mode: 'perimeter' },
    ],
  },
  icon: 'grid-3x3',
  keywords: ['grid', 'area', 'math', 'geometry', '面积'],
  status: 'stable',
};

export { GridAreaWidget as gridArea };
export default GridAreaWidget;
