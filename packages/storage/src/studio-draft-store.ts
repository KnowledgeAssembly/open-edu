import { openDatabase, type StoredStudioDraft } from './db.js';

export async function saveStudioDraft(draft: StoredStudioDraft): Promise<void> {
  const db = await openDatabase();
  await db.put('studio-drafts', draft);
}

export async function getStudioDraft(id: string): Promise<StoredStudioDraft | undefined> {
  const db = await openDatabase();
  return db.get('studio-drafts', id);
}

export async function listStudioDrafts(): Promise<StoredStudioDraft[]> {
  const db = await openDatabase();
  return db.getAll('studio-drafts');
}

export async function listStudioDraftsByCourse(courseId: string): Promise<StoredStudioDraft[]> {
  const db = await openDatabase();
  const all = await db.getAll('studio-drafts');
  return all.filter((draft) => draft.courseId === courseId);
}

export async function deleteStudioDraft(id: string): Promise<void> {
  const db = await openDatabase();
  await db.delete('studio-drafts', id);
}
