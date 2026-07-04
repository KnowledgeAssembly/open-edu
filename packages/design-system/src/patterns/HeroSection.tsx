import * as React from 'react';
import { cn } from '../lib/utils.js';
import { AssemblyFlow } from '../primitives/assembly-flow.js';

export interface HeroSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function HeroSection({ children, className, ...props }: HeroSectionProps): JSX.Element {
  return (
    <div
      className={cn(
        'relative bg-gradient-to-br from-surface to-surface-variant',
        'py-xl px-lg overflow-hidden',
        className,
      )}
      data-testid="hero-section"
      {...props}
    >
      <AssemblyFlow density="dense" className="absolute inset-0 opacity-8" aria-hidden="true" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
