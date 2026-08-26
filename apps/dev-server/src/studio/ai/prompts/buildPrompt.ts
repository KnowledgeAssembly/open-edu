import { listCuratedWidgets } from '../../widgets/curatedCatalog.js';

/**
 * Renders the live curated widget catalog into a compact table so the LLM can
 * both pick a canonical widget id and fill its config fields. Widget ids are
 * never hardcoded anywhere in prompt source — this is the single source.
 */
export function renderWidgetCatalogSection(): string {
  const widgets = listCuratedWidgets();
  const lines = widgets.map((widget) =>
    [
      widget.id,
      widget.name,
      widget.source ?? 'builtin',
      widget.trustTier ?? 'native',
      widget.version ?? '0.1.0',
      widget.offline ? 'offline' : 'online',
      widget.status ?? 'stable',
    ].join(' | '),
  );
  return `AVAILABLE WIDGETS (id | name | source | trust | version | offline | status):\n${lines.join('\n')}`;
}

export function isCatalogWidgetId(id: string): boolean {
  return listCuratedWidgets().some((w) => w.id === id);
}

/**
 * AI/draft guard: only ids present in the merged curated catalog are allowed.
 * Throws with the offending id so callers surface a deterministic error rather
 * than silently authoring an unknown/revoked widget.
 */
export function assertCatalogWidgetId(id: string): void {
  if (!isCatalogWidgetId(id)) {
    throw new Error(`Unknown or revoked widget id "${id}" is not in the curated catalog`);
  }
}

/**
 * Guard against legacy url emission: prompts must reference community widgets
 * by widgetRef (pinned by version/integrity), never by remoteWidget.url.
 */
export function assertNoLegacyRemoteUrlPrompt(text: string): void {
  if (text.includes('remoteWidget.url')) {
    throw new Error('Prompt output must not emit remoteWidget.url; use widgetRef instead');
  }
}

/**
 * Renders the titles of existing course items as context for add/edit prompts.
 * Returns an empty string when there are no existing items.
 */
export function renderCourseContext(titles: string[]): string {
  if (titles.length === 0) return '';
  const items = titles.map((title, index) => `${index + 1}. ${title}`).join('\n');
  return `EXISTING COURSE ITEMS:\n${items}`;
}
