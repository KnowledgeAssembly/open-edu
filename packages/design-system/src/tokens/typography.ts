import type { TypographyToken, TypographyTokens, TypographySet } from '../theme/types.js';

const productiveBody: TypographyToken = {
  fontFamily: 'Inter',
  fontSize: '14px',
  fontWeight: '420',
  lineHeight: '1.6',
};

const expressiveBody: TypographyToken = {
  fontFamily: 'Source Serif 4',
  fontSize: '18px',
  fontWeight: '420',
  lineHeight: '1.7',
  letterSpacing: '0.01em',
};

const productiveSet: TypographySet = {
  display: {
    fontFamily: 'Inter',
    fontSize: '40px',
    fontWeight: '700',
    lineHeight: '1.1',
    letterSpacing: '-0.02em',
  },
  heading: {
    fontFamily: 'Inter',
    fontSize: '28px',
    fontWeight: '650',
    lineHeight: '1.3',
    letterSpacing: '-0.01em',
  },
  subheading: { fontFamily: 'Inter', fontSize: '24px', fontWeight: '600', lineHeight: '1.3' },
  heading3: { fontFamily: 'Inter', fontSize: '20px', fontWeight: '600', lineHeight: '1.4' },
  heading4: { fontFamily: 'Inter', fontSize: '18px', fontWeight: '600', lineHeight: '1.4' },
  heading5: { fontFamily: 'Inter', fontSize: '16px', fontWeight: '600', lineHeight: '1.5' },
  heading6: { fontFamily: 'Inter', fontSize: '14px', fontWeight: '600', lineHeight: '1.5' },
  body: productiveBody,
  label: {
    fontFamily: 'Inter',
    fontSize: '11px',
    fontWeight: '600',
    lineHeight: '1.0',
    letterSpacing: '0.08em',
  },
  caption: { fontFamily: 'Inter', fontSize: '13px', fontWeight: '420', lineHeight: '1.5' },
  code: { fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: '400', lineHeight: '1.6' },
};

const expressiveSet: TypographySet = {
  display: {
    fontFamily: 'Source Serif 4',
    fontSize: '40px',
    fontWeight: '700',
    lineHeight: '1.1',
    letterSpacing: '-0.02em',
  },
  heading: {
    fontFamily: 'Source Serif 4',
    fontSize: '28px',
    fontWeight: '600',
    lineHeight: '1.3',
  },
  subheading: {
    fontFamily: 'Source Serif 4',
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '1.3',
  },
  heading3: {
    fontFamily: 'Source Serif 4',
    fontSize: '20px',
    fontWeight: '600',
    lineHeight: '1.4',
  },
  heading4: {
    fontFamily: 'Source Serif 4',
    fontSize: '18px',
    fontWeight: '600',
    lineHeight: '1.5',
  },
  heading5: {
    fontFamily: 'Source Serif 4',
    fontSize: '16px',
    fontWeight: '600',
    lineHeight: '1.6',
  },
  heading6: {
    fontFamily: 'Source Serif 4',
    fontSize: '14px',
    fontWeight: '600',
    lineHeight: '1.6',
  },
  body: expressiveBody,
  label: {
    fontFamily: 'Inter',
    fontSize: '11px',
    fontWeight: '600',
    lineHeight: '1.0',
    letterSpacing: '0.08em',
  },
  caption: { fontFamily: 'Source Serif 4', fontSize: '13px', fontWeight: '420', lineHeight: '1.5' },
  code: { fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: '400', lineHeight: '1.6' },
};

export const defaultTypography: TypographyTokens = {
  productive: productiveSet,
  expressive: expressiveSet,
};

export type TypographyRole =
  | 'display'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'label'
  | 'caption'
  | 'code';

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
  set: 'productive' | 'expressive' = 'productive',
): string {
  const suffix = propertyToCssSuffix[property];
  return `var(--oe-font-${set}-${role}-${suffix})`;
}
