export const spacingScale = {
  '2xs': '2px',
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '40px',
  '4xl': '48px',
  '5xl': '64px',
} as const;

export type SpacingKey = keyof typeof spacingScale;
export type SpacingScaleTokens = Record<SpacingKey, string>;

export function spacingTokenToCssVar(token: SpacingKey): string {
  return `var(--oe-space-${token})`;
}
