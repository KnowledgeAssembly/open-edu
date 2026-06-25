import type { ProgressSnapshot } from '@open-edu/schemas';

const STORAGE_KEY = 'open-edu-progress';

export interface ProgressData {
  [packageId: string]: ProgressSnapshot;
}

export function getAllProgress(): ProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ProgressData;
  } catch {
    return {};
  }
}

export function getProgress(packageId: string): ProgressSnapshot | null {
  try {
    const all = getAllProgress();
    return all[packageId] ?? null;
  } catch {
    return null;
  }
}

export function saveProgress(packageId: string, snapshot: ProgressSnapshot): void {
  try {
    const all = getAllProgress();
    all[packageId] = snapshot;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // localStorage unavailable — silently ignore
  }
}
