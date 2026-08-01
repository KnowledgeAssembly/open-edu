import { z } from 'zod';

export const CatalogVersionEntrySchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'must be semver'),
  downloadUrl: z.string().url(),
  checksum: z.string().regex(/^[a-f0-9]{64}$/, 'must be 64-char SHA-256 hex'),
  sizeBytes: z.number().int().positive(),
  languages: z.array(z.string()).default(['en']),
  createdAt: z.string().optional(),
});

export type CatalogVersionEntry = z.infer<typeof CatalogVersionEntrySchema>;

export const CatalogPackageEntrySchema = z.object({
  id: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9][a-z0-9_-]*$/),
  title: z.string().min(1).max(256),
  description: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),
  tags: z.array(z.string()).optional(),
  thumbnail: z.string().url().optional(),
  latestVersion: z.string(),
  versions: z.array(CatalogVersionEntrySchema).min(1),
});

export type CatalogPackageEntry = z.infer<typeof CatalogPackageEntrySchema>;

export const CatalogSchema = z.object({
  catalogVersion: z.literal(1),
  generatedAt: z.string().optional(),
  packages: z.array(CatalogPackageEntrySchema),
});

export type Catalog = z.infer<typeof CatalogSchema>;
