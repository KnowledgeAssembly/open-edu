import { openDatabase, type CardProgressData } from './db.js';

export async function saveCard(card: CardProgressData): Promise<void> {
  const db = await openDatabase();
  await db.put('cards', card);
}

export async function getCard(cardId: string): Promise<CardProgressData | undefined> {
  const db = await openDatabase();
  return db.get('cards', cardId);
}

export async function getAllCards(): Promise<CardProgressData[]> {
  const db = await openDatabase();
  return db.getAll('cards');
}

export async function deleteAllCards(): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('cards', 'readwrite');
  await tx.objectStore('cards').clear();
  await tx.done;
}
