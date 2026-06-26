import { useState, useCallback } from 'react';
import { defaultThemeId } from '../themes/index.js';
import type { ThemeId } from '../themes/types.js';

const STORAGE_KEY = 'oe-theme-preference';

function getStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const valid: ThemeId[] = [
        'high-focus',
        'lumina-scholastica',
        'nocturnal',
        'sylvan-workspace',
      ];
      if (valid.includes(stored as ThemeId)) {
        return stored as ThemeId;
      }
    }
  } catch {}
  return defaultThemeId;
}

export function useThemePreference(): [ThemeId, (id: ThemeId) => void] {
  const [themeId, setThemeId] = useState<ThemeId>(getStoredTheme);

  const setTheme = useCallback((id: ThemeId) => {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
    setThemeId(id);
  }, []);

  return [themeId, setTheme];
}
