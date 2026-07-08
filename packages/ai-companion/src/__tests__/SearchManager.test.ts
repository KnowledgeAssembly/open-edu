import { describe, it, expect, beforeAll } from 'vitest';
import { SearchManager } from '../services/SearchManager.js';
import { DictionaryService } from '../services/DictionaryService.js';
import { CacheService } from '../services/CacheService.js';

describe('SearchManager', () => {
  let searchManager: SearchManager;
  let cacheService: CacheService;

  beforeAll(async () => {
    cacheService = new CacheService();
    const dictService = new DictionaryService();
    await dictService.initialize();
    searchManager = new SearchManager(dictService, cacheService);
  });

  it('returns instant exact match result', () => {
    const response = searchManager.search('gravity');
    expect(response.instant.entry).not.toBeNull();
    expect(response.instant.entry!.word).toBe('gravity');
    expect(response.instant.suggestions).toEqual([]);
  });

  it('returns suggestions when no exact match', () => {
    const response = searchManager.search('photo');
    expect(response.instant.entry).toBeNull();
    expect(response.instant.suggestions.length).toBeGreaterThan(0);
  });

  it('returns enriched results with FTS matches', async () => {
    const response = searchManager.search('gravity');
    const enriched = await response.enriched;
    expect(enriched.ftsResults.length).toBeGreaterThan(0);
  });

  it('checks AI cache as part of enrichment', async () => {
    cacheService.set('ai:test-word', 'cached explanation');
    const response = searchManager.search('test-word');
    const enriched = await response.enriched;
    expect(enriched.cachedAiResponse).toBe('cached explanation');
  });

  it('returns empty course references when no context', async () => {
    const response = searchManager.search('gravity');
    const enriched = await response.enriched;
    expect(enriched.courseReferences).toEqual([]);
  });

  it('finds course references from context page content', async () => {
    const response = searchManager.search('mitosis', {
      lessonTitle: 'Cell Biology',
      pageContent:
        'Mitosis is the process of cell division. It creates two identical daughter cells. Meiosis is different.',
    });
    const enriched = await response.enriched;
    expect(enriched.courseReferences.length).toBeGreaterThan(0);
    expect(enriched.courseReferences[0]!.title).toBe('Cell Biology');
  });

  it('normalizes query case', () => {
    const response = searchManager.search('GRAVITY');
    expect(response.instant.entry).not.toBeNull();
  });

  it('handles query with no matches', async () => {
    const response = searchManager.search('xyznonexistent12345');
    expect(response.instant.entry).toBeNull();
    expect(response.instant.suggestions).toEqual([]);
    const enriched = await response.enriched;
    expect(enriched.ftsResults).toEqual([]);
    expect(enriched.cachedAiResponse).toBeNull();
  });
});
