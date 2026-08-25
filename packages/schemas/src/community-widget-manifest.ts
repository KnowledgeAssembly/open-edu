import { z } from 'zod';

export const PROTOCOL_API_VERSION = 'open-edu.widget/1' as const;

export const WidgetCapabilitySchema = z.enum([
  'resize',
  'telemetry-interaction',
  'state-persistence',
  'locale',
  'theme',
  'hints',
  'observe-mode',
]);

const integritySchema = z.string().regex(/^sha256-[a-f0-9]{64}$/);

const httpsUrlSchema = z
  .string()
  .url()
  .refine(
    (val) => {
      const url = new URL(val);
      if (url.protocol !== 'https:') return false;
      const host = url.hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host.endsWith('.local') ||
        host === '127.0.0.1' ||
        host === '::1'
      ) {
        return false;
      }
      return true;
    },
    { message: 'documentUrl must be https and non-loopback' },
  );

export const WidgetManifestSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/),
    version: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/),
    apiVersion: z.literal(PROTOCOL_API_VERSION),
    artifact: z.object({
      documentUrl: httpsUrlSchema,
      documentIntegrity: integritySchema,
      archiveUrl: httpsUrlSchema.optional(),
      archiveIntegrity: integritySchema.optional(),
      sizeBytes: z.number().int().positive(),
      format: z.enum(['multi-file', 'self-contained-html']),
    }),
    publisher: z.object({
      id: z.string().min(1).max(128),
      name: z.string().min(1).max(256),
      website: z.string().url().optional(),
    }),
    metadata: z.record(z.unknown()),
    schemas: z
      .object({
        configUrl: httpsUrlSchema.optional(),
        stateUrl: httpsUrlSchema.optional(),
      })
      .default({}),
    capabilities: z.array(WidgetCapabilitySchema),
    accessibility: z.record(z.unknown()),
    supportedThemes: z.array(z.enum(['light', 'dark', 'zen'])).min(1),
    reducedMotion: z.enum(['supported', 'not-supported', 'not-applicable']),
    compatibility: z.object({
      runtime: z.string().min(1),
      browsers: z.array(z.string()).optional(),
    }),
    distribution: z.object({
      offline: z.boolean(),
      cachePolicy: z.literal('immutable'),
    }),
    status: z.enum(['experimental', 'verified', 'deprecated', 'revoked']),
    fallback: z.string().min(1).max(256).optional(),
    signature: z.unknown().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.artifact.archiveUrl && !val.artifact.archiveIntegrity) {
      ctx.addIssue({
        code: 'custom',
        message: 'archiveIntegrity required when archiveUrl is set',
        path: ['artifact', 'archiveIntegrity'],
      });
    }
    if (val.distribution.offline && val.artifact.format !== 'self-contained-html') {
      ctx.addIssue({
        code: 'custom',
        message: 'offline widgets must use self-contained-html',
        path: ['distribution', 'offline'],
      });
    }
  });

export type WidgetManifest = z.infer<typeof WidgetManifestSchema>;
export type WidgetCapability = z.infer<typeof WidgetCapabilitySchema>;
