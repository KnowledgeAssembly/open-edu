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

interface FDApiResponse {
  word: string;
  entries: FDApiEntry[];
  source: { url: string; license: { name: string; url: string } };
}

interface FDApiEntry {
  language: { code: string; name: string };
  partOfSpeech: string;
  pronunciations?: { type: string; text: string; tags?: string[] }[];
  senses: FDApiSense[];
  synonyms?: string[];
  antonyms?: string[];
}

interface FDApiSense {
  definition: string;
  tags?: string[];
  examples?: string[];
  synonyms?: string[];
  antonyms?: string[];
}

const FD_API_BASE = 'https://freedictionaryapi.com/api/v1/entries/en';

function cleanWikitext(text: string): string {
  let result = text;
  let prev: string;
  do {
    prev = result;
    result = result.replace(/\{\{[^{}]*\{\{[^{}]*\}\}[^{}]*\}\}/g, '');
    result = result.replace(/\{\{[^{}]+\}\}/g, '');
    result = result.replace(/\{\{[^}]*$/gm, '');
  } while (result !== prev);
  result = result.replace(/<!--[\s\S]*?-->/g, '');
  result = result.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '');
  result = result.replace(/<\/?[a-z]+[^>]*>/gi, '');
  result = result.replace(/&apos;/g, "'");
  result = result.replace(/&amp;/g, '&');
  result = result.replace(/&quot;/g, '"');
  result = result.replace(/&lt;/g, '<');
  result = result.replace(/&gt;/g, '>');
  result = result.replace(/&#39;/g, "'");
  result = result.replace(/&#\d+;/g, '');
  result = result.replace(/https?:\/\/\S+/g, '');
  result = result.replace(/[ \t]+/g, ' ');
  result = result.replace(/\s*,\s*\.\s*$/g, '.');
  result = result.replace(/^\s*;\s*/g, '');
  result = result.replace(/\s+or\s*;\s*/g, '; ');
  result = result.replace(/\s*;\s*,\s*/g, '; ');
  result = result.replace(/\s*\(\)\s*/g, ' ');
  result = result.replace(/\s+of the genus\s*\.?\s*/g, ' ');
  result = result.replace(/\s+of species\s*\.?\s*/g, ' ');
  result = result.replace(/\s+of the family\s*:\s*/g, ' ');
  result = result.replace(/\s*,\s*etc\.?\s*$/i, '.');
  result = result.replace(/\s+\.\s*/g, '. ');
  return result.trim();
}

function isPrimaryDefinition(text: string): boolean {
  const line = text.trim();
  if (!line) return false;
  if (/^[:.\s]+$/.test(line)) return false;
  if (/^\*/.test(line.replace(/^[#:*]+\s*/, ''))) return false;
  if (/^[\s:.*#]*$/.test(line)) return false;
  return true;
}

function stripMarkers(text: string): string {
  return text.replace(/^[#:*]+\s*/gm, '').trim();
}

function cleanPhonetic(phonetic: string | undefined): string | undefined {
  if (!phonetic) return undefined;
  // FDApi returns /ˈæp.əl/ — strip the slashes, popover adds them back
  const matched = phonetic.match(/^\/?(.+?)\/?$/);
  const cleaned = matched?.[1]?.trim();
  if (!cleaned) return undefined;
  // If still looks like raw wikitext (contains | or [), take first variant
  if (/[|[|]/.test(cleaned)) {
    return cleaned.split(/[/[|]/)[0]?.trim() || undefined;
  }
  return cleaned;
}

function cleanEntry(entry: DictionaryEntry): DictionaryEntry {
  const cleaned = entry.definitions
    .map((d) => ({
      definition: cleanWikitext(stripMarkers(d.definition)),
      example: d.example,
    }))
    .filter(
      (d) =>
        d.definition.length > 3 &&
        /[a-zA-Z]{3,}/.test(d.definition) &&
        isPrimaryDefinition(d.definition),
    );
  return {
    ...entry,
    definitions: cleaned.length > 0 ? cleaned : [{ definition: entry.word }],
    phonetic: cleanPhonetic(entry.phonetic),
    synonyms: entry.synonyms
      ?.map((s) => cleanWikitext(s))
      .filter((s) => s.length > 0 && /[a-zA-Z]/.test(s))
      .slice(0, 10),
  };
}

/* ---------- LRU cache for FreeDictionaryAPI responses ---------- */

class LRUCache<V> {
  private max: number;
  private map: Map<string, V>;
  constructor(max: number) {
    this.max = max;
    this.map = new Map();
  }
  get(key: string): V | undefined {
    const val = this.map.get(key);
    if (val !== undefined) {
      this.map.delete(key);
      this.map.set(key, val);
    }
    return val;
  }
  set(key: string, val: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.max) {
      const first = this.map.keys().next().value;
      if (first !== undefined) this.map.delete(first);
    }
    this.map.set(key, val);
  }
  has(key: string): boolean {
    return this.map.has(key);
  }
  get size(): number {
    return this.map.size;
  }
}

const fdCache = new LRUCache<DictionaryEntry>(500);

/* ---------- FreeDictionaryAPI client ---------- */

function mapFDApiToEntry(word: string, data: FDApiResponse): DictionaryEntry {
  const defs: { definition: string; example?: string }[] = [];
  const syns = new Set<string>();
  const ants = new Set<string>();
  let phonetic: string | undefined;
  let partOfSpeech: string | undefined;

  for (const entry of data.entries) {
    if (!partOfSpeech && entry.partOfSpeech) partOfSpeech = entry.partOfSpeech;
    if (!phonetic && entry.pronunciations) {
      const ipa = entry.pronunciations.find((p) => p.type === 'ipa' || p.type === 'IPA');
      if (ipa) {
        phonetic = ipa.text;
      } else if (entry.pronunciations.length > 0) {
        phonetic = entry.pronunciations[0]!.text;
      }
    }
    for (const s of entry.synonyms ?? []) syns.add(s);
    for (const a of entry.antonyms ?? []) ants.add(a);
    for (const sense of entry.senses) {
      defs.push({
        definition: sense.definition,
        example: sense.examples?.[0],
      });
      for (const s of sense.synonyms ?? []) syns.add(s);
      for (const a of sense.antonyms ?? []) ants.add(a);
    }
  }

  return {
    id: word,
    word,
    language: 'en',
    phonetic,
    partOfSpeech,
    definitions: defs,
    synonyms: [...syns].slice(0, 20),
    antonyms: [...ants].slice(0, 20),
  };
}

async function fetchFromFDApi(word: string): Promise<DictionaryEntry | null> {
  const url = `${FD_API_BASE}/${encodeURIComponent(word)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as FDApiResponse;
    if (!data.entries?.length) return null;
    const entry = mapFDApiToEntry(word, data);
    const cleaned = cleanEntry(entry);
    fdCache.set(word, cleaned);
    return cleaned;
  } catch {
    return null;
  }
}

async function lookupWord(word: string): Promise<DictionaryEntry | null> {
  if (!word) return null;
  const cached = fdCache.get(word);
  if (cached) return cached;

  return fetchFromFDApi(word).catch(() => null);
}

/* ---------- Public API ---------- */

export function handleDictionaryRequest(req: IncomingMessage, res: ServerResponse): boolean {
  const url = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`);
  const pathname = url.pathname;
  if (!pathname.startsWith('/api/dictionary/')) return false;
  res.setHeader('Content-Type', 'application/json');

  /* ----- lookup ----- */
  if (pathname === '/api/dictionary/lookup') {
    const word = url.searchParams.get('word') ?? '';
    lookupWord(word)
      .then((result) => res.end(JSON.stringify(result)))
      .catch(() => {
        res.statusCode = 500;
        res.end(JSON.stringify(null));
      });
    return true;
  }

  /* ----- autocomplete ----- */
  // Local dictionary word index was removed; the browser-side search handles
  // autocomplete from its bundled index. Return an empty list.
  if (pathname === '/api/dictionary/autocomplete') {
    res.end(JSON.stringify([]));
    return true;
  }

  /* ----- search ----- */
  if (pathname === '/api/dictionary/search') {
    const query = url.searchParams.get('q') ?? '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '10', 10), 50);
    (async () => {
      const result: DictionaryEntry[] = [];

      // Remote lookup via FreeDictionaryAPI (the single data source)
      if (query) {
        const remote = await lookupWord(query);
        if (remote) result.unshift(remote);
      }

      const cleaned = result.slice(0, limit).map(cleanEntry);
      const deduped = cleaned.filter((e, i, arr) => arr.findIndex((x) => x.word === e.word) === i);
      res.end(JSON.stringify(deduped));
    })().catch(() => {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end(JSON.stringify([]));
      }
    });
    return true;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not found' }));
  return true;
}
