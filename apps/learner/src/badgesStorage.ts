const STORAGE_KEY = 'open-edu-badges';

export interface BadgesData {
  [packageId: string]: string[];
}

export function getAllBadges(): BadgesData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as BadgesData;
  } catch {
    return {};
  }
}

export function getBadges(packageId: string): string[] {
  const all = getAllBadges();
  return all[packageId] ?? [];
}

export function addBadge(packageId: string, badgeName: string): void {
  try {
    const all = getAllBadges();
    const badges = all[packageId] ?? [];
    if (!badges.includes(badgeName)) {
      badges.push(badgeName);
      all[packageId] = badges;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
  } catch {
    // localStorage unavailable
  }
}
