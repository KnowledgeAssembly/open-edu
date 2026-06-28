import type { TypographyToken, TypographyTokens } from '../theme/types.js';

export type TypographyRole =
  | 'display'
  | 'headlineLg'
  | 'headlineMd'
  | 'title'
  | 'bodyLg'
  | 'bodyMd'
  | 'label'
  | 'caption'
  | 'mono';

export const defaultTypography: TypographyTokens = {
  display: {
    fontFamily: 'Inter',
    fontSize: '48px',
    fontWeight: '700',
    lineHeight: '1.1',
    letterSpacing: '-0.02em',
  },
  headlineLg: {
    fontFamily: 'Inter',
    fontSize: '30px',
    fontWeight: '600',
    lineHeight: '1.3',
    letterSpacing: '-0.01em',
  },
  headlineMd: {
    fontFamily: 'Inter',
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '1.3',
  },
  title: {
    fontFamily: 'Inter',
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '1.3',
  },
  bodyLg: {
    fontFamily: 'Source Serif 4',
    fontSize: '18px',
    fontWeight: '400',
    lineHeight: '1.7',
  },
  bodyMd: {
    fontFamily: 'Inter',
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '1.5',
  },
  label: {
    fontFamily: 'Inter',
    fontSize: '12px',
    fontWeight: '600',
    lineHeight: '1.0',
    letterSpacing: '0.05em',
  },
  caption: {
    fontFamily: 'Inter',
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '1.5',
  },
  mono: {
    fontFamily: 'JetBrains Mono',
    fontSize: '13px',
    fontWeight: '400',
    lineHeight: '1.6',
  },
};

const propertyToCssSuffix: Record<keyof TypographyToken, string> = {
  fontFamily: 'family',
  fontSize: 'size',
  fontWeight: 'weight',
  lineHeight: 'lineHeight',
  letterSpacing: 'letterSpacing',
};

export function typographyTokenToCssVar(
  role: TypographyRole,
  property: keyof TypographyToken,
): string {
  const suffix = propertyToCssSuffix[property];
  return `var(--oe-font-${role}-${suffix})`;
}
