import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RuntimeThemeProvider, useTheme } from '../../theme.js';

function ThemeConsumer(): JSX.Element {
  const theme = useTheme();
  return <div data-testid="theme-name">{theme.name}</div>;
}

describe('RuntimeThemeProvider', () => {
  it('renders children inside a div with open-edu-runtime class', () => {
    const { container } = render(
      <RuntimeThemeProvider>
        <div>child</div>
      </RuntimeThemeProvider>,
    );
    const wrapper = container.querySelector('.open-edu-runtime');
    expect(wrapper).toBeTruthy();
    expect(wrapper?.textContent).toBe('child');
  });

  it('sets data-theme attribute to the themeId', () => {
    const { container } = render(
      <RuntimeThemeProvider themeId="zen">
        <div>child</div>
      </RuntimeThemeProvider>,
    );
    const wrapper = container.querySelector('.open-edu-runtime');
    expect(wrapper?.getAttribute('data-theme')).toBe('zen');
  });

  it('defaults to lumina-scholastica theme', () => {
    const { container } = render(
      <RuntimeThemeProvider>
        <div>child</div>
      </RuntimeThemeProvider>,
    );
    const wrapper = container.querySelector('.open-edu-runtime');
    expect(wrapper?.getAttribute('data-theme')).toBe('lumina-scholastica');
  });

  it('injects CSS variables as inline styles', () => {
    const { container } = render(
      <RuntimeThemeProvider themeId="nocturnal">
        <div>child</div>
      </RuntimeThemeProvider>,
    );
    const wrapper = container.querySelector('.open-edu-runtime') as HTMLElement;
    expect(wrapper?.style.getPropertyValue('--oe-color-primary')).toBe('#d4c4ff');
    expect(wrapper?.style.getPropertyValue('--oe-color-surface')).toBe('#151219');
    expect(wrapper?.style.getPropertyValue('--oe-radius-DEFAULT')).toBe('0.625rem');
    expect(wrapper?.style.getPropertyValue('--oe-font-productive-display-family')).toBe(
      'Inter, system-ui, -apple-system, sans-serif',
    );
  });

  it('injects typography CSS variables', () => {
    const { container } = render(
      <RuntimeThemeProvider themeId="nocturnal">
        <div>child</div>
      </RuntimeThemeProvider>,
    );
    const wrapper = container.querySelector('.open-edu-runtime') as HTMLElement;
    expect(wrapper?.style.getPropertyValue('--oe-font-productive-display-family')).toBe(
      'Inter, system-ui, -apple-system, sans-serif',
    );
    expect(wrapper?.style.getPropertyValue('--oe-font-productive-display-size')).toBe('48px');
    expect(wrapper?.style.getPropertyValue('--oe-font-productive-display-weight')).toBe('700');
  });

  it('provides ThemeDefinition via useTheme hook', () => {
    render(
      <RuntimeThemeProvider themeId="nocturnal">
        <ThemeConsumer />
      </RuntimeThemeProvider>,
    );
    expect(screen.getByTestId('theme-name')).toHaveTextContent('OpenEdu Dark');
  });

  it('injects a11y overrides style tag', () => {
    const { container } = render(
      <RuntimeThemeProvider>
        <div>child</div>
      </RuntimeThemeProvider>,
    );
    const styleTag = container.querySelector('style');
    expect(styleTag).toBeTruthy();
    expect(styleTag?.innerHTML).toContain('@media (prefers-contrast: more)');
    expect(styleTag?.innerHTML).toContain('forced-colors');
    expect(styleTag?.innerHTML).toContain('CanvasText');
  });

  it('style tag is rendered only once', () => {
    const { container } = render(
      <RuntimeThemeProvider>
        <div>child</div>
      </RuntimeThemeProvider>,
    );
    const styleTags = container.querySelectorAll('style');
    expect(styleTags.length).toBe(1);
  });
});
