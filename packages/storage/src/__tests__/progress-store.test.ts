import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveProgress,
  getProgress,
  getCourseProgress,
  deleteCourseProgress,
} from '../progress-store.js';
import { openDatabase, resetDatabase, type LearningProgress } from '../db.js';

const mockProgress: LearningProgress = {
  courseId: 'hello-world',
  lessonId: 'intro',
  completed: true,
  score: 95,
  updatedAt: new Date().toISOString(),
};

describe('Progress Store', () => {
  beforeEach(async () => {
    const db = await openDatabase();
    await db.clear('progress');
    db.close();
    resetDatabase();
  });

  it('saves and retrieves progress by courseId + lessonId', async () => {
    await saveProgress(mockProgress);
    const progress = await getProgress('hello-world', 'intro');
    expect(progress).toBeDefined();
    expect(progress?.completed).toBe(true);
    expect(progress?.score).toBe(95);
  });

  it('gets all progress for a course', async () => {
    await saveProgress(mockProgress);
    await saveProgress({ ...mockProgress, lessonId: 'chapter-1', completed: true });
    await saveProgress({ ...mockProgress, lessonId: 'chapter-2', completed: false });
    const allProgress = await getCourseProgress('hello-world');
    expect(allProgress).toHaveLength(3);
  });

  it('deletes all progress for a course', async () => {
    await saveProgress(mockProgress);
    await deleteCourseProgress('hello-world');
    const allProgress = await getCourseProgress('hello-world');
    expect(allProgress).toHaveLength(0);
  });

  it('returns undefined for non-existent progress', async () => {
    const progress = await getProgress('non-existent', 'lesson');
    expect(progress).toBeUndefined();
  });
});
