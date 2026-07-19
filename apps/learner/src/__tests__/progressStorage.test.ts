import { describe, it, expect, beforeEach } from 'vitest';
import { getAllProgress, getProgress, saveProgress } from '../progressStorage';
import { deleteCourseProgress } from '@open-edu/storage';

describe('progressStorage (IndexedDB)', () => {
  beforeEach(async () => {
    const all = await getAllProgress();
    for (const id of Object.keys(all)) {
      await deleteCourseProgress(id);
    }
  });

  it('returns empty data initially', async () => {
    const all = await getAllProgress();
    expect(all).toEqual({});
  });

  it('saves and retrieves progress', async () => {
    const snapshot = { currentNodeId: 'lesson-1', visitedNodes: ['lesson-0'] };
    await saveProgress('course-1', snapshot as any);
    const result = await getProgress('course-1');
    expect(result).toEqual(snapshot);
  });

  it('overwrites existing progress', async () => {
    await saveProgress('course-1', { currentNodeId: 'a' } as any);
    await saveProgress('course-1', { currentNodeId: 'b' } as any);
    const result = await getProgress('course-1');
    expect(result).toEqual({ currentNodeId: 'b' });
  });

  it('returns null for unknown course', async () => {
    const result = await getProgress('nonexistent');
    expect(result).toBeNull();
  });

  it('handles multiple courses independently', async () => {
    await saveProgress('course-1', { currentNodeId: 'a' } as any);
    await saveProgress('course-2', { currentNodeId: 'b' } as any);
    const all = await getAllProgress();
    expect(Object.keys(all)).toHaveLength(2);
    expect(all['course-1']).toEqual({ currentNodeId: 'a' });
    expect(all['course-2']).toEqual({ currentNodeId: 'b' });
  });
});
