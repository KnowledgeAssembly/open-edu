import { useEffect, useRef, useState } from 'react';

interface StatCounterProps {
  value: number;
  label: string;
  duration?: number;
  format?: (n: number) => string;
}

const DEFAULT_DURATION_MS = 1200;

export function StatCounter({
  value,
  label,
  duration = DEFAULT_DURATION_MS,
  format,
}: StatCounterProps): JSX.Element {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (duration <= 0) {
      setDisplay(value);
      return;
    }

    let start: number | null = null;

    const step = (timestamp: number): void => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) {
        rafRef.current = window.requestAnimationFrame(step);
      }
    };

    rafRef.current = window.requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [duration, value]);

  const formatted = format ? format(display) : String(display);

  return (
    <div data-testid="stat-counter" className="text-center">
      <span className="text-3xl font-bold">{formatted}</span>
      <span className="text-on-surface-variant mt-1 block text-sm">{label}</span>
    </div>
  );
}

StatCounter.displayName = 'StatCounter';
