import { listCuratedWidgets } from '../../widgets/curatedCatalog.js';

/**
 * Renders the live curated widget catalog into a compact table so the LLM can
 * both pick a canonical widget id and fill its config fields. Widget ids are
 * never hardcoded anywhere in prompt source — this is the single source.
 */
export function renderWidgetCatalogSection(): string {
  const widgets = listCuratedWidgets();
  const lines = widgets.map((widget) => {
    const configFields = (widget.guide?.configFields ?? [])
      .map((field) => `${field.name}:${field.type}`)
      .join(', ');
    return `${widget.id} | ${widget.name} | ${widget.domain ?? ''} | ${configFields}`;
  });
  return `AVAILABLE WIDGETS (id | name | domain | configFields):\n${lines.join('\n')}`;
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
