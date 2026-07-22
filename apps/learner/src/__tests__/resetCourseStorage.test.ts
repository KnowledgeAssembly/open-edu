import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetCourse } from '../resetCourseStorage';

vi.mock('@open-edu/storage', () => ({
  deleteCourseProgress: vi.fn().mockResolvedValue(undefined),
  deleteBadges: vi.fn().mockResolvedValue(undefined),
  deleteAllCards: vi.fn().mockResolvedValue(undefined),
  deleteNotesByCourse: vi.fn().mockResolvedValue(undefined),
}));

import {
  deleteCourseProgress,
  deleteBadges,
  deleteAllCards,
  deleteNotesByCourse,
} from '@open-edu/storage';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resetCourse', () => {
  it('deletes progress, badges, cards, and notes for the given courseId', async () => {
    await resetCourse('my-course');

    expect(deleteCourseProgress).toHaveBeenCalledWith('my-course');
    expect(deleteBadges).toHaveBeenCalledWith('my-course');
    expect(deleteAllCards).toHaveBeenCalled();
    expect(deleteNotesByCourse).toHaveBeenCalledWith('my-course');
  });

  it('succeeds even when individual deletions throw', async () => {
    vi.mocked(deleteCourseProgress).mockRejectedValueOnce(new Error('DB error'));
    vi.mocked(deleteBadges).mockRejectedValueOnce(new Error('DB error'));

    await expect(resetCourse('my-course')).resolves.toBeUndefined();
  });
});
