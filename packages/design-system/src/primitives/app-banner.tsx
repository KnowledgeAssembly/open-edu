import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '../lib/utils.js';

const appBannerVariants = cva(
  'animate-banner-slide-down flex items-start gap-4 border-b px-4 py-3 motion-reduce:animate-none',
  {
    variants: {
      variant: {
        info: 'bg-surface-container text-on-surface border-outline-variant',
        warning: 'bg-tertiary-container text-on-tertiary-container border-outline-variant',
        break: 'bg-primary-fixed text-on-primary-fixed border-outline-variant',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
);

export type AppBannerVariant = 'info' | 'warning' | 'break';

export interface AppBannerProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof appBannerVariants> {
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  onDismiss?: () => void;
}

const AppBanner = React.forwardRef<HTMLDivElement, AppBannerProps>(
  ({ className, variant, icon, actions, onDismiss, children, ...props }, ref) => (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className={cn(appBannerVariants({ variant }), className)}
      {...props}
    >
      {icon && <div className="flex w-16 shrink-0 items-start pt-0.5">{icon}</div>}
      <div className="flex flex-1 items-center py-1">{children}</div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-on-surface-variant hover:text-on-surface ml-2 shrink-0 self-start rounded p-1 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  ),
);
AppBanner.displayName = 'AppBanner';

export { AppBanner, appBannerVariants };
