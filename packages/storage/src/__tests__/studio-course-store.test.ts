import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase, resetDatabase, type StoredStudioCourse } from '../db.js';
import {
  saveStudioCourse,
  getStudioCourse,
  listStudioCourses,
  replaceStudioCourse,
  deleteStudioCourse,
} from '../studio-course-store.js';

function makeCourse(id: string): StoredStudioCourse {
  return {
    id,
    version: '1.0.0',
    title: `Course ${id}`,
    files: [
      { path: 'package.json', data: new TextEncoder().encode('{}').buffer },
      { path: 'nodes/lesson.md', data: new TextEncoder().encode('# Lesson').buffer },
    ],
    updatedAt: new Date().toISOString(),
    source: { kind: 'browser-created' },
  };
}

describe('studio-course-store', () => {
  beforeEach(async () => {
    // Start from a clean studio-courses store. Closing the connection before
    // resetDatabase avoids stale cached connections across cases.
    const db = await openDatabase();
    await db.clear('studio-courses');
    db.close();
    resetDatabase();
  });

  it('migrates the database from version 4 to version 5 and adds the studio-courses store', async () => {
    // Start from a deleted database (no open connections after beforeEach
    // closed them), then create a version-4 database with the legacy stores
    // only. Opening through openDatabase() must run the v4 → v5 upgrade and
    // add the studio-courses store.
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('open-edu');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('delete blocked'));
    });

    const legacy = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('open-edu', 4);
      req.onupgradeneeded = () => {
        const db = req.result as IDBDatabase;
        if (!db.objectStoreNames.contains('courses')) {
          db.createObjectStore('courses', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('bundles')) {
          db.createObjectStore('bundles', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    legacy.close();

    resetDatabase();
    const db = await openDatabase();
    expect(Array.from(db.objectStoreNames)).toContain('studio-courses');
    expect(Array.from(db.objectStoreNames)).toContain('courses');
  });

  it('saves and reads a studio course', async () => {
    const course = makeCourse('save-read');
    await saveStudioCourse(course);
    const loaded = await getStudioCourse('save-read');
    expect(loaded).toBeDefined();
    expect(loaded!.title).toBe('Course save-read');
  });

  it('lists all studio courses', async () => {
    await saveStudioCourse(makeCourse('list-1'));
    await saveStudioCourse(makeCourse('list-2'));
    const all = await listStudioCourses();
    expect(all.map((c) => c.id).sort()).toEqual(['list-1', 'list-2']);
  });

  it('replaces an existing course in place', async () => {
    const original = makeCourse('replace-me');
    await saveStudioCourse(original);
    const updated: StoredStudioCourse = {
      ...original,
      title: 'Updated title',
      updatedAt: new Date().toISOString(),
    };
    await replaceStudioCourse('replace-me', updated);
    const loaded = await getStudioCourse('replace-me');
    expect(loaded!.title).toBe('Updated title');
    expect(loaded!.files).toHaveLength(2);
  });

  it('fails to replace a missing course and leaves no record behind', async () => {
    await expect(replaceStudioCourse('missing', makeCourse('missing'))).rejects.toThrow(
      /does not exist/,
    );
    expect(await getStudioCourse('missing')).toBeUndefined();
  });

  it('preserves the prior record when a replacement fails', async () => {
    const original = makeCourse('atomic');
    await saveStudioCourse(original);
    const broken = makeCourse('atomic');
    broken.files = [{ path: 'x', data: (() => {}) as unknown as ArrayBuffer }];
    await expect(replaceStudioCourse('atomic', broken)).rejects.toThrow();
    const loaded = await getStudioCourse('atomic');
    expect(loaded).toBeDefined();
    expect(loaded!.title).toBe('Course atomic');
    expect(loaded!.files).toHaveLength(2);
  });

  it('deletes a studio course', async () => {
    await saveStudioCourse(makeCourse('delete-me'));
    await deleteStudioCourse('delete-me');
    expect(await getStudioCourse('delete-me')).toBeUndefined();
  });

  it('stores binary file data as ArrayBuffer', async () => {
    const bytes = new Uint8Array([0, 1, 2, 255]);
    const course: StoredStudioCourse = {
      id: 'binary',
      version: '1.0.0',
      title: 'Binary',
      files: [{ path: 'assets/img.png', data: bytes.buffer.slice(0) as ArrayBuffer }],
      updatedAt: new Date().toISOString(),
    };
    await saveStudioCourse(course);
    const loaded = await getStudioCourse('binary');
    const buf = loaded!.files[0]!.data;
    // fake-indexeddb and jsdom run in different realms, so use a toString
    // probe instead of a cross-realm instanceof check.
    expect(Object.prototype.toString.call(buf)).toBe('[object ArrayBuffer]');
    expect(new Uint8Array(buf)).toEqual(bytes);
  });

  it('isolates studio courses from learner-installed courses', async () => {
    const db = await openDatabase();
    const tx = db.transaction(['courses', 'studio-courses'], 'readwrite');
    tx.objectStore('courses').put({
      id: 'learner-course',
      version: '1.0.0',
      manifest: {},
      nodes: [],
      assets: [],
      downloadedAt: new Date().toISOString(),
    });
    await tx.done;

    await saveStudioCourse(makeCourse('studio-course'));
    const learnerCourses = await db.getAll('courses');
    const studioCourses = await db.getAll('studio-courses');

    expect(learnerCourses.map((c) => c.id)).toContain('learner-course');
    expect(learnerCourses.map((c) => c.id)).not.toContain('studio-course');
    expect(studioCourses.map((c) => c.id)).toContain('studio-course');
    expect(studioCourses.map((c) => c.id)).not.toContain('learner-course');
  });
});
