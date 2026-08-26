import { z } from 'zod';
import { IntegrityHashSchema } from './community-widget-manifest.js';

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
    integrity: IntegrityHashSchema.optional(),
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
    if (val.source === 'registry' && !val.registryId) {
      ctx.addIssue({
        code: 'custom',
        message: 'registry references require registryId',
        path: ['registryId'],
      });
    }
  });

export const WidgetReferenceSchema = z.union([BuiltinRef, ExternalRef]);
export type WidgetReference = z.infer<typeof WidgetReferenceSchema>;
