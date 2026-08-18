import { openDatabase, type StoredPendingDraft } from './db.js';

export async function savePendingDraft(draft: StoredPendingDraft): Promise<void> {
  const db = await openDatabase();
  await db.put('pending-drafts', draft);
}

export async function getPendingDraft(id: string): Promise<StoredPendingDraft | undefined> {
  const db = await openDatabase();
  return db.get('pending-drafts', id);
}

export async function listPendingDraftsByCourse(courseId: string): Promise<StoredPendingDraft[]> {
  const db = await openDatabase();
  const all = await db.getAll('pending-drafts');
  return all.filter((d) => d.courseId === courseId);
}

export async function deletePendingDraft(id: string): Promise<void> {
  const db = await openDatabase();
  await db.delete('pending-drafts', id);
}
