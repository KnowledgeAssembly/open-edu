import type { DictionaryEntry } from '../providers/types.js';

export interface SearchBuilder {
  build(entries: DictionaryEntry[]): void;

  load(data: unknown): void;

  search(query: string, limit?: number): DictionaryEntry[];

  autocomplete(prefix: string, limit?: number): string[];

  lookup(word: string): DictionaryEntry | null;
}
