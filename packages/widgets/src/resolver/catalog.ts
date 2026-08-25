import { z } from 'zod';
import type { ResolverCatalog, CatalogWidgetMeta } from './widget-resolver.js';

export const WidgetCatalogFileSchema = z.object({
  registryId: z.string(),
  origin: z
    .string()
    .url()
    .refine((v) => new URL(v).protocol === 'https:', {
      message: 'catalog origin must be https',
    }),
  widgets: z.array(
    z.object({
      id: z.string(),
      version: z.string(),
      manifestUrl: z
        .string()
        .url()
        .refine((v) => new URL(v).protocol === 'https:', {
          message: 'manifestUrl must be https',
        }),
      status: z.enum(['experimental', 'verified', 'deprecated', 'revoked']),
      trustTier: z.enum(['native', 'sandboxed']),
      offline: z.boolean(),
    }),
  ),
});
export type WidgetCatalogFile = z.infer<typeof WidgetCatalogFileSchema>;

export function loadStaticCatalog(json: unknown): ResolverCatalog {
  const parsed = WidgetCatalogFileSchema.parse(json);
  const widgets = new Map<string, CatalogWidgetMeta>();
  for (const w of parsed.widgets) {
    widgets.set(`${w.id}@${w.version}`, {
      id: w.id,
      version: w.version,
      manifestUrl: w.manifestUrl,
      status: w.status,
      trustTier: w.trustTier,
      offline: w.offline,
    });
  }
  return { registryId: parsed.registryId, origin: parsed.origin, widgets };
}
