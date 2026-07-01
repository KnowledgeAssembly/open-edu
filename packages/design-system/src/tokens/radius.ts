export const radiusScale = {
  sm: '0.125rem',
  DEFAULT: '0.375rem',
  md: '0.5rem',
  lg: '0.625rem',
  xl: '0.75rem',
  full: '9999px',
} as const;

export type RadiusKey = keyof typeof radiusScale;
