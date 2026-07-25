#!/usr/bin/env node
/**
 * Generates per-widget documentation pages from the guide field in
 * widget-catalog-source.ts. Writes markdown to apps/docs/docs/widget-library/.
 *
 * Run: pnpm --filter @open-edu/widgets generate:widget-docs
 */
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WidgetGuideData } from '../src/widget-catalog-source.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { WIDGET_CATALOG_ENTRIES } = await import('../src/widget-catalog-source.ts');

const entriesWithGuide = WIDGET_CATALOG_ENTRIES.filter((e) => !e.deprecated && e.guide);

const outputBaseDir = resolve(__dirname, '../../../apps/docs/docs/widget-library');

const domains = [...new Set(entriesWithGuide.map((e) => e.domain!))];

for (const domain of domains) {
  const domainDir = join(outputBaseDir, domain);
  if (existsSync(domainDir)) {
    const staleFiles = readdirSync(domainDir).filter((f) => f.endsWith('.md'));
    for (const file of staleFiles) {
      unlinkSync(join(domainDir, file));
    }
  }
  mkdirSync(domainDir, { recursive: true });
}

for (const entry of entriesWithGuide) {
  const g = entry.guide!;
  const md = renderPage(
    entry.id,
    entry.name ?? entry.id,
    entry.domain ?? 'core',
    entry.status ?? 'stable',
    g,
  );
  const filename = entry.id.split('.').slice(1).join('-') + '.md';
  const filePath = join(outputBaseDir, entry.domain!, filename);
  writeFileSync(filePath, md, 'utf-8');
}

console.log(`Generated ${entriesWithGuide.length} widget doc pages → ${outputBaseDir}`);

function renderPage(
  id: string,
  name: string,
  domain: string,
  status: string,
  g: WidgetGuideData,
): string {
  return (
    [
      `---`,
      `sidebar_position: ${g.sidebarPosition}`,
      `---`,
      ``,
      `# ${name}`,
      ``,
      `**Widget ID:** \`${id}\` | **Domain:** ${domain} | **Status:** ${status}`,
      ``,
      `> ${g.oneLiner}`,
      ``,
      `## What it does`,
      ``,
      g.whatItDoes,
      ``,
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
