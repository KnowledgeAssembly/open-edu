import { describe, it, expect } from 'vitest';
import { buildSearchIndex, searchOffline } from '../searchService.js';

describe('Offline Search', () => {
  const mockCourses = [
    { id: 'course-1', title: 'Introduction to Math', content: 'Learn basic arithmetic' },
    { id: 'course-2', title: 'Advanced Physics', content: 'Quantum mechanics basics' },
  ];

  it('builds search index from courses', () => {
    const index = buildSearchIndex(mockCourses);
    expect(index).toBeDefined();
  });

  it('searches offline courses', () => {
    const index = buildSearchIndex(mockCourses);
    const results = searchOffline(index, 'math');
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe('course-1');
  });

  it('returns empty for no matches', () => {
    const index = buildSearchIndex(mockCourses);
    const results = searchOffline(index, 'nonexistent');
    expect(results).toHaveLength(0);
  });
});
