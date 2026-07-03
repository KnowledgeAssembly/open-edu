export const iconSizeScale = {
  xs: '12px',
  sm: '16px',
  md: '20px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
} as const;

export const iconStrokeScale = {
  thin: '1',
  regular: '1.5',
  thick: '2',
} as const;

export type IconSizeToken = keyof typeof iconSizeScale;
export type IconStrokeToken = keyof typeof iconStrokeScale;

export function iconSizeTokenToCssVar(token: IconSizeToken): string {
  return `var(--oe-icon-size-${token})`;
}

export const tailwindIconSizeExtensions = Object.fromEntries(
  Object.entries(iconSizeScale).map(([key, value]) => [key, value]),
);
