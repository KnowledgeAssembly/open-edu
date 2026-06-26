import type { ThemeDefinition, ThemeId } from './types';
import { highFocus } from './high-focus';
import { luminaScholastica } from './lumina-scholastica';
import { nocturnal } from './nocturnal';
import { sylvanWorkspace } from './sylvan-workspace';

/**
 * Note on typography roles:
 * The DESIGN.md YAML frontmatter for each theme uses inconsistent typography role names
 * (e.g. body-copy vs body-lg, label-caps vs label-sm). The implementation standardizes
 * to 9 semantic roles across all themes: display, headlineLg, headlineMd, title,
 * bodyLg, bodyMd, label, caption, mono. This ensures consumers can rely on a stable
 * set of typography tokens regardless of which theme is active.
 */

export type {
  ThemeDefinition,
  ThemeId,
  ColorTokens,
  TypographyToken,
  TypographyTokens,
  SpacingTokens,
  RadiiTokens,
} from './types';

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
