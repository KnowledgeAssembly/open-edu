import { cn } from '../lib/utils.js';

export interface ThinkingIndicatorProps {
  label?: string;
}

const dotClassName = 'w-2 h-2 rounded-full bg-on-surface-variant animate-bounce';

export function ThinkingIndicator({ label = 'Thinking...' }: ThinkingIndicatorProps): JSX.Element {
  return (
    <div className="flex items-center gap-2 px-4 py-2" data-testid="thinking-indicator">
      <div className="flex items-center gap-1">
        <span className={cn(dotClassName)} style={{ animationDelay: '0ms' }} />
        <span className={cn(dotClassName)} style={{ animationDelay: '150ms' }} />
        <span className={cn(dotClassName)} style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-on-surface-variant text-xs">{label}</span>
    </div>
  );
}

ThinkingIndicator.displayName = 'ThinkingIndicator';
