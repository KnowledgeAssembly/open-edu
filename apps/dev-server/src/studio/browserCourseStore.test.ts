import { describe, it, expect, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { openDatabase, resetDatabase } from '@open-edu/storage';
import {
  createBrowserCourseStore,
  buildFileIndex,
  type BrowserCourse,
  type BrowserCourseStoreError,
  type BrowserCourseStore,
} from './browserCourseStore.js';

const enc = (s: string) => new TextEncoder().encode(s);

function makeStore(): BrowserCourseStore {
  return createBrowserCourseStore({ nonPersistent: true });
}

function makeCourse(id: string): BrowserCourse {
  return {
    id,
    version: '1.0.0',
    title: `Course ${id}`,
    files: [
      { path: 'package.json', data: enc('{"id":"' + id + '","title":"Course ' + id + '"}') },
      { path: 'nodes/lesson.md', data: enc('# Lesson') },
    ],
    updatedAt: Date.now(),
  };
}

describe('BrowserCourseStore', () => {
  beforeEach(async () => {
    resetDatabase();
    const db = await openDatabase();
    await db.clear('studio-courses');
    db.close();
    resetDatabase();
  });

  it('creates, lists, and reads courses', async () => {
    const store = makeStore();
    await store.create(makeCourse('c1'));
    await store.create(makeCourse('c2'));
    const list = await store.list();
    expect(list.map((s) => s.id).sort()).toEqual(['c1', 'c2']);
    const loaded = await store.get('c1');
    expect(loaded!.title).toBe('Course c1');
    expect(loaded!.files.map((f) => f.path)).toEqual(['nodes/lesson.md', 'package.json']);
  });

  it('stores content in the workspace, not as an IndexedDB course record', async () => {
    const store = makeStore();
    await store.create(makeCourse('ws'));
    const db = await openDatabase();
    const records = await db.getAll('studio-courses');
    expect(records).toEqual([]);

    const loaded = await store.get('ws');
    expect(loaded!.files.map((f) => f.path)).toEqual(['nodes/lesson.md', 'package.json']);
    const ws = await store.workspaceOf?.('ws');
    expect(ws).not.toBeNull();
    expect(await ws!.readText('nodes/lesson.md')).toBe('# Lesson');
  });

  it('can be safely reconstructed when IndexedDB is unavailable (non-persistent fallback)', async () => {
    vi.stubGlobal('indexedDB', undefined);
    try {
      const store = createBrowserCourseStore();
      await store.create(makeCourse('mem'));
      const loaded = await store.get('mem');
      expect(loaded!.title).toBe('Course mem');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('stores nested, unknown-text, and binary files without loss', async () => {
    const store = makeStore();
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
    const store = makeStore();
    const course = makeCourse('copy');
    await store.create(course);
    course.files[0]!.data[0] = 90;

    const loaded = await store.get('copy');
    const stored = buildFileIndex(loaded!.files);
    expect(stored.get('package.json')![0]).toBe(123); // '{'
  });

  it('normalizes backslash paths before persistence', async () => {
    const store = makeStore();
    const course = makeCourse('win');
    course.files = [{ path: 'nodes\\lesson.md', data: enc('# L') }];
    await store.create(course);
    const loaded = await store.get('win');
    expect(loaded!.files[0]!.path).toBe('nodes/lesson.md');
  });

  it('rejects traversal paths with an invalid-path code', async () => {
    const store = makeStore();
    const course = makeCourse('bad');
    course.files = [{ path: '../escape.png', data: enc('x') }];
    await expect(store.create(course)).rejects.toMatchObject({
      code: 'invalid-path',
    } as Partial<BrowserCourseStoreError>);
  });

  it('replaces an existing course', async () => {
    const store = makeStore();
    await store.create(makeCourse('r'));
    const updated: BrowserCourse = {
      ...makeCourse('r'),
      title: 'Updated',
      files: [
        { path: 'package.json', data: enc('{"title":"Updated"}') },
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
    const store = makeStore();
    await expect(store.replace('missing', makeCourse('missing'))).rejects.toMatchObject({
      code: 'course-not-found',
    } as Partial<BrowserCourseStoreError>);
  });

  it('preserves last-known-good data after a failed replacement', async () => {
    const store = makeStore();
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
    const store = makeStore();
    const course = makeCourse('src');
    course.files = [
      { path: 'package.json', data: enc('{"id":"src","title":"Source"}') },
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
    const store = makeStore();
    await store.create(makeCourse('gone'));
    await store.delete('gone');
    expect(await store.get('gone')).toBeNull();
  });

  it('exposes the live workspace via workspaceOf', async () => {
    const store = makeStore();
    await store.create(makeCourse('live'));
    const ws = await store.workspaceOf?.('live');
    expect(ws).not.toBeNull();
    await ws!.writeText('notes.md', 'from workspace');
    const loaded = await store.get('live');
    expect(new TextDecoder().decode(buildFileIndex(loaded!.files).get('notes.md'))).toBe(
      'from workspace',
    );
    expect(await store.workspaceOf?.('missing')).toBeNull();
  });

  it('isolates per-session hooks: separate stores never share courses (multi-user model)', async () => {
    // Each user session owns its own store/repository (OPFS is per-browser but
    // the store seam scopes it). Editing in one session must not leak into the
    // other even when the same course ids exist.
    const sessionA = makeStore();
    const sessionB = makeStore();

    await sessionA.create(makeCourse('shared-id'));
    await sessionB.create(makeCourse('shared-id'));

    const wsA = await sessionA.workspaceOf?.('shared-id');
    const wsB = await sessionB.workspaceOf?.('shared-id');
    await wsA!.writeText('nodes/lesson.md', '# Session A edit');
    await wsB!.writeText('nodes/lesson.md', '# Session B edit');

    const loadedA = await sessionA.get('shared-id');
    const loadedB = await sessionB.get('shared-id');
    expect(new TextDecoder().decode(buildFileIndex(loadedA!.files).get('nodes/lesson.md'))).toBe(
      '# Session A edit',
    );
    expect(new TextDecoder().decode(buildFileIndex(loadedB!.files).get('nodes/lesson.md'))).toBe(
      '# Session B edit',
    );

    // Unrelated to the AI path, but a useful seam guard: one session deleting
    // its copy leaves the other intact.
    await sessionA.delete('shared-id');
    expect(await sessionB.get('shared-id')).not.toBeNull();
  });
});
