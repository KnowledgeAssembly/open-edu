export const borderWidthScale = {
  '0': '0',
  '1': '1px',
  '2': '2px',
  '4': '4px',
  '8': '8px',
} as const;

export const borderStyleScale = {
  solid: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
  none: 'none',
} as const;

export type BorderWidthToken = keyof typeof borderWidthScale;
export type BorderStyleToken = keyof typeof borderStyleScale;

export function borderWidthTokenToCssVar(token: BorderWidthToken): string {
  return `var(--oe-border-width-${token})`;
}

export const tailwindBorderWidthExtensions = Object.fromEntries(
  Object.entries(borderWidthScale).map(([key, value]) => [key, value]),
);
