import { saveBadge, getBadges as getBadgesFromDB, getAllBadgeRecords } from '@open-edu/storage';

export interface BadgesData {
  [packageId: string]: string[];
}

export async function getAllBadges(): Promise<BadgesData> {
  try {
    const records = await getAllBadgeRecords();
    const result: BadgesData = {};
    for (const record of records) {
      result[record.courseId] = record.badgeNames;
    }
    return result;
  } catch {
    return {};
  }
}

export async function getBadges(packageId: string): Promise<string[]> {
  try {
    return await getBadgesFromDB(packageId);
  } catch {
    return [];
  }
}

export async function addBadge(packageId: string, badgeName: string): Promise<void> {
  try {
    const existing = await getBadgesFromDB(packageId);
    if (!existing.includes(badgeName)) {
      await saveBadge(packageId, [...existing, badgeName]);
    }
  } catch {
    // IndexedDB unavailable
  }
}
