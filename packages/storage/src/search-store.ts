import { openDatabase, type SearchIndex } from './db.js';

export async function saveSearchIndex(index: SearchIndex): Promise<void> {
  const db = await openDatabase();
  await db.put('search-indexes', index);
}

export async function getSearchIndex(locale: string): Promise<SearchIndex | undefined> {
  const db = await openDatabase();
  return db.get('search-indexes', locale);
}

export async function deleteSearchIndex(locale: string): Promise<void> {
  const db = await openDatabase();
  await db.delete('search-indexes', locale);
}
