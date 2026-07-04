import * as React from 'react';
import { cn } from '../lib/utils.js';

export interface GeoPrimitiveProps extends React.SVGAttributes<SVGSVGElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'muted' | 'accent';
}

const sizeMap = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

const variantClasses: Record<NonNullable<GeoPrimitiveProps['variant']>, string> = {
  default: '',
  muted: 'text-on-surface-variant',
  accent: 'text-primary',
};

export const GeoPrimitive = React.forwardRef<SVGSVGElement, GeoPrimitiveProps>(
  ({ size = 'md', variant = 'default', className, ...props }, ref) => {
    const px = sizeMap[size];
    return (
      <svg
        ref={ref}
        width={px}
        height={px}
        viewBox="0 0 20 20"
        className={cn('fill-current', variantClasses[variant], className)}
        aria-hidden="true"
        {...props}
      >
        <circle cx="10" cy="10" r="8" />
      </svg>
    );
  },
);
GeoPrimitive.displayName = 'GeoPrimitive';
