import type { ThemeDefinition, TypographySet, TypographyToken } from './types.js';

export function flattenTheme(theme: ThemeDefinition): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const [key, value] of Object.entries(theme.colors)) {
    vars[`--oe-color-${key}`] = value;
  }

  for (const [setName, set] of Object.entries(theme.typography)) {
    const typographySet = set as TypographySet;
    for (const [role, token] of Object.entries(typographySet)) {
      const t = token as TypographyToken;
      vars[`--oe-font-${setName}-${role}-family`] = t.fontFamily;
      vars[`--oe-font-${setName}-${role}-size`] = t.fontSize;
      vars[`--oe-font-${setName}-${role}-weight`] = String(t.fontWeight);
      vars[`--oe-font-${setName}-${role}-lineHeight`] = String(t.lineHeight);
      if (t.letterSpacing) {
        vars[`--oe-font-${setName}-${role}-letterSpacing`] = t.letterSpacing;
      }
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
  vars['--oe-font-sans'] = theme.typography.productive.body.fontFamily;
  vars['--oe-reading-width'] = theme.spacing.readingWidth;
  vars['--oe-paragraph-spacing'] = theme.spacing.paragraphSpacing;
  vars['--oe-radius'] = theme.radii.DEFAULT;
  vars['--oe-spacing'] = theme.spacing.md;
  vars['color'] = theme.colors['on-background'] ?? theme.colors['on-surface'] ?? '';

  return vars;
}
