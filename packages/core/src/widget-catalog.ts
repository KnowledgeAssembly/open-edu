export interface WidgetCatalogEntry {
  id: string;
  name?: string;
  description?: string;
  domain?: string;
  status?: string;
  deprecated?: boolean;
  replacement?: string;
  keywords?: string[];
  learningIntents?: string[];
  legacyId?: string;
}

export interface WidgetCatalogInput {
  widgets: WidgetCatalogEntry[];
}

export function generateWidgetCatalog(input: WidgetCatalogInput): string {
  const lines: string[] = [];
  lines.push('## Widget Catalog');
  lines.push('');
  lines.push(
    'The following built-in widgets are available. Each has a unique `widget` ID and expects a specific `config` object shape.',
  );
  lines.push(
    'Legacy `open-edu.*` IDs are automatically resolved to their new domain-prefixed equivalents.',
  );
  lines.push('');

  const byDomain = new Map<string, WidgetCatalogEntry[]>();

  for (const w of input.widgets) {
    const domain = w.domain || w.id.split('.')[0] || 'unknown';
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
      let statusTag = '';
      if (w.status === 'deprecated') {
        statusTag = ' **[DEPRECATED]**';
      } else if (w.status === 'experimental') {
        statusTag = ' *(experimental)*';
      }

      lines.push(`#### ${w.name ?? w.id} (\`${w.id}\`)${statusTag}`);
      if (w.description) lines.push(w.description);
      lines.push('');

      if (w.learningIntents && w.learningIntents.length > 0) {
        const labels = w.learningIntents.map((i) => i.charAt(0).toUpperCase() + i.slice(1));
        lines.push(`Learning intents: ${labels.join(', ')}`);
        lines.push('');
      }

      if (w.legacyId) {
        lines.push(`Legacy ID: \`${w.legacyId}\` (auto-resolved)`);
        lines.push('');
      }

      if (w.deprecated && w.replacement) {
        lines.push(`Note: This widget is deprecated. Use \`${w.replacement}\` instead.`);
        lines.push('');
      }

      if (w.keywords && w.keywords.length > 0) {
        lines.push(`Keywords: ${w.keywords.join(', ')}`);
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}
