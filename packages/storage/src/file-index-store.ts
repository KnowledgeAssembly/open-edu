import { openDatabase, type IndexedFile } from './db.js';

export async function putFileIndexRecord(record: IndexedFile): Promise<void> {
  const db = await openDatabase();
  await db.put('files', record);
}

export async function getFileIndexRecord(id: string): Promise<IndexedFile | undefined> {
  const db = await openDatabase();
  return db.get('files', id);
}

export async function listFileIndexRecords(workspaceId: string): Promise<IndexedFile[]> {
  const db = await openDatabase();
  return db.getAllFromIndex('files', 'byWorkspace', workspaceId);
}

export async function listAllFileIndexRecords(): Promise<IndexedFile[]> {
  const db = await openDatabase();
  return db.getAll('files');
}

export async function deleteFileIndexRecord(id: string): Promise<void> {
  const db = await openDatabase();
  await db.delete('files', id);
}

export async function clearFileIndex(workspaceId: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('files', 'readwrite');
  const store = tx.objectStore('files');
  const index = store.index('byWorkspace');
  let cursor = await index.openKeyCursor(workspaceId);
  while (cursor) {
    await store.delete(cursor.primaryKey);
    cursor = await cursor.continue();
  }
  await tx.done;
}
