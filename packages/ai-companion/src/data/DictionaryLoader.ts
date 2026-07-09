import type { DictionaryEntry } from '../providers/types.js';

export interface PackageManifest {
  package: string;
  version: string;
  type: 'dictionary';
  language: string;
  files: {
    dictionary: string;
    metadata: string;
  };
  wordCount: number;
  compressed: boolean;
  compression?: 'gzip' | 'none';
}

export interface PackageMetadata {
  version: string;
  language: string;
  languageName: string;
  wordCount: number;
  source: string;
  sourceUrl: string;
  sourceDump: string;
  license: string;
  licenseUrl: string;
  generated: string;
  generator: string;
  generatorVersion: string;
  checksum: string;
}

export interface PackageInfo {
  basePath: string;
  language: string;
  version: string;
}

export interface LoadedPackage {
  entries: DictionaryEntry[];
  manifest: PackageManifest;
  metadata: PackageMetadata;
}

function applyDefaults(entry: DictionaryEntry): DictionaryEntry {
  return {
    id: entry.id || entry.word,
    word: entry.word,
    language: entry.language || 'en',
    phonetic: entry.phonetic,
    pronunciations: entry.pronunciations,
    partOfSpeech: entry.partOfSpeech,
    definitions: entry.definitions,
    synonyms: entry.synonyms,
    antonyms: entry.antonyms,
    relatedWords: entry.relatedWords,
    translations: entry.translations,
  };
}

function applyDefaultsToEntries(entries: DictionaryEntry[]): DictionaryEntry[] {
  return entries.map(applyDefaults);
}

async function fetchJSON<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.status}`);
  return (await response.json()) as T;
}

export class DictionaryLoader {
  private static instance: DictionaryLoader;
  private entries: DictionaryEntry[] | null = null;

  static getInstance(): DictionaryLoader {
    if (!DictionaryLoader.instance) {
      DictionaryLoader.instance = new DictionaryLoader();
    }
    return DictionaryLoader.instance;
  }

  static reset(): void {
    DictionaryLoader.instance = new DictionaryLoader();
  }

  async load(): Promise<DictionaryEntry[]> {
    if (this.entries) return this.entries;
    const data = await import('./dictionary.json');
    const raw = data.default as DictionaryEntry[];
    this.entries = applyDefaultsToEntries(raw);
    return this.entries;
  }

  async loadPackage(packageInfo: PackageInfo): Promise<LoadedPackage> {
    const manifestPath = `${packageInfo.basePath}/manifest.json`;
    const metadataPath = `${packageInfo.basePath}/metadata.json`;

    let manifest: PackageManifest;
    let metadata: PackageMetadata;

    try {
      manifest = await fetchJSON<PackageManifest>(manifestPath);
    } catch {
      manifest = {
        package: `dictionary-${packageInfo.language}`,
        version: packageInfo.version,
        type: 'dictionary',
        language: packageInfo.language,
        files: { dictionary: 'dictionary.json', metadata: 'metadata.json' },
        wordCount: 0,
        compressed: false,
      };
    }

    try {
      metadata = await fetchJSON<PackageMetadata>(metadataPath);
    } catch {
      metadata = {
        version: packageInfo.version,
        language: packageInfo.language,
        languageName: packageInfo.language,
        wordCount: 0,
        source: '',
        sourceUrl: '',
        sourceDump: '',
        license: '',
        licenseUrl: '',
        generated: new Date().toISOString(),
        generator: 'dictionary-loader',
        generatorVersion: '1.0.0',
        checksum: '',
      };
    }

    const dictionaryPath = `${packageInfo.basePath}/${manifest.files.dictionary}`;
    let rawEntries: DictionaryEntry[];

    try {
      console.time('[Dictionary] fetch + parse dictionary.json');
      rawEntries = await fetchJSON<DictionaryEntry[]>(dictionaryPath);
      console.timeEnd('[Dictionary] fetch + parse dictionary.json');
    } catch (err) {
      console.error('[Dictionary] Failed to load dictionary.json:', err);
      rawEntries = [];
    }

    const entries = applyDefaultsToEntries(rawEntries);
    manifest.wordCount = entries.length;
    metadata.wordCount = entries.length;

    return { entries, manifest, metadata };
  }

  getEntries(): DictionaryEntry[] {
    if (!this.entries) {
      throw new Error('Dictionary not loaded. Call load() first.');
    }
    return this.entries;
  }

  hasEntries(): boolean {
    return this.entries !== null;
  }
}
