import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import type { WidgetDefinition } from '../../types';

export const configSchema = z.object({
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  mode: z.enum(['read', 'set']).optional().default('read'),
  showDigital: z.boolean().optional().default(false),
  targetTime: z
    .object({
      hour: z.number().int().min(0).max(23),
      minute: z.number().int().min(0).max(59),
    })
    .optional(),
  interactive: z.boolean().optional().default(false),
  size: z.number().positive().optional().default(250),
});

export type ClockTimeConfig = z.infer<typeof configSchema>;

function to12(hour: number): number {
  const h = hour % 12;
  return h === 0 ? 12 : h;
}

function handAngle(hour: number, minute: number): { hourAngle: number; minuteAngle: number } {
  const hourAngle = ((hour % 12) * 30) + minute * 0.5;
  const minuteAngle = minute * 6;
  return { hourAngle, minuteAngle };
}

const HOUR_VALUES = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function polarX(cx: number, r: number, angleDeg: number): number {
  return cx + r * Math.sin((angleDeg * Math.PI) / 180);
}

function polarY(cx: number, r: number, angleDeg: number): number {
  return cx - r * Math.cos((angleDeg * Math.PI) / 180);
}

function ClockTimeComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number) => void;
}) {
  const { config: rawConfig, emitInteraction, complete } = props;
  const parsed = configSchema.safeParse(rawConfig);
  const config = parsed.success ? parsed.data : null;

  const [submitted, setSubmitted] = useState(false);
  const [currentHour, setCurrentHour] = useState(config?.hour ?? 12);
  const [currentMinute, setCurrentMinute] = useState(config?.minute ?? 0);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');

  const isInteractive = config?.interactive ?? false;
  const isObserve = config != null && !isInteractive;
  const isReadMode = config?.mode === 'read';
  const isSetMode = config?.mode === 'set';

  const size = config?.size ?? 250;
  const cx = size / 2;
  const cy = size / 2;
  const faceR = size * 0.42;
  const markerR = size * 0.36;
  const digitR = size * 0.29;

  const { hourAngle, minuteAngle } = handAngle(
    isSetMode ? currentHour : (config?.hour ?? 12),
    isSetMode ? currentMinute : (config?.minute ?? 0),
  );

  const displayHour = config != null ? to12(config.hour) : 12;
  const displayHour24 = config?.hour ?? 12;
  const displayMinute = config?.minute ?? 0;

  const displayHour12 = to12(isSetMode ? currentHour : displayHour24);
  const displayMinuteStr = String(isSetMode ? currentMinute : displayMinute).padStart(2, '0');
  const timeAnnouncement = isSetMode
    ? `${displayHour12}:${displayMinuteStr}`
    : `${to12(config?.hour ?? 12)}:${String(config?.minute ?? 0).padStart(2, '0')}`;

  useEffect(() => {
    if (isObserve && !submitted && config) {
      const timer = setTimeout(() => {
        emitInteraction({
          type: 'widget.interaction',
          widgetId: 'open-edu.clock-time',
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

  const handleReadClick = useCallback(
    (hourValue: number) => {
      if (!config || !isInteractive || !isReadMode || submitted) return;
      setSelectedHour(hourValue);
      const correct = hourValue === displayHour;
      const score = correct ? 100 : 0;
      setSubmitted(true);
      emitInteraction({
        type: 'widget.interaction',
        widgetId: 'open-edu.clock-time',
        action: 'submit',
        mode: 'read',
        selectedHour: hourValue,
        displayedHour: displayHour,
        correct,
      });
      complete(score);
    },
    [config, isInteractive, isReadMode, submitted, displayHour, emitInteraction, complete],
  );

  const handleSetSubmit = useCallback(() => {
    if (!config || !isInteractive || !isSetMode || submitted) return;
    const target = config.targetTime;
    if (!target) {
      setSubmitted(true);
      complete(100);
      return;
    }
    const hourCorrect = currentHour % 12 === target.hour % 12;
    const minuteDiff = Math.abs(currentMinute - target.minute);
    const minuteCorrect = minuteDiff <= 5;
    const score = hourCorrect && minuteCorrect ? 100 : 0;
    setSubmitted(true);
    emitInteraction({
      type: 'widget.interaction',
      widgetId: 'open-edu.clock-time',
      action: 'submit',
      mode: 'set',
      currentHour,
      currentMinute,
      targetHour: target.hour,
      targetMinute: target.minute,
      hourCorrect,
      minuteCorrect,
      score,
    });
    complete(score);
  }, [config, isInteractive, isSetMode, submitted, currentHour, currentMinute, emitInteraction, complete]);

  const cycleHour = useCallback(
    (dir: 1 | -1) => {
      setCurrentHour((h) => (h + dir + 24) % 24);
    },
    [],
  );

  const cycleMinute = useCallback(
    (dir: 1 | -1) => {
      setCurrentMinute((m) => (m + dir + 60) % 60);
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!config || !isInteractive || submitted) return;
      if (isSetMode) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (mode === 'hour') cycleHour(1);
          else cycleMinute(1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (mode === 'hour') cycleHour(-1);
          else cycleMinute(-1);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          setMode((m) => (m === 'hour' ? 'minute' : 'hour'));
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSetSubmit();
        }
      }
    },
    [config, isInteractive, submitted, isSetMode, mode, cycleHour, cycleMinute, handleSetSubmit],
  );

  if (!parsed.success || !config) {
    return (
      <div role="alert" data-testid="widget-config-error">
        <p>Invalid widget configuration.</p>
      </div>
    );
  }

  function renderClockFace() {
    const markers = HOUR_VALUES.map((hv, i) => {
      const angle = i * 30;
      const mx = polarX(cx, markerR, angle);
      const my = polarY(cx, markerR, angle);
      const dx = polarX(cx, digitR, angle);
      const dy = polarY(cx, digitR, angle);

      const isMarked =
        isReadMode &&
        isInteractive &&
        !submitted &&
        (selectedHour === hv);

      const isTargetRead =
        isReadMode &&
        isInteractive &&
        submitted &&
        hv === displayHour;

      const isWrongRead =
        isReadMode &&
        isInteractive &&
        submitted &&
        selectedHour === hv &&
        hv !== displayHour;

      return (
        <g key={hv}>
          <circle
            cx={mx}
            cy={my}
            r={4}
            fill={
              isMarked ? '#3b82f6' :
              isTargetRead ? '#10b981' :
              isWrongRead ? '#ef4444' :
              '#374151'
            }
            aria-hidden="true"
          />
          {interactiveClockPart() && (
            <text
              x={dx}
              y={dy}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={size * 0.055}
              fontWeight={
                (submitted && hv === displayHour) ? 'bold' : 'normal'
              }
              fill={
                isTargetRead ? '#10b981' :
                isWrongRead ? '#ef4444' :
                '#1f2937'
              }
              cursor={isReadMode && isInteractive && !submitted ? 'pointer' : 'default'}
              onClick={() => handleReadClick(hv)}
              aria-label={`${hv} o'clock`}
              data-testid={`hour-marker-${hv}`}
            >
              {hv}
            </text>
          )}
          {!interactiveClockPart() && (
            <text
              x={dx}
              y={dy}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={size * 0.055}
              fill="#1f2937"
              aria-hidden="true"
            >
              {hv}
            </text>
          )}
        </g>
      );
    });

    const hLen = faceR * 0.5;
    const mLen = faceR * 0.7;
    const hx = polarX(cx, hLen, hourAngle);
    const hy = polarY(cx, hLen, hourAngle);
    const mx = polarX(cx, mLen, minuteAngle);
    const my = polarY(cx, mLen, minuteAngle);

    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        data-testid="clock-svg"
        role="img"
        aria-label={`Analog clock showing ${timeAnnouncement}`}
        tabIndex={isInteractive && !submitted ? 0 : undefined}
        onKeyDown={isInteractive ? handleKeyDown : undefined}
      >
        <circle cx={cx} cy={cy} r={faceR} fill="#f9fafb" stroke="#9ca3af" strokeWidth={2} />
        {markers}
        <line
          x1={cx}
          y1={cy}
          x2={hx}
          y2={hy}
          stroke="#1f2937"
          strokeWidth={4}
          strokeLinecap="round"
          aria-hidden="true"
        />
        <line
          x1={cx}
          y1={cy}
          x2={mx}
          y2={my}
          stroke="#1f2937"
          strokeWidth={2.5}
          strokeLinecap="round"
          aria-hidden="true"
        />
        <circle cx={cx} cy={cy} r={5} fill="#1f2937" aria-hidden="true" />
      </svg>
    );
  }

  function interactiveClockPart() {
    return isReadMode || isSetMode;
  }

  return (
    <div
      data-testid="clock-time"
      aria-label={`Clock time widget showing ${timeAnnouncement}`}
      style={{ textAlign: 'center' }}
    >
      <div
        role="status"
        aria-live="polite"
        data-testid="time-live-region"
        aria-atomic="true"
      >
        {config.showDigital ? timeAnnouncement : ''}
      </div>

      {renderClockFace()}

      {isSetMode && isInteractive && !submitted && (
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: mode === 'hour' ? 'bold' : 'normal' }}>Hour</div>
            <button
              onClick={() => cycleHour(1)}
              data-testid="hour-up"
              aria-label="Increase hour"
            >
              ▲
            </button>
            <div data-testid="set-hour-display" style={{ fontSize: '1.2rem' }}>
              {displayHour12}
            </div>
            <button
              onClick={() => cycleHour(-1)}
              data-testid="hour-down"
              aria-label="Decrease hour"
            >
              ▼
            </button>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: mode === 'minute' ? 'bold' : 'normal' }}>Minute</div>
            <button
              onClick={() => cycleMinute(1)}
              data-testid="minute-up"
              aria-label="Increase minute"
            >
              ▲
            </button>
            <div data-testid="set-minute-display" style={{ fontSize: '1.2rem' }}>
              {String(currentMinute).padStart(2, '0')}
            </div>
            <button
              onClick={() => cycleMinute(-1)}
              data-testid="minute-down"
              aria-label="Decrease minute"
            >
              ▼
            </button>
          </div>
        </div>
      )}

      {isSetMode && isInteractive && !submitted && (
        <div style={{ marginTop: '0.75rem' }}>
          <button onClick={handleSetSubmit} data-testid="submit-btn">
            Submit
          </button>
          <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
            Tab to switch between hour/minute, arrow keys to adjust
          </span>
        </div>
      )}

      {isSetMode && isInteractive && submitted && (
        <div data-testid="feedback" role="status" aria-live="assertive">
          {config.targetTime
            ? (currentHour % 12 === config.targetTime.hour % 12 &&
                Math.abs(currentMinute - config.targetTime.minute) <= 5)
              ? 'Correct!'
              : `Not quite. Expected ${to12(config.targetTime.hour)}:${String(config.targetTime.minute).padStart(2, '0')}.`
            : 'Complete.'}
        </div>
      )}

      {isReadMode && isInteractive && submitted && (
        <div data-testid="feedback" role="status" aria-live="assertive">
          {selectedHour === displayHour ? 'Correct!' : `Not quite. The hour shown was ${displayHour}.`}
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

const ClockTimeWidget: WidgetDefinition = {
  id: 'open-edu.clock-time',
  version: '0.1.0',
  render: ClockTimeComponent,
};

export { ClockTimeWidget as clockTime };
export default ClockTimeWidget;