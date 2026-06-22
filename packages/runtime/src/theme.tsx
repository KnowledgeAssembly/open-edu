import { createContext, useContext, type ReactNode } from 'react';

export const RUNTIME_THEME = {
  '--oe-color-bg': '#ffffff',
  '--oe-color-fg': '#1a1a1a',
  '--oe-color-primary': '#2563eb',
  '--oe-color-primary-fg': '#ffffff',
  '--oe-color-muted': '#6b7280',
  '--oe-color-border': '#e5e7eb',
  '--oe-color-success': '#16a34a',
  '--oe-color-error': '#dc2626',
  '--oe-radius': '8px',
  '--oe-spacing': '1rem',
  '--oe-font-sans': 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
} as const;

export type RuntimeTheme = Partial<typeof RUNTIME_THEME>;

const ThemeContext = createContext<RuntimeTheme | null>(null);

export interface RuntimeThemeProviderProps {
  theme?: RuntimeTheme;
  children: ReactNode;
}

export function RuntimeThemeProvider({ theme, children }: RuntimeThemeProviderProps): JSX.Element {
  const merged = { ...RUNTIME_THEME, ...theme };
  const style = Object.fromEntries(
    Object.entries(merged).map(([k, v]) => [k, v]),
  ) as React.CSSProperties;

  return (
    <ThemeContext.Provider value={merged}>
      <div className="open-edu-runtime" style={style}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): RuntimeTheme {
  const ctx = useContext(ThemeContext);
  return ctx ?? RUNTIME_THEME;
}
