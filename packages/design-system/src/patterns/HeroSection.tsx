import * as React from 'react';
import { cn } from '../lib/utils.js';
import { AssemblyFlow } from '../primitives/assembly-flow.js';
import { OpenModule } from '../primitives/open-module.js';

export interface HeroSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'editorial';
  showIllustration?: boolean;
}

export function HeroSection({
  children,
  variant = 'default',
  showIllustration = false,
  className,
  ...props
}: HeroSectionProps): JSX.Element {
  return (
    <div
      className={cn(
        'relative overflow-hidden',
        variant === 'editorial' ? 'px-12 py-16' : 'px-10 py-12',
        className,
      )}
      style={{
        background:
          'linear-gradient(135deg, var(--oe-color-surface-container-low) 0%, var(--oe-color-surface-container) 100%)',
      }}
      data-testid="hero-section"
      {...props}
    >
      <AssemblyFlow
        density="dense"
        className="absolute inset-0 opacity-[0.08]"
        aria-hidden="true"
      />
      <div className="relative z-10">
        {variant === 'editorial' && showIllustration ? (
          <div className="flex items-start justify-between gap-8">
            <div className="flex-1">{children}</div>
            <div className="hidden flex-shrink-0 md:block">
              <OpenModule size="lg" satellites={6} aria-hidden="true" />
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
HeroSection.displayName = 'HeroSection';
