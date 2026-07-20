import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { buildSearchIndex, searchOffline, loadSearchIndex, resetSearchCache } from '../searchService.js';
import { resetDatabase } from '@open-edu/storage';

describe('searchService', () => {
  beforeEach(() => {
    resetSearchCache();
    resetDatabase();
  });

  const docs = [
    { id: 'course-1', title: 'Introduction to Math', content: 'Learn basic arithmetic' },
    { id: 'course-2', title: 'Advanced Physics', content: 'Quantum mechanics basics' },
    { id: 'course-3', title: 'History 101', content: 'World history overview' },
  ];

  it('builds an index and returns it', async () => {
    const index = await buildSearchIndex(docs);
    expect(index).toBeDefined();
  });

  it('searches the index', async () => {
    const index = await buildSearchIndex(docs);
    const results = searchOffline(index, 'math');
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe('course-1');
  });

  it('returns empty for no matches', async () => {
    const index = await buildSearchIndex(docs);
    const results = searchOffline(index, 'nonexistent');
    expect(results).toHaveLength(0);
  });

  it('persists and loads index from IndexedDB', async () => {
    await buildSearchIndex(docs, 'en');
    resetSearchCache();

    const loaded = await loadSearchIndex('en');
    expect(loaded).not.toBeNull();
    const results = searchOffline(loaded!, 'physics');
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe('course-2');
  });

  it('returns null when no stored index exists', async () => {
    const loaded = await loadSearchIndex('fr');
    expect(loaded).toBeNull();
  });
});
