import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  MemoryCourseRepository,
  openDatabase,
  resetDatabase,
  saveStudioCourse,
  listStudioCourses,
  type StoredStudioCourse,
} from '@open-edu/storage';
import { migrateLegacyCourses } from './migrateLegacyCourses.js';

const enc = (s: string) => new TextEncoder().encode(s);

function legacyCourse(id: string): StoredStudioCourse {
  return {
    id,
    version: '1.0.0',
    title: `Legacy ${id}`,
    files: [
      { path: 'package.json', data: enc('{"id":"' + id + '"}').buffer },
      { path: 'nodes/lesson.md', data: enc('# Legacy').buffer },
      { path: 'assets/pic.png', data: new Uint8Array([137, 80, 78, 71]).buffer },
    ],
    updatedAt: new Date().toISOString(),
    source: { kind: 'browser-created' },
  };
}

describe('migrateLegacyCourses', () => {
  beforeEach(async () => {
    resetDatabase();
    const db = await openDatabase();
    await db.clear('studio-courses');
    db.close();
    resetDatabase();
  });

  it('writes legacy records into a workspace and opens the course', async () => {
    await saveStudioCourse(legacyCourse('legacy-1'));
    await saveStudioCourse(legacyCourse('legacy-2'));

    const repository = new MemoryCourseRepository();
    const result = await migrateLegacyCourses({ repository });
    expect(result.migrated.sort()).toEqual(['legacy-1', 'legacy-2']);
    expect(result.skipped).toEqual([]);
    expect(result.failed).toEqual([]);

    const ws = await repository.open('legacy-1');
    expect(await ws.readText('package.json')).toBe('{"id":"legacy-1"}');
    expect(await ws.readText('nodes/lesson.md')).toBe('# Legacy');
    expect(await ws.read('assets/pic.png')).toEqual(new Uint8Array([137, 80, 78, 71]));

    const info = (await repository.list()).find((i) => i.courseId === 'legacy-1');
    expect(info?.workspaceId).toBeTruthy();
  });

  it('skips courses that already exist in the workspace and collects failures', async () => {
    await saveStudioCourse(legacyCourse('exists'));
    const repository = new MemoryCourseRepository();
    await repository.create('exists');

    const record: StoredStudioCourse = {
      ...legacyCourse('bad'),
      id: 'bad',
      files: [{ path: '../escape.md', data: enc('x').buffer }],
    };
    await saveStudioCourse(record);
    const result = await migrateLegacyCourses({ repository });
    expect(result.skipped).toEqual(['exists']);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.id).toBe('bad');
    expect(result.migrated).toEqual([]);
  });

  it('is an explicit utility that leaves IndexedDB records in place', async () => {
    await saveStudioCourse(legacyCourse('leave-me'));
    const repository = new MemoryCourseRepository();
    await migrateLegacyCourses({ repository });
    // The legacy store is not destroyed; callers decide cleanup timing.
    expect((await listStudioCourses()).map((r) => r.id)).toEqual(['leave-me']);
  });
});
