import { useState, useEffect, useCallback, useRef } from 'react';
import { z } from 'zod';
import type { WidgetDefinition } from '../../types';

export const configSchema = z.object({
  type: z.enum(['ruler', 'thermometer', 'cylinder']),
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
  unit: z.string().min(1),
  interactive: z.boolean().optional().default(false),
  targetValue: z.number().optional(),
  showReading: z.boolean().optional().default(true),
  showLabels: z.boolean().optional().default(true),
  value: z.number().optional(),
  description: z.string().optional(),
});

export type MeasurementScaleConfig = z.infer<typeof configSchema>;

const WIDTH = 320;
const HEIGHT = 360;
const PADDING = 40;

function MeasurementScaleComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number) => void;
}) {
  const { config: rawConfig, emitInteraction, complete } = props;
  const parsed = configSchema.safeParse(rawConfig);
  const config = parsed.success ? parsed.data : (null as unknown as MeasurementScaleConfig);

  const [submitted, setSubmitted] = useState(false);
  const [value, setValue] = useState(config?.value ?? config?.min ?? 0);
  const containerRef = useRef<HTMLDivElement>(null);

  const isInteractive = config?.interactive ?? false;
  const isObserve = parsed.success && !isInteractive;

  useEffect(() => {
    if (isObserve && !submitted && config) {
      const timer = setTimeout(() => {
        emitInteraction({
          type: 'widget.interaction',
          widgetId: 'open-edu.measurement-scale',
          action: 'observe',
          observed: true,
          correct: true,
        });
        complete(100);
        setSubmitted(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isObserve, submitted, config, emitInteraction, complete]);

  const handleSubmit = useCallback(() => {
    if (!config || submitted) return;
    const target = config.targetValue;
    let correct = false;
    if (target != null) {
      const diff = Math.abs(value - target);
      correct = diff <= config.step;
    }
    const score = correct ? 100 : 0;
    emitInteraction({
      type: 'widget.interaction',
      widgetId: 'open-edu.measurement-scale',
      action: 'submit',
      value,
      targetValue: target,
      correct,
    });
    complete(score);
    setSubmitted(true);
  }, [config, submitted, value, emitInteraction, complete]);

  const clamp = useCallback(
    (v: number) => {
      if (!config) return v;
      const stepped = Math.round((v - config.min) / config.step) * config.step + config.min;
      return Math.min(config.max, Math.max(config.min, stepped));
    },
    [config],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!config || !isInteractive || submitted) return;
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const isVertical = config.type === 'thermometer' || config.type === 'cylinder';
      let pos: number;
      if (isVertical) {
        pos = 1 - (e.clientY - rect.top) / rect.height;
      } else {
        pos = (e.clientX - rect.left) / rect.width;
      }
      pos = Math.min(1, Math.max(0, pos));
      const range = config.max - config.min;
      setValue(clamp(config.min + pos * range));
    },
    [config, isInteractive, submitted, clamp],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!config || !isInteractive || submitted) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        e.preventDefault();
        setValue((v) => clamp(v + config.step));
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setValue((v) => clamp(v - config.step));
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [config, isInteractive, submitted, clamp, handleSubmit],
  );

  const currentReading = config ? `${value}${config.unit}` : '';

  if (!parsed.success || !config) {
    return (
      <div role="alert" data-testid="widget-config-error">
        <p>Invalid widget configuration.</p>
      </div>
    );
  }

  const cfg: MeasurementScaleConfig = config;

  function getTickInterval(): number {
    const range = cfg.max - cfg.min;
    if (range <= 0) return 1;
    const ideal = range / 10;
    const magnitude = Math.pow(10, Math.floor(Math.log10(ideal)));
    const residual = ideal / magnitude;
    let nice: number;
    if (residual <= 1.5) nice = 1;
    else if (residual <= 3.5) nice = 2;
    else if (residual <= 7.5) nice = 5;
    else nice = 10;
    return nice * magnitude;
  }

  function renderRuler() {
    const svgW = WIDTH;
    const svgH = 120;
    const rulerY = 60;
    const rulerH = 40;
    const tickInterval = getTickInterval();
    const range = cfg.max - cfg.min;
    const usable = svgW - PADDING * 2;

    const ticks: React.ReactNode[] = [];
    for (let v = cfg.min; v <= cfg.max + 0.0001; v += tickInterval) {
      const frac = (v - cfg.min) / range;
      const x = PADDING + frac * usable;
      const isMajor = Math.abs(v - Math.round(v / tickInterval) * tickInterval) < 0.0001;
      const tickH = isMajor ? 16 : 8;
      ticks.push(
        <line
          key={`tick-${v}`}
          x1={x}
          y1={rulerY}
          x2={x}
          y2={rulerY + tickH}
          stroke="#374151"
          strokeWidth={isMajor ? 2 : 1}
          aria-hidden="true"
        />,
      );
      if (isMajor && cfg.showLabels) {
        ticks.push(
          <text
            key={`label-${v}`}
            x={x}
            y={rulerY + 32}
            textAnchor="middle"
            fontSize={11}
            fill="#374151"
            aria-hidden="true"
          >
            {v}
          </text>,
        );
      }
    }

    const markerFrac = (value - cfg.min) / range;
    const markerX = PADDING + markerFrac * usable;

    return (
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        data-testid="ruler-svg"
        role="img"
        aria-label={`Ruler scale from ${cfg.min} to ${cfg.max} ${cfg.unit}`}
        style={{ cursor: isInteractive && !submitted ? 'pointer' : 'default' }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={isInteractive && !submitted ? 0 : undefined}
      >
        <rect
          x={PADDING}
          y={rulerY}
          width={usable}
          height={rulerH}
          fill="#f9fafb"
          stroke="#9ca3af"
          strokeWidth={1}
          rx={4}
        />
        {ticks}
        <line
          x1={markerX}
          y1={rulerY - 8}
          x2={markerX}
          y2={rulerY + rulerH + 4}
          stroke={submitted ? '#10b981' : '#ef4444'}
          strokeWidth={3}
          strokeLinecap="round"
          aria-hidden="true"
        />
        <polygon
          points={`${markerX - 6},${rulerY - 8} ${markerX + 6},${rulerY - 8} ${markerX},${rulerY - 16}`}
          fill={submitted ? '#10b981' : '#ef4444'}
          aria-hidden="true"
        />
      </svg>
    );
  }

  function renderThermometer() {
    const svgW = 160;
    const svgH = HEIGHT;
    const bulbCY = svgH - 50;
    const bulbR = 20;
    const tubeX = svgW / 2;
    const tubeTopY = 60;
    const tubeBotY = bulbCY - bulbR;
    const tubeLen = tubeBotY - tubeTopY;
    const tickInterval = getTickInterval();
    const range = cfg.max - cfg.min;

    const ticks: React.ReactNode[] = [];
    for (let v = cfg.min; v <= cfg.max + 0.0001; v += tickInterval) {
      const frac = (v - cfg.min) / range;
      const y = tubeBotY - frac * tubeLen;
      const isMajor = Math.abs(v - Math.round(v / tickInterval) * tickInterval) < 0.0001;
      const tickW = isMajor ? 12 : 6;
      ticks.push(
        <line
          key={`tick-${v}`}
          x1={tubeX - tickW}
          y1={y}
          x2={tubeX}
          y2={y}
          stroke="#374151"
          strokeWidth={isMajor ? 2 : 1}
          aria-hidden="true"
        />,
      );
      if (isMajor && cfg.showLabels) {
        ticks.push(
          <text
            key={`label-${v}`}
            x={tubeX - tickW - 4}
            y={y + 4}
            textAnchor="end"
            fontSize={11}
            fill="#374151"
            aria-hidden="true"
          >
            {v}
          </text>,
        );
      }
    }

    const markerFrac = (value - cfg.min) / range;
    const fillHeight = markerFrac * tubeLen;

    return (
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        data-testid="thermometer-svg"
        role="img"
        aria-label={`Thermometer scale from ${cfg.min} to ${cfg.max} ${cfg.unit}`}
        style={{ cursor: isInteractive && !submitted ? 'pointer' : 'default' }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={isInteractive && !submitted ? 0 : undefined}
      >
        <rect
          x={tubeX - 8}
          y={tubeTopY}
          width={16}
          height={tubeLen}
          fill="#f3f4f6"
          stroke="#9ca3af"
          strokeWidth={1}
          rx={8}
        />
        <rect
          x={tubeX - 6}
          y={tubeBotY - fillHeight}
          width={12}
          height={fillHeight}
          fill={submitted ? '#10b981' : '#ef4444'}
          rx={6}
          aria-hidden="true"
        />
        <circle
          cx={tubeX}
          cy={bulbCY}
          r={bulbR}
          fill={submitted ? '#10b981' : '#ef4444'}
          stroke="#9ca3af"
          strokeWidth={1}
          aria-hidden="true"
        />
        {ticks}
      </svg>
    );
  }

  function renderCylinder() {
    const svgW = 180;
    const svgH = HEIGHT;
    const cx = svgW / 2;
    const cylTop = 60;
    const cylBot = svgH - 60;
    const cylH = cylBot - cylTop;
    const cylW = 80;
    const tickInterval = getTickInterval();
    const range = cfg.max - cfg.min;

    const ticks: React.ReactNode[] = [];
    for (let v = cfg.min; v <= cfg.max + 0.0001; v += tickInterval) {
      const frac = (v - cfg.min) / range;
      const y = cylBot - frac * cylH;
      const isMajor = Math.abs(v - Math.round(v / tickInterval) * tickInterval) < 0.0001;
      const tickW = isMajor ? 12 : 6;
      ticks.push(
        <line
          key={`tick-${v}`}
          x1={cx + cylW / 2}
          y1={y}
          x2={cx + cylW / 2 + tickW}
          y2={y}
          stroke="#374151"
          strokeWidth={isMajor ? 2 : 1}
          aria-hidden="true"
        />,
      );
      if (isMajor && cfg.showLabels) {
        ticks.push(
          <text
            key={`label-${v}`}
            x={cx + cylW / 2 + tickW + 4}
            y={y + 4}
            textAnchor="start"
            fontSize={11}
            fill="#374151"
            aria-hidden="true"
          >
            {v}
          </text>,
        );
      }
    }

    const markerFrac = (value - cfg.min) / range;
    const fillHeight = markerFrac * cylH;

    return (
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        data-testid="cylinder-svg"
        role="img"
        aria-label={`Graduated cylinder scale from ${cfg.min} to ${cfg.max} ${cfg.unit}`}
        style={{ cursor: isInteractive && !submitted ? 'pointer' : 'default' }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={isInteractive && !submitted ? 0 : undefined}
      >
        <ellipse
          cx={cx}
          cy={cylTop}
          rx={cylW / 2}
          ry={10}
          fill="#e5e7eb"
          stroke="#9ca3af"
          strokeWidth={1}
        />
        <rect
          x={cx - cylW / 2}
          y={cylTop}
          width={cylW}
          height={cylH}
          fill="none"
          stroke="#9ca3af"
          strokeWidth={1}
        />
        <rect
          x={cx - cylW / 2 + 2}
          y={cylBot - fillHeight}
          width={cylW - 4}
          height={fillHeight}
          fill={submitted ? '#10b981' : '#60a5fa'}
          opacity={0.6}
          aria-hidden="true"
        />
        <ellipse
          cx={cx}
          cy={cylBot}
          rx={cylW / 2}
          ry={10}
          fill={submitted ? '#10b981' : '#60a5fa'}
          opacity={0.6}
          aria-hidden="true"
        />
        <ellipse
          cx={cx}
          cy={cylTop}
          rx={cylW / 2}
          ry={10}
          fill="none"
          stroke="#9ca3af"
          strokeWidth={1}
        />
        {ticks}
      </svg>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="measurement-scale"
      aria-label={`Measurement scale: ${cfg.type}`}
      style={{ textAlign: 'center' }}
    >
      {cfg.description && <p>{cfg.description}</p>}

      <div role="status" aria-live="polite" data-testid="reading-live-region" aria-atomic="true">
        {cfg.showReading ? currentReading : ''}
      </div>

      {cfg.type === 'ruler' && renderRuler()}
      {cfg.type === 'thermometer' && renderThermometer()}
      {cfg.type === 'cylinder' && renderCylinder()}

      {isInteractive && !submitted && (
        <div style={{ marginTop: '0.75rem' }}>
          <button onClick={handleSubmit} data-testid="submit-btn">
            Submit
          </button>
        </div>
      )}

      {isInteractive && submitted && (
        <div data-testid="feedback" role="status" aria-live="assertive">
          {value != null && cfg.targetValue != null
            ? Math.abs(value - cfg.targetValue) <= cfg.step
              ? 'Correct!'
              : `Not quite. Expected ${cfg.targetValue}${cfg.unit}.`
            : 'Complete.'}
        </div>
      )}

      {isObserve && submitted && (
        <div role="status" aria-live="assertive" data-testid="observe-complete">
          <p>Observed.</p>
        </div>
      )}
    </div>
  );
}

const MeasurementScaleWidget: WidgetDefinition = {
  id: 'open-edu.measurement-scale',
  version: '0.1.0',
  render: MeasurementScaleComponent,
};

export { MeasurementScaleWidget as measurementScale };
export default MeasurementScaleWidget;
