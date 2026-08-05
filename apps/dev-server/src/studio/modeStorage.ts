import type { StudioMode } from './types.js';

export const STUDIO_MODE_KEY = 'openedu.studio.mode';

export function getStudioMode(): StudioMode {
  const value = localStorage.getItem(STUDIO_MODE_KEY);
  return value === 'developer' ? 'developer' : 'creator';
}

export function setStudioMode(mode: StudioMode): void {
  localStorage.setItem(STUDIO_MODE_KEY, mode);
}
