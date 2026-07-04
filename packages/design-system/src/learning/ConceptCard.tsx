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
      className={cn('bg-surface-container-low border-outline-variant w-full', className)}
    >
      <div className="flex items-start gap-4 p-5">
        {icon && (
          <span
            className="bg-primary-container text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <div className="flex-1 space-y-2">
          <h3 className="text-on-surface m-0 text-base font-semibold">{title}</h3>
          <div className="text-on-surface-variant font-body-md text-sm leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </Card>
  );
}
