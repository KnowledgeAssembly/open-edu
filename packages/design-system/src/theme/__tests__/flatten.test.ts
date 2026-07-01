import { describe, it, expect } from 'vitest';
import { flattenTheme } from '../flatten.js';
import type { ThemeDefinition } from '../types.js';

const testTheme: ThemeDefinition = {
  id: 'lumina-scholastica',
  name: 'Lumina Scholastica',
  colors: {
    background: '#fcfaf8',
    'on-background': '#1f1c18',
    outline: '#ccc6c0',
    secondary: '#665e77',
  },
  typography: {
    productive: {
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
      body: { fontFamily: 'Inter', fontSize: '14px', fontWeight: '420', lineHeight: '1.6' },
      label: {
        fontFamily: 'Inter',
        fontSize: '11px',
        fontWeight: '600',
        lineHeight: '1.0',
        letterSpacing: '0.08em',
      },
      caption: { fontFamily: 'Inter', fontSize: '13px', fontWeight: '420', lineHeight: '1.5' },
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
      body: {
        fontFamily: 'Source Serif 4',
        fontSize: '18px',
        fontWeight: '420',
        lineHeight: '1.7',
        letterSpacing: '0.01em',
      },
      label: {
        fontFamily: 'Inter',
        fontSize: '11px',
        fontWeight: '600',
        lineHeight: '1.0',
        letterSpacing: '0.08em',
      },
      caption: {
        fontFamily: 'Source Serif 4',
        fontSize: '13px',
        fontWeight: '420',
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
    marginDesktop: '48px',
    marginMobile: '16px',
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    containerMax: '720px',
    readingWidth: '68ch',
    paragraphSpacing: '1.5rem',
  },
  radii: {
    DEFAULT: '0.375rem',
    sm: '0.125rem',
    md: '0.5rem',
    lg: '0.625rem',
    xl: '0.75rem',
    full: '9999px',
  },
};

describe('flattenTheme', () => {
  it('emits color CSS vars', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-color-background']).toBe('#fcfaf8');
  });

  it('emits productive typography CSS vars', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-font-productive-body-family']).toBe('Inter');
    expect(vars['--oe-font-productive-body-size']).toBe('14px');
    expect(vars['--oe-font-productive-body-weight']).toBe('420');
    expect(vars['--oe-font-productive-body-lineHeight']).toBe('1.6');
  });

  it('emits expressive typography CSS vars', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-font-expressive-body-family']).toBe('Source Serif 4');
    expect(vars['--oe-font-expressive-body-size']).toBe('18px');
    expect(vars['--oe-font-expressive-body-weight']).toBe('420');
    expect(vars['--oe-font-expressive-body-lineHeight']).toBe('1.7');
  });

  it('emits readingWidth and paragraphSpacing as convenience vars', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-reading-width']).toBe('68ch');
    expect(vars['--oe-paragraph-spacing']).toBe('1.5rem');
  });

  it('emits convenience aliases', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-font-sans']).toBe('Inter');
    expect(vars['--oe-radius']).toBe('0.375rem');
    expect(vars['--oe-spacing']).toBe('12px');
  });

  it('emits readingWidth as --oe-space-readingWidth from spacing loop', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-space-readingWidth']).toBe('68ch');
    expect(vars['--oe-space-paragraphSpacing']).toBe('1.5rem');
  });

  it('emits spacing vars', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-space-md']).toBe('12px');
  });
});
