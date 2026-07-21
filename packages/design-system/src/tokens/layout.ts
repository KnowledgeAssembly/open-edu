export const layoutTokens = {
  'sidebar-width': '280px',
  'sidebar-collapsed-width': '64px',
  'header-height': '56px',
  'panel-nav-width': '240px',
  'panel-explorer-width': '300px',
  'content-max-width': '1024px',
  'reading-width': '680px',
  'grid-gap-sm': '8px',
  'grid-gap-md': '16px',
  'grid-gap-lg': '24px',
  'grid-gap-xl': '32px',
} as const;

export type LayoutToken = keyof typeof layoutTokens;

export function layoutTokenToCssVar(token: LayoutToken): string {
  return `var(--oe-layout-${token})`;
}
