import type { WidgetCatalogEntry } from '@open-edu/core';
import widgetCatalogData from '@open-edu/core/widget-catalog-data';

const CATALOG_ENTRIES: WidgetCatalogEntry[] = widgetCatalogData;

export interface CuratedWidget {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  status?: string;
  deprecated?: boolean;
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

function loadCatalogWidgets(): Map<string, CuratedWidget> {
  const widgets = new Map<string, CuratedWidget>();
  for (const entry of CATALOG_ENTRIES) {
    widgets.set(entry.id, {
      id: entry.id,
      name: entry.name ?? entry.id,
      description: entry.description,
      domain: entry.domain,
      status: entry.status,
      deprecated: entry.deprecated,
      guide: entry.guide,
      guideMarkdown: entry.guide ? renderGuideMarkdown(entry) : undefined,
    });
  }
  return widgets;
}

let _cache: Map<string, CuratedWidget> | null = null;

function getCatalogMap(): Map<string, CuratedWidget> {
  if (!_cache) _cache = loadCatalogWidgets();
  return _cache;
}

export function listCuratedWidgets(): CuratedWidget[] {
  return [...getCatalogMap().values()].filter(
    (widget) => widget.status !== 'deprecated' && widget.deprecated !== true && widget.guide,
  );
}

export function getCuratedWidget(id: string): CuratedWidget | undefined {
  const widget = getCatalogMap().get(id);
  if (!widget || widget.status === 'deprecated' || widget.deprecated === true) return undefined;
  return widget;
}
