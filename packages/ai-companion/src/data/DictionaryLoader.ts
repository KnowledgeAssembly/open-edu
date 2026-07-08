import type { DictionaryEntry } from '../providers/types.js';

export class DictionaryLoader {
  private static instance: DictionaryLoader;
  private entries: DictionaryEntry[] | null = null;

  static getInstance(): DictionaryLoader {
    if (!DictionaryLoader.instance) {
      DictionaryLoader.instance = new DictionaryLoader();
    }
    return DictionaryLoader.instance;
  }

  async load(): Promise<DictionaryEntry[]> {
    if (this.entries) return this.entries;
    const data = await import('./dictionary.json');
    this.entries = data.default as DictionaryEntry[];
    return this.entries;
  }

  getEntries(): DictionaryEntry[] {
    if (!this.entries) throw new Error('Dictionary not loaded. Call load() first.');
    return this.entries;
  }
}
