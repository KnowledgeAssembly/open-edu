import type { RemoteWidgetManifest, WidgetReference } from '@open-edu/schemas';

export interface NormalizeWarning {
  code: 'legacy-url-source' | 'missing-integrity';
  message: string;
}

export function normalizeWidgetReference(input: {
  widget?: string;
  version?: string;
  remoteWidget?: RemoteWidgetManifest;
  widgetRef?: WidgetReference;
}): { ref: WidgetReference; warnings: NormalizeWarning[] } {
  if (input.widgetRef) return { ref: input.widgetRef, warnings: [] };
  if (input.remoteWidget) {
    const ref: WidgetReference = {
      id: input.remoteWidget.id,
      version: input.remoteWidget.version,
      source: 'url',
      fallback: input.remoteWidget.fallback,
      integrity: input.remoteWidget.integrity,
    };
    return {
      ref,
      warnings: [
        {
          code: 'legacy-url-source',
          message: 'remoteWidget normalized to source=url',
        },
        ...(!input.remoteWidget.integrity
          ? [
              {
                code: 'missing-integrity' as const,
                message: 'legacy remoteWidget has no integrity',
              },
            ]
          : []),
      ],
    };
  }
  return {
    ref: {
      id: input.widget ?? 'exercise',
      version: input.version ?? '0.0.0',
      source: 'builtin',
    },
    warnings: [],
  };
}
