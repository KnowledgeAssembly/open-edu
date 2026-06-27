import { type ReactNode } from 'react';
import { FocusTrap } from '@open-edu/accessibility';

export interface WidgetCanvasProps {
  widgetId: string;
  widgetName?: string;
  children: ReactNode;
  minHeight?: number;
  className?: string;
  focusTrapActive?: boolean;
}

export function formatWidgetName(id: string): string {
  const name = id.split('.').pop() ?? id;
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function WidgetCanvas({
  widgetId,
  widgetName,
  children,
  minHeight = 200,
  className = '',
  focusTrapActive = false,
}: WidgetCanvasProps): JSX.Element {
  const displayName = widgetName ?? formatWidgetName(widgetId);

  return (
    <FocusTrap active={focusTrapActive}>
      <div
        role="region"
        aria-label={displayName}
        data-testid="widget-canvas"
        className={`rounded-xl border border-outline-variant bg-surface-container-lowest p-md ${className}`}
        style={{ minHeight: `${minHeight}px` }}
      >
        <div className="text-xs text-on-surface-variant font-medium uppercase tracking-wider mb-sm">
          {displayName}
        </div>
        {children}
      </div>
    </FocusTrap>
  );
}
