import type { ProgressSnapshot } from '@open-edu/schemas';

const STORAGE_PREFIX = 'open-edu:progress:';

export function getStorageKey(packageId: string, packageVersion: string): string {
  return `${STORAGE_PREFIX}${packageId}:${packageVersion}`;
}

export function loadProgress(packageId: string, packageVersion: string): ProgressSnapshot | null {
  try {
    const key = getStorageKey(packageId, packageVersion);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as ProgressSnapshot;
  } catch {
    return null;
  }
}

export function saveProgress(
  packageId: string,
  packageVersion: string,
  snapshot: ProgressSnapshot,
): void {
  try {
    const key = getStorageKey(packageId, packageVersion);
    localStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function clearProgress(packageId: string, packageVersion: string): void {
  try {
    const key = getStorageKey(packageId, packageVersion);
    localStorage.removeItem(key);
  } catch {
    // silently ignore
  }
}
