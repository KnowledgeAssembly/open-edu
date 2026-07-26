import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchCatalog,
  parseCatalog,
  findPackageInCatalog,
  findVersionInCatalog,
  CatalogLoadError,
} from './catalog-loader';

const validCatalog = {
  catalogVersion: 1 as const,
  packages: [
    {
      id: 'science-grade7',
      title: 'Science Grade 7',
      latestVersion: '2.0.0',
      versions: [
        {
          version: '1.0.0',
          downloadUrl: 'https://example.org/science-1.0.0.oep',
          checksum: 'a'.repeat(64),
          sizeBytes: 54321,
        },
        {
          version: '2.0.0',
          downloadUrl: 'https://example.org/science-2.0.0.oep',
          checksum: 'b'.repeat(64),
          sizeBytes: 65432,
        },
      ],
    },
  ],
};

describe('parseCatalog', () => {
  it('parses valid catalog', () => {
    const result = parseCatalog(validCatalog);
    expect(result.packages).toHaveLength(1);
    expect(result.packages[0].id).toBe('science-grade7');
  });

  it('throws on invalid catalog', () => {
    expect(() => parseCatalog({})).toThrow(CatalogLoadError);
  });

  it('throws on non-object input', () => {
    expect(() => parseCatalog('not-an-object')).toThrow(CatalogLoadError);
  });
});

describe('findPackageInCatalog', () => {
  it('finds existing package', () => {
    const catalog = parseCatalog(validCatalog);
    const entry = findPackageInCatalog(catalog, 'science-grade7');
    expect(entry).toBeDefined();
    expect(entry!.title).toBe('Science Grade 7');
  });

  it('returns undefined for missing package', () => {
    const catalog = parseCatalog(validCatalog);
    expect(findPackageInCatalog(catalog, 'nonexistent')).toBeUndefined();
  });
});

describe('findVersionInCatalog', () => {
  it('finds specific version', () => {
    const catalog = parseCatalog(validCatalog);
    const entry = findPackageInCatalog(catalog, 'science-grade7')!;
    const version = findVersionInCatalog(entry, '1.0.0');
    expect(version).toBeDefined();
    expect(version!.downloadUrl).toBe('https://example.org/science-1.0.0.oep');
  });

  it('returns undefined for missing version', () => {
    const catalog = parseCatalog(validCatalog);
    const entry = findPackageInCatalog(catalog, 'science-grade7')!;
    expect(findVersionInCatalog(entry, '9.9.9')).toBeUndefined();
  });
});

describe('fetchCatalog', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches and parses catalog', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(validCatalog),
    } as Response);

    const catalog = await fetchCatalog('https://example.org/catalog.json');
    expect(catalog.packages).toHaveLength(1);
  });

  it('throws on non-ok response', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    await expect(fetchCatalog('https://example.org/catalog.json')).rejects.toThrow(
      CatalogLoadError,
    );
  });
});
