export const sizingScale = {
  'icon-xs': '12px',
  'icon-sm': '16px',
  'icon-md': '20px',
  'icon-lg': '24px',
  'icon-xl': '32px',
  'height-xs': '24px',
  'height-sm': '32px',
  'height-md': '40px',
  'height-lg': '48px',
  'height-xl': '56px',
  'min-width-xs': '48px',
  'min-width-sm': '64px',
  'min-width-md': '120px',
  'min-width-lg': '200px',
} as const;

export type SizingToken = keyof typeof sizingScale;

export function sizingTokenToCssVar(token: SizingToken): string {
  return `var(--oe-size-${token})`;
}
