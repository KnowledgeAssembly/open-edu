import { useState, useCallback } from 'react';

export interface UseSvgZoomOptions {
  min?: number;
  max?: number;
  step?: number;
  initial?: number;
  onZoomChange?: (level: number) => void;
}

export interface UseSvgZoomResult {
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  setZoom: (level: number) => void;
  reset: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function useSvgZoom(options: UseSvgZoomOptions = {}): UseSvgZoomResult {
  const { min = 0.5, max = 3, step = 0.25, initial = 1, onZoomChange } = options;
  const [zoom, setZoomState] = useState<number>(initial);

  const setZoom = useCallback(
    (level: number) => {
      const clamped = clamp(level, min, max);
      setZoomState(clamped);
      onZoomChange?.(clamped);
    },
    [min, max, onZoomChange],
  );

  const zoomIn = useCallback(() => {
    setZoomState((prev) => {
      const next = clamp(prev + step, min, max);
      onZoomChange?.(next);
      return next;
    });
  }, [step, min, max, onZoomChange]);

  const zoomOut = useCallback(() => {
    setZoomState((prev) => {
      const next = clamp(prev - step, min, max);
      onZoomChange?.(next);
      return next;
    });
  }, [step, min, max, onZoomChange]);

  const reset = useCallback(() => {
    setZoomState(initial);
    onZoomChange?.(initial);
  }, [initial, onZoomChange]);

  return { zoom, zoomIn, zoomOut, setZoom, reset };
}
