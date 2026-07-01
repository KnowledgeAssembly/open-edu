import { useState, useCallback } from 'react';
import { z } from 'zod';
import type { WidgetDefinition } from '../../types';
import { ThemedButton } from '../../themed-button';
import { useObserveMode } from '../../use-observe-mode';

const compareSchema = z.object({
  numerator: z.number().int().min(0),
  denominator: z.number().int().min(1),
});

export const fractionVisualSchema = z.object({
  numerator: z.number().int().min(0),
  denominator: z.number().int().min(1),
  mode: z.enum(['bar', 'circle']).optional().default('bar'),
  label: z.string().optional(),
  showLabel: z.boolean().optional().default(true),
  interactive: z.boolean().optional().default(false),
  compare: compareSchema.optional(),
  size: z.number().optional().default(200),
});

export type FractionVisualConfig = z.infer<typeof fractionVisualSchema>;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join('');
}

function computeComparison(n1: number, d1: number, n2: number, d2: number): '=' | '<' | '>' {
  const v1 = n1 / d1;
  const v2 = n2 / d2;
  if (v1 === v2) return '=';
  return v1 > v2 ? '>' : '<';
}

function segmentLabel(index: number, total: number): string {
  return `${index + 1} of ${total}`;
}

function countBits(mask: number): number {
  let count = 0;
  while (mask > 0) {
    count += mask & 1;
    mask >>= 1;
  }
  return count;
}

function FractionNotation({ numerator, denominator }: { numerator: number; denominator: number }) {
  return (
    <span
      className="inline-flex flex-col items-center leading-none"
      aria-label={`${numerator} over ${denominator}`}
    >
      <span className="border-b-2 border-on-surface px-1 text-lg font-semibold">{numerator}</span>
      <span className="px-1 text-lg font-semibold">{denominator}</span>
    </span>
  );
}

function FractionVisualComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number) => void;
}) {
  const { config: rawConfig, emitInteraction, complete } = props;
  const parsed = fractionVisualSchema.safeParse(rawConfig);
  const content = parsed.success ? parsed.data : null;
  const [submitted, setSubmitted] = useState(false);
  const [shadedMask, setShadedMask] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const isObserve = content && !content.interactive;
  const size = content?.size ?? 200;
  const mode = content?.mode ?? 'bar';

  const initialMask = content ? (1 << content.numerator) - 1 : 0;
  const effectiveMask = shadedMask ?? initialMask;
  const shadedCount = countBits(effectiveMask);

  const {
    acknowledged,
    handleAcknowledge: handleObserveAcknowledge,
    showAcknowledgeButton,
  } = useObserveMode({
    isObserve: !!isObserve,
    onComplete: complete,
    onInteract: emitInteraction,
    widgetId: 'open-edu.fraction-visual',
  });

  const handleSegmentClick = useCallback(
    (index: number) => {
      if (!content?.interactive || submitted || !content) return;
      setShadedMask((prev) => {
        const mask = prev ?? (1 << content.numerator) - 1;
        return mask ^ (1 << index);
      });
    },
    [content, submitted],
  );

  const handleSubmit = useCallback(() => {
    if (!content || submitted) return;
    const correct = shadedCount === content.numerator;
    const score = correct ? 100 : 0;
    emitInteraction({
      type: 'widget.interaction',
      action: 'submit',
      shaded: shadedCount,
      expected: content.numerator,
      correct,
      widgetId: 'open-edu.fraction-visual',
    });
    complete(score);
    setSubmitted(true);
  }, [content, submitted, shadedCount, emitInteraction, complete]);

  if (!parsed.success || !content) {
    return (
      <div
        role="alert"
        data-testid="widget-config-error"
        className="rounded-lg bg-error/10 border border-error/30 p-md text-on-surface"
      >
        <p className="font-semibold text-error">Invalid widget configuration.</p>
        <p className="text-sm text-on-surface/70 mt-xs">
          Please check the fraction settings and try again.
        </p>
      </div>
    );
  }

  if (content.denominator > 12) {
    return (
      <div data-testid="fraction-too-many">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md text-center">
          <p className="text-on-surface-variant">
            This fraction has too many parts to display visually.
          </p>
        </div>
      </div>
    );
  }

  const barHeight = Math.max(40, size / 4);

  function renderBarSvg(baseNum: number, den: number, interactive: boolean, svgTestId: string) {
    const segWidth = size / den;
    const mask = interactive ? effectiveMask : (1 << baseNum) - 1;
    const segs: React.ReactNode[] = [];

    for (let i = 0; i < den; i++) {
      const isShaded = (mask & (1 << i)) !== 0;
      const isHovered = hoverIndex === i;
      let fillColor = isShaded
        ? interactive
          ? 'var(--oe-color-primary, #3b82f6)'
          : 'var(--oe-color-primary-fixed-dim, #2563eb)'
        : 'var(--oe-color-surface-container-high, #f3f4f6)';
      if (interactive && isHovered) {
        fillColor = isShaded
          ? 'var(--oe-color-primary-container, #60a5fa)'
          : 'var(--oe-color-surface-variant, #e5e7eb)';
      }
      segs.push(
        <rect
          key={i}
          x={i * segWidth}
          y={0}
          width={segWidth + 0.5}
          height={barHeight}
          fill={fillColor}
          stroke="var(--oe-outline, #1e3a5f)"
          strokeWidth={1}
          data-testid="bar-segment"
          data-shaded={isShaded ? 'true' : 'false'}
          aria-label={`Segment ${segmentLabel(i, den)} ${isShaded ? 'shaded' : 'unshaded'}`}
          role={interactive ? 'button' : undefined}
          tabIndex={interactive ? 0 : undefined}
          onClick={interactive ? () => handleSegmentClick(i) : undefined}
          onMouseEnter={interactive ? () => setHoverIndex(i) : undefined}
          onMouseLeave={interactive ? () => setHoverIndex(null) : undefined}
          onKeyDown={
            interactive
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleSegmentClick(i);
                }
              : undefined
          }
          className={interactive ? 'cursor-pointer' : undefined}
        />,
      );
    }

    return (
      <svg
        width={size}
        height={barHeight}
        viewBox={`0 0 ${size} ${barHeight}`}
        data-testid={svgTestId}
        aria-label={`Fraction bar: ${baseNum}/${den}`}
        role="img"
      >
        {segs}
      </svg>
    );
  }

  function renderCircleSvg(baseNum: number, den: number, interactive: boolean, svgTestId: string) {
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 2;
    const anglePerSeg = 360 / den;
    const mask = interactive ? effectiveMask : (1 << baseNum) - 1;
    const segs: React.ReactNode[] = [];

    for (let i = 0; i < den; i++) {
      const startAngle = i * anglePerSeg;
      const endAngle = (i + 1) * anglePerSeg;
      const isShaded = (mask & (1 << i)) !== 0;
      const isHovered = hoverIndex === i;
      let fillColor = isShaded
        ? interactive
          ? 'var(--oe-color-primary, #3b82f6)'
          : 'var(--oe-color-primary-fixed-dim, #2563eb)'
        : 'var(--oe-color-surface-container-high, #f3f4f6)';
      if (interactive && isHovered) {
        fillColor = isShaded
          ? 'var(--oe-color-primary-container, #60a5fa)'
          : 'var(--oe-color-surface-variant, #e5e7eb)';
      }
      const d = describeArc(cx, cy, r, startAngle, endAngle);
      segs.push(
        <path
          key={i}
          d={d}
          fill={fillColor}
          stroke="var(--oe-outline, #1e3a5f)"
          strokeWidth={1}
          data-testid="circle-segment"
          data-shaded={isShaded ? 'true' : 'false'}
          aria-label={`Segment ${segmentLabel(i, den)} ${isShaded ? 'shaded' : 'unshaded'}`}
          role={interactive ? 'button' : undefined}
          tabIndex={interactive ? 0 : undefined}
          onClick={interactive ? () => handleSegmentClick(i) : undefined}
          onMouseEnter={interactive ? () => setHoverIndex(i) : undefined}
          onMouseLeave={interactive ? () => setHoverIndex(null) : undefined}
          onKeyDown={
            interactive
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleSegmentClick(i);
                }
              : undefined
          }
          className={interactive ? 'cursor-pointer' : undefined}
        />,
      );
    }

    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        data-testid={svgTestId}
        aria-label={`Fraction circle: ${baseNum}/${den}`}
        role="img"
      >
        {segs}
      </svg>
    );
  }

  function renderFraction(num: number, den: number, interactive: boolean, svgTestId: string) {
    if (mode === 'circle') {
      return renderCircleSvg(num, den, interactive, svgTestId);
    }
    return renderBarSvg(num, den, interactive, svgTestId);
  }

  const isInteractive = content.interactive ?? false;
  const displayIndex = `${content.numerator}/${content.denominator}`;

  if (content.compare) {
    const comparison = computeComparison(
      content.numerator,
      content.denominator,
      content.compare.numerator,
      content.compare.denominator,
    );
    return (
      <div
        data-testid="fraction-compare"
        style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}
      >
        <div style={{ textAlign: 'center' }}>
          {renderFraction(content.numerator, content.denominator, isInteractive, 'fraction-bar')}
          <div aria-label={`Fraction value: ${content.numerator}/${content.denominator}`}>
            <FractionNotation numerator={content.numerator} denominator={content.denominator} />
          </div>
        </div>
        <div
          style={{ fontSize: '2rem', fontWeight: 'bold' }}
          aria-label={`comparison: ${comparison}`}
        >
          {comparison}
        </div>
        <div style={{ textAlign: 'center' }}>
          {renderFraction(
            content.compare.numerator,
            content.compare.denominator,
            isInteractive,
            'fraction-bar',
          )}
          <div
            aria-label={`Fraction value: ${content.compare.numerator}/${content.compare.denominator}`}
          >
            <FractionNotation
              numerator={content.compare.numerator}
              denominator={content.compare.denominator}
            />
          </div>
        </div>
        {isInteractive && !submitted && (
          <div style={{ width: '100%', textAlign: 'center' }}>
            <ThemedButton
              variant="primary"
              onClick={handleSubmit}
              disabled={shadedCount === 0 && shadedMask === null}
            >
              Submit
            </ThemedButton>
          </div>
        )}
        {submitted && (
          <div data-testid="feedback" role="status" aria-live="assertive">
            {shadedCount === content.numerator ? (
              <p>Correct!</p>
            ) : (
              <p>
                You shaded {shadedCount} out of {content.numerator} segments.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-testid="fraction-visual" aria-label={`Fraction visual: ${displayIndex}`}>
      {content.showLabel !== false && content.label && <p>{content.label}</p>}

      <div role="status" aria-live="polite" data-testid="fraction-live-region" aria-atomic="true">
        <FractionNotation numerator={content.numerator} denominator={content.denominator} />
      </div>

      {renderFraction(content.numerator, content.denominator, isInteractive, `fraction-${mode}`)}

      {isInteractive && !submitted && (
        <div style={{ marginTop: '1rem' }}>
          <ThemedButton
            variant="primary"
            onClick={handleSubmit}
            disabled={shadedCount === 0 && shadedMask === null}
          >
            Submit
          </ThemedButton>
        </div>
      )}

      {isInteractive && submitted && (
        <div data-testid="feedback" role="status" aria-live="assertive">
          {shadedCount === content.numerator ? (
            <p>Correct!</p>
          ) : (
            <p>
              You shaded {shadedCount} out of {content.numerator} segments.
            </p>
          )}
        </div>
      )}

      {!isInteractive && showAcknowledgeButton && (
        <div
          role="status"
          aria-live="assertive"
          data-testid="observe-complete"
          style={{ marginTop: '1rem' }}
        >
          <ThemedButton
            variant="secondary"
            onClick={handleObserveAcknowledge}
            data-testid="observe-acknowledge"
          >
            Acknowledge
          </ThemedButton>
        </div>
      )}

      {!isInteractive && acknowledged && (
        <div
          role="status"
          aria-live="assertive"
          data-testid="observe-complete"
          style={{ marginTop: '1rem' }}
        >
          <p>Content acknowledged.</p>
        </div>
      )}
    </div>
  );
}

const FractionVisualWidget: WidgetDefinition = {
  id: 'open-edu.fraction-visual',
  version: '0.1.0',
  render: FractionVisualComponent,
};

export { FractionVisualWidget as fractionVisual };
export default FractionVisualWidget;
