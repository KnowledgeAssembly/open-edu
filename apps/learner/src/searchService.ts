import MiniSearch from 'minisearch';

export interface SearchResult {
  id: string;
  title: string;
  score: number;
}

export interface SearchDocument {
  id: string;
  title: string;
  content: string;
}

export function buildSearchIndex(documents: SearchDocument[]): MiniSearch {
  const index = new MiniSearch({
    fields: ['title', 'content'],
    storeFields: ['title'],
  });
  index.addAll(documents);
  return index;
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
