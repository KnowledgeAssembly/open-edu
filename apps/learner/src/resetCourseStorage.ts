import {
  deleteCourseProgress,
  deleteBadges,
  deleteAllCards,
  deleteNotesByCourse,
} from '@open-edu/storage';

export async function resetCourse(courseId: string): Promise<void> {
  const operations = [
    deleteCourseProgress(courseId),
    deleteBadges(courseId),
    deleteAllCards(),
    deleteNotesByCourse(courseId),
  ];

  const results = await Promise.allSettled(operations);

  const failures = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
  if (failures.length > 0) {
    console.warn(
      `[resetCourse] Some cleanup operations failed for "${courseId}":`,
      failures.map((f) => f.reason),
    );
  }
}
