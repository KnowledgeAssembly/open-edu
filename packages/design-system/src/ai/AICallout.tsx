import { type ReactNode } from 'react';
import { cn } from '../lib/utils.js';

export interface AICalloutProps {
  icon?: string;
  title: string;
  children: ReactNode;
}

export function AICallout({ icon, title, children }: AICalloutProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-md bg-tertiary-container border border-tertiary-container rounded-lg font-sans',
      )}
      data-testid="ai-callout"
      role="complementary"
      aria-label={title}
    >
      {icon && (
        <span
          className="shrink-0 w-6 h-6 flex items-center justify-center text-lg text-on-tertiary-container"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold m-0 mb-1 text-on-tertiary-container leading-tight">
          {title}
        </h3>
        <div className="text-sm text-on-tertiary-container leading-normal m-0">{children}</div>
      </div>
    </div>
  );
}

AICallout.displayName = 'AICallout';
