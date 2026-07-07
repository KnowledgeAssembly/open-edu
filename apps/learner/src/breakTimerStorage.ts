export interface BreakTimerSettings {
  mode: 'off' | '15' | '30' | '60';
}

const STORAGE_KEY = 'oe-break-timer-settings';

const VALID_MODES = ['off', '15', '30', '60'] as const;

function isValidMode(value: string): value is BreakTimerSettings['mode'] {
  return VALID_MODES.includes(value as BreakTimerSettings['mode']);
}

const DEFAULT_SETTINGS: BreakTimerSettings = { mode: 'off' };

export function loadBreakTimerSettings(): BreakTimerSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'mode' in parsed && isValidMode(parsed.mode)) {
      return { mode: parsed.mode };
    }
    return { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveBreakTimerSettings(settings: BreakTimerSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage may be unavailable
  }
}

export function clearBreakTimerSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage may be unavailable
  }
}
