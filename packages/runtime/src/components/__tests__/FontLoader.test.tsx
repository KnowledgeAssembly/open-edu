import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { RuntimeThemeProvider } from '../../theme.js';
import { FontLoader } from '../FontLoader.js';

describe('FontLoader', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('injects Google Fonts link tags for the active theme', () => {
    render(
      <RuntimeThemeProvider themeId="high-focus">
        <FontLoader />
      </RuntimeThemeProvider>,
    );

    const links = document.querySelectorAll('link[id^="oe-font-"]');
    expect(links.length).toBeGreaterThanOrEqual(2);

    const atkinson = document.getElementById('oe-font-Atkinson Hyperlegible Next');
    expect(atkinson).toBeTruthy();
    expect(atkinson?.getAttribute('rel')).toBe('stylesheet');
    expect(atkinson?.getAttribute('href')).toContain('fonts.googleapis.com');

    const jetbrains = document.getElementById('oe-font-JetBrains Mono');
    expect(jetbrains).toBeTruthy();
  });

  it('removes unused font links when theme changes', () => {
    const { rerender } = render(
      <RuntimeThemeProvider themeId="high-focus">
        <FontLoader />
      </RuntimeThemeProvider>,
    );

    expect(document.getElementById('oe-font-Atkinson Hyperlegible Next')).toBeTruthy();
    expect(document.getElementById('oe-font-Inter')).toBeFalsy();

    rerender(
      <RuntimeThemeProvider themeId="nocturnal">
        <FontLoader />
      </RuntimeThemeProvider>,
    );

    expect(document.getElementById('oe-font-Atkinson Hyperlegible Next')).toBeFalsy();
    const inter = document.getElementById('oe-font-Inter');
    expect(inter).toBeTruthy();
  });

  it('does not add duplicate links for the same font', () => {
    render(
      <RuntimeThemeProvider themeId="lumina-scholastica">
        <FontLoader />
      </RuntimeThemeProvider>,
    );

    const interLinks = document.querySelectorAll('link[id="oe-font-Inter"]');
    expect(interLinks.length).toBe(1);
  });
});
