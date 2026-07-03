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

export const GeoPrimitive = React.forwardRef<SVGSVGElement, GeoPrimitiveProps>(
  ({ size = 'md', variant = 'default', className, ...props }, ref) => {
    const px = sizeMap[size];
    return (
      <svg
        ref={ref}
        width={px}
        height={px}
        viewBox="0 0 20 20"
        className={cn('fill-current', className)}
        {...props}
      >
        <rect x="2" y="2" width="16" height="16" rx="3" />
      </svg>
    );
  },
);
GeoPrimitive.displayName = 'GeoPrimitive';
