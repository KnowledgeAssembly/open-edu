import { openDatabase, type BadgeData } from './db.js';

export async function saveBadge(courseId: string, badgeNames: string[]): Promise<void> {
  const db = await openDatabase();
  await db.put('badges', { courseId, badgeNames });
}

export async function getBadges(courseId: string): Promise<string[]> {
  const db = await openDatabase();
  const record = await db.get('badges', courseId);
  return record?.badgeNames ?? [];
}

export async function getAllBadges(): Promise<BadgeData[]> {
  const db = await openDatabase();
  return db.getAll('badges');
}
