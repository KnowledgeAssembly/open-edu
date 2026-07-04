/**
 * Maps semantic token paths to CSS custom property names.
 *
 * @remarks
 * Must be kept in sync with the token definitions in
 * `packages/design-system/src/tokens/`.
 */
const TOKEN_MAP: Record<string, string> = {
  'color.primary': '--oe-color-primary',
  'color.on-primary': '--oe-color-on-primary',
  'color.primary-container': '--oe-color-primary-container',
  'color.on-primary-container': '--oe-color-on-primary-container',
  'color.secondary': '--oe-color-secondary',
  'color.on-secondary': '--oe-color-on-secondary',
  'color.secondary-container': '--oe-color-secondary-container',
  'color.on-secondary-container': '--oe-color-on-secondary-container',
  'color.tertiary': '--oe-color-tertiary',
  'color.on-tertiary': '--oe-color-on-tertiary',
  'color.tertiary-container': '--oe-color-tertiary-container',
  'color.on-tertiary-container': '--oe-color-on-tertiary-container',
  'color.surface': '--oe-color-surface',
  'color.on-surface': '--oe-color-on-surface',
  'color.surface-variant': '--oe-color-surface-variant',
  'color.on-surface-variant': '--oe-color-on-surface-variant',
  'color.surface-container': '--oe-color-surface-container',
  'color.surface-container-low': '--oe-color-surface-container-low',
  'color.surface-container-high': '--oe-color-surface-container-high',
  'color.surface-container-highest': '--oe-color-surface-container-highest',
  'color.error': '--oe-color-error',
  'color.on-error': '--oe-color-on-error',
  'color.outline': '--oe-color-outline',
  'color.outline-variant': '--oe-color-outline-variant',
  'color.success': '--oe-color-success',
  'color.on-success': '--oe-color-on-success',
  'color.background': '--oe-color-background',
  'color.on-background': '--oe-color-on-background',
  'spacing.xs': '--oe-space-xs',
  'spacing.sm': '--oe-space-sm',
  'spacing.md': '--oe-space-md',
  'spacing.lg': '--oe-space-lg',
  'spacing.xl': '--oe-space-xl',
  'radius.sm': '--oe-radius-sm',
  'radius.md': '--oe-radius-md',
  'radius.lg': '--oe-radius-lg',
  'radius.xl': '--oe-radius-xl',
  'radius.full': '--oe-radius-full',
};

export function token(path: string): string {
  const cssVar = TOKEN_MAP[path];
  if (!cssVar) {
    throw new Error(
      `Unknown token path: "${path}". Check packages/design-system/src/tokens/ for available tokens.`,
    );
  }
  return `var(${cssVar})`;
}

export function tokenVar(path: string): string {
  const cssVar = TOKEN_MAP[path];
  if (!cssVar) {
    throw new Error(
      `Unknown token path: "${path}". Check packages/design-system/src/tokens/ for available tokens.`,
    );
  }
  return cssVar;
}
