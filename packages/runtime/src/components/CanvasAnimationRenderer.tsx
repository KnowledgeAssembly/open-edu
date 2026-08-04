import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AnimationConfig } from '@open-edu/schemas';
import { useTranslation } from '@open-edu/i18n';
import { useLiveRegion } from '@open-edu/accessibility';
import { Button } from '@open-edu/design-system';

export interface CanvasAnimationRendererProps {
  config: AnimationConfig;
  width?: number;
  height?: number;
  reducedMotion: boolean;
  className?: string;
  ariaLabel: string;
  speed?: number;
}

type SortingAlgorithm = 'bubble' | 'selection' | 'insertion';

function generateSortingSteps(
  algorithm: SortingAlgorithm,
  data: number[],
): Array<[number, number] | null> {
  const arr = [...data];
  const steps: Array<[number, number] | null> = [];
  const n = arr.length;

  if (algorithm === 'bubble') {
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        steps.push([j, j + 1]);
        const a = arr[j];
        const b = arr[j + 1];
        if (a !== undefined && b !== undefined && a > b) {
          arr[j] = b;
          arr[j + 1] = a;
        }
      }
    }
  } else if (algorithm === 'selection') {
    for (let i = 0; i < n - 1; i++) {
      let minIdx = i;
      for (let j = i + 1; j < n; j++) {
        steps.push([minIdx, j]);
        const a = arr[j];
        const b = arr[minIdx];
        if (a !== undefined && b !== undefined && a < b) {
          minIdx = j;
        }
      }
      if (minIdx !== i) {
        const a = arr[i];
        const b = arr[minIdx];
        if (a !== undefined && b !== undefined) {
          arr[i] = b;
          arr[minIdx] = a;
        }
      }
    }
  } else {
    for (let i = 1; i < n; i++) {
      let j = i;
      while (j > 0) {
        const a = arr[j];
        const b = arr[j - 1];
        if (a === undefined || b === undefined || a >= b) break;
        steps.push([j - 1, j]);
        arr[j] = b;
        arr[j - 1] = a;
        j--;
      }
    }
  }

  return steps;
}

export function CanvasAnimationRenderer({
  config,
  width = 400,
  height = 250,
  reducedMotion,
  className,
  ariaLabel,
  speed = 1,
}: CanvasAnimationRendererProps): JSX.Element {
  const { t } = useTranslation();
  const { announce } = useLiveRegion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);

  const algorithm: SortingAlgorithm =
    config.effects?.[0]?.effect === 'flow'
      ? 'bubble'
      : config.effects?.[0]?.effect === 'connect'
        ? 'selection'
        : 'insertion';

  const data = useMemo(
    () =>
      config.effects?.length
        ? config.effects.map((e) => e.step ?? Math.floor(Math.random() * 90) + 10)
        : [30, 50, 20, 80, 40, 60, 10, 70, 90],
    [config.effects],
  );

  const steps = useMemo(() => generateSortingSteps(algorithm, data), [algorithm, data]);
  const totalSteps = steps.length;

  const [colors, setColors] = useState<{ primary: string; warning: string }>({
    primary: '#6750a4',
    warning: '#f59e0b',
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const styles = getComputedStyle(document.documentElement);
    setColors({
      primary: styles.getPropertyValue('--oe-color-primary').trim() || '#6750a4',
      warning: styles.getPropertyValue('--oe-color-warning').trim() || '#f59e0b',
    });
  }, []);

  const drawFrame = useCallback(
    (comparing: [number, number] | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);

      const barWidth = width / data.length;
      const maxVal = Math.max(...data);

      data.forEach((val, i) => {
        const barHeight = (val / maxVal) * (height - 20);
        const x = i * barWidth;
        const y = height - barHeight;

        if (comparing && (i === comparing[0] || i === comparing[1])) {
          ctx.fillStyle = colors.warning;
        } else {
          ctx.fillStyle = colors.primary;
        }

        ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
      });
    },
    [data, width, height, colors],
  );

  useEffect(() => {
    if (reducedMotion) {
      drawFrame(null);
      return;
    }

    if (!playing) return;

    const delay = 200 / speed;
    const timer = setTimeout(() => {
      if (step < totalSteps) {
        const comparing = steps[step] ?? null;
        drawFrame(comparing);
        announce(
          t('runtime.canvas.comparing', {
            a: String(comparing?.[0] ?? 0),
            b: String(comparing?.[1] ?? 0),
          }),
        );
        setStep((s) => s + 1);
      } else {
        setPlaying(false);
        announce(t('runtime.canvas.sort_complete'));
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [playing, step, reducedMotion, speed, steps, totalSteps, drawFrame, announce, t]);

  const handlePlay = () => {
    if (step >= totalSteps) {
      setStep(0);
    }
    setPlaying(true);
  };

  const handlePause = () => setPlaying(false);

  const handleReset = () => {
    setPlaying(false);
    setStep(0);
    drawFrame(null);
  };

  const handleStep = () => {
    if (step < totalSteps) {
      const comparing = steps[step] ?? null;
      drawFrame(comparing);
      setStep((s) => s + 1);
    }
  };

  return (
    <div className={className} data-testid="canvas-animation-renderer">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel}
        className="border-outline-variant rounded-lg border"
      />
      {!reducedMotion && (
        <div
          role="group"
          aria-label={t('runtime.animation.controls')}
          className="mt-sm gap-xs flex items-center"
        >
          {playing ? (
            <Button variant="outline" size="sm" onClick={handlePause} data-testid="canvas-pause">
              {t('runtime.animation.pause')}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handlePlay} data-testid="canvas-play">
              {t('runtime.animation.play')}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleStep} data-testid="canvas-step">
            {t('runtime.animation.step_forward')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} data-testid="canvas-reset">
            {t('runtime.animation.reset')}
          </Button>
          <span className="text-on-surface-variant ml-sm text-xs">
            {t('runtime.canvas.step_of', {
              step: String(Math.min(step + 1, totalSteps)),
              total: String(totalSteps),
            })}
          </span>
        </div>
      )}
    </div>
  );
}
