import { openDatabase, type WorkspaceSearchIndexRecord } from './db.js';

/**
 * Persisted, rebuildable derived search index (SPEC §41). Deleting it never
 * invalidates the course; it can always be rebuilt from CourseWorkspace.
 */
export async function saveWorkspaceSearchIndex(record: WorkspaceSearchIndexRecord): Promise<void> {
  const db = await openDatabase();
  await db.put('searchIndex', record);
}

export async function getWorkspaceSearchIndex(
  id: string,
): Promise<WorkspaceSearchIndexRecord | undefined> {
  const db = await openDatabase();
  return db.get('searchIndex', id);
}

export async function listWorkspaceSearchIndexes(
  workspaceId: string,
): Promise<WorkspaceSearchIndexRecord[]> {
  const db = await openDatabase();
  return db.getAllFromIndex('searchIndex', 'byWorkspace', workspaceId);
}

export async function deleteWorkspaceSearchIndex(id: string): Promise<void> {
  const db = await openDatabase();
  await db.delete('searchIndex', id);
}

export async function clearWorkspaceSearchIndexes(workspaceId: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('searchIndex', 'readwrite');
  const store = tx.objectStore('searchIndex');
  const index = store.index('byWorkspace');
  let cursor = await index.openKeyCursor(workspaceId);
  while (cursor) {
    await store.delete(cursor.primaryKey);
    cursor = await cursor.continue();
  }
  await tx.done;
}
