const STORAGE_KEY = 'open-edu-cards';

export interface CardProgress {
  level: number;
  unlockedAt: string;
}

export interface CardsData {
  [cardId: string]: CardProgress;
}

export function getAllCardProgress(): CardsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CardsData;
  } catch {
    return {};
  }
}

export function getCardProgress(cardId: string): CardProgress | null {
  const all = getAllCardProgress();
  return all[cardId] ?? null;
}

export function saveCardProgress(cardId: string, level: number): void {
  try {
    const all = getAllCardProgress();
    const existing = all[cardId];
    if (!existing || level > existing.level) {
      all[cardId] = { level, unlockedAt: existing?.unlockedAt ?? new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
  } catch {
    // localStorage unavailable
  }
}

export function clearCardProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable
  }
}
