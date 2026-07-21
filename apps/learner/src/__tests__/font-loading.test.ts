import { describe, it, expect } from 'vitest';

describe('Fontsource CSS imports', () => {
  it('imports primary fonts (Inter + Source Serif 4)', async () => {
    await import('@fontsource/inter/400.css');
    await import('@fontsource/inter/500.css');
    await import('@fontsource/inter/600.css');
    await import('@fontsource/inter/700.css');
    await import('@fontsource/source-serif-4/400.css');
    await import('@fontsource/source-serif-4/600.css');
    await import('@fontsource/source-serif-4/700.css');
    expect(true).toBe(true);
  });

  it('imports Noto fallback fonts for hi locale', async () => {
    await import('@fontsource/noto-sans-devanagari/400.css');
    await import('@fontsource/noto-serif-devanagari/400.css');
    expect(true).toBe(true);
  });
});
