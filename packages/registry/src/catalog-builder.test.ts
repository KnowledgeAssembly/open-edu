import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildCatalog, validateCatalogData } from './catalog-builder.js';
import { loadMetadataMap } from './metadata.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, '..', 'test', 'fixtures');
const metadataMap = loadMetadataMap(join(fixtures, 'courses'));

const MOCK_BYTES = new TextEncoder().encode('mock-oep-content');

async function makeFakeFetch({ mismatch = false } = {}) {
  const { computeSha256 } = await import('@open-edu/oep-distribution');
  const sha = await computeSha256(MOCK_BYTES);
  return async (url: string) => {
    if (url.includes('checksums.txt')) {
      const declared = mismatch ? 'e'.repeat(64) : sha;
      return new TextEncoder().encode(`${declared}  tribal-art-0.4.0.oep\n`);
    }
    return MOCK_BYTES;
  };
}

const releases = JSON.parse(readFileSync(join(fixtures, 'releases.json'), 'utf8')) as Parameters<
  typeof buildCatalog
>[0]['releases'];

describe('buildCatalog', () => {
  beforeEach(() => {});

  it('builds a catalog from releases and metadata', async () => {
    const { catalog, warnings } = await buildCatalog({
      metadataMap,
      releases,
      repo: 'acme/openedu-library',
      fetchAsset: await makeFakeFetch(),
    });

    expect(warnings).toEqual([]);
    expect(catalog.catalogVersion).toBe(1);
    expect(catalog.generatedAt).toBeTruthy();
    expect(catalog.packages.length).toBe(1);

    const pkg = catalog.packages[0]!;
    expect(pkg.id).toBe('tribal-art');
    expect(pkg.title).toBe('Indian Tribal Art');
    expect(pkg.latestVersion).toBe('0.4.0');
    expect(pkg.versions.map((v) => v.version)).toEqual(['0.2.0', '0.4.0']);
    expect(pkg.thumbnail).toBe(
      'https://raw.githubusercontent.com/acme/openedu-library/HEAD/courses/tribal-art/thumbnail.png',
    );
  });

  it('skips releases without metadata and warns', async () => {
    const { catalog, warnings } = await buildCatalog({
      metadataMap,
      releases: [
        {
          tag_name: 'ghost-course-v0.1.0',
          draft: false,
          prerelease: false,
          assets: [
            { name: 'ghost-course-0.1.0.oep', size: 1, browser_download_url: 'https://x/g.oep' },
          ],
        },
      ],
      repo: 'acme/openedu-library',
      fetchAsset: await makeFakeFetch(),
    });
    expect(catalog.packages.length).toBe(0);
    expect(warnings.some((w) => w.includes('ghost-course'))).toBe(true);
  });

  it('skips drafts and prereleases unless included', async () => {
    const draftReleases = [
      { tag_name: 'tribal-art-v0.4.0', draft: true, prerelease: false, assets: [] },
      { tag_name: 'tribal-art-v0.5.0', draft: false, prerelease: true, assets: [] },
    ];
    const { catalog } = await buildCatalog({
      metadataMap,
      releases: draftReleases,
      repo: 'acme/openedu-library',
      fetchAsset: await makeFakeFetch(),
    });
    expect(catalog.packages.length).toBe(0);

    const withPre = await buildCatalog({
      metadataMap,
      releases: [
        {
          tag_name: 'tribal-art-v0.5.0',
          draft: false,
          prerelease: true,
          assets: [
            {
              name: 'tribal-art-0.5.0.oep',
              size: 1,
              browser_download_url: 'https://x/tribal-art-0.5.0.oep',
            },
          ],
        },
      ],
      repo: 'acme/openedu-library',
      includePrerelease: true,
      fetchAsset: await makeFakeFetch(),
    });
    expect(withPre.catalog.packages.length).toBe(1);
  });

  it('warns when checksums.txt disagrees with the computed hash', async () => {
    const { warnings } = await buildCatalog({
      metadataMap,
      releases,
      repo: 'acme/openedu-library',
      fetchAsset: await makeFakeFetch({ mismatch: true }),
    });
    expect(warnings.some((w) => w.includes('checksums.txt mismatch'))).toBe(true);
  });
});

describe('validateCatalogData', () => {
  it('accepts a valid catalog', async () => {
    expect(await validateCatalogData({ catalogVersion: 1, packages: [] })).toEqual([]);
  });

  it('rejects duplicate package ids', async () => {
    const entry = (v: string) => ({
      version: v,
      downloadUrl: 'https://example.com/x.oep',
      checksum: 'a'.repeat(64),
      sizeBytes: 1,
      languages: ['en'],
    });
    const data = {
      catalogVersion: 1,
      packages: [
        { id: 'x', title: 'X', latestVersion: '1.0.0', versions: [entry('1.0.0')] },
        { id: 'x', title: 'X2', latestVersion: '1.0.0', versions: [entry('1.0.0')] },
      ],
    };
    const errors = await validateCatalogData(data);
    expect(errors.some((e) => e.includes('duplicate package id "x"'))).toBe(true);
  });
});
