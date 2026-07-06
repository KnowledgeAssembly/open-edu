import * as React from 'react';
import { cn } from '../lib/utils.js';
import { AssemblyFlow } from '../primitives/assembly-flow.js';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  eyebrow?: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  className,
  ...props
}: PageHeaderProps): JSX.Element {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl px-10 py-12',
        'bg-gradient-to-br from-[var(--oe-color-surface-container-low)] to-[var(--oe-color-surface-container)]',
        className,
      )}
      data-testid="page-header"
      {...props}
    >
      <AssemblyFlow
        density="dense"
        className="absolute inset-0 opacity-[0.06]"
        aria-hidden="true"
      />
      <div className="relative z-10">
        {eyebrow && <span className="text-label-caps text-primary mb-sm block">{eyebrow}</span>}
        <h1 className="text-h1 font-display text-on-surface">{title}</h1>
        {subtitle && (
          <p className="text-body-reading text-on-surface-variant mt-sm max-w-prose">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
PageHeader.displayName = 'PageHeader';
