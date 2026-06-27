import { z } from 'zod';

export const BundleModuleRefSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9][a-z0-9_-]*$/, 'module id must be kebab-case'),
  title: z.string().min(1).max(256),
  chapterCode: z.string().optional(),
  path: z.string().min(1).max(512),
  dependsOn: z.array(z.string()).default([]),
  estimatedDuration: z.number().positive().optional(),
});

export const BundleManifestSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-z0-9][a-z0-9_-]*$/, 'id must be kebab-case (lowercase, hyphens, underscores)'),
    type: z.literal('bundle').default('bundle'),
    title: z.string().min(1).max(256),
    level: z.string().optional(),
    subject: z.string().optional(),
    description: z.string().optional(),
    version: z
      .string()
      .min(1)
      .max(64)
      .regex(/^\d+\.\d+\.\d+$/, 'version must be semver format (e.g. 1.0.0)'),
    author: z.string().min(1).max(128),
    modules: z.array(BundleModuleRefSchema).min(1),
    skills: z.array(z.string()).optional(),
    rewards: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const ids = data.modules.map((m) => m.id);
    const seen = new Set<string>();
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]!;
      if (seen.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate module id: "${id}"`,
          path: ['modules', i, 'id'],
        });
      }
      seen.add(id);
    }
  });

export type BundleManifest = z.infer<typeof BundleManifestSchema>;
export type BundleModuleRef = z.infer<typeof BundleModuleRefSchema>;
