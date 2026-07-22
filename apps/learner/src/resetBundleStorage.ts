import type { LoadedBundle } from '@open-edu/core';
import {
  deleteCourseProgress,
  deleteBadges,
  deleteAllCards,
  deleteNotesByCourse,
} from '@open-edu/storage';

export async function resetBundle(bundle: LoadedBundle): Promise<void> {
  const operations: Promise<void>[] = [
    deleteCourseProgress(bundle.manifest.id),
  ];

  for (const mod of bundle.manifest.modules) {
    operations.push(deleteCourseProgress(mod.id));
    operations.push(deleteBadges(mod.id));
    operations.push(deleteNotesByCourse(mod.id));
  }

  operations.push(deleteAllCards());

  const results = await Promise.allSettled(operations);

  const failures = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
  if (failures.length > 0) {
    console.warn(
      `[resetBundle] Some cleanup operations failed for "${bundle.manifest.id}":`,
      failures.map((f) => f.reason),
    );
  }
}
