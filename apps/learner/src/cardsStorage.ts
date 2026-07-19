import {
  saveCard as saveCardToDB,
  getCard as getCardFromDB,
  getAllCards as getAllFromDB,
  deleteAllCards as deleteAllFromDB,
  type CardProgressData,
} from '@open-edu/storage';

export type { CardProgressData };

export interface CardsData {
  [cardId: string]: CardProgressData;
}

export async function getAllCardProgress(): Promise<CardsData> {
  try {
    const records = await getAllFromDB();
    const data: CardsData = {};
    for (const record of records) {
      data[record.cardId] = record;
    }
    return data;
  } catch {
    return {};
  }
}

export async function getCardProgress(cardId: string): Promise<CardProgressData | null> {
  try {
    const record = await getCardFromDB(cardId);
    return record ?? null;
  } catch {
    return null;
  }
}

export async function saveCardProgress(cardId: string, level: number): Promise<void> {
  try {
    const existing = await getCardFromDB(cardId);
    if (!existing || level > existing.level) {
      await saveCardToDB({
        cardId,
        level,
        unlockedAt: existing?.unlockedAt ?? new Date().toISOString(),
      });
    }
  } catch {
    // IndexedDB unavailable
  }
}

export async function clearCardProgress(): Promise<void> {
  try {
    await deleteAllFromDB();
  } catch {
    // IndexedDB unavailable
  }
}
