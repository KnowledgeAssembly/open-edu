import { describe, it, expect, beforeAll } from 'vitest';
import { DictionaryService } from '../services/DictionaryService.js';

describe('DictionaryService', () => {
  let service: DictionaryService;

  beforeAll(async () => {
    service = new DictionaryService();
    await service.initialize();
  });

  it('finds exact word match', () => {
    const result = service.lookupExact('gravity');
    expect(result).not.toBeNull();
    expect(result!.word).toBe('gravity');
    expect(result!.definitions.length).toBeGreaterThan(0);
  });

  it('resolves plural forms to singular', () => {
    const result = service.lookupExact('ecosystems');
    expect(result).not.toBeNull();
    expect(result!.word).toBe('ecosystem');
  });

  it('resolves verb -ing forms', () => {
    const result = service.lookupExact('photosynthesising');
    expect(result).not.toBeNull();
    expect(result!.word).toBe('photosynthesis');
  });

  it('returns null for unknown words', () => {
    const result = service.lookupExact('xyznonexistent');
    expect(result).toBeNull();
  });

  it('performs FTS search by definition content', () => {
    const results = service.searchFTS('force');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.word === 'gravity')).toBe(true);
  });

  it('performs FTS search by word name', () => {
    const results = service.searchFTS('mitosis');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.word).toBe('mitosis');
  });

  it('returns suggestions for prefixes', () => {
    const suggestions = service.getSuggestions('photo');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions).toContain('photosynthesis');
  });

  it('handles edit distance for near matches', () => {
    const result = service.lookupExact('gravitty');
    expect(result).not.toBeNull();
    expect(result!.word).toBe('gravity');
  });

  it('reports loaded state', () => {
    expect(service.isLoaded()).toBe(true);
  });

  it('respects limit on FTS results', () => {
    const results = service.searchFTS('the', 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('handles empty string', () => {
    const result = service.lookupExact('');
    expect(result).toBeNull();
  });

  it('resolves verb -ed forms', () => {
    const result = service.lookupExact('gravityed');
    expect(result).not.toBeNull();
    expect(result!.word).toBe('gravity');
  });
});
