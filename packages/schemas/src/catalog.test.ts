import { describe, it, expect } from 'vitest';
import { CatalogSchema, CatalogPackageEntrySchema, CatalogVersionEntrySchema } from './catalog';

describe('CatalogVersionEntrySchema', () => {
  it('accepts valid version entry', () => {
    const result = CatalogVersionEntrySchema.safeParse({
      version: '1.0.0',
      downloadUrl: 'https://example.org/pkg-1.0.0.oep',
      checksum: 'a'.repeat(64),
      sizeBytes: 12345,
    });
    expect(result.success).toBe(true);
  });

  it('rejects bad URL', () => {
    const result = CatalogVersionEntrySchema.safeParse({
      version: '1.0.0',
      downloadUrl: 'not-a-url',
      checksum: 'a'.repeat(64),
      sizeBytes: 12345,
    });
    expect(result.success).toBe(false);
  });
});

describe('CatalogPackageEntrySchema', () => {
  it('accepts minimal entry', () => {
    const result = CatalogPackageEntrySchema.safeParse({
      id: 'science-grade7',
      title: 'Science Grade 7',
      latestVersion: '1.0.0',
      versions: [
        {
          version: '1.0.0',
          downloadUrl: 'https://example.org/sci-1.0.0.oep',
          checksum: 'a'.repeat(64),
          sizeBytes: 12345,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty versions array', () => {
    const result = CatalogPackageEntrySchema.safeParse({
      id: 'science-grade7',
      title: 'Science Grade 7',
      latestVersion: '1.0.0',
      versions: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('CatalogSchema', () => {
  it('parses a full catalog', () => {
    const catalog = {
      catalogVersion: 1 as const,
      packages: [
        {
          id: 'science-grade7',
          title: 'Science Grade 7',
          latestVersion: '1.0.0',
          versions: [
            {
              version: '1.0.0',
              downloadUrl: 'https://example.org/sci-1.0.0.oep',
              checksum: 'a'.repeat(64),
              sizeBytes: 54321,
            },
          ],
        },
      ],
    };
    const result = CatalogSchema.safeParse(catalog);
    expect(result.success).toBe(true);
  });

  it('rejects without packages array', () => {
    const result = CatalogSchema.safeParse({ catalogVersion: 1 });
    expect(result.success).toBe(false);
  });
});
