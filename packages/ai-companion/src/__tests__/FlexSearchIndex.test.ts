import { describe, it, expect, beforeAll } from 'vitest';
import { FlexSearchIndex } from '../search/FlexSearchIndex.js';
import type { DictionaryEntry } from '../providers/types.js';
import type { SearchBuilder } from '../search/types.js';

function makeEntry(word: string, definition: string): DictionaryEntry {
  return {
    id: word,
    word,
    language: 'en',
    definitions: [{ definition }],
  };
}

describe('FlexSearchIndex', () => {
  let index: FlexSearchIndex;

  beforeAll(() => {
    index = new FlexSearchIndex();
    const entries: DictionaryEntry[] = [
      makeEntry('gravity', 'A natural force of attraction between objects with mass'),
      makeEntry('photosynthesis', 'The process by which plants convert light into energy'),
      makeEntry('mitosis', 'Cell division resulting in two identical daughter cells'),
      makeEntry('ecosystem', 'A community of interacting organisms and their environment'),
      makeEntry('quantum', 'The smallest discrete quantity of energy or matter'),
    ];
    index.addBatch(entries);
  });

  it('finds words by definition content', () => {
    const results = index.search('force');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.word === 'gravity')).toBe(true);
  });

  it('finds words by word name', () => {
    const results = index.search('photosynthesis');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.word).toBe('photosynthesis');
  });

  it('returns empty array for no matches', () => {
    const results = index.search('xyznonexistent');
    expect(results).toEqual([]);
  });

  it('performs prefix/partial matching', () => {
    const results = index.search('photo');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.word === 'photosynthesis')).toBe(true);
  });

  it('respects limit parameter', () => {
    const results = index.search('the', 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('handles removal and re-adding', () => {
    const testIndex = new FlexSearchIndex();
    testIndex.add(makeEntry('testword', 'a test word'));
    expect(testIndex.search('testword').length).toBeGreaterThan(0);

    testIndex.remove('testword');
    expect(testIndex.search('testword')).toEqual([]);

    testIndex.add(makeEntry('testword', 'a test word again'));
    expect(testIndex.search('testword').length).toBeGreaterThan(0);
  });

  it('handles clear', () => {
    const testIndex = new FlexSearchIndex();
    testIndex.add(makeEntry('temp', 'temporary word'));
    expect(testIndex.search('temp').length).toBeGreaterThan(0);

    testIndex.clear();
    expect(testIndex.search('temp')).toEqual([]);
  });

  it('isReady returns true after initialization', () => {
    const testIndex = new FlexSearchIndex();
    expect(testIndex.isReady()).toBe(false);
    testIndex.add(makeEntry('test', 'test entry'));
    expect(testIndex.isReady()).toBe(true);
  });
});

function searchBuilderConformanceTest(builder: SearchBuilder, label: string): void {
  describe(`SearchBuilder conformance (${label})`, () => {
    const entries = [
      makeEntry('testword', 'a test word for search'),
      makeEntry('another', 'another word entirely'),
    ];

    beforeAll(() => {
      builder.build(entries);
    });

    it('search returns matching entries', () => {
      const result = builder.search('testword');
      expect(result.length).toBeGreaterThan(0);
    });

    it('autocomplete returns suggestions', () => {
      const suggestions = builder.autocomplete('test');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('lookup exact word', () => {
      const result = builder.lookup('another');
      expect(result).not.toBeNull();
      expect(result!.word).toBe('another');
    });

    it('lookup returns null for missing word', () => {
      expect(builder.lookup('nonexistent')).toBeNull();
    });

    it('load restores index from serialized data', () => {
      const newBuilder = new FlexSearchIndex();
      newBuilder.load({
        entries: [{ word: 'loaded', entry: makeEntry('loaded', 'loaded from data') }],
      });
      const results = newBuilder.search('loaded');
      expect(results.length).toBeGreaterThan(0);
    });
  });
}

const builderForFlex = new FlexSearchIndex();
searchBuilderConformanceTest(builderForFlex, 'FlexSearchIndex');
