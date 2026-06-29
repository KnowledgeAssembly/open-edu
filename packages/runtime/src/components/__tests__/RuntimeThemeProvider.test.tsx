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
      <RuntimeThemeProvider themeId="high-focus">
        <div>child</div>
      </RuntimeThemeProvider>,
    );
    const wrapper = container.querySelector('.open-edu-runtime');
    expect(wrapper?.getAttribute('data-theme')).toBe('high-focus');
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
      <RuntimeThemeProvider themeId="high-focus">
        <div>child</div>
      </RuntimeThemeProvider>,
    );
    const wrapper = container.querySelector('.open-edu-runtime') as HTMLElement;
    expect(wrapper?.style.getPropertyValue('--oe-color-primary')).toBe('#002a81');
    expect(wrapper?.style.getPropertyValue('--oe-color-surface')).toBe('#fcf8f9');
    expect(wrapper?.style.getPropertyValue('--oe-space-md')).toBe('24px');
    expect(wrapper?.style.getPropertyValue('--oe-radius-DEFAULT')).toBe('0.25rem');
  });

  it('injects typography CSS variables', () => {
    const { container } = render(
      <RuntimeThemeProvider themeId="high-focus">
        <div>child</div>
      </RuntimeThemeProvider>,
    );
    const wrapper = container.querySelector('.open-edu-runtime') as HTMLElement;
    expect(wrapper?.style.getPropertyValue('--oe-font-productive-display-family')).toBe(
      'Atkinson Hyperlegible Next',
    );
    expect(wrapper?.style.getPropertyValue('--oe-font-productive-display-size')).toBe('32px');
    expect(wrapper?.style.getPropertyValue('--oe-font-productive-display-weight')).toBe('700');
  });

  it('provides ThemeDefinition via useTheme hook', () => {
    render(
      <RuntimeThemeProvider themeId="nocturnal">
        <ThemeConsumer />
      </RuntimeThemeProvider>,
    );
    expect(screen.getByTestId('theme-name')).toHaveTextContent('OpenEdu Nocturnal');
  });
});
