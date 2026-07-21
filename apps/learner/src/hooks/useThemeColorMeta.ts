import { useEffect } from 'react';
import type { ThemeId } from '@open-edu/runtime';

const THEME_COLOR_BY_ID: Record<ThemeId, string> = {
  'lumina-scholastica': '#fcfaf8',
  nocturnal: '#151219',
  zen: '#fcfaf8',
};

export function useThemeColorMeta(themeId: ThemeId): void {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    meta.setAttribute('content', THEME_COLOR_BY_ID[themeId]);
  }, [themeId]);
}
