import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../lib/utils.js';

export interface ResizablePanelProps {
  left: ReactNode;
  right: ReactNode;
  defaultRatio?: number;
  minLeftPct?: number;
  minRightPx?: number;
  collapsed?: boolean;
  onCollapse?: () => void;
  onExpand?: () => void;
  onRatioChange?: (ratio: number) => void;
  leftClassName?: string;
  rightClassName?: string;
}

export function ResizablePanel({
  left,
  right,
  defaultRatio = 0.5,
  minLeftPct = 20,
  minRightPx = 300,
  collapsed = false,
  onCollapse: _onCollapse,
  onExpand: _onExpand,
  onRatioChange,
  leftClassName,
  rightClassName,
}: ResizablePanelProps): JSX.Element {
  const [ratio, setRatio] = useState(defaultRatio);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleTouchStart = useCallback(() => {
    dragging.current = true;
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    if (collapsed) return;

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newRatio = Math.max(
        minLeftPct / 100,
        Math.min(1 - minRightPx / rect.width, (e.clientX - rect.left) / rect.width),
      );
      setRatio(newRatio);
      onRatioChange?.(newRatio);
    };

    const handleTouchMove = (e: globalThis.TouchEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      if (!touch) return;
      const newRatio = Math.max(
        minLeftPct / 100,
        Math.min(1 - minRightPx / rect.width, (touch.clientX - rect.left) / rect.width),
      );
      setRatio(newRatio);
      onRatioChange?.(newRatio);
    };

    const handleUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [collapsed, minLeftPct, minRightPx, onRatioChange]);

  return (
    <div ref={containerRef} className="flex h-full w-full" data-testid="resizable-panel">
      <div
        data-testid="resizable-left"
        className={cn('overflow-auto', leftClassName)}
        style={{
          flex: collapsed ? '1 1 100%' : `0 0 ${ratio * 100}%`,
          minWidth: collapsed ? undefined : `${minLeftPct}%`,
        }}
      >
        {left}
      </div>
      {!collapsed && (
        <>
          <div
            role="separator"
            tabIndex={0}
            aria-label="Resize panels"
            aria-orientation="vertical"
            aria-valuenow={Math.round(ratio * 100)}
            className="bg-outline-variant hover:bg-primary active:bg-primary focus-visible:ring-primary flex w-1 shrink-0 cursor-col-resize items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onKeyDown={(e) => {
              const step = 0.02;
              if (e.key === 'ArrowLeft') {
                const newRatio = Math.max(minLeftPct / 100, ratio - step);
                setRatio(newRatio);
                onRatioChange?.(newRatio);
              } else if (e.key === 'ArrowRight') {
                const newRatio = Math.min(
                  1 - minRightPx / (containerRef.current?.getBoundingClientRect().width ?? 800),
                  ratio + step,
                );
                setRatio(newRatio);
                onRatioChange?.(newRatio);
              }
            }}
          >
            <div className="bg-on-surface-variant/30 h-8 w-0.5 rounded-full" />
          </div>
          <div
            data-testid="right-pane-container"
            className={cn('overflow-auto', rightClassName)}
            style={{ flex: `0 0 ${(1 - ratio) * 100}%`, minWidth: `${minRightPx}px` }}
          >
            {right}
          </div>
        </>
      )}
    </div>
  );
}
