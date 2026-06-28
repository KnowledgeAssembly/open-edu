import type { ThemeDefinition } from './types.js';

export function flattenTheme(theme: ThemeDefinition): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const [key, value] of Object.entries(theme.colors)) {
    vars[`--oe-color-${key}`] = value;
  }

  for (const [role, token] of Object.entries(theme.typography)) {
    vars[`--oe-font-${role}-family`] = token.fontFamily;
    vars[`--oe-font-${role}-size`] = token.fontSize;
    vars[`--oe-font-${role}-weight`] = String(token.fontWeight);
    vars[`--oe-font-${role}-lineHeight`] = String(token.lineHeight);
    if (token.letterSpacing) {
      vars[`--oe-font-${role}-letterSpacing`] = token.letterSpacing;
    }
  }

  for (const [key, value] of Object.entries(theme.spacing)) {
    if (value !== undefined) {
      vars[`--oe-space-${key}`] = value;
    }
  }

  for (const [key, value] of Object.entries(theme.radii)) {
    vars[`--oe-radius-${key}`] = value;
  }

  vars['--oe-color-bg'] = theme.colors['background'] ?? theme.colors['surface'] ?? '';
  vars['--oe-color-fg'] = theme.colors['on-background'] ?? theme.colors['on-surface'] ?? '';
  vars['--oe-color-border'] = theme.colors['outline'] ?? '';
  vars['--oe-color-success'] = theme.colors['secondary'] ?? '#16a34a';
  vars['--oe-font-sans'] = theme.typography.bodyMd.fontFamily;
  vars['--oe-radius'] = theme.radii.DEFAULT;
  vars['--oe-spacing'] = theme.spacing.md;
  vars['color'] = theme.colors['on-background'] ?? theme.colors['on-surface'] ?? '';

  return vars;
}
