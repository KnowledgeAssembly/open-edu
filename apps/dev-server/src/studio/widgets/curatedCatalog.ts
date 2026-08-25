import { readFileSync } from 'node:fs';
import type { WidgetCatalogEntry } from '@open-edu/core';
import widgetCatalogData from '@open-edu/core/widget-catalog-data';
import { loadStaticCatalog } from '@open-edu/widgets';

const CATALOG_ENTRIES: WidgetCatalogEntry[] = widgetCatalogData;

export interface CuratedWidget {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  status?: string;
  deprecated?: boolean;
  source: 'builtin' | 'registry';
  registryId?: string;
  trustTier: 'native' | 'sandboxed';
  version: string;
  integrity?: string;
  offline?: boolean;
  experimental?: boolean;
  configSchema?: Record<string, unknown>;
  guide?: Partial<NonNullable<WidgetCatalogEntry['guide']>>;
  guideMarkdown?: string;
}

function renderGuideMarkdown(entry: WidgetCatalogEntry): string {
  const g = entry.guide;
  if (!g) return '';
  const id = entry.id;
  const name = entry.name ?? entry.id;
  const domain = entry.domain ?? 'core';
  const status = entry.status ?? 'stable';
  return (
    [
      `# ${name}`,
      ``,
      `**Widget ID:** \`${id}\` | **Domain:** ${domain} | **Status:** ${status}`,
      ``,
      `> ${g.oneLiner}`,
      ``,
      `## What it does`,
      ``,
      g.whatItDoes,
      ...(g.whenToUse.length > 0
        ? [``, `## When to use this widget`, ``, ...g.whenToUse.map((item) => `- ${item}`)]
        : []),
      ``,
      `## Setting it up`,
      ``,
      ...g.setupSteps.map((step, i) => `${i + 1}. ${step}`),
      ``,
      `## Configuration fields`,
      ``,
      `| Field | Type | Required | Description |`,
      `|-------|------|----------|-------------|`,
      ...g.configFields.map(
        (f) => `| \`${f.name}\` | ${f.type} | ${f.required ? 'Yes' : 'No'} | ${f.description} |`,
      ),
      ``,
      `## Example`,
      ``,
      '```json',
      g.exampleJson.trim(),
      '```',
      ...(g.tips.length > 0 ? [``, `## Tips`, ``, ...g.tips.map((tip) => `- ${tip}`)] : []),
      ...(g.relatedWidgets && g.relatedWidgets.length > 0
        ? [
            ``,
            `## See also`,
            ``,
            ...g.relatedWidgets.map((r) =>
              r.domain === domain
                ? `- [${r.name}](${r.slug}.md)`
                : `- [${r.name}](../${r.domain}/${r.slug}.md)`,
            ),
          ]
        : []),
    ].join('\n') + '\n'
  );
}

export function loadCatalogWidgets(
  catalogFiles: unknown[] = getConfiguredCatalogFiles(),
): Map<string, CuratedWidget> {
  const widgets = new Map<string, CuratedWidget>();
  for (const entry of CATALOG_ENTRIES) {
    widgets.set(entry.id, {
      id: entry.id,
      name: entry.name ?? entry.id,
      description: entry.description,
      domain: entry.domain,
      status: entry.status,
      deprecated: entry.deprecated,
      source: 'builtin',
      trustTier: 'native',
      version: '0.1.0',
      experimental: entry.status === 'experimental',
      guide: entry.guide,
      guideMarkdown: entry.guide ? renderGuideMarkdown(entry) : undefined,
    });
  }
  for (const catalog of catalogFiles) {
    let staticCatalog;
    try {
      staticCatalog = loadStaticCatalog(catalog);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('skipping unparseable widget catalog', err);
      continue;
    }
    for (const entry of staticCatalog.widgets.values()) {
      if (entry.status === 'revoked') continue;
      if (widgets.has(entry.id)) continue;
      widgets.set(entry.id, {
        id: entry.id,
        name: entry.id,
        source: 'registry',
        registryId: staticCatalog.registryId,
        trustTier: entry.trustTier,
        version: entry.version,
        integrity: undefined,
        offline: entry.offline,
        experimental: entry.status === 'experimental',
        status: entry.status,
      });
    }
  }
  return widgets;
}

function getConfiguredCatalogFiles(): unknown[] {
  const globalCatalogs = (globalThis as Record<string, unknown>).__OPEN_EDU_STUDIO_CATALOGS__;
  if (Array.isArray(globalCatalogs)) return globalCatalogs;
  const envPaths = process.env.OPEN_EDU_STUDIO_CATALOGS;
  if (!envPaths) return [];
  return envPaths
    .split(',')
    .map((path) => path.trim())
    .filter(Boolean)
    .map((path) => {
      try {
        return JSON.parse(readFileSync(path, 'utf-8'));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`skipping unparseable catalog file: ${path}`, err);
        return null;
      }
    })
    .filter((catalog): catalog is unknown => catalog !== null);
}

let _cache: Map<string, CuratedWidget> | null = null;

function getCatalogMap(): Map<string, CuratedWidget> {
  if (!_cache) _cache = loadCatalogWidgets();
  return _cache;
}

export function __resetCatalogCache(): void {
  _cache = null;
}

export function listCuratedWidgets(): CuratedWidget[] {
  return [...getCatalogMap().values()].filter(
    (widget) => widget.status !== 'deprecated' && widget.deprecated !== true,
  );
}

export function getCuratedWidget(id: string): CuratedWidget | undefined {
  const widget = getCatalogMap().get(id);
  if (!widget || widget.status === 'deprecated' || widget.deprecated === true) return undefined;
  return widget;
}

export function listConfiguredRegistryIds(): string[] {
  return [
    ...new Set(
      [...getCatalogMap().values()]
        .filter((w) => w.source === 'registry' && w.registryId)
        .map((w) => w.registryId as string),
    ),
  ];
}
