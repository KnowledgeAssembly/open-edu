import { z } from 'zod';

const integrity = z.string().regex(/^sha256-[a-f0-9]{64}$/);

const BuiltinRef = z.object({
  id: z.string().min(1).max(256),
  version: z.string().min(1).max(64),
  source: z.literal('builtin'),
  fallback: z.string().min(1).max(256).optional(),
});

const ExternalRef = z
  .object({
    id: z.string().min(1).max(256),
    version: z.string().min(1).max(64),
    source: z.enum(['registry', 'url']),
    registryId: z.string().min(1).max(128).optional(),
    integrity: integrity.optional(),
    fallback: z.string().min(1).max(256).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.source === 'registry' && !val.integrity) {
      ctx.addIssue({
        code: 'custom',
        message: 'registry references require integrity',
        path: ['integrity'],
      });
    }
  });

export const WidgetReferenceSchema = z.union([BuiltinRef, ExternalRef]);
export type WidgetReference = z.infer<typeof WidgetReferenceSchema>;
