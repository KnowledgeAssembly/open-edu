import { describe, it, expect } from 'vitest';
import { ExactIndex } from '../search/ExactIndex.js';
import type { DictionaryEntry } from '../providers/types.js';

function makeEntry(word: string, definition: string): DictionaryEntry {
  return {
    word,
    definitions: [{ definition }],
  };
}

describe('ExactIndex (Trie)', () => {
  it('inserts and retrieves words by exact match', () => {
    const index = new ExactIndex();
    index.insert('gravity', makeEntry('gravity', 'A natural force of attraction'));
    index.insert('photosynthesis', makeEntry('photosynthesis', 'Process in plants'));

    const gravity = index.get('gravity');
    expect(gravity).not.toBeNull();
    expect(gravity!.definitions[0]!.definition).toBe('A natural force of attraction');

    expect(index.get('photosynthesis')).not.toBeNull();
  });

  it('returns null for words not in the index', () => {
    const index = new ExactIndex();
    expect(index.get('unknown')).toBeNull();
  });

  it('is case-insensitive', () => {
    const index = new ExactIndex();
    index.insert('Gravity', makeEntry('gravity', 'A natural force'));

    expect(index.get('gravity')).not.toBeNull();
    expect(index.get('GRAVITY')).not.toBeNull();
    expect(index.get('Gravity')).not.toBeNull();
  });

  it('provides prefix suggestions', () => {
    const index = new ExactIndex();
    index.insert('photosynthesis', makeEntry('photosynthesis', ''));
    index.insert('photograph', makeEntry('photograph', ''));
    index.insert('photography', makeEntry('photography', ''));
    index.insert('physics', makeEntry('physics', ''));

    const suggestions = index.getSuggestions('photo');
    expect(suggestions).toContain('photograph');
    expect(suggestions).toContain('photography');
    expect(suggestions).toContain('photosynthesis');
    expect(suggestions).not.toContain('physics');
  });

  it('returns empty suggestions for unknown prefix', () => {
    const index = new ExactIndex();
    expect(index.getSuggestions('xyz')).toEqual([]);
  });

  it('respects limit on suggestions', () => {
    const index = new ExactIndex();
    for (let i = 0; i < 20; i++) {
      index.insert(`word${i}`, makeEntry(`word${i}`, ''));
    }
    const suggestions = index.getSuggestions('word', 5);
    expect(suggestions.length).toBe(5);
  });

  it('tracks size correctly', () => {
    const index = new ExactIndex();
    expect(index.size).toBe(0);

    index.insert('hello', makeEntry('hello', ''));
    expect(index.size).toBe(1);

    index.insert('world', makeEntry('world', ''));
    expect(index.size).toBe(2);
  });

  it('does not double-count duplicate insertions', () => {
    const index = new ExactIndex();
    index.insert('hello', makeEntry('hello', ''));
    index.insert('hello', makeEntry('hello', 'Updated'));
    expect(index.size).toBe(1);
    expect(index.get('hello')!.definitions[0]!.definition).toBe('Updated');
  });

  it('deletes words correctly', () => {
    const index = new ExactIndex();
    index.insert('hello', makeEntry('hello', ''));
    index.insert('world', makeEntry('world', ''));

    expect(index.delete('hello')).toBe(true);
    expect(index.has('hello')).toBe(false);
    expect(index.has('world')).toBe(true);
    expect(index.size).toBe(1);
  });

  it('returns false when deleting non-existent word', () => {
    const index = new ExactIndex();
    expect(index.delete('nothing')).toBe(false);
  });

  it('clears the index', () => {
    const index = new ExactIndex();
    index.insert('hello', makeEntry('hello', ''));
    index.insert('world', makeEntry('world', ''));
    index.clear();

    expect(index.size).toBe(0);
    expect(index.has('hello')).toBe(false);
    expect(index.has('world')).toBe(false);
  });

  it('handles empty string', () => {
    const index = new ExactIndex();
    index.insert('', makeEntry('', 'empty'));
    expect(index.get('')).not.toBeNull();
    expect(index.getSuggestions('')).toContain('');
  });

  it('performs basic smart matching for plural forms', () => {
    const index = new ExactIndex();
    index.insert('plant', makeEntry('plant', 'A living organism'));

    expect(index.has('plant')).toBe(true);
    expect(index.has('plants')).toBe(false);

    const suggestions = index.getSuggestions('plant');
    expect(suggestions).toContain('plant');
  });
});
