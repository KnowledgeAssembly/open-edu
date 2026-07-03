export const focusTokens = {
  'ring-width': '2px',
  'ring-offset': '2px',
  'ring-color': 'var(--oe-color-focus-ring)',
  'ring-style': 'solid',
} as const;

export type FocusToken = keyof typeof focusTokens;

export function focusRingClass(): string {
  return 'outline-none ring-2 ring-offset-2';
}
