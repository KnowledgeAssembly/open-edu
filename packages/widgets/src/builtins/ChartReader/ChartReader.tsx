import { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import type { WidgetDefinitionV2 } from '../../types';
import { LearningIntent } from '../../metadata/learning-intents';
import { Button } from '@open-edu/design-system';
import { useObserveMode } from '../../use-observe-mode';

const dataItemSchema = z.object({
  label: z.string().min(1),
  value: z.number().int().nonnegative(),
  emoji: z.string().optional(),
});

const configSchema = z
  .discriminatedUnion('type', [
    z.object({
      type: z.literal('bar'),
      data: z.array(dataItemSchema).min(1),
      title: z.string().optional(),
      showValues: z.boolean().optional().default(true),
      interactive: z.boolean().optional().default(false),
      correctLabel: z.string().optional(),
      description: z.string().optional(),
    }),
    z.object({
      type: z.literal('pictograph'),
      data: z.array(dataItemSchema).min(1),
      title: z.string().optional(),
      showValues: z.boolean().optional().default(true),
      interactive: z.boolean().optional().default(false),
      correctLabel: z.string().optional(),
      description: z.string().optional(),
    }),
  ])
  .refine(
    (val) => {
      if (val.interactive && !val.correctLabel) return false;
      return true;
    },
    { message: 'correctLabel is required when interactive is true' },
  );

const ChartReaderStateSchema = z.object({
  submitted: z.boolean(),
});

function ChartReaderComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number, state?: unknown) => void;
  storedState?: unknown;
}) {
  const { config: rawConfig, emitInteraction, complete, storedState } = props;
  const parsed = configSchema.safeParse(rawConfig);

  const parsedState = useMemo(() => {
    const result = ChartReaderStateSchema.safeParse(storedState);
    return result.success ? result.data : null;
  }, [storedState]);

  const [submitted, setSubmitted] = useState(parsedState?.submitted ?? false);

  const isObserve = parsed.success && !parsed.data.interactive && !parsed.data.correctLabel;
  const isInteractive = parsed.success && parsed.data.interactive && !!parsed.data.correctLabel;

  const { handleAcknowledge: handleObserveAcknowledge, showAcknowledgeButton } = useObserveMode({
    isObserve,
    onComplete: complete,
    onInteract: emitInteraction,
    widgetId: 'core.chart-reader',
  });

  const handleSelect = useCallback(
    (label: string) => {
      if (submitted || !parsed.success || !parsed.data.correctLabel) return;
      const isCorrect = label === parsed.data.correctLabel;
      const score = isCorrect ? 100 : 0;
      emitInteraction({
        type: 'widget.interaction',
        widgetId: 'core.chart-reader',
        action: 'select',
        selectedLabel: label,
        correct: isCorrect,
      });
      complete(score, { submitted: true });
      setSubmitted(true);
    },
    [submitted, parsed, emitInteraction, complete],
  );

  if (!parsed.success) {
    return (
      <div
        role="alert"
        data-testid="widget-config-error"
        className="bg-error-container text-on-error-container p-md rounded-lg"
      >
        <p className="font-semibold">Chart configuration is invalid</p>
        <p className="mt-xs text-sm opacity-80">
          {parsed.error.issues.map((i) => i.message).join('; ')}
        </p>
      </div>
    );
  }

  const config = parsed.data;

  return (
    <div role="group" aria-label={config.title ?? 'Chart'} data-testid="chart-reader">
      {config.title && <h3>{config.title}</h3>}
      {config.description && <p>{config.description}</p>}

      {config.type === 'bar' ? (
        <BarChart
          data={config.data}
          showValues={config.showValues}
          interactive={isInteractive}
          submitted={submitted}
          onSelect={handleSelect}
        />
      ) : (
        <PictographChart
          data={config.data}
          showValues={config.showValues}
          interactive={isInteractive}
          submitted={submitted}
          onSelect={handleSelect}
        />
      )}

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
      {!showAcknowledgeButton && (submitted || isObserve) && (
        <div role="status" aria-live="assertive" data-testid="chart-submitted">
          <p>Content acknowledged.</p>
        </div>
      )}
    </div>
  );
}

