import { describe, it, expect, beforeEach } from 'vitest';
import { saveCourse, getCourse, listCourses, deleteCourse } from '../course-store.js';
import { openDatabase, resetDatabase, type StoredCourse } from '../db.js';

const mockCourse: StoredCourse = {
  id: 'hello-world',
  version: '1.0.0',
  manifest: { name: 'Hello World', description: 'A test course' },
  nodes: [{ id: 'intro', type: 'lesson', content: '# Hello' }],
  assets: [],
  downloadedAt: new Date().toISOString(),
};

describe('Course Store', () => {
  beforeEach(async () => {
    const db = await openDatabase();
    await db.clear('courses');
    db.close();
    resetDatabase();
  });

  it('saves and retrieves a course by id', async () => {
    await saveCourse(mockCourse);
    const course = await getCourse('hello-world');
    expect(course).toBeDefined();
    expect(course?.id).toBe('hello-world');
    expect(course?.manifest).toEqual(mockCourse.manifest);
  });

  it('lists all saved courses', async () => {
    await saveCourse(mockCourse);
    await saveCourse({ ...mockCourse, id: 'fractions', version: '2.0.0' });
    const courses = await listCourses();
    expect(courses).toHaveLength(2);
  });

  it('deletes a course by id', async () => {
    await saveCourse(mockCourse);
    await deleteCourse('hello-world');
    const course = await getCourse('hello-world');
    expect(course).toBeUndefined();
  });

  it('returns undefined for non-existent course', async () => {
    const course = await getCourse('non-existent');
    expect(course).toBeUndefined();
  });
});
