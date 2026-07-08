import type { DictionaryEntry } from '../providers/types.js';
import { Document } from 'flexsearch';

interface FlexSearchDoc {
  [key: string]: string;
  id: string;
  word: string;
  definition: string;
  phonetic: string;
}

export class FlexSearchIndex {
  private index: Document<FlexSearchDoc> | null = null;
  private ready = false;
  private entries = new Map<string, DictionaryEntry>();

  ensureIndex(): Document<FlexSearchDoc> {
    if (this.index) return this.index;
    this.index = new Document<FlexSearchDoc>({
      document: {
        id: 'id',
        index: ['word', 'definition', 'phonetic'],
        store: ['word'],
      },
      tokenize: 'forward',
      cache: true,
    });
    this.ready = true;
    return this.index;
  }

  add(entry: DictionaryEntry): void {
    const idx = this.ensureIndex();
    const doc: FlexSearchDoc = {
      id: entry.word.toLowerCase(),
      word: entry.word,
      definition: entry.definitions.map((d) => d.definition).join(' '),
      phonetic: entry.phonetic ?? '',
    };
    idx.add(doc);
    this.entries.set(entry.word.toLowerCase(), entry);
  }

  addBatch(entries: DictionaryEntry[]): void {
    for (const entry of entries) {
      this.add(entry);
    }
  }

  search(query: string, limit = 10): DictionaryEntry[] {
    const idx = this.ensureIndex();
    type SearchResult = { field: string; result: { id: string }[] };
    const results = idx.search(query, limit, { enrich: true }) as unknown as SearchResult[];
    if (!results || results.length === 0) return [];
    const fieldResult = results[0];
    if (!fieldResult || !fieldResult.result) return [];
    const seen = new Set<string>();
    const output: DictionaryEntry[] = [];
    for (const item of fieldResult.result) {
      const id = typeof item === 'string' ? item : item.id;
      if (seen.has(id)) continue;
      seen.add(id);
      const entry = this.entries.get(id);
      if (entry) {
        output.push(entry);
        if (output.length >= limit) break;
      }
    }
    return output;
  }

  remove(word: string): void {
    const idx = this.ensureIndex();
    const id = word.toLowerCase();
    idx.remove(id);
    this.entries.delete(id);
  }

  clear(): void {
    if (this.index) {
      this.index.clear();
    }
    this.entries.clear();
  }

  isReady(): boolean {
    return this.ready;
  }
}
