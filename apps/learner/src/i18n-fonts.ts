const loaded = new Set<string>();

export async function loadLocaleFonts(locale: string): Promise<void> {
  if (loaded.has(locale)) return;
  loaded.add(locale);
  if (locale === 'hi') {
    await Promise.all([
      import('@fontsource/noto-sans-devanagari/400.css'),
      import('@fontsource/noto-sans-devanagari/500.css'),
      import('@fontsource/noto-sans-devanagari/600.css'),
      import('@fontsource/noto-sans-devanagari/700.css'),
      import('@fontsource/noto-serif-devanagari/400.css'),
      import('@fontsource/noto-serif-devanagari/600.css'),
      import('@fontsource/noto-serif-devanagari/700.css'),
    ]);
  }
}
