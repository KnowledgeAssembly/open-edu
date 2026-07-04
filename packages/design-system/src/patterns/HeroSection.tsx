import * as React from 'react';
import { cn } from '../lib/utils.js';
import { AssemblyFlow } from '../primitives/assembly-flow.js';

export interface HeroSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function HeroSection({ children, className, ...props }: HeroSectionProps): JSX.Element {
  return (
    <div
      className={cn('relative overflow-hidden', 'px-10 py-12', className)}
      style={{
        background: 'linear-gradient(135deg, #f5f3f0 0%, #ede9e3 100%)',
      }}
      data-testid="hero-section"
      {...props}
    >
      <AssemblyFlow
        density="dense"
        className="absolute inset-0 opacity-[0.08]"
        aria-hidden="true"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
