import type { BundleProgressSnapshot } from '@open-edu/schemas';

const STORAGE_KEY = 'open-edu-bundle-progress';

export interface BundleProgressData {
  [bundleId: string]: BundleProgressSnapshot;
}

export function getAllBundleProgress(): BundleProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as BundleProgressData;
  } catch {
    return {};
  }
}

export function getBundleProgress(bundleId: string): BundleProgressSnapshot | null {
  try {
    const all = getAllBundleProgress();
    return all[bundleId] ?? null;
  } catch {
    return null;
  }
}

export function saveBundleProgress(bundleId: string, snapshot: BundleProgressSnapshot): void {
  try {
    const all = getAllBundleProgress();
    all[bundleId] = snapshot;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // localStorage unavailable; silently fail
  }
}
