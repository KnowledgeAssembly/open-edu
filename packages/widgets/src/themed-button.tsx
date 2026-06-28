/**
 * @deprecated Use Button from `@open-edu/design-system` instead.
 * Migration: `variant` mapping — primary→default, secondary→secondary, outline→outline, ghost→ghost.
 * Size mapping — sm→sm, md→default, lg→lg.
 */
import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Button } from '@open-edu/design-system';
import type { ButtonProps } from '@open-edu/design-system';

export interface ThemedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const variantMap: Record<NonNullable<ThemedButtonProps['variant']>, ButtonProps['variant']> = {
  primary: 'default',
  secondary: 'secondary',
  outline: 'outline',
  ghost: 'ghost',
};

const sizeMap: Record<NonNullable<ThemedButtonProps['size']>, ButtonProps['size']> = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
};

export function ThemedButton({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ThemedButtonProps): JSX.Element {
  return (
    <Button
      variant={variantMap[variant] ?? 'default'}
      size={sizeMap[size] ?? 'default'}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}
