import { useEffect, useRef } from 'react';
import { useTheme } from '../theme.js';

const GOOGLE_FONTS_BASE = 'https://fonts.googleapis.com/css2';
const LINK_ID_PREFIX = 'oe-font-';

function familyToUrl(family: string): string {
  const encoded = family.replace(/\s+/g, '+');
  return `${GOOGLE_FONTS_BASE}?family=${encoded}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
}

function getUniqueFontFamilies(theme: ReturnType<typeof useTheme>): string[] {
  const families = new Set<string>();
  for (const set of Object.values(theme.typography)) {
    for (const token of Object.values(set)) {
      const t = token as { fontFamily?: string };
      if (t.fontFamily) {
        families.add(t.fontFamily);
      }
    }
  }
  return Array.from(families);
}

export function FontLoader(): null {
  const theme = useTheme();
  const prevFamiliesRef = useRef<string[]>([]);

  useEffect(() => {
    const families = getUniqueFontFamilies(theme);
    const prev = prevFamiliesRef.current;
    prevFamiliesRef.current = families;

    const prevSet = new Set(prev);
    const currentSet = new Set(families);

    for (const family of prev) {
      if (!currentSet.has(family)) {
        const link = document.getElementById(`${LINK_ID_PREFIX}${family}`);
        if (link) {
          link.remove();
        }
      }
    }

    for (const family of families) {
      if (!prevSet.has(family)) {
        const existing = document.getElementById(`${LINK_ID_PREFIX}${family}`);
        if (!existing) {
          const link = document.createElement('link');
          link.id = `${LINK_ID_PREFIX}${family}`;
          link.rel = 'stylesheet';
          link.href = familyToUrl(family);
          document.head.appendChild(link);
        }
      }
    }
  }, [theme]);

  return null;
}
