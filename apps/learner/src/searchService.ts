import MiniSearch from 'minisearch';
import { saveSearchIndex, getSearchIndex } from '@open-edu/storage';

export interface SearchResult {
  id: string;
  title: string;
  score: number;
}

export interface SearchDocument {
  id: string;
  title: string;
  content: string;
  locale?: string;
}

let currentIndex: MiniSearch | null = null;

export async function buildSearchIndex(
  documents: SearchDocument[],
  locale = 'en',
): Promise<MiniSearch> {
  const index = new MiniSearch({
    fields: ['title', 'content'],
    storeFields: ['title', 'locale'],
  });
  index.addAll(documents);
  currentIndex = index;

  try {
    const serializable = index.toJSON();
    await saveSearchIndex({ locale, indexData: serializable as unknown as Record<string, unknown> });
  } catch {
    // If IndexedDB is unavailable, search still works in-memory
  }

  return index;
}

export async function loadSearchIndex(locale = 'en'): Promise<MiniSearch | null> {
  if (currentIndex) return currentIndex;

  try {
    const stored = await getSearchIndex(locale);
    if (stored?.indexData) {
      currentIndex = MiniSearch.loadJSON(
        JSON.stringify(stored.indexData),
        { fields: ['title', 'content'], storeFields: ['title', 'locale'] },
      );
      return currentIndex;
    }
  } catch {
    // IndexedDB unavailable
  }

  return null;
}

export function searchOffline(
  index: MiniSearch,
  query: string,
  limit = 10,
): SearchResult[] {
  const results = index.search(query, { prefix: true, fuzzy: 0.2 });
  return results.slice(0, limit).map((r) => ({
    id: r.id as string,
    title: (r as unknown as { title: string }).title,
    score: r.score,
  }));
}

export function resetSearchCache(): void {
  currentIndex = null;
}
