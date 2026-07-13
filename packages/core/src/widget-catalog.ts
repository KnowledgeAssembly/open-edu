import type { WidgetRegistry, WidgetDefinitionV2 } from '@open-edu/widgets';
import { WIDGET_ALIAS_MAP, getLearningIntentsForWidget } from '@open-edu/widgets';

export function generateWidgetCatalog(registry: WidgetRegistry): string {
  const lines: string[] = [];
  lines.push('## Widget Catalog');
  lines.push('');
  lines.push('The following built-in widgets are available. Each has a unique `widget` ID and expects a specific `config` object shape.');
  lines.push('Legacy `open-edu.*` IDs are automatically resolved to their new domain-prefixed equivalents.');
  lines.push('');

  const allWidgets = registry.getAll();
  const byDomain = new Map<string, typeof allWidgets>();

  for (const w of allWidgets) {
    const v2 = w as WidgetDefinitionV2;
    const domain = v2.domain || w.id.split('.')[0] || 'unknown';
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain)!.push(w);
  }

  const DOMAIN_LABELS: Record<string, string> = {
    core: 'Core Widgets',
    math: 'Math Widgets',
    language: 'Language Widgets',
    science: 'Science Widgets',
    social: 'Social Widgets',
  };

  for (const [domain, widgets] of byDomain) {
    lines.push(`### ${DOMAIN_LABELS[domain] ?? domain} Widgets`);
    lines.push('');

    for (const w of widgets) {
      const v2 = w as WidgetDefinitionV2;
      const intents = getLearningIntentsForWidget(w.id);

      let statusTag = '';
      if (v2.status === 'deprecated') {
        statusTag = ' **[DEPRECATED]**';
      } else if (v2.status === 'experimental') {
        statusTag = ' *(experimental)*';
      }

      lines.push(`#### ${v2.name ?? w.id} (\`${w.id}\`)${statusTag}`);
      if (v2.description) lines.push(v2.description);
      lines.push('');

      if (intents.length > 0) {
        const labels = intents.map(i => i.charAt(0).toUpperCase() + i.slice(1));
        lines.push(`Learning intents: ${labels.join(', ')}`);
        lines.push('');
      }

      const legacyEntry = Object.entries(WIDGET_ALIAS_MAP).find(([, target]) => target === w.id);
      if (legacyEntry) {
        lines.push(`Legacy ID: \`${legacyEntry[0]}\` (auto-resolved)`);
        lines.push('');
      }

      if (v2.deprecated && v2.replacement) {
        lines.push(`Note: This widget is deprecated. Use \`${v2.replacement}\` instead.`);
        lines.push('');
      }

      if (v2.keywords?.length) {
        lines.push(`Keywords: ${v2.keywords.join(', ')}`);
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}
