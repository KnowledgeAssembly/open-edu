export type ThemeId =
  | 'high-focus'
  | 'lumina-scholastica'
  | 'nocturnal'
  | 'sylvan-workspace'
  | 'zen'
  | 'forest';

export type ColorTokens = Record<string, string>;

export interface TypographyToken {
  fontFamily: string;
  fontSize: string;
  fontWeight: string | number;
  lineHeight: string | number;
  letterSpacing?: string;
}

export interface TypographySet {
  display: TypographyToken;
  heading: TypographyToken;
  subheading: TypographyToken;
  body: TypographyToken;
  label: TypographyToken;
  caption: TypographyToken;
  code: TypographyToken;
}

export interface TypographyTokens {
  productive: TypographySet;
  expressive: TypographySet;
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
  readingWidth: string;
  paragraphSpacing: string;
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
