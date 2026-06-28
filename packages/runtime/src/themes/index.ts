import type { ThemeDefinition, ThemeId } from '@open-edu/design-system';
import { highFocus } from './high-focus.js';
import { luminaScholastica } from './lumina-scholastica.js';
import { nocturnal } from './nocturnal.js';
import { sylvanWorkspace } from './sylvan-workspace.js';

export type { ThemeDefinition, ThemeId } from '@open-edu/design-system';
export type {
  ColorTokens,
  TypographyToken,
  TypographyTokens,
  SpacingTokens,
  RadiiTokens,
} from '@open-edu/design-system';

export const themeRegistry: Record<ThemeId, ThemeDefinition> = {
  'high-focus': highFocus,
  'lumina-scholastica': luminaScholastica,
  nocturnal: nocturnal,
  'sylvan-workspace': sylvanWorkspace,
};

export const themeIds: ThemeId[] = [
  'high-focus',
  'lumina-scholastica',
  'nocturnal',
  'sylvan-workspace',
];

export const defaultThemeId: ThemeId = 'lumina-scholastica';

export function getTheme(id: ThemeId): ThemeDefinition {
  const theme = themeRegistry[id];
  if (!theme) {
    throw new Error(`Unknown theme: "${id}". Available themes: ${themeIds.join(', ')}`);
  }
  return theme;
}

export const DEFAULT_THEME: ThemeDefinition = luminaScholastica;
