import { describe, it, expect } from 'vitest';
import { flattenTheme } from '../flatten.js';
import type { ThemeDefinition } from '../types.js';

const testTheme: ThemeDefinition = {
  id: 'lumina-scholastica',
  name: 'Lumina Scholastica',
  colors: {
    background: '#ffffff',
    'on-background': '#000000',
    outline: '#e0e0e0',
    secondary: '#16a34a',
  },
  typography: {
    productive: {
      display: {
        fontFamily: 'Inter',
        fontSize: '48px',
        fontWeight: '700',
        lineHeight: '1.1',
        letterSpacing: '-0.02em',
      },
      heading: {
        fontFamily: 'Inter',
        fontSize: '30px',
        fontWeight: '600',
        lineHeight: '1.3',
        letterSpacing: '-0.01em',
      },
      subheading: { fontFamily: 'Inter', fontSize: '24px', fontWeight: '600', lineHeight: '1.3' },
      heading3: { fontFamily: 'Inter', fontSize: '20px', fontWeight: '600', lineHeight: '1.4' },
      heading4: { fontFamily: 'Inter', fontSize: '18px', fontWeight: '600', lineHeight: '1.4' },
      heading5: { fontFamily: 'Inter', fontSize: '16px', fontWeight: '500', lineHeight: '1.5' },
      heading6: { fontFamily: 'Inter', fontSize: '14px', fontWeight: '500', lineHeight: '1.5' },
      body: { fontFamily: 'Inter', fontSize: '14px', fontWeight: '400', lineHeight: '1.5' },
      label: {
        fontFamily: 'Inter',
        fontSize: '12px',
        fontWeight: '600',
        lineHeight: '1.0',
        letterSpacing: '0.05em',
      },
      caption: { fontFamily: 'Inter', fontSize: '14px', fontWeight: '400', lineHeight: '1.5' },
      code: {
        fontFamily: 'JetBrains Mono',
        fontSize: '13px',
        fontWeight: '400',
        lineHeight: '1.6',
      },
    },
    expressive: {
      display: {
        fontFamily: 'Source Serif 4',
        fontSize: '48px',
        fontWeight: '700',
        lineHeight: '1.1',
        letterSpacing: '-0.02em',
      },
      heading: {
        fontFamily: 'Source Serif 4',
        fontSize: '30px',
        fontWeight: '600',
        lineHeight: '1.3',
      },
      subheading: {
        fontFamily: 'Source Serif 4',
        fontSize: '24px',
        fontWeight: '600',
        lineHeight: '1.3',
      },
      heading3: { fontFamily: 'Source Serif 4', fontSize: '20px', fontWeight: '600', lineHeight: '1.4' },
      heading4: { fontFamily: 'Source Serif 4', fontSize: '18px', fontWeight: '600', lineHeight: '1.5' },
      heading5: { fontFamily: 'Source Serif 4', fontSize: '16px', fontWeight: '500', lineHeight: '1.6' },
      heading6: { fontFamily: 'Source Serif 4', fontSize: '14px', fontWeight: '500', lineHeight: '1.6' },
      body: {
        fontFamily: 'Source Serif 4',
        fontSize: '18px',
        fontWeight: '400',
        lineHeight: '1.7',
      },
      label: {
        fontFamily: 'Inter',
        fontSize: '12px',
        fontWeight: '600',
        lineHeight: '1.0',
        letterSpacing: '0.05em',
      },
      caption: {
        fontFamily: 'Source Serif 4',
        fontSize: '14px',
        fontWeight: '400',
        lineHeight: '1.5',
      },
      code: {
        fontFamily: 'JetBrains Mono',
        fontSize: '13px',
        fontWeight: '400',
        lineHeight: '1.6',
      },
    },
  },
  spacing: {
    base: '4px',
    gutter: '16px',
    marginDesktop: '24px',
    marginMobile: '16px',
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    containerMax: '1200px',
    readingWidth: '65ch',
    paragraphSpacing: '1.5rem',
  },
  radii: {
    DEFAULT: '8px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
};

describe('flattenTheme', () => {
  it('emits color CSS vars', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-color-background']).toBe('#ffffff');
  });

  it('emits productive typography CSS vars', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-font-productive-body-family']).toBe('Inter');
    expect(vars['--oe-font-productive-body-size']).toBe('14px');
    expect(vars['--oe-font-productive-body-weight']).toBe('400');
    expect(vars['--oe-font-productive-body-lineHeight']).toBe('1.5');
  });

  it('emits expressive typography CSS vars', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-font-expressive-body-family']).toBe('Source Serif 4');
    expect(vars['--oe-font-expressive-body-size']).toBe('18px');
    expect(vars['--oe-font-expressive-body-weight']).toBe('400');
    expect(vars['--oe-font-expressive-body-lineHeight']).toBe('1.7');
  });

  it('emits readingWidth and paragraphSpacing as convenience vars', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-reading-width']).toBe('65ch');
    expect(vars['--oe-paragraph-spacing']).toBe('1.5rem');
  });

  it('emits convenience aliases', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-font-sans']).toBe('Inter');
    expect(vars['--oe-radius']).toBe('8px');
    expect(vars['--oe-spacing']).toBe('12px');
  });

  it('emits readingWidth as --oe-space-readingWidth from spacing loop', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-space-readingWidth']).toBe('65ch');
    expect(vars['--oe-space-paragraphSpacing']).toBe('1.5rem');
  });

  it('emits spacing vars', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-space-md']).toBe('12px');
  });
});
