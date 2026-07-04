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
        'p-md bg-tertiary-container border-tertiary-container flex items-start gap-3 rounded-lg border font-sans',
      )}
      data-testid="ai-callout"
      role="complementary"
      aria-label={title}
    >
      {icon && (
        <span
          className="text-on-tertiary-container flex h-6 w-6 shrink-0 items-center justify-center text-lg"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="text-on-tertiary-container m-0 mb-1 text-sm font-semibold leading-tight">
          {title}
        </h3>
        <div className="text-on-tertiary-container m-0 text-sm leading-normal">{children}</div>
      </div>
    </div>
  );
}

AICallout.displayName = 'AICallout';
