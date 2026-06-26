import { createContext, useContext, type ReactNode } from 'react';
import { getTheme, defaultThemeId, DEFAULT_THEME } from './themes/index.js';
import type { ThemeId, ThemeDefinition } from './themes/types.js';

function flattenTheme(theme: ThemeDefinition): Record<string, string> {
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

  return vars;
}

const defaultFlattened = flattenTheme(DEFAULT_THEME);

export const RUNTIME_THEME: Readonly<Record<string, string>> = defaultFlattened;

export type RuntimeTheme = Partial<typeof RUNTIME_THEME>;

const ThemeContext = createContext<ThemeDefinition | null>(null);

export interface RuntimeThemeProviderProps {
  themeId?: ThemeId;
  children: ReactNode;
}

export function RuntimeThemeProvider({
  themeId = defaultThemeId,
  children,
}: RuntimeThemeProviderProps): JSX.Element {
  const definition = getTheme(themeId);
  const vars = flattenTheme(definition);
  const style = vars as React.CSSProperties;

  return (
    <ThemeContext.Provider value={definition}>
      <div className="open-edu-runtime" data-theme={themeId} style={style}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeDefinition {
  const ctx = useContext(ThemeContext);
  return ctx ?? DEFAULT_THEME;
}
