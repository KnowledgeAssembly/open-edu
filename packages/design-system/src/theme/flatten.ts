import type { ThemeDefinition, TypographySet, TypographyToken } from './types.js';
import { motionTokens } from '../tokens/motion.js';
import { sizingScale } from '../tokens/sizing.js';
import { opacityScale } from '../tokens/opacity.js';
import { borderWidthScale, borderStyleScale } from '../tokens/borders.js';
import { focusTokens } from '../tokens/focus.js';
import { iconSizeScale, iconStrokeScale } from '../tokens/icons.js';
import { layoutTokens } from '../tokens/layout.js';
import { elevationScale } from '../tokens/elevation.js';

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

  for (const [key, value] of Object.entries(motionTokens)) {
    if (typeof value === 'string') {
      vars[`--oe-motion-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`] = value;
    }
  }

  for (const [key, value] of Object.entries(sizingScale)) {
    vars[`--oe-size-${key}`] = value;
  }

  for (const [key, value] of Object.entries(opacityScale)) {
    vars[`--oe-opacity-${key}`] = value;
  }

  for (const [key, value] of Object.entries(borderWidthScale)) {
    vars[`--oe-border-width-${key}`] = value;
  }
  for (const [key, value] of Object.entries(borderStyleScale)) {
    vars[`--oe-border-style-${key}`] = value;
  }

  for (const [key, value] of Object.entries(focusTokens)) {
    vars[`--oe-focus-${key}`] = value;
  }

  for (const [key, value] of Object.entries(iconSizeScale)) {
    vars[`--oe-icon-size-${key}`] = value;
  }
  for (const [key, value] of Object.entries(iconStrokeScale)) {
    vars[`--oe-icon-stroke-${key}`] = value;
  }

  for (const [key, value] of Object.entries(layoutTokens)) {
    vars[`--oe-layout-${key}`] = value;
  }

  for (const [key, value] of Object.entries(elevationScale)) {
    vars[`--oe-elevation-${key}`] = value.boxShadow;
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
