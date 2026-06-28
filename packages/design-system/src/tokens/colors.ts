export const palette = {
  white: '#ffffff',
  black: '#000000',
  purple10: '#22005d',
  purple20: '#4f378a',
  purple30: '#6750a4',
  purple40: '#7c6bb0',
  purple80: '#cfbcff',
  purple90: '#eaddff',
  purple95: '#f5eeff',
  purple99: '#fdf7ff',
  gray10: '#1d1b20',
  gray20: '#322f35',
  gray30: '#494551',
  gray40: '#7a7582',
  gray50: '#cbc4d2',
  gray80: '#e6e0e9',
  gray85: '#ece6ee',
  gray90: '#f2ecf4',
  gray92: '#f8f2fa',
  gray95: '#ded8e0',
  gray99: '#fdf7ff',
  red20: '#93000a',
  red30: '#ba1a1a',
  red80: '#ffb4ab',
  red90: '#ffdad6',
  green20: '#046d3f',
  green30: '#16a34a',
  green80: '#a7f0ba',
  green90: '#dafbe3',
  amber40: '#765b00',
  amber60: '#e7c365',
  amber80: '#ffdf93',
  blue40: '#003eb3',
  blue80: '#7fa9ff',
  blue90: '#d4e3ff',
} as const;

export interface SemanticColorTokens {
  surface: string;
  'surface-dim': string;
  'surface-bright': string;
  'surface-container-lowest': string;
  'surface-container-low': string;
  'surface-container': string;
  'surface-container-high': string;
  'surface-container-highest': string;
  'on-surface': string;
  'on-surface-variant': string;
  'inverse-surface': string;
  'inverse-on-surface': string;
  outline: string;
  'outline-variant': string;
  'surface-tint': string;
  primary: string;
  'on-primary': string;
  'primary-container': string;
  'on-primary-container': string;
  'inverse-primary': string;
  secondary: string;
  'on-secondary': string;
  'secondary-container': string;
  'on-secondary-container': string;
  tertiary: string;
  'on-tertiary': string;
  'tertiary-container': string;
  'on-tertiary-container': string;
  error: string;
  'on-error': string;
  'error-container': string;
  'on-error-container': string;
  'primary-fixed': string;
  'primary-fixed-dim': string;
  'on-primary-fixed': string;
  'on-primary-fixed-variant': string;
  'secondary-fixed': string;
  'secondary-fixed-dim': string;
  'on-secondary-fixed': string;
  'on-secondary-fixed-variant': string;
  'tertiary-fixed': string;
  'tertiary-fixed-dim': string;
  'on-tertiary-fixed': string;
  'on-tertiary-fixed-variant': string;
  background: string;
  'on-background': string;
  'surface-variant': string;
  bg: string;
  fg: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

type DeepColorTokens = Record<string, string | Record<string, string>>;

export function flattenColorTokens(tokens: DeepColorTokens): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens)) {
    if (typeof value === 'string') {
      result[key] = value;
    } else if (typeof value === 'object') {
      for (const [subkey, subvalue] of Object.entries(value)) {
        result[`${key}-${subkey}`] = String(subvalue);
      }
    }
  }
  return result;
}

export function colorTokenToCssVar(tokenPath: string): string {
  return `var(--oe-color-${tokenPath})`;
}
