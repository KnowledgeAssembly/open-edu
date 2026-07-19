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

export async function deleteCourse(id: string): Promise<void> {
  const db = await openDatabase();
  await db.delete('courses', id);
}
