import * as React from 'react';
import { cn } from '../lib/utils.js';

export interface CitationProps {
  source: string;
  children: React.ReactNode;
  className?: string;
}

export function Citation({ source, children, className }: CitationProps): JSX.Element {
  return (
    <div
      className={cn(
        'border-tertiary bg-surface-container-low border-l-2 px-4 py-2 text-sm',
        className,
      )}
      data-testid="citation"
    >
      <div className="text-on-surface-muted mb-1 text-xs font-medium">{source}</div>
      <div>{children}</div>
    </div>
  );
}
Citation.displayName = 'Citation';
