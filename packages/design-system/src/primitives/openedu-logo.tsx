import * as React from 'react';
import { cn } from '../lib/utils.js';

export interface OpenEduLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'symbol' | 'lockup' | 'wordmark';
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { symbol: 24, text: 'text-sm', tagline: 'text-[10px]' },
  md: { symbol: 32, text: 'text-lg', tagline: 'text-xs' },
  lg: { symbol: 48, text: 'text-2xl', tagline: 'text-sm' },
};

function LogoSymbol({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="currentColor" className="text-primary" />
      <circle cx="16" cy="13" r="6" fill="white" />
      <circle cx="16" cy="13" r="2.5" fill="currentColor" className="text-primary" />
    </svg>
  );
}
LogoSymbol.displayName = 'LogoSymbol';

export const OpenEduLogo = React.forwardRef<HTMLDivElement, OpenEduLogoProps>(
  ({ variant = 'lockup', size = 'md', className, ...props }, ref) => {
    const s = sizeMap[size];

    if (variant === 'symbol') {
      return (
        <div
          ref={ref}
          className={cn('inline-flex', className)}
          role="img"
          aria-label="OpenEdu"
          {...props}
        >
          <LogoSymbol size={s.symbol} />
        </div>
      );
    }

    if (variant === 'wordmark') {
      return (
        <div
          ref={ref}
          className={cn(
            'inline-flex items-center gap-0.5 font-light tracking-tight',
            s.text,
            className,
          )}
          {...props}
        >
          <span className="text-foreground">open</span>
          <svg
            width={s.symbol * 0.3}
            height={s.symbol * 0.3}
            viewBox="0 0 20 20"
            className="text-primary mt-0.5 self-start fill-current"
            aria-hidden="true"
          >
            <circle cx="10" cy="10" r="8" />
          </svg>
          <span className="text-foreground">edu</span>
        </div>
      );
    }

    // lockup
    return (
      <div ref={ref} className={cn('inline-flex items-center gap-2', className)} {...props}>
        <LogoSymbol size={s.symbol} />
        <div className="flex flex-col">
          <span className={cn('text-foreground font-semibold leading-tight', s.text)}>OpenEdu</span>
          <span className={cn('text-on-surface-variant leading-tight', s.tagline)}>
            Knowledge assembled
          </span>
        </div>
      </div>
    );
  },
);
OpenEduLogo.displayName = 'OpenEduLogo';
