import type { BundleProgressSnapshot } from '@open-edu/schemas';
import {
  saveProgress as saveProgressToDB,
  getProgress as getProgressFromDB,
  getAllCourseProgress,
} from '@open-edu/storage';

const BUNDLE_SENTINEL = '__bundle__';

export interface BundleProgressData {
  [bundleId: string]: BundleProgressSnapshot;
}

export async function getAllBundleProgress(): Promise<BundleProgressData> {
  try {
    const records = await getAllCourseProgress();
    const data: BundleProgressData = {};
    for (const record of records) {
      if (record.lessonId === BUNDLE_SENTINEL && record.data) {
        data[record.courseId] = record.data as unknown as BundleProgressSnapshot;
      }
    }
    return data;
  } catch {
    return {};
  }
}

export async function getBundleProgress(bundleId: string): Promise<BundleProgressSnapshot | null> {
  try {
    const record = await getProgressFromDB(bundleId, BUNDLE_SENTINEL);
    return (record?.data as unknown as BundleProgressSnapshot) ?? null;
  } catch {
    return null;
  }
}

export async function saveBundleProgress(
  bundleId: string,
  snapshot: BundleProgressSnapshot,
): Promise<void> {
  try {
    await saveProgressToDB({
      courseId: bundleId,
      lessonId: BUNDLE_SENTINEL,
      completed: true,
      updatedAt: new Date().toISOString(),
      data: snapshot as unknown as Record<string, unknown>,
    });
  } catch {
    // IndexedDB unavailable
  }
}
