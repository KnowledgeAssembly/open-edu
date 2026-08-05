import type { StudioMode } from './types.js';

export const STUDIO_MODE_KEY = 'openedu.studio.mode';

const VALID_MODES: readonly StudioMode[] = ['creator', 'developer'];

export function getStudioMode(): StudioMode {
  if (
    typeof OPEN_EDU_STUDIO_MODE === 'string' &&
    (VALID_MODES as readonly string[]).includes(OPEN_EDU_STUDIO_MODE)
  ) {
    return OPEN_EDU_STUDIO_MODE as StudioMode;
  }
  const value = localStorage.getItem(STUDIO_MODE_KEY);
  return value === 'developer' ? 'developer' : 'creator';
}

export function setStudioMode(mode: StudioMode): void {
  localStorage.setItem(STUDIO_MODE_KEY, mode);
}
