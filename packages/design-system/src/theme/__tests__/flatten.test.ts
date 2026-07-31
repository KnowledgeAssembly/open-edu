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
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: '40px',
        fontWeight: '700',
        lineHeight: '1.1',
        letterSpacing: '-0.02em',
      },
      heading: {
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: '28px',
        fontWeight: '650',
        lineHeight: '1.3',
        letterSpacing: '-0.01em',
      },
      subheading: {
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: '24px',
        fontWeight: '600',
        lineHeight: '1.3',
      },
      heading3: {
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: '20px',
        fontWeight: '600',
        lineHeight: '1.4',
      },
      heading4: {
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: '18px',
        fontWeight: '600',
        lineHeight: '1.4',
      },
      heading5: {
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: '16px',
        fontWeight: '600',
        lineHeight: '1.5',
      },
      heading6: {
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: '14px',
        fontWeight: '600',
        lineHeight: '1.5',
      },
      body: {
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: '14px',
        fontWeight: '420',
        lineHeight: '1.6',
      },
      label: {
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: '11px',
        fontWeight: '600',
        lineHeight: '1.0',
        letterSpacing: '0.08em',
      },
      caption: {
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        fontWeight: '420',
        lineHeight: '1.5',
      },
      code: {
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: '13px',
        fontWeight: '400',
        lineHeight: '1.6',
      },
    },
    expressive: {
      display: {
        fontFamily: '"Source Serif 4", Georgia, ui-serif, serif',
        fontSize: '40px',
        fontWeight: '700',
        lineHeight: '1.1',
        letterSpacing: '-0.02em',
      },
      heading: {
        fontFamily: '"Source Serif 4", Georgia, ui-serif, serif',
        fontSize: '28px',
        fontWeight: '600',
        lineHeight: '1.3',
      },
      subheading: {
        fontFamily: '"Source Serif 4", Georgia, ui-serif, serif',
        fontSize: '24px',
        fontWeight: '600',
        lineHeight: '1.3',
      },
      heading3: {
        fontFamily: '"Source Serif 4", Georgia, ui-serif, serif',
        fontSize: '20px',
        fontWeight: '600',
        lineHeight: '1.4',
      },
      heading4: {
        fontFamily: '"Source Serif 4", Georgia, ui-serif, serif',
        fontSize: '18px',
        fontWeight: '600',
        lineHeight: '1.5',
      },
      heading5: {
        fontFamily: '"Source Serif 4", Georgia, ui-serif, serif',
        fontSize: '16px',
        fontWeight: '600',
        lineHeight: '1.6',
      },
      heading6: {
        fontFamily: '"Source Serif 4", Georgia, ui-serif, serif',
        fontSize: '14px',
        fontWeight: '600',
        lineHeight: '1.6',
      },
      body: {
        fontFamily: '"Source Serif 4", Georgia, ui-serif, serif',
        fontSize: '16px',
        fontWeight: '420',
        lineHeight: '1.7',
        letterSpacing: '0.01em',
      },
      label: {
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: '11px',
        fontWeight: '600',
        lineHeight: '1.0',
        letterSpacing: '0.08em',
      },
      caption: {
        fontFamily: '"Source Serif 4", Georgia, ui-serif, serif',
        fontSize: '13px',
        fontWeight: '420',
        lineHeight: '1.5',
      },
      code: {
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
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
    expect(vars['--oe-font-productive-body-family']).toBe(
      'Inter, system-ui, -apple-system, sans-serif',
    );
    expect(vars['--oe-font-productive-body-size']).toBe('14px');
    expect(vars['--oe-font-productive-body-weight']).toBe('420');
    expect(vars['--oe-font-productive-body-lineHeight']).toBe('1.6');
  });

  it('emits expressive typography CSS vars', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-font-expressive-body-family']).toBe(
      '"Source Serif 4", Georgia, ui-serif, serif',
    );
    expect(vars['--oe-font-expressive-body-size']).toBe('16px');
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
    expect(vars['--oe-font-sans']).toBe('Inter, system-ui, -apple-system, sans-serif');
    expect(vars['--oe-radius']).toBe('0.375rem');
    expect(vars['--oe-spacing']).toBe('12px');
  });

  it('emits readingWidth as --oe-space-reading-width from spacing loop (kebab-case)', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-space-reading-width']).toBe('68ch');
    expect(vars['--oe-space-paragraph-spacing']).toBe('1.5rem');
  });

  it('emits spacing vars', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-space-md']).toBe('12px');
  });

  it('emits motion CSS vars', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-motion-duration-fast']).toBe('100ms');
    expect(vars['--oe-motion-duration-normal']).toBe('200ms');
    expect(vars['--oe-motion-duration-slow']).toBe('300ms');
    expect(vars['--oe-motion-easing-ease-in-out']).toContain('cubic-bezier');
    expect(vars['--oe-motion-easing-ease-out']).toContain('cubic-bezier');
    expect(vars['--oe-motion-easing-ease-in']).toContain('cubic-bezier');
  });

  it('emits sizing CSS vars', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-size-icon-sm']).toBe('16px');
    expect(vars['--oe-size-icon-lg']).toBe('24px');
    expect(vars['--oe-size-height-md']).toBe('40px');
    expect(vars['--oe-size-min-width-xs']).toBe('48px');
  });

  it('emits opacity CSS vars', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-opacity-0']).toBe('0');
    expect(vars['--oe-opacity-50']).toBe('0.50');
    expect(vars['--oe-opacity-100']).toBe('1');
  });

  it('emits border CSS vars', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-border-width-1']).toBe('1px');
    expect(vars['--oe-border-width-2']).toBe('2px');
    expect(vars['--oe-border-style-solid']).toBe('solid');
  });

  it('emits focus CSS vars', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-focus-ring-width']).toBe('2px');
    expect(vars['--oe-focus-ring-offset']).toBe('2px');
  });

  it('emits icon CSS vars', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-icon-size-sm']).toBe('16px');
    expect(vars['--oe-icon-size-lg']).toBe('24px');
    expect(vars['--oe-icon-stroke-regular']).toBe('1.5');
  });

  it('emits elevation CSS vars', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-elevation-flat']).toBe('none');
    expect(vars['--oe-elevation-raised']).toBe('0 1px 2px rgba(31,28,24,0.08)');
    expect(vars['--oe-elevation-overlay']).toBe('0 4px 12px rgba(31,28,24,0.10)');
    expect(vars['--oe-elevation-modal']).toBe('0 8px 24px rgba(31,28,24,0.14)');
    expect(vars['--oe-elevation-sticky']).toBe('0 2px 6px rgba(31,28,24,0.08)');
  });

  it('emits layout CSS vars', () => {
    const vars = flattenTheme(testTheme);
    expect(vars['--oe-layout-sidebar-width']).toBe('280px');
    expect(vars['--oe-layout-header-height']).toBe('56px');
    expect(vars['--oe-layout-reading-width']).toBe('680px');
  });
});
