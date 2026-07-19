import { openDatabase, type LearningProgress } from './db.js';

export async function saveProgress(progress: LearningProgress): Promise<void> {
  const db = await openDatabase();
  await db.put('progress', progress);
}

export async function getProgress(
  courseId: string,
  lessonId: string,
): Promise<LearningProgress | undefined> {
  const db = await openDatabase();
  return db.get('progress', [courseId, lessonId]);
}

export async function getCourseProgress(courseId: string): Promise<LearningProgress[]> {
  const db = await openDatabase();
  const all = await db.getAll('progress');
  return all.filter((p) => p.courseId === courseId);
}

export async function deleteCourseProgress(courseId: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('progress', 'readwrite');
  const store = tx.objectStore('progress');

  let cursor = await store.openCursor();
  while (cursor) {
    const key = cursor.key as [string, string];
    if (key[0] === courseId) {
      cursor.delete();
    }
    cursor = await cursor.continue();
  }
  await tx.done;
}
