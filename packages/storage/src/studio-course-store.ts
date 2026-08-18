import { openDatabase, type StoredStudioCourse } from './db.js';

export async function saveStudioCourse(course: StoredStudioCourse): Promise<void> {
  const db = await openDatabase();
  await db.put('studio-courses', course);
}

export async function getStudioCourse(id: string): Promise<StoredStudioCourse | undefined> {
  const db = await openDatabase();
  return db.get('studio-courses', id);
}

export async function listStudioCourses(): Promise<StoredStudioCourse[]> {
  const db = await openDatabase();
  return db.getAll('studio-courses');
}

export async function replaceStudioCourse(id: string, course: StoredStudioCourse): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('studio-courses', 'readwrite');
  const store = tx.objectStore('studio-courses');
  const existing = await store.get(id);
  if (!existing) {
    throw new Error(`Studio course "${id}" does not exist`);
  }
  try {
    await store.put(course);
    await tx.done;
  } catch (err) {
    // The put failure aborts the transaction; swallowing tx.done here keeps
    // the associated AbortError from surfacing as an unhandled rejection.
    await tx.done.catch(() => {});
    throw err;
  }
}

export async function deleteStudioCourse(id: string): Promise<void> {
  const db = await openDatabase();
  await db.delete('studio-courses', id);
}
