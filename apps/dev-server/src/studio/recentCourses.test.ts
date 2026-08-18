import { describe, it, expect, beforeEach } from 'vitest';
import { recordRecentCourse, listRecentCourses, type RecentCourse } from './recentCourses';

const make = (id: string, title: string): RecentCourse => ({
  id,
  title,
  location: 'local',
  packageDir: `/tmp/${id}`,
  updatedAt: Date.now(),
});

const makeBrowser = (id: string, title: string): RecentCourse => ({
  id,
  title,
  location: 'browser',
  updatedAt: Date.now(),
});

describe('recentCourses', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty list when nothing stored', () => {
    expect(listRecentCourses()).toEqual([]);
  });

  it('records and lists a course at the front', () => {
    recordRecentCourse(make('a', 'Alpha'));
    recordRecentCourse(make('b', 'Beta'));
    const list = listRecentCourses();
    expect(list).toHaveLength(2);
    expect(list[0]!.id).toBe('b');
    expect(list[1]!.id).toBe('a');
  });

  it('stores browser courses with a browser id and no fake path', () => {
    recordRecentCourse(makeBrowser('browser-course', 'Browser Course'));
    const list = listRecentCourses();
    expect(list[0]!.location).toBe('browser');
    expect(list[0]!.packageDir).toBeUndefined();
    expect(list[0]!.id).toBe('browser-course');
  });

  it('deduplicates by id and moves to front', () => {
    recordRecentCourse(make('a', 'Alpha'));
    recordRecentCourse(make('b', 'Beta'));
    recordRecentCourse(make('a', 'Alpha'));
    const list = listRecentCourses();
    expect(list).toHaveLength(2);
    expect(list[0]!.id).toBe('a');
  });

  it('caps at 10 entries', () => {
    for (let i = 0; i < 15; i++) {
      recordRecentCourse(make(`course-${i}`, `Course ${i}`));
    }
    expect(listRecentCourses()).toHaveLength(10);
  });

  it('ignores corrupt storage', () => {
    localStorage.setItem('openedu.studio.recent', 'not-json');
    expect(listRecentCourses()).toEqual([]);
  });
});
