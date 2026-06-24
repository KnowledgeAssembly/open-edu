import { z } from 'zod';

const httpsUrlSchema = z
  .string()
  .min(1)
  .max(2048)
  .refine(
    (val) => {
      try {
        const url = new URL(val);
        return url.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'URL must use https:// protocol' },
  );

export const RemoteWidgetManifestSchema = z.object({
  id: z.string().min(1).max(128),
  version: z.string().min(1).max(64),
  url: httpsUrlSchema,
  integrity: z.string().min(1).max(128).optional(),
  apiVersion: z.string().min(1).max(64),
  fallback: z.string().min(1).max(128).optional(),
  permissions: z.array(z.string().min(1).max(64)).optional(),
});

export type RemoteWidgetManifest = z.infer<typeof RemoteWidgetManifestSchema>;
