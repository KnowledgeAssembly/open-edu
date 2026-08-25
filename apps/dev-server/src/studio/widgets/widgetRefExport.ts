import type { WidgetReference } from '@open-edu/schemas';
import type { CuratedWidget } from './curatedCatalog.js';

export function toExportedWidgetRef(widget: CuratedWidget, fallback?: string): WidgetReference {
  if (widget.source === 'builtin') {
    return fallback
      ? { id: widget.id, version: widget.version, source: 'builtin', fallback }
      : { id: widget.id, version: widget.version, source: 'builtin' };
  }
  if (!widget.integrity) {
    throw new Error('Cannot export registry widget without manifest integrity');
  }
  return fallback
    ? {
        id: widget.id,
        version: widget.version,
        source: 'registry',
        registryId: widget.registryId,
        integrity: widget.integrity,
        fallback,
      }
    : {
        id: widget.id,
        version: widget.version,
        source: 'registry',
        registryId: widget.registryId,
        integrity: widget.integrity,
      };
}

export function registryIsConfigured(registryId: string, configured: ReadonlySet<string>): boolean {
  return configured.has(registryId);
}
