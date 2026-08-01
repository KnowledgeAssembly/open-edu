import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CatalogSchema, RegistryMetadataSchema, toJsonSchemaDraft7 } from '@open-edu/schemas';

export function generateSchemas(outDir: string): string[] {
  mkdirSync(outDir, { recursive: true });
  const files = [
    { name: 'metadata.schema.json', schema: RegistryMetadataSchema },
    { name: 'catalog.schema.json', schema: CatalogSchema },
  ];
  for (const { name, schema } of files) {
    const doc = toJsonSchemaDraft7(schema) as Record<string, unknown>;
    doc['$id'] = `https://openedu.dev/schemas/${name}`;
    writeFileSync(join(outDir, name), JSON.stringify(doc, null, 2) + '\n');
  }
  return files.map((f) => f.name);
}
