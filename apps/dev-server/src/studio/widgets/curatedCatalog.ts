import { createDefaultRegistry, WIDGET_CATALOG_ENTRIES } from '@open-edu/widgets';
import type { WidgetDefinitionV2, WidgetGuideConfigField } from '@open-edu/widgets';

export interface CuratedWidget {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  status?: string;
  deprecated?: boolean;
  guide?: { configFields?: WidgetGuideConfigField[] };
}

export const CURATED_WIDGET_IDS = [
  'core.multiple-choice',
  'core.matching',
  'core.ordering', // only included if present in the catalog; dropped otherwise
  'math.fraction-visual',
] as const;

const GUIDE_BY_ID: Record<string, CuratedWidget['guide']> = Object.fromEntries(
  WIDGET_CATALOG_ENTRIES.map((entry) => [entry.id, entry.guide]),
);

function loadRegistryWidgets(): Map<string, CuratedWidget> {
  const registry = createDefaultRegistry();
  const widgets = new Map<string, CuratedWidget>();
  for (const def of registry.getAll()) {
    const v2 = def as WidgetDefinitionV2;
    widgets.set(v2.id, {
      id: v2.id,
      name: v2.name ?? v2.id,
      description: v2.description,
      domain: v2.domain,
      status: v2.status,
      deprecated: v2.deprecated,
      guide: GUIDE_BY_ID[v2.id],
    });
  }
  return widgets;
}

let _cache: Map<string, CuratedWidget> | null = null;

function getRegistryMap(): Map<string, CuratedWidget> {
  if (!_cache) _cache = loadRegistryWidgets();
  return _cache;
}

export function listCuratedWidgets(): CuratedWidget[] {
  const map = getRegistryMap();
  return CURATED_WIDGET_IDS.flatMap((id) => {
    const widget = map.get(id);
    if (!widget || widget.status === 'deprecated' || widget.deprecated === true) return [];
    return [widget];
  });
}

export function getCuratedWidget(id: string): CuratedWidget | undefined {
  const widget = getRegistryMap().get(id);
  if (!widget || widget.status === 'deprecated' || widget.deprecated === true) return undefined;
  return widget;
}
