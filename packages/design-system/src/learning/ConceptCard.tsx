import type { ReactNode } from 'react';
import { cn } from '../lib/utils.js';
import { Card } from '../primitives/card.js';

export interface ConceptCardProps {
  title: string;
  children: ReactNode;
  icon?: string;
  className?: string;
}

export function ConceptCard({ title, children, icon, className }: ConceptCardProps): JSX.Element {
  return (
    <Card
      data-testid="concept-card"
      className={cn('w-full bg-surface-container-low border-outline-variant', className)}
    >
      <div className="flex items-start gap-4 p-5">
        {icon && (
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-container text-xl text-primary"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <div className="flex-1 space-y-2">
          <h3 className="m-0 text-base font-semibold text-on-surface">{title}</h3>
          <div className="text-sm text-on-surface-variant font-body-md leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </Card>
  );
}
