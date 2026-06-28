import type { ReactNode } from 'react';
import { cn } from '../lib/utils.js';

export interface DefinitionBlockProps {
  term: string;
  children: ReactNode;
  className?: string;
}

export function DefinitionBlock({ term, children, className }: DefinitionBlockProps): JSX.Element {
  return (
    <div
      data-testid="definition-block"
      className={cn('border-l-2 border-solid border-primary pl-4 py-1', className)}
    >
      <dt className="m-0 text-sm font-semibold text-on-surface">{term}</dt>
      <dd className="m-0 mt-1 text-sm text-on-surface-variant font-body-md leading-relaxed">
        {children}
      </dd>
    </div>
  );
}
