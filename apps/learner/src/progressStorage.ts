import type { ProgressSnapshot } from '@open-edu/schemas';
import {
  saveProgress as saveProgressToDB,
  getAllCourseProgress,
} from '@open-edu/storage';

const SNAPSHOT_LESSON_ID = '__snapshot__';

export interface ProgressData {
  [packageId: string]: ProgressSnapshot;
}

export async function getAllProgress(): Promise<ProgressData> {
  try {
    const records = await getAllCourseProgress();
    const data: ProgressData = {};
    for (const record of records) {
      if (record.lessonId === SNAPSHOT_LESSON_ID && record.data) {
        data[record.courseId] = record.data as unknown as ProgressSnapshot;
      }
    }
    return data;
  } catch {
    return {};
  }
}

export async function getProgress(packageId: string): Promise<ProgressSnapshot | null> {
  try {
    const all = await getAllProgress();
    return all[packageId] ?? null;
  } catch {
    return null;
  }
}

export async function saveProgress(
  packageId: string,
  snapshot: ProgressSnapshot,
): Promise<void> {
  try {
    await saveProgressToDB({
      courseId: packageId,
      lessonId: SNAPSHOT_LESSON_ID,
      completed: true,
      updatedAt: new Date().toISOString(),
      data: snapshot as unknown as Record<string, unknown>,
    });
  } catch {
    // IndexedDB unavailable
  }
}
