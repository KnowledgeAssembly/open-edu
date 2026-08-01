import { describe, expect, it } from 'vitest';
import { RegistryMetadataSchema } from './registry.js';
import { CatalogSchema } from './catalog.js';
import { toJsonSchemaDraft7 } from './json-schema.js';

const valid = {
  id: 'tribal-art',
  name: 'Indian Tribal Art',
  description: 'Explore the traditional art forms of India.',
  author: 'OpenEdu Authors',
  version: '0.4.0',
  license: 'CC-BY-SA-4.0',
  languages: ['en'],
  thumbnail: 'thumbnail.png',
  screenshots: ['screenshots/hero.png'],
  tags: ['art', 'india'],
};

describe('RegistryMetadataSchema', () => {
  it('accepts a valid course', () => {
    expect(RegistryMetadataSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = RegistryMetadataSchema.safeParse({ id: 'x' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields', () => {
    const result = RegistryMetadataSchema.safeParse({ ...valid, extra: true });
    expect(result.success).toBe(false);
  });

  it('defaults type to course', () => {
    const data = RegistryMetadataSchema.parse({ ...valid, type: undefined });
    expect(data.type).toBe('course');
  });
});

describe('enriched CatalogSchema', () => {
  it('accepts and preserves registry-style fields', () => {
    const catalog = {
      catalogVersion: 1,
      generatedAt: '2026-08-01T00:00:00.000Z',
      packages: [
        {
          id: 'tribal-art',
          title: 'Indian Tribal Art',
          author: 'OpenEdu Authors',
          license: 'CC-BY-SA-4.0',
          tags: ['art'],
          thumbnail: 'https://example.com/thumb.png',
          latestVersion: '0.4.0',
          versions: [
            {
              version: '0.4.0',
              downloadUrl: 'https://example.com/x.oep',
              checksum: 'a'.repeat(64),
              sizeBytes: 12345,
              languages: ['en'],
              createdAt: '2026-08-01T00:00:00.000Z',
            },
          ],
        },
      ],
    };
    const parsed = CatalogSchema.parse(catalog);
    expect(parsed.generatedAt).toBe(catalog.generatedAt);
    expect(parsed.packages[0]?.author).toBe('OpenEdu Authors');
    expect(parsed.packages[0]?.versions[0]?.createdAt).toBe('2026-08-01T00:00:00.000Z');
  });
});

describe('toJsonSchemaDraft7', () => {
  it('emits a draft-07 JSON Schema object', () => {
    const doc = toJsonSchemaDraft7(RegistryMetadataSchema) as {
      $schema?: string;
      type?: string;
    };
    expect(doc.$schema).toContain('draft-07');
    expect(doc.type).toBe('object');
  });

  it('disallows additional properties for strict schemas', () => {
    const doc = toJsonSchemaDraft7(RegistryMetadataSchema) as {
      additionalProperties?: boolean;
    };
    expect(doc.additionalProperties).toBe(false);
  });
});
