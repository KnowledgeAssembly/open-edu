import { describe, it, expect, beforeEach } from 'vitest';
import { CacheService } from '../services/CacheService.js';

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService();
    cache.clear();
  });

  it('stores and retrieves string values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('stores and retrieves object values', () => {
    const obj = { name: 'test', count: 42 };
    cache.set('obj', obj);
    const result = cache.get<typeof obj>('obj');
    expect(result).toEqual(obj);
  });

  it('returns null for missing keys', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('respects custom TTL', async () => {
    cache.set('short', 'expires-fast', -1);
    expect(cache.get('short')).toBeNull();
  });

  it('deletes specific keys', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.delete('key1');
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBe('value2');
  });

  it('clears all entries', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.get('a')).toBeNull();
    expect(cache.get('b')).toBeNull();
  });

  it('overwrites existing keys', () => {
    cache.set('key', 'old');
    cache.set('key', 'new');
    expect(cache.get('key')).toBe('new');
  });

  it('handles boolean values', () => {
    cache.set('flag', true);
    expect(cache.get('flag')).toBe(true);
  });

  it('handles numeric values', () => {
    cache.set('count', 0);
    expect(cache.get('count')).toBe(0);
  });

  it('returns null after delete', () => {
    cache.set('temp', 'data');
    cache.delete('temp');
    expect(cache.get('temp')).toBeNull();
  });
});
