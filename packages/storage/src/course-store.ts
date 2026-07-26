import { openDatabase, type StoredCourse } from './db.js';

export async function saveCourse(course: StoredCourse): Promise<void> {
  const db = await openDatabase();
  await db.put('courses', course);
}

export async function getCourse(id: string): Promise<StoredCourse | undefined> {
  const db = await openDatabase();
  return db.get('courses', id);
}

export async function listCourses(): Promise<StoredCourse[]> {
  const db = await openDatabase();
  return db.getAll('courses');
}

export async function replaceCourse(courseId: string, course: StoredCourse): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('courses', 'readwrite');
  const store = tx.objectStore('courses');
  const existing = await store.get(courseId);
  if (!existing) {
    throw new Error(`Course "${courseId}" is not installed`);
  }
  await store.put(course);
  await tx.done;
}

export async function deleteCourse(id: string): Promise<void> {
  const db = await openDatabase();
  await db.delete('courses', id);
}
