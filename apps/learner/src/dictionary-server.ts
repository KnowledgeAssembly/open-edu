import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import type { IncomingMessage, ServerResponse } from 'node:http';

interface DictionaryEntry {
  id: string;
  word: string;
  language: string;
  phonetic?: string;
  pronunciations?: { text: string; audioUrl?: string }[];
  partOfSpeech?: string;
  definitions: { definition: string; example?: string }[];
  synonyms?: string[];
  antonyms?: string[];
  relatedWords?: string[];
  translations?: Record<string, string>;
}

interface PackageManifest {
  files: { dictionary: string; metadata: string };
  wordCount: number;
  compressed: boolean;
}

function bisectLeft(sorted: string[], target: string): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((sorted[mid] ?? '').toLowerCase() < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

let entries: Map<string, DictionaryEntry> | null = null;
let words: string[] = [];

export function loadDictionary(dictionaryDir: string): boolean {
  try {
    const baseDir = join(dictionaryDir, 'en/v1.0.0');
    const manifestPath = join(baseDir, 'manifest.json');
    if (!existsSync(manifestPath)) return false;

    const manifest: PackageManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    const dictFile = manifest.files.dictionary;
    const dictPath = join(baseDir, dictFile);
    if (!existsSync(dictPath)) return false;

    let data: DictionaryEntry[];
    if (dictFile.endsWith('.gz')) {
      data = JSON.parse(gunzipSync(readFileSync(dictPath)).toString('utf-8'));
    } else {
      data = JSON.parse(readFileSync(dictPath, 'utf-8')) as DictionaryEntry[];
    }

    entries = new Map(data.map((e) => [e.word, e]));
    words = data.map((e) => e.word).sort((a, b) => a.localeCompare(b));
    console.log(`[DictionaryServer] Loaded ${entries.size} entries`);
    return true;
  } catch (err) {
    console.error('[DictionaryServer] Failed to load dictionary:', err);
    return false;
  }
}

export function handleDictionaryRequest(
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  const url = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`);
  const pathname = url.pathname;

  if (!pathname.startsWith('/api/dictionary/')) return false;

  res.setHeader('Content-Type', 'application/json');

  if (pathname === '/api/dictionary/lookup') {
    const word = url.searchParams.get('word') ?? '';
    const result = entries?.get(word) ?? null;
    res.end(JSON.stringify(result));
    return true;
  }

  if (pathname === '/api/dictionary/autocomplete') {
    const prefix = url.searchParams.get('prefix') ?? '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '10', 10), 50);
    const result = [];
    if (entries && prefix) {
      const lower = prefix.toLowerCase();
      let start = bisectLeft(words, lower);
      for (let i = start; i < words.length && result.length < limit; i++) {
        const w = words[i]!;
        if (w.toLowerCase().startsWith(lower)) result.push(w);
        else break;
      }
    }
    res.end(JSON.stringify(result));
    return true;
  }

  if (pathname === '/api/dictionary/search') {
    const query = url.searchParams.get('q') ?? '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '10', 10), 50);
    const result: DictionaryEntry[] = [];

    if (entries && query) {
      const lower = query.toLowerCase();
      const exact = entries.get(query);
      if (exact) result.push(exact);

      for (const word of words) {
        if (result.length >= limit) break;
        if (result.includes(entries.get(word)!)) continue;
        const entry = entries.get(word)!;
        if (word.toLowerCase().startsWith(lower)) {
          if (!result.includes(entry)) result.push(entry);
        }
      }

      for (const [word, entry] of entries) {
        if (result.length >= limit) break;
        if (result.includes(entry) || word === query) continue;
        const defText = entry.definitions.map((d) => d.definition).join(' ').toLowerCase();
        if (defText.includes(lower)) result.push(entry);
      }
    }

    res.end(JSON.stringify(result.slice(0, limit)));
    return true;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not found' }));
  return true;
}
