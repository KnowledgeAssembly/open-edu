import { openDatabase, type HistoryEntryRecord } from './db.js';

export type HistoryEntry = HistoryEntryRecord;

export async function saveHistoryEntry(entry: HistoryEntry): Promise<void> {
  const db = await openDatabase();
  await db.put('history', entry);
}

export async function getHistoryEntry(id: string): Promise<HistoryEntry | undefined> {
  const db = await openDatabase();
  return db.get('history', id);
}

export async function listHistory(workspaceId: string): Promise<HistoryEntry[]> {
  const db = await openDatabase();
  const entries = await db.getAllFromIndex('history', 'byWorkspace', workspaceId);
  return entries.sort((a, b) => b.timestamp - a.timestamp);
}

export async function listAllHistory(): Promise<HistoryEntry[]> {
  const db = await openDatabase();
  return db.getAll('history');
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  const db = await openDatabase();
  await db.delete('history', id);
}

export async function clearHistory(workspaceId: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('history', 'readwrite');
  const store = tx.objectStore('history');
  const index = store.index('byWorkspace');
  let cursor = await index.openKeyCursor(workspaceId);
  while (cursor) {
    await store.delete(cursor.primaryKey);
    cursor = await cursor.continue();
  }
  await tx.done;
}
