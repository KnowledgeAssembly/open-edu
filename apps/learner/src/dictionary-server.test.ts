import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { handleDictionaryRequest } from './dictionary-server.js';

const FD_API_ENTRY = {
  word: 'apple',
  entries: [
    {
      language: { code: 'en', name: 'English' },
      partOfSpeech: 'noun',
      pronunciations: [{ type: 'ipa', text: 'ˈæp.əl' }],
      senses: [
        { definition: 'A fruit produced by the apple tree.', examples: ['She ate an apple.'] },
      ],
      synonyms: ['fruit'],
      antonyms: ['vegetable'],
    },
  ],
  source: { url: 'https://example.org', license: { name: 'CC BY', url: 'https://example.org' } },
};

function mockResFetch(ok: boolean, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok,
    json: vi.fn().mockResolvedValue(body),
  });
}

function makeRes() {
  return {
    statusCode: undefined as number | undefined,
    setHeader: vi.fn(),
    end: vi.fn(),
  };
}

function callHandler(url: string, res = makeRes()) {
  const handled = handleDictionaryRequest(
    {
      url,
      headers: { host: 'localhost' },
    } as unknown as IncomingMessage,
    res as unknown as ServerResponse,
  );
  return { handled, res };
}

async function bodyOf(res: ReturnType<typeof makeRes>): Promise<unknown> {
  const end = res.end as ReturnType<typeof vi.fn>;
  const started = Date.now();
  while (end.mock.calls.length === 0) {
    if (Date.now() - started > 2000) throw new Error('res.end was never called');
    await new Promise((r) => setTimeout(r, 0));
  }
  return JSON.parse(end.mock.calls[0]![0] as string);
}

describe('handleDictionaryRequest (FreeDictionaryAPI only)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns false for non-dictionary paths', () => {
    const { handled } = callHandler('/api/other');
    expect(handled).toBe(false);
  });

  it('looks up a word via FreeDictionaryAPI', async () => {
    globalThis.fetch = mockResFetch(true, FD_API_ENTRY);

    const { handled, res } = callHandler('/api/dictionary/lookup?word=apple');

    expect(handled).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://freedictionaryapi.com/api/v1/entries/en/apple',
    );

    const entry = (await bodyOf(res)) as {
      word: string;
      phonetic?: string;
      definitions: unknown[];
    };
    expect(entry.word).toBe('apple');
    expect(entry.definitions.length).toBeGreaterThan(0);
    expect(entry.phonetic).toBe('ˈæp.əl');
  });

  it('returns null when the remote API fails', async () => {
    globalThis.fetch = mockResFetch(false, {});

    const { handled, res } = callHandler('/api/dictionary/lookup?word=zebra');

    expect(handled).toBe(true);
    expect(await bodyOf(res)).toBeNull();
  });

  it('returns an empty autocomplete list since the local dictionary is removed', async () => {
    const { handled, res } = callHandler('/api/dictionary/autocomplete?prefix=app');

    expect(handled).toBe(true);
    expect(await bodyOf(res)).toEqual([]);
  });

  it('searches via FreeDictionaryAPI without a local fallback', async () => {
    const entry = { ...FD_API_ENTRY, word: 'banana' };
    globalThis.fetch = mockResFetch(true, entry);

    const { handled, res } = callHandler('/api/dictionary/search?q=banana');

    expect(handled).toBe(true);

    const results = (await bodyOf(res)) as { word: string }[];
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.word).toBe('banana');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://freedictionaryapi.com/api/v1/entries/en/banana',
    );
  });

  it('returns a 404 for unknown dictionary paths', () => {
    const { handled, res } = callHandler('/api/dictionary/unknown');

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(404);
  });
});
