export type ThemeId = 'high-focus' | 'lumina-scholastica' | 'nocturnal' | 'sylvan-workspace';

export type ColorTokens = Record<string, string>;

export interface TypographyToken {
  fontFamily: string;
  fontSize: string;
  fontWeight: string | number;
  lineHeight: string | number;
  letterSpacing?: string;
}

export interface TypographyTokens {
  display: TypographyToken;
  headlineLg: TypographyToken;
  headlineMd: TypographyToken;
  title: TypographyToken;
  bodyLg: TypographyToken;
  bodyMd: TypographyToken;
  label: TypographyToken;
  caption: TypographyToken;
  mono: TypographyToken;
}

export interface SpacingTokens {
  base: string;
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  gutter: string;
  marginDesktop: string;
  marginMobile: string;
  containerMax: string;
  panelNav?: string;
  panelExplorer?: string;
}

export interface RadiiTokens {
  sm: string;
  DEFAULT: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description?: string;
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radii: RadiiTokens;
  metadata?: {
    author?: string;
    version?: string;
  };
}
