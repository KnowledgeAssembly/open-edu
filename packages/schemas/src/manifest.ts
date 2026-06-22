import { z } from 'zod';

export const PackageManifestSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9][a-z0-9_-]*$/, 'id must be kebab-case (lowercase, hyphens, underscores)'),
  title: z.string().min(1).max(256),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'version must be semver format (e.g. 1.0.0)'),
  author: z.string().min(1).max(128),
  entry: z.string().min(1).max(512),
});

export type PackageManifest = z.infer<typeof PackageManifestSchema>;

export const SkillsSchema = z.array(z.string().min(1).max(128));
