import { createDefaultRegistry } from '@open-edu/widgets';
import type { WidgetDefinitionV2 } from '@open-edu/widgets';

export interface CuratedWidget {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  status?: string;
  deprecated?: boolean;
  guide?: { configFields?: Array<{ name: string; type: string; required: boolean; description: string }> };
}

export const CURATED_WIDGET_IDS = [
  'core.multiple-choice',
  'core.matching',
  'core.ordering', // only included if present in the catalog; dropped otherwise
  'math.fraction-visual',
] as const;

const DEFINITION_TO_CURATED = (def: WidgetDefinitionV2): CuratedWidget => ({
  id: def.id,
  name: def.name ?? def.id,
  description: def.description,
  domain: def.domain,
  status: def.status,
  deprecated: def.deprecated,
  guide: def.guide,
});

function loadRegistryWidgets(): Map<string, CuratedWidget> {
  const registry = createDefaultRegistry();
  const widgets = new Map<string, CuratedWidget>();
  for (const def of registry.getAll()) {
    const v2 = def as WidgetDefinitionV2;
    widgets.set(v2.id, DEFINITION_TO_CURATED(v2));
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
