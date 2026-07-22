import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseResizablePanelOptions {
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
  onWidthChange?: (width: number) => void;
}

export interface UseResizablePanelReturn {
  width: number;
  isDragging: boolean;
  handleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    tabIndex: number;
    role: string;
    'aria-label': string;
    'aria-valuemin': number;
    'aria-valuemax': number;
    'aria-valuenow': number;
    'aria-orientation': 'vertical';
  };
  panelStyle: { width: number };
}

export function useResizablePanel({
  initialWidth,
  minWidth,
  maxWidth,
  onWidthChange,
}: UseResizablePanelOptions): UseResizablePanelReturn {
  const [width, setWidth] = useState(initialWidth);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);
  const rafIdRef = useRef<number | null>(null);

  const clamp = useCallback(
    (value: number) => Math.max(minWidth, Math.min(maxWidth, value)),
    [minWidth, maxWidth],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(() => {
        const delta = e.clientX - startXRef.current;
        const newWidth = clamp(startWidthRef.current - delta);
        setWidth(newWidth);
      });
    },
    [clamp],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, [handleMouseMove]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startXRef.current = e.clientX;
      startWidthRef.current = width;
      setIsDragging(true);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    },
    [width, handleMouseMove, handleMouseUp],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 40 : 10;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setWidth((prev) => {
          const next = clamp(prev - step);
          onWidthChange?.(next);
          return next;
        });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setWidth((prev) => {
          const next = clamp(prev + step);
          onWidthChange?.(next);
          return next;
        });
      }
    },
    [clamp, onWidthChange],
  );

  useEffect(() => {
    if (!isDragging) {
      onWidthChange?.(width);
    }
  }, [width, isDragging, onWidthChange]);

  return {
    width,
    isDragging,
    handleProps: {
      onMouseDown: handleMouseDown,
      onKeyDown: handleKeyDown,
      tabIndex: 0,
      role: 'separator',
      'aria-label': 'Resize sidebar',
      'aria-valuemin': minWidth,
      'aria-valuemax': maxWidth,
      'aria-valuenow': width,
      'aria-orientation': 'vertical',
    },
    panelStyle: { width },
  };
}
