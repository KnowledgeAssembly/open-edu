import { createContext, useContext, type ReactNode } from 'react';
import { flattenTheme } from '@open-edu/design-system';
import { getTheme, defaultThemeId, DEFAULT_THEME } from './themes/index.js';
import type { ThemeId, ThemeDefinition } from './themes/types.js';

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
