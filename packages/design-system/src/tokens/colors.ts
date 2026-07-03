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
  gray75: '#ded8e0',
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
  // Warm gray (stone) family — Zen
  stone10: '#1c1917',
  stone15: '#24211e',
  stone20: '#292524',
  stone30: '#3e3b38',
  stone35: '#444240',
  stone40: '#57534e',
  stone45: '#6e6a66',
  stone50: '#72706e',
  stone70: '#b7b3ae',
  stone75: '#c4c2c0',
  stone80: '#d5d1cc',
  stone81: '#dbd7d2',
  stone82: '#d9d9d8',
  stone85: '#e5e5e4',
  stone88: '#efefee',
  stone89: '#f0ece7',
  stone90: '#f1ede8',
  stone92: '#f5f5f4',
  stone95: '#fafaf9',
  // Cool gray additions
  gray15: '#1c1c1c',
  gray25: '#242424',
  gray55: '#6b6b6b',
  gray60: '#c7c7c7',
  gray70: '#d6d6d6',
  gray72: '#e3e3e3',
  // Muted green (sage) family — Forest
  sage5: '#111b11',
  sage8: '#142013',
  sage10: '#1a1c1a',
  sage15: '#222d21',
  sage20: '#2e312c',
  sage25: '#2d4a2c',
  sage28: '#3a4a39',
  sage35: '#444a42',
  sage38: '#536253',
  sage40: '#50634f',
  sage50: '#747a70',
  sage65: '#b8ccb3',
  sage70: '#c3c9bd',
  sage75: '#bac9b8',
  sage78: '#d6e5d4',
  sage80: '#d4e8cf',
  sage83: '#d9dbd4',
  sage85: '#daddd5',
  sage88: '#e4e6df',
  sage90: '#eaece5',
  sage92: '#f0f1ec',
  sage95: '#f6f7f3',
  // Bark (brown) family — Forest
  bark10: '#2a1f14',
  bark15: '#3a2e21',
  bark20: '#4d3e2f',
  bark35: '#6b5b4a',
  bark70: '#d6c5b3',
  bark75: '#e8d8c8',
  // Additional reds
  red8: '#5c2020',
  red12: '#7f1d1d',
  red16: '#8b3a3a',
  red50: '#dc2626',
  red88: '#f4d4d4',
  red93: '#fee2e2',
  // Warm greige — Lumina Scholastica v2
  greigeWhite: '#fcfaf8',
  greigeDim: '#e3dfda',
  greigeBright: '#fefcf9',
  greigeOutline: '#ccc6c0',
  purpleMuted: '#5d4a8a',
  goldTertiary: '#b8862d',
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
  'primary-light': string;
  accent: string;
  success: string;
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
