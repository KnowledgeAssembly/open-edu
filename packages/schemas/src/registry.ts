import { z } from 'zod';

/**
 * Author-facing metadata for one course in the OpenEdu registry
 * (openedu-library `courses/<id>/metadata.json`).
 */
export const RegistryMetadataSchema = z
  .object({
    id: z.string().min(1).max(128).regex(/^[a-z0-9][a-z0-9_-]*$/),
    name: z.string().min(1).max(256),
    description: z.string().max(4096).optional(),
    author: z.string().min(1).max(128),
    version: z
      .string()
      .regex(/^\d+\.\d+\.\d+$/)
      .optional()
      .describe('Informational only; catalog versions always come from GitHub Releases'),
    license: z.string().min(1).max(64),
    languages: z.array(z.string().min(1).max(16)).min(1),
    thumbnail: z
      .string()
      .regex(/^[A-Za-z0-9_./-]+\.(webp|png|jpg|jpeg|avif)$/)
      .optional(),
    screenshots: z.array(z.string()).optional(),
    tags: z.array(z.string().min(1).max(64)).optional(),
    type: z.enum(['course', 'bundle']).default('course'),
  })
  .strict();

export type RegistryMetadata = z.infer<typeof RegistryMetadataSchema>;
