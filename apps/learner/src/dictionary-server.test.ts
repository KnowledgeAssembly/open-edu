import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';

const fsMock = vi.hoisted(() => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  gunzipSync: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: { readFileSync: fsMock.readFileSync, existsSync: fsMock.existsSync },
  readFileSync: fsMock.readFileSync,
  existsSync: fsMock.existsSync,
}));
vi.mock('node:zlib', () => ({
  default: { gunzipSync: fsMock.gunzipSync },
  gunzipSync: fsMock.gunzipSync,
}));

import { loadDictionary, handleDictionaryRequest } from './dictionary-server.js';

const DICTIONARY_ENTRIES = [
  { id: '1', word: 'apple', language: 'en', definitions: [{ definition: 'a fruit' }] },
  { id: '2', word: 'banana', language: 'en', definitions: [{ definition: 'a fruit' }] },
];

describe('loadDictionary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as Record<string, unknown>)['__openEduLocalDictionaryCache'];
    fsMock.existsSync.mockImplementation(
      (p: string) => p.endsWith('/manifest.json') || p.endsWith('/dictionary.json.gz'),
    );
    fsMock.readFileSync.mockImplementation((p: string) => {
      if (p.endsWith('/manifest.json')) {
        return JSON.stringify({
          files: { dictionary: 'dictionary.json.gz', metadata: 'metadata.json' },
          wordCount: 2,
          compressed: true,
        });
      }
      return 'gzipped-bytes';
    });
    fsMock.gunzipSync.mockReturnValue(Buffer.from(JSON.stringify(DICTIONARY_ENTRIES)));
  });

  it('parses the local dictionary once and reuses it across reloads', () => {
    expect(loadDictionary('/dict')).toBe(true);
    const readsAfterFirst = fsMock.readFileSync.mock.calls.length;
    expect(readsAfterFirst).toBeGreaterThan(0);

    // A Vite dev-server restart re-invokes loadDictionary in the same process
    // while the previous server is still resident; it must reuse the cached
    // parse instead of re-reading and re-parsing the multi-hundred-MB file.
    expect(loadDictionary('/dict')).toBe(true);
    expect(fsMock.readFileSync.mock.calls.length).toBe(readsAfterFirst);
    expect(fsMock.gunzipSync).toHaveBeenCalledTimes(1);
  });

  it('serves cached dictionary data after a restart-style reload', () => {
    loadDictionary('/dict');
    loadDictionary('/dict');

    const res = {
      setHeader: vi.fn(),
      end: vi.fn(),
    };
    const handled = handleDictionaryRequest(
      {
        url: '/api/dictionary/autocomplete?prefix=app',
        headers: { host: 'localhost' },
      } as unknown as IncomingMessage,
      res as unknown as ServerResponse,
    );

    expect(handled).toBe(true);
    const body = JSON.parse(((res.end as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] ?? '[]') as string);
    expect(body).toContain('apple');
  });
});
