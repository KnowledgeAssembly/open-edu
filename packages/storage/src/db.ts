import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface OpenEduDB extends DBSchema {
  'bundles': { key: string; value: unknown };
  'progress': { key: string; value: unknown };
  'rewards': { key: string; value: unknown };
  'settings': { key: string; value: unknown };
}

const DB_NAME = 'OpenEduDB';
const DB_VERSION = 1;

export async function openDatabase(): Promise<IDBPDatabase<OpenEduDB>> {
  const db = await openDB<OpenEduDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('bundles')) {
        db.createObjectStore('bundles', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('progress')) {
        db.createObjectStore('progress', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('rewards')) {
        db.createObjectStore('rewards', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    },
  });
  return db;
}
