import { describe, it, expect } from 'vitest';
import { luminaScholastica } from '../lumina-scholastica';
import { nocturnal } from '../nocturnal';
import { zen } from '../zen';

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

describe('cross-theme consistency', () => {
  it('all themes have primary within same purple hue family (±20° of 258°)', () => {
    const themes = [luminaScholastica, nocturnal, zen];
    const targetHue = 258; // hue of Lumina's primary #5d4a8a
    for (const theme of themes) {
      const primary = theme.colors.primary;
      expect(primary).toBeDefined();
      const { h } = hexToHsl(primary!);
      expect(Math.abs(h - targetHue)).toBeLessThanOrEqual(20);
    }
  });

  it('no theme has zero radii', () => {
    const themes = [luminaScholastica, nocturnal, zen];
    for (const theme of themes) {
      expect(theme.radii.sm).not.toBe('0px');
      expect(theme.radii.DEFAULT).not.toBe('0px');
      expect(theme.radii.md).not.toBe('0px');
    }
  });

  it('all themes share same container max width', () => {
    const themes = [luminaScholastica, nocturnal, zen];
    for (const theme of themes) {
      expect(theme.spacing.containerMax).toBe('720px');
    }
  });

  it('all themes share same reading width', () => {
    const themes = [luminaScholastica, nocturnal, zen];
    for (const theme of themes) {
      expect(theme.spacing.readingWidth).toBe('68ch');
    }
  });

  it('all themes have primary-light defined and within same purple hue family', () => {
    const themes = [luminaScholastica, nocturnal, zen];
    const targetHue = 258;
    for (const theme of themes) {
      const light = theme.colors['primary-light'];
      expect(light).toBeDefined();
      if (light) {
        expect(light).not.toBe('');
        const { h } = hexToHsl(light);
        expect(Math.abs(h - targetHue)).toBeLessThanOrEqual(20);
      }
    }
  });
});
