import { openDatabase, type UserPreferences } from './db.js';

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  const db = await openDatabase();
  await db.put('preferences', prefs);
}

export async function getPreferences(locale: string): Promise<UserPreferences | undefined> {
  const db = await openDatabase();
  return db.get('preferences', locale);
}

export async function deletePreferences(locale: string): Promise<void> {
  const db = await openDatabase();
  await db.delete('preferences', locale);
}
