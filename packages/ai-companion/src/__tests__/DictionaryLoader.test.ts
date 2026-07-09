import { describe, it, expect } from 'vitest';
import { DictionaryLoader, type PackageInfo } from '../data/DictionaryLoader.js';

describe('DictionaryLoader', () => {
  beforeEach(() => {
    DictionaryLoader.reset();
  });

  it('loads bundled dictionary with defaults applied', async () => {
    const loader = DictionaryLoader.getInstance();
    const entries = await loader.load();
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('word');
      expect(entry).toHaveProperty('language');
      expect(entry.language).toBe('en');
    }
  });

  it('returns cached entries on second call', async () => {
    const loader = DictionaryLoader.getInstance();
    const first = await loader.load();
    const second = await loader.load();
    expect(first).toBe(second);
  });

  it('loadPackage falls back on missing path', async () => {
    const loader = DictionaryLoader.getInstance();
    const packageInfo: PackageInfo = {
      basePath: '/nonexistent/path/v1.0.0',
      language: 'en',
      version: '1.0.0',
    };
    const result = await loader.loadPackage(packageInfo);
    expect(result.entries).toEqual([]);
    expect(result.manifest.language).toBe('en');
    expect(result.metadata.version).toBe('1.0.0');
  });
});

describe('DictionaryLoader backward compat', () => {
  beforeEach(() => {
    DictionaryLoader.reset();
  });

  it('applies defaults for missing id and language', async () => {
    const loader = DictionaryLoader.getInstance();
    const entries = await loader.load();
    for (const entry of entries) {
      expect(entry.id).toBeTruthy();
      expect(entry.language).toBe('en');
    }
  });

  it('getEntries returns entries after load', async () => {
    const loader = DictionaryLoader.getInstance();
    await loader.load();
    const entries = loader.getEntries();
    expect(entries.length).toBeGreaterThan(0);
  });

  it('all entries have definitions', async () => {
    const loader = DictionaryLoader.getInstance();
    const entries = await loader.load();
    for (const entry of entries) {
      expect(entry.definitions.length).toBeGreaterThan(0);
    }
  });
});
