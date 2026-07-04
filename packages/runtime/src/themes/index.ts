import type { ThemeDefinition, ThemeId } from '@open-edu/design-system';
import { luminaScholastica } from './lumina-scholastica.js';
import { nocturnal } from './nocturnal.js';
import { zen } from './zen.js';

export type {
  ThemeDefinition,
  ThemeId,
  ColorTokens,
  TypographyToken,
  TypographyTokens,
  SpacingTokens,
  RadiiTokens,
} from '@open-edu/design-system';

export const themeRegistry: Record<ThemeId, ThemeDefinition> = {
  'lumina-scholastica': luminaScholastica,
  nocturnal: nocturnal,
  zen: zen,
};

export const themeIds: ThemeId[] = ['lumina-scholastica', 'nocturnal', 'zen'];

export const defaultThemeId: ThemeId = 'lumina-scholastica';

export function getTheme(id: ThemeId): ThemeDefinition {
  const theme = themeRegistry[id];
  if (!theme) {
    throw new Error(`Unknown theme: "${id}". Available themes: ${themeIds.join(', ')}`);
  }
  return theme;
}

export const DEFAULT_THEME: ThemeDefinition = luminaScholastica;
