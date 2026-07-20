import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { getAllCardProgress, getCardProgress, saveCardProgress, clearCardProgress } from '../cardsStorage';
import { deleteAllCards } from '@open-edu/storage';

describe('cardsStorage (IndexedDB)', () => {
  beforeEach(async () => {
    await deleteAllCards();
  });

  it('returns empty data initially', async () => {
    const all = await getAllCardProgress();
    expect(all).toEqual({});
  });

  it('saves and retrieves card progress', async () => {
    await saveCardProgress('card-1', 2);
    const card = await getCardProgress('card-1');
    expect(card).toMatchObject({ cardId: 'card-1', level: 2 });
    expect(card?.unlockedAt).toBeDefined();
  });

  it('only upgrades level, never downgrades', async () => {
    await saveCardProgress('card-1', 3);
    await saveCardProgress('card-1', 1);
    const card = await getCardProgress('card-1');
    expect(card?.level).toBe(3);
  });

  it('returns null for unknown card', async () => {
    const card = await getCardProgress('nonexistent');
    expect(card).toBeNull();
  });

  it('clears all cards', async () => {
    await saveCardProgress('card-1', 1);
    await saveCardProgress('card-2', 2);
    await clearCardProgress();
    const all = await getAllCardProgress();
    expect(all).toEqual({});
  });

  it('returns all cards as a map', async () => {
    await saveCardProgress('card-a', 1);
    await saveCardProgress('card-b', 3);
    const all = await getAllCardProgress();
    expect(Object.keys(all)).toHaveLength(2);
    expect(all['card-a']?.level).toBe(1);
    expect(all['card-b']?.level).toBe(3);
  });

  it('preserves unlockedAt timestamp on upgrade', async () => {
    await saveCardProgress('card-1', 1);
    const before = await getCardProgress('card-1');
    await saveCardProgress('card-1', 2);
    const after = await getCardProgress('card-1');
    expect(after?.unlockedAt).toBe(before?.unlockedAt);
    expect(after?.level).toBe(2);
  });

  it('generates unlockedAt for new cards', async () => {
    await saveCardProgress('card-1', 1);
    const card = await getCardProgress('card-1');
    expect(card?.unlockedAt).toBeTruthy();
    expect(new Date(card!.unlockedAt).getTime()).toBeGreaterThan(0);
  });
});
