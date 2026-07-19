import { describe, it, expect, beforeEach } from 'vitest';
import { saveSearchIndex, getSearchIndex, deleteSearchIndex } from '../search-store.js';
import { openDatabase, resetDatabase } from '../db.js';

describe('Search Index Store', () => {
  beforeEach(async () => {
    const db = await openDatabase();
    await db.clear('search-indexes');
    db.close();
    resetDatabase();
  });

  it('saves and retrieves a search index by locale', async () => {
    const index = { locale: 'en', indexData: { tokens: ['hello', 'world'] } };
    await saveSearchIndex(index);
    const result = await getSearchIndex('en');
    expect(result).toBeDefined();
    expect(result?.locale).toBe('en');
  });

  it('deletes a search index', async () => {
    await saveSearchIndex({ locale: 'es', indexData: {} });
    await deleteSearchIndex('es');
    const result = await getSearchIndex('es');
    expect(result).toBeUndefined();
  });
});
