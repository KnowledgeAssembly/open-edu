import { openDatabase, type StoredBundle } from './db.js';

export async function saveBundle(bundle: StoredBundle): Promise<void> {
  const db = await openDatabase();
  await db.put('bundles', bundle);
}

export async function getBundle(id: string): Promise<StoredBundle | undefined> {
  const db = await openDatabase();
  return db.get('bundles', id);
}

export async function listBundles(): Promise<StoredBundle[]> {
  const db = await openDatabase();
  return db.getAll('bundles');
}

export async function replaceBundle(bundleId: string, bundle: StoredBundle): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('bundles', 'readwrite');
  const store = tx.objectStore('bundles');
  const existing = await store.get(bundleId);
  if (!existing) {
    throw new Error(`Bundle "${bundleId}" is not installed`);
  }
  await store.put(bundle);
  await tx.done;
}

export async function deleteBundle(id: string): Promise<void> {
  const db = await openDatabase();
  await db.delete('bundles', id);
}
