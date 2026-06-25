import { useState, useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';
import type { WidgetDefinition } from '../../types';

const CRORE_COLUMNS = ['Cr', 'TL', 'L', 'TTh', 'Th', 'H', 'T', 'O'] as const;
const LAKH_COLUMNS = ['L', 'TTh', 'Th', 'H', 'T', 'O'] as const;

const LABEL_MAP: Record<string, string> = {
  Cr: 'Crore',
  TL: 'Ten Lakh',
  L: 'Lakh',
  TTh: 'Ten Thousand',
  Th: 'Thousand',
  H: 'Hundred',
  T: 'Tens',
  O: 'Ones',
};

export const placeValueChartSchema = z.object({
  maxPlaces: z.enum(['lakh', 'crore']),
  digits: z.array(z.number().nullable()).optional(),
  targetNumber: z.number().optional(),
  interactive: z.boolean().optional().default(false),
  draggableDigits: z.array(z.number()).optional(),
  showLabels: z.boolean().optional().default(true),
  description: z.string().optional(),
});

function computeNumber(placed: (number | null)[]): number {
  let num = 0;
  let power = 0;
  for (let i = placed.length - 1; i >= 0; i--) {
    const d = placed[i];
    if (d !== null && d !== undefined) {
      num += d * Math.pow(10, power);
    }
    power++;
  }
  return num;
}

function rightAlignDigits(
  digits: (number | null | undefined)[],
  colCount: number,
): (number | null)[] {
  const result: (number | null)[] = new Array(colCount).fill(null);
  const offset = colCount - digits.length;
  for (let i = 0; i < digits.length; i++) {
    const idx = offset + i;
    if (idx >= 0) {
      const d = digits[i];
      result[idx] = d !== undefined ? d : null;
    }
  }
  return result;
}

function PlaceValueChartComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number) => void;
}) {
  const { config: rawConfig, emitInteraction, complete } = props;
  const parsed = useMemo(() => placeValueChartSchema.safeParse(rawConfig), [rawConfig]);
  const content = parsed.success ? parsed.data : null;

  const [submitted, setSubmitted] = useState(false);
  const [selectedDigit, setSelectedDigit] = useState<number | null>(null);

  const columns = content?.maxPlaces === 'crore' ? CRORE_COLUMNS : LAKH_COLUMNS;

  const colCount = columns.length;

  const [placedDigits, setPlacedDigits] = useState<(number | null)[]>(() => {
    if (!content?.digits) return new Array(colCount).fill(null);
    return rightAlignDigits(content.digits, colCount);
  });

  const isObserve = content && !content.interactive;
  const bankDigits = content?.draggableDigits ?? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  useEffect(() => {
    if (!isObserve || submitted || !content) return;
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
  }, [isObserve, submitted, content, emitInteraction, complete]);

  const handleSlotClick = useCallback(
    (index: number) => {
      if (submitted || isObserve) return;
      setPlacedDigits((prev) => {
        const current = prev[index];
        if (current !== null) {
          const next = [...prev];
          next[index] = null;
          return next;
        }
        if (selectedDigit !== null) {
          const next = [...prev];
          next[index] = selectedDigit;
          return next;
        }
        return prev;
      });
      if (selectedDigit !== null) {
        setSelectedDigit(null);
      }
    },
    [submitted, isObserve, selectedDigit],
  );

  const handleDigitSelect = useCallback(
    (digit: number) => {
      if (submitted || isObserve) return;
      setSelectedDigit((prev) => (prev === digit ? null : digit));
    },
    [submitted, isObserve],
  );

  const handleSubmit = useCallback(() => {
    if (!content || submitted) return;
    const placedNum = computeNumber(placedDigits);
    const expected = content.targetNumber;
    let correct = false;
    if (expected !== undefined) {
      correct = placedNum === expected;
    } else {
      correct = placedDigits.some((d) => d !== null);
    }
    const score = correct ? 100 : 0;
    emitInteraction({
      type: 'widget.interaction',
      action: 'submit',
      placedDigits,
      expected,
      placedNumber: placedNum,
      correct,
      widgetId: 'open-edu.place-value-chart',
    });
    complete(score);
    setSubmitted(true);
  }, [content, submitted, placedDigits, emitInteraction, complete]);

  if (!parsed.success || !content) {
    return (
      <div role="alert" data-testid="widget-config-error">
        <p>Invalid widget configuration.</p>
      </div>
    );
  }

  const isAllNull = placedDigits.every((d) => d === null);
  const hasTarget = content.targetNumber !== undefined;

  const displayDigits = isObserve
    ? content.digits
      ? rightAlignDigits(content.digits, colCount)
      : new Array(colCount).fill(null)
    : placedDigits;

  return (
    <div data-testid="place-value-chart" aria-label="Place value chart">
      {content.description && <p>{content.description}</p>}

      <div
        role="group"
        aria-label="Place value columns"
        style={{
          display: 'inline-flex',
          gap: '4px',
          padding: '12px',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          background: '#f9fafb',
        }}
      >
        {columns.map((col, i) => (
          <div
            key={col}
            data-testid={`column-${col}`}
            role="columnheader"
            aria-label={`${LABEL_MAP[col]} column`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              width: '56px',
            }}
          >
            {content.showLabels && (
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {LABEL_MAP[col]}
              </div>
            )}
            <div
              data-testid={`slot-${col}`}
              role={!isObserve ? 'button' : undefined}
              tabIndex={!isObserve ? 0 : undefined}
              aria-label={
                displayDigits[i] !== null
                  ? `${LABEL_MAP[col]}: ${displayDigits[i]}${!isObserve ? '. Click to remove' : ''}`
                  : `${LABEL_MAP[col]} slot empty${!isObserve ? '. Click to place a digit' : ''}`
              }
              aria-live={!isObserve ? 'polite' : undefined}
              onClick={() => handleSlotClick(i)}
              onKeyDown={(e) => {
                if (!isObserve && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleSlotClick(i);
                }
              }}
              style={{
                width: '48px',
                height: '56px',
                border:
                  displayDigits[i] !== null
                    ? '2px solid #3b82f6'
                    : selectedDigit !== null
                      ? '2px dashed #93c5fd'
                      : '2px solid #d1d5db',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 700,
                fontFamily: 'monospace',
                background: displayDigits[i] !== null ? '#eff6ff' : '#ffffff',
                cursor: isObserve ? 'default' : 'pointer',
                transition: 'all 0.1s ease',
              }}
            >
              {displayDigits[i] !== null ? displayDigits[i] : ''}
            </div>
          </div>
        ))}
      </div>

      {isObserve && submitted && (
        <div role="status" aria-live="assertive" data-testid="observe-complete">
          <p>Observed.</p>
        </div>
      )}

      {!isObserve && (
        <>
          <div
            role="group"
            aria-label="Digit bank"
            data-testid="digit-bank"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              marginTop: '12px',
              padding: '10px',
              border: '1px dashed #d1d5db',
              borderRadius: '8px',
              background: '#f9fafb',
              maxWidth: `${colCount * 60 + (colCount - 1) * 4 + 24}px`,
            }}
          >
            {bankDigits.map((digit) => {
              const isSelected = selectedDigit === digit;
              return (
                <div
                  key={digit}
                  data-testid={`bank-digit-${digit}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Digit ${digit}${isSelected ? ', selected' : ''}`}
                  aria-selected={isSelected}
                  onClick={() => handleDigitSelect(digit)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleDigitSelect(digit);
                    }
                  }}
                  style={{
                    width: '40px',
                    height: '44px',
                    border: isSelected ? '2px solid #3b82f6' : '1px solid #d1d5db',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    background: isSelected ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  {digit}
                </div>
              );
            })}
          </div>

          <div role="status" aria-live="polite" aria-atomic="true" style={{ marginTop: '8px' }}>
            {selectedDigit !== null && (
              <p data-testid="selected-digit-status">Selected digit: {selectedDigit}</p>
            )}
            {!isAllNull && selectedDigit === null && (
              <p data-testid="placement-status">Click a placed digit to remove it.</p>
            )}
          </div>

          <div style={{ marginTop: '12px' }}>
            {!submitted ? (
              <button onClick={handleSubmit} disabled={isAllNull}>
                Submit
              </button>
            ) : (
              <button disabled data-testid="result-display">
                {hasTarget && computeNumber(placedDigits) === content.targetNumber
                  ? 'Correct!'
                  : !hasTarget
                    ? 'Submitted'
                    : 'Incorrect'}
              </button>
            )}
          </div>

          {submitted && (
            <div role="status" aria-live="assertive" data-testid="feedback">
              {hasTarget ? (
                computeNumber(placedDigits) === content.targetNumber ? (
                  <p>Correct! The number matches.</p>
                ) : (
                  <p>
                    The number formed is {computeNumber(placedDigits)}
                    {content.targetNumber !== undefined
                      ? `, expected ${content.targetNumber}.`
                      : '.'}
                  </p>
                )
              ) : (
                <p>Number formed: {computeNumber(placedDigits)}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const PlaceValueChartWidget: WidgetDefinition = {
  id: 'open-edu.place-value-chart',
  version: '0.1.0',
  render: PlaceValueChartComponent,
};

export { PlaceValueChartWidget as placeValueChart };
export default PlaceValueChartWidget;
