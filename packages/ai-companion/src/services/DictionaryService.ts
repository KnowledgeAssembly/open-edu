import type { DictionaryEntry } from '../providers/types.js';
import type { SearchBuilder } from '../search/types.js';
import type { PackageInfo } from '../data/DictionaryLoader.js';
import { ExactIndex } from '../search/ExactIndex.js';
import { FlexSearchIndex } from '../search/FlexSearchIndex.js';
import { DictionaryLoader } from '../data/DictionaryLoader.js';

const PLURAL_SUFFIXES = [/^(.+)ies$/, /^(.+)es$/, /^(.+)s$/];
const VERB_SUFFIXES = [/^(.+)ing$/, /^(.+)ed$/, /^(.+)en$/];

function stripSuffix(word: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = word.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[m]![n]!;
}

export class DictionaryService {
  private loaded = false;
  private packageInfo?: PackageInfo;

  constructor(
    private searchBuilders: SearchBuilder[],
    private loader: DictionaryLoader,
  ) {}

  static createDefault(packageInfo?: PackageInfo): DictionaryService {
    const service = new DictionaryService(
      [new ExactIndex(), new FlexSearchIndex()],
      DictionaryLoader.getInstance(),
    );
    if (packageInfo) {
      service.packageInfo = packageInfo;
    }
    return service;
  }

  async initialize(): Promise<void> {
    if (this.loaded) return;
    const entries = await this.loader.load();
    for (const builder of this.searchBuilders) {
      builder.build(entries);
    }
    this.loaded = true;
  }

  lookupExact(word: string): DictionaryEntry | null {
    for (const builder of this.searchBuilders) {
      const result = builder.lookup(word);
      if (result) return result;
    }

    const stripped = stripSuffix(word, PLURAL_SUFFIXES) ?? stripSuffix(word, VERB_SUFFIXES);
    if (stripped) {
      for (const builder of this.searchBuilders) {
        const result = builder.lookup(stripped);
        if (result) return result;
      }
    }

    const fuzzyResult = this.fuzzyMatch(word);
    if (fuzzyResult) return fuzzyResult;

    return null;
  }

  private fuzzyMatch(word: string): DictionaryEntry | null {
    const lower = word.toLowerCase();
    const primary = this.searchBuilders[0];
    if (!primary) return null;

    for (let len = lower.length; len >= 1; len--) {
      const prefix = lower.slice(0, len);
      const suggestions = primary.autocomplete(prefix, 10);
      if (suggestions.length === 0) continue;

      for (const candidate of suggestions) {
        if (editDistance(lower, candidate.toLowerCase()) <= 2) {
          return primary.lookup(candidate);
        }
      }
    }

    const firstChar = lower[0];
    if (!firstChar) return null;
    const allSuggestions = primary.autocomplete(firstChar, 50);
    for (const candidate of allSuggestions) {
      if (
        Math.abs(candidate.length - lower.length) <= 2 &&
        editDistance(lower, candidate.toLowerCase()) <= 2
      ) {
        return primary.lookup(candidate);
      }
    }

    return null;
  }

  searchFTS(query: string, limit = 10): DictionaryEntry[] {
    const fts = this.searchBuilders.find((b) => b.type === 'fts');
    if (fts) return fts.search(query, limit);
    return this.searchBuilders[0]?.search(query, limit) ?? [];
  }

  async searchRemote(query: string, limit = 10): Promise<DictionaryEntry[]> {
    if (!this.packageInfo) return [];
    try {
      const res = await fetch(
        `/api/dictionary/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      );
      if (!res.ok) return [];
      return (await res.json()) as DictionaryEntry[];
    } catch {
      return [];
    }
  }

  getSuggestions(prefix: string, limit = 10): string[] {
    const exact = this.searchBuilders.find((b) => b.type === 'exact');
    if (exact) return exact.autocomplete(prefix, limit);
    return this.searchBuilders[0]?.autocomplete(prefix, limit) ?? [];
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}
