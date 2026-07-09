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
      const manifestData = await import(/* @vite-ignore */ manifestPath);
      manifest = manifestData.default as PackageManifest;
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
      const metadataData = await import(/* @vite-ignore */ metadataPath);
      metadata = metadataData.default as PackageMetadata;
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
      const dictData = await import(/* @vite-ignore */ dictionaryPath);
      rawEntries = dictData.default as DictionaryEntry[];
    } catch {
      rawEntries = [];
    }

    const entries = applyDefaultsToEntries(rawEntries);
    manifest.wordCount = entries.length;
    metadata.wordCount = entries.length;

    return { entries, manifest, metadata };
  }

  getEntries(): DictionaryEntry[] {
    if (!this.entries) throw new Error('Dictionary not loaded. Call load() first.');
    return this.entries;
  }
}
