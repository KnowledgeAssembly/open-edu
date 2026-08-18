import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { openDatabase, resetDatabase } from '@open-edu/storage';
import {
  createBrowserCourseStore,
  buildFileIndex,
  type BrowserCourse,
  type BrowserCourseStoreError,
} from './browserCourseStore.js';

const enc = (s: string) => new TextEncoder().encode(s);

function makeCourse(id: string): BrowserCourse {
  return {
    id,
    version: '1.0.0',
    title: `Course ${id}`,
    files: [
      { path: 'package.json', data: enc('{"id":"' + id + '"}') },
      { path: 'nodes/lesson.md', data: enc('# Lesson') },
    ],
    updatedAt: Date.now(),
  };
}

describe('BrowserCourseStore', () => {
  let store: ReturnType<typeof createBrowserCourseStore>;

  beforeEach(async () => {
    resetDatabase();
    const db = await openDatabase();
    await db.clear('studio-courses');
    db.close();
    resetDatabase();
    store = createBrowserCourseStore();
  });

  it('creates, lists, and reads courses', async () => {
    await store.create(makeCourse('c1'));
    await store.create(makeCourse('c2'));
    const list = await store.list();
    expect(list.map((s) => s.id).sort()).toEqual(['c1', 'c2']);
    const loaded = await store.get('c1');
    expect(loaded!.title).toBe('Course c1');
    expect(loaded!.files.map((f) => f.path)).toEqual(['nodes/lesson.md', 'package.json']);
  });

  it('stores nested, unknown-text, and binary files without loss', async () => {
    const png = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
    const course: BrowserCourse = {
      id: 'rich',
      version: '1.0.0',
      title: 'Rich',
      files: [
        { path: 'assets/images/diagram.png', data: png },
        { path: 'assets/notes.txt', data: enc('unknown text') },
        { path: 'nodes/lesson.md', data: enc('# L') },
        { path: 'package.json', data: enc('{}') },
      ],
      updatedAt: 1,
    };
    await store.create(course);
    const loaded = await store.get('rich');
    expect(loaded!.files).toHaveLength(4);
    const record = buildFileIndex(loaded!.files);
    expect(record.get('assets/images/diagram.png')).toEqual(png);
    expect(new TextDecoder().decode(record.get('assets/notes.txt'))).toBe('unknown text');
  });

  it('deep-copies file bytes so callers cannot mutate stored data', async () => {
    const course = makeCourse('copy');
    await store.create(course);
    course.files[0]!.data[0] = 90;

    const loaded = await store.get('copy');
    const stored = buildFileIndex(loaded!.files);
    expect(stored.get('package.json')![0]).toBe(123); // '{'
  });

  it('normalizes backslash paths before persistence', async () => {
    const course = makeCourse('win');
    course.files = [{ path: 'nodes\\lesson.md', data: enc('# L') }];
    await store.create(course);
    const loaded = await store.get('win');
    expect(loaded!.files[0]!.path).toBe('nodes/lesson.md');
  });

  it('rejects traversal paths with an invalid-path code', async () => {
    const course = makeCourse('bad');
    course.files = [{ path: '../escape.png', data: enc('x') }];
    await expect(store.create(course)).rejects.toMatchObject({
      code: 'invalid-path',
    } as Partial<BrowserCourseStoreError>);
  });

  it('replaces an existing course', async () => {
    await store.create(makeCourse('r'));
    const updated: BrowserCourse = {
      ...makeCourse('r'),
      title: 'Updated',
      files: [
        { path: 'package.json', data: enc('{}') },
        { path: 'nodes/lesson.md', data: enc('# Updated') },
        { path: 'nodes/quiz.json', data: enc('{"type":"quiz"}') },
      ],
      updatedAt: 2,
    };
    await store.replace('r', updated);
    const loaded = await store.get('r');
    expect(loaded!.title).toBe('Updated');
    expect(loaded!.files).toHaveLength(3);
  });

  it('maps a missing replacement to course-not-found', async () => {
    await expect(store.replace('missing', makeCourse('missing'))).rejects.toMatchObject({
      code: 'course-not-found',
    } as Partial<BrowserCourseStoreError>);
  });

  it('preserves last-known-good data after a failed replacement', async () => {
    const original = makeCourse('lkg');
    await store.create(original);
    const failing: BrowserCourse = {
      ...original,
      files: [
        { path: 'nodes/a.md', data: enc('a') },
        { path: 'nodes\\a.md', data: enc('a') },
      ],
    };
    await expect(store.replace('lkg', failing)).rejects.toThrow();
    const loaded = await store.get('lkg');
    expect(loaded!.title).toBe('Course lkg');
    expect(loaded!.files).toHaveLength(2);
    expect(loaded!.files[0]!.path).toBe('nodes/lesson.md');
  });

  it('duplicates a course with deep-copied bytes and a new id', async () => {
    const course = makeCourse('src');
    course.files = [
      { path: 'package.json', data: enc('{"id":"src"}') },
      { path: 'assets/pic.png', data: new Uint8Array([1, 2, 3]) },
    ];
    await store.create(course);
    const dup = await store.duplicate('src', 'dst', 'Copy');
    expect(dup.id).toBe('dst');
    expect(dup.title).toBe('Copy');
    const loaded = await store.get('dst');
    expect(loaded).not.toBeNull();
    expect(loaded!.files.map((f) => f.path)).toEqual(['assets/pic.png', 'package.json']);
    loaded!.files[1]!.data[0] = 99;
    const srcAgain = await store.get('src');
    expect(srcAgain!.files.find((f) => f.path === 'package.json')!.data[0]).toBe(123);
  });

  it('deletes a course', async () => {
    await store.create(makeCourse('gone'));
    await store.delete('gone');
    expect(await store.get('gone')).toBeNull();
  });
});
