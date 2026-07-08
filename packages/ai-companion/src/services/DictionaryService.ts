import type { DictionaryEntry } from '../providers/types.js';
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
  private exactIndex = new ExactIndex();
  private ftsIndex = new FlexSearchIndex();
  private loaded = false;

  async initialize(): Promise<void> {
    if (this.loaded) return;
    const loader = DictionaryLoader.getInstance();
    const entries = await loader.load();
    for (const entry of entries) {
      this.exactIndex.insert(entry.word, entry);
      this.ftsIndex.add(entry);
    }
    this.loaded = true;
  }

  lookupExact(word: string): DictionaryEntry | null {
    const direct = this.exactIndex.get(word);
    if (direct) return direct;

    const stripped = stripSuffix(word, PLURAL_SUFFIXES) ?? stripSuffix(word, VERB_SUFFIXES);
    if (stripped) {
      const resolved = this.exactIndex.get(stripped);
      if (resolved) return resolved;
    }

    const fuzzyResult = this.fuzzyMatch(word);
    if (fuzzyResult) return fuzzyResult;

    return null;
  }

  private fuzzyMatch(word: string): DictionaryEntry | null {
    const lower = word.toLowerCase();
    for (let len = lower.length; len >= 1; len--) {
      const prefix = lower.slice(0, len);
      const suggestions = this.exactIndex.getSuggestions(prefix, 10);
      if (suggestions.length === 0) continue;

      for (const candidate of suggestions) {
        if (editDistance(lower, candidate.toLowerCase()) <= 2) {
          return this.exactIndex.get(candidate);
        }
      }
    }

    const firstChar = lower[0];
    if (!firstChar) return null;
    const allSuggestions = this.exactIndex.getSuggestions(firstChar, 50);
    for (const candidate of allSuggestions) {
      if (
        Math.abs(candidate.length - lower.length) <= 2 &&
        editDistance(lower, candidate.toLowerCase()) <= 2
      ) {
        return this.exactIndex.get(candidate);
      }
    }

    return null;
  }

  searchFTS(query: string, limit = 10): DictionaryEntry[] {
    return this.ftsIndex.search(query, limit);
  }

  getSuggestions(prefix: string, limit = 10): string[] {
    return this.exactIndex.getSuggestions(prefix, limit);
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}
