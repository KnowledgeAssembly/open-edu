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
      className={cn('border-primary border-l-2 border-solid py-1 pl-4', className)}
    >
      <dl className="m-0">
        <dt className="text-on-surface m-0 text-sm font-semibold">{term}</dt>
        <dd className="text-on-surface-variant font-body-md m-0 mt-1 text-sm leading-relaxed">
          {children}
        </dd>
      </dl>
    </div>
  );
}
