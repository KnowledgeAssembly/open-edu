import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { urlSource, catalogSource } from './source-adapters';

describe('urlSource', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns downloaded bytes', async () => {
    const testData = new Uint8Array([1, 2, 3, 4]);
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(testData.buffer),
    } as Response);

    const source = urlSource('https://example.org/course.oep');
    expect(source.kind).toBe('url');
    expect(source.label).toBe('https://example.org/course.oep');

    const bytes = await source.getBytes();
    expect(bytes).toEqual(testData);
  });

  it('throws on HTTP error', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    const source = urlSource('https://example.org/missing.oep');
    await expect(source.getBytes()).rejects.toThrow('HTTP 404');
  });
});

describe('catalogSource', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses provided label', () => {
    const source = catalogSource({
      downloadUrl: 'https://example.org/pkg.oep',
      label: 'My Course v1.0',
    });
    expect(source.kind).toBe('catalog');
    expect(source.label).toBe('My Course v1.0');
  });
});