function BarChart({
  data,
  showValues,
  interactive,
  submitted,
  onSelect,
}: {
  data: z.infer<typeof dataItemSchema>[];
  showValues: boolean;
  interactive: boolean;
  submitted: boolean;
  onSelect: (label: string) => void;
}) {
  const maxValue = Math.max(...data.map((d) => d.value));
  const barWidth = 60;
  const gap = 40;
  const chartHeight = 200;
  const labelHeight = 30;
  const padding = { top: 20, right: 20, bottom: labelHeight + 20, left: 40 };
  const svgWidth = data.length * (barWidth + gap) + padding.left + padding.right;
  const svgHeight = chartHeight + padding.top + padding.bottom;
  const chartBottom = chartHeight + padding.top;

  return (
    <svg
      role="img"
      aria-label="Bar chart"
      width={svgWidth}
      height={svgHeight}
      data-testid="bar-chart"
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      {maxValue > 0 && (
        <g>
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = chartBottom - frac * chartHeight;
            return (
              <g key={frac}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="var(--oe-color-outline-variant, #e5e7eb)"
                  strokeWidth={1}
                />
                <text
                  x={padding.left - 6}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={12}
                  fill="var(--oe-color-on-surface-variant, #6b7280)"
                >
                  {Math.round(maxValue * frac)}
                </text>
              </g>
            );
          })}
        </g>
      )}

      {data.map((item, idx) => {
        const barHeight = maxValue > 0 ? (item.value / maxValue) * chartHeight : 0;
        const x = padding.left + idx * (barWidth + gap);
        const y = chartBottom - barHeight;

        const barContent = (
          <g>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill="var(--oe-color-primary, #3b82f6)"
              rx={4}
              aria-label={`${item.label}: ${item.value}`}
              role={interactive && !submitted ? 'button' : 'graphics-symbol'}
              tabIndex={interactive && !submitted ? 0 : undefined}
              style={{ cursor: interactive && !submitted ? 'pointer' : undefined }}
              onKeyDown={
                interactive && !submitted
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect(item.label);
                      }
                    }
                  : undefined
              }
            />
            {barHeight > 20 && showValues && (
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize={12}
                fill="var(--oe-color-on-surface, #374151)"
                data-testid={`bar-value-${item.label}`}
              >
                {item.value}
              </text>
            )}
            <text
              x={x + barWidth / 2}
              y={chartBottom + 16}
              textAnchor="middle"
              fontSize={12}
              fill="var(--oe-color-on-surface, #374151)"
            >
              {item.label}
            </text>
          </g>
        );

        return (
          <g
            key={item.label}
            {...(interactive && !submitted ? { onClick: () => onSelect(item.label) } : {})}
          >
            {barContent}
          </g>
        );
      })}
    </svg>
  );
}

function PictographChart({
  data,
  showValues,
  interactive,
  submitted,
  onSelect,
}: {
  data: z.infer<typeof dataItemSchema>[];
  showValues: boolean;
  interactive: boolean;
  submitted: boolean;
  onSelect: (label: string) => void;
}) {
  return (
    <div role="img" aria-label="Pictograph chart" data-testid="pictograph-chart">
      {data.map((item) => {
        const emoji = item.emoji ?? '★';
        const RowTag = interactive && !submitted ? 'button' : 'div';

        return (
          <RowTag
            key={item.label}
            data-testid={`pictograph-row-${item.label}`}
            role={interactive && !submitted ? 'button' : undefined}
            aria-label={`${item.label}: ${item.value}`}
            onClick={interactive && !submitted ? () => onSelect(item.label) : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: '0.5rem 0',
              cursor: interactive && !submitted ? 'pointer' : undefined,
              border: interactive && !submitted ? '1px solid transparent' : undefined,
              borderRadius: '0.5rem',
              padding: '0.25rem 0.5rem',
              background: 'none',
              fontSize: 'inherit',
              fontFamily: 'inherit',
              textAlign: 'left',
              width: '100%',
            }}
            onKeyDown={
              interactive && !submitted
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(item.label);
                    }
                  }
                : undefined
            }
          >
            <span style={{ minWidth: '5rem', fontWeight: 500 }}>{item.label}</span>
            <span data-testid={`pictograph-emojis-${item.label}`}>
              {Array.from({ length: item.value }, (_, i) => (
                <span key={i} role="img" aria-hidden="true">
                  {emoji}
                </span>
              ))}
            </span>
            {showValues && (
              <span
                style={{
                  marginLeft: '0.5rem',
                  color: 'var(--oe-color-on-surface-variant, #6b7280)',
                }}
              >
                {item.value}
              </span>
            )}
          </RowTag>
        );
      })}
    </div>
  );
}

const ChartReaderWidget: WidgetDefinitionV2 = {
  id: 'core.chart-reader',
  name: 'Chart Reader',
  description: 'Read and interpret charts, graphs, and data visualizations',
  domain: 'core',
  version: '0.1.0',
  render: ChartReaderComponent,
  learningIntents: [LearningIntent.Observe, LearningIntent.Apply],
  capabilities: {
    supportsKeyboard: true, supportsScreenReader: true, supportsHints: true,
    supportsRetry: true, supportsScoring: true, supportsTouch: true,
    supportsMouse: true, supportsAnalytics: true, supportsRewards: true,
    supportsAccessibility: true, supportsOffline: true,
  },
  accessibility: {
    highContrast: true, keyboardOnly: true, screenReader: true, tts: true,
    focusManagement: true, ariaSupport: true,
  },
  analytics: {
    trackAttempts: true, trackCompletionTime: true, trackSuccessRate: true,
  },
  reward: { completionXP: 10, confetti: true },
  ai: {
    difficulty: 'medium', estimatedMinutes: 4, bloomsLevel: 'understand',
    cognitiveLoad: 'moderate', subjectTags: ['math', 'data'],
    authoringPrompt: 'Create a chart-reading exercise with bar or line charts',
  },
  icon: 'bar-chart-2',
  keywords: ['chart', 'graph', 'data', 'read'],
  status: 'stable',
};

export { ChartReaderWidget as chartReader };
export default ChartReaderWidget;
