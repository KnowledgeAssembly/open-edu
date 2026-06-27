import { type ButtonHTMLAttributes, type ReactNode } from 'react';

export interface ThemedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const baseClasses =
  'inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

const variantClasses: Record<'primary' | 'secondary' | 'outline' | 'ghost', string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover focus:ring-primary',
  secondary: 'bg-secondary text-on-secondary hover:bg-secondary-hover focus:ring-secondary',
  outline:
    'border border-outline-variant bg-surface text-on-surface hover:bg-surface-variant focus:ring-outline-variant',
  ghost: 'text-on-surface hover:bg-surface-variant focus:ring-outline-variant',
};

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'px-sm py-xs text-xs',
  md: 'px-lg py-sm text-sm',
  lg: 'px-xl py-md text-base',
};

export function ThemedButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ThemedButtonProps): JSX.Element {
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
