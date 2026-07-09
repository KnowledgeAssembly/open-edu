import type { DictionaryEntry } from '../providers/types.js';

export type SearchBuilderType = 'exact' | 'fts';

export interface SearchBuilder {
  readonly type: SearchBuilderType;

  build(entries: DictionaryEntry[]): void;

  load(data: unknown): void;

  search(query: string, limit?: number): DictionaryEntry[];

  autocomplete(prefix: string, limit?: number): string[];

  lookup(word: string): DictionaryEntry | null;
}
