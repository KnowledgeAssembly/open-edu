export const opacityScale = {
  '0': '0',
  '5': '0.05',
  '10': '0.10',
  '20': '0.20',
  '30': '0.30',
  '40': '0.40',
  '50': '0.50',
  '60': '0.60',
  '70': '0.70',
  '80': '0.80',
  '90': '0.90',
  '100': '1',
} as const;

export type OpacityToken = keyof typeof opacityScale;

export function opacityTokenToCssVar(token: OpacityToken): string {
  return `var(--oe-opacity-${token})`;
}
