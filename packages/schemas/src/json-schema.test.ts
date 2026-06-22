import { describe, it, expect } from 'vitest';
import { toJsonSchema } from './json-schema';
import { PackageManifestSchema } from './manifest';

describe('toJsonSchema', () => {
  it('should convert a Zod schema to JSON Schema object', () => {
    const result = toJsonSchema(PackageManifestSchema);
    expect(result).toBeDefined();
    expect(result).toHaveProperty('type', 'object');
  });

  it('should include all fields from the schema', () => {
    const result = toJsonSchema(PackageManifestSchema);
    const schemaStr = JSON.stringify(result);
    expect(schemaStr).toContain('id');
    expect(schemaStr).toContain('title');
    expect(schemaStr).toContain('version');
    expect(schemaStr).toContain('author');
    expect(schemaStr).toContain('entry');
  });
});
