# Widget Guide for Content Developers

**Date:** 2026-07-23
**Audience:** Non-technical teachers and parents authoring learning packages
**Status:** Approved

## Problem

The 26 built-in widgets have no per-widget documentation for content authors. The existing `widgets/overview.md` is a developer-focused SDK reference covering the type contract, registry API, metadata validation, widget catalog generation, remote loading, and scaffold templates. It contains zero config references, usage examples, or authoring guidance. Teachers and parents cannot discover how to use widgets without reading source code.

## Audience Separation

This design creates a **content developer** documentation track — plain-language guides for teachers and parents authoring learning packages. The existing `overview.md` remains the **widget developer** reference — covering SDK contracts, registry APIs, and catalog generation. These are separate audiences with separate needs:

| Audience                               | Needs                                                                | Location                                                                                         |
| -------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Content developers (teachers, parents) | Config fields, usage examples, practical tips, how to build a lesson | `apps/docs/docs/widget-library/` (new directory, 26 generated pages + hand-written tutorial)     |
| Widget developers (engineers)          | Type contracts, registry API, metadata schema, scaffold templates    | `apps/docs/docs/widgets/overview.md` (existing, unchanged; sidebar entry moved under "Packages") |

The sidebar is restructured to make this split explicit:

- **Widget Library** — new top-level category near `package-authoring` for content authors
- **Widget SDK** — the existing `overview.md` moves from a standalone "Widgets" category into the "Packages" category, alongside `schemas`, `core`, `runtime`, etc.

## Goals

1. Every non-deprecated built-in widget has a documentation page with config fields, example JSON, and practical tips
2. A hands-on tutorial teaches content authors to build their first lesson with widgets
3. All content is written in plain language — no JSON jargon, no developer assumptions
4. Config documentation stays accurate via a structured data source with a generation pipeline
5. Content developer docs are clearly separated from widget developer docs in the sidebar
6. The Widget SDK reference lives with other package references under "Packages"

## Non-Goals

- Visual editor or GUI for widget configuration (out of scope for this work)
- Widget-specific video walkthroughs
- Translations / i18n of the docs
- Content changes to the existing widget developer reference (`overview.md`)

## Widget Count & Source of Truth

The canonical source of registered built-in widgets is `packages/widgets/src/widget-catalog-source.ts` (27 entries: 18 stable, 8 experimental, 1 deprecated). The generation script sources from this file.

### Deprecated Widgets

`open-edu.multiple-choice-practice` (status: `deprecated`, deprecated: `true`, replacement: `core.multiple-choice`) is **excluded** from documentation generation. The generator applies the filter:

```typescript
const active = WIDGET_CATALOG_ENTRIES.filter((e) => !e.deprecated);
```

### Domain Breakdown (26 active widgets)

| Domain   | Count | Widgets                                                                                                                                                                                        |
| -------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| core     | 15    | matching, multiple-choice, visual-counting, drag-drop, sequencing, fill-blank, story-question, real-world, chart-reader, callout, image-compare, hotspot, timeline, audio-player, video-player |
| math     | 6     | fraction-visual, place-value-chart, grid-area, clock-time, measurement-scale, number-line                                                                                                      |
| science  | 3     | label-diagram, image-label, process-diagram                                                                                                                                                    |
| language | 1     | flashcard                                                                                                                                                                                      |
| social   | 1     | social.map                                                                                                                                                                                     |

## Design Decisions

| Decision                  | Choice                                                                                | Rationale                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation format      | Per-widget pages in Docusaurus                                                        | Each widget gets focused attention; sidebar groups by domain                                                                                  |
| Content source            | Optional `guide` field on existing `WidgetCatalogEntry` in `widget-catalog-source.ts` | No separate source file; teacher-facing guide data lives alongside catalog metadata in the existing canonical source                          |
| Config field descriptions | Manually written (not extracted from Zod)                                             | Zod schemas lack human-friendly descriptions; teachers need plain language                                                                    |
| Example JSON              | Manually curated (not pulled from examples/)                                          | Examples in `examples/` are developer-facing; guide examples are teacher-facing                                                               |
| Tutorial approach         | Step-by-step building a complete lesson                                               | Teachers learn by doing; builds a working artifact                                                                                            |
| Generation approach       | TypeScript template literals (no template engine)                                     | Matches `generate-catalog.ts`'s established pattern of importing TypeScript and writing output; no intermediate template language to maintain |
| Widget count source       | `WIDGET_CATALOG_ENTRIES` from `widget-catalog-source.ts`                              | Canonical registry, already the single source of truth for `generate:catalog`                                                                 |
| Content dev doc location  | `apps/docs/docs/widget-library/` (new top-level directory)                            | Clean namespace separation from the SDK reference at `widgets/overview.md`                                                                    |
| SDK ref sidebar placement | Under "Packages" category                                                             | Same audience and doc type as `schemas`, `core`, `runtime`, etc.                                                                              |

## Content Architecture

### Directory Structure

```
apps/docs/docs/
├── widgets/
│   └── overview.md                       # Existing — unchanged, widget developer SDK reference
├── widget-library/                       # NEW — content developer documentation
│   ├── getting-started.md                # Hand-written tutorial
│   ├── core/
│   │   ├── audio-player.md               # Generated
│   │   ├── callout.md                    # Generated (status: experimental)
│   │   ├── chart-reader.md               # Generated
│   │   ├── drag-drop.md                  # Generated
│   │   ├── fill-blank.md                 # Generated
│   │   ├── hotspot.md                    # Generated (status: experimental)
│   │   ├── image-compare.md              # Generated (status: experimental)
│   │   ├── matching.md                   # Generated
│   │   ├── multiple-choice.md            # Generated
│   │   ├── real-world.md                 # Generated
│   │   ├── sequencing.md                 # Generated
│   │   ├── story-question.md             # Generated
│   │   ├── timeline.md                   # Generated (status: experimental)
│   │   ├── video-player.md               # Generated
│   │   └── visual-counting.md            # Generated
│   ├── math/
│   │   ├── clock-time.md                 # Generated
│   │   ├── fraction-visual.md            # Generated
│   │   ├── grid-area.md                  # Generated
│   │   ├── measurement-scale.md          # Generated
│   │   ├── number-line.md                # Generated
│   │   └── place-value-chart.md          # Generated
│   ├── science/
│   │   ├── image-label.md                # Generated (status: experimental)
│   │   ├── label-diagram.md              # Generated (status: experimental)
│   │   └── process-diagram.md            # Generated
│   ├── language/
│   │   └── flashcard.md                  # Generated
│   └── social/
│       └── social-map.md                 # Generated
```

### `id-slug` Transformation

The filename slug is derived from the catalog `id` by stripping the domain prefix:

```
id            → slug            → file path
core.multiple-choice → multiple-choice → widget-library/core/multiple-choice.md
math.place-value-chart → place-value-chart → widget-library/math/place-value-chart.md
social.map   → social-map      → widget-library/social/social-map.md
```

Implementation: `id.split('.').slice(1).join('-')`. The domain prefix is already part of the directory path, so keeping it in the filename would be redundant. The `social.map` case naturally produces `social-map` via `join('-')`, so no special-casing is needed.

### Sidebar Restructuring

The current sidebar has a single "Widgets" category pointing to `widgets/overview`. It is split across two locations:

```typescript
const sidebars = {
  docs: [
    'intro',
    'architecture',
    'learner',
    'package-format',
    'package-authoring',
    // ── Content developer: Widget Library (NEW) ──
    {
      type: 'category',
      label: 'Widget Library',
      link: { type: 'doc', id: 'widget-library/getting-started' },
      items: [
        'widget-library/getting-started',
        {
          type: 'category',
          label: 'Core',
          items: [
            'widget-library/core/multiple-choice',
            'widget-library/core/matching',
            'widget-library/core/drag-drop',
            'widget-library/core/sequencing',
            'widget-library/core/fill-blank',
            'widget-library/core/story-question',
            'widget-library/core/real-world',
            'widget-library/core/chart-reader',
            'widget-library/core/visual-counting',
            'widget-library/core/callout',
            'widget-library/core/image-compare',
            'widget-library/core/hotspot',
            'widget-library/core/timeline',
            'widget-library/core/audio-player',
            'widget-library/core/video-player',
          ],
        },
        {
          type: 'category',
          label: 'Math',
          items: [
            'widget-library/math/fraction-visual',
            'widget-library/math/place-value-chart',
            'widget-library/math/grid-area',
            'widget-library/math/clock-time',
            'widget-library/math/measurement-scale',
            'widget-library/math/number-line',
          ],
        },
        {
          type: 'category',
          label: 'Science',
          items: [
            'widget-library/science/label-diagram',
            'widget-library/science/image-label',
            'widget-library/science/process-diagram',
          ],
        },
        {
          type: 'category',
          label: 'Language',
          items: ['widget-library/language/flashcard'],
        },
        {
          type: 'category',
          label: 'Social',
          items: ['widget-library/social/social-map'],
        },
      ],
    },
    'testing',
    // ...
    // ── Widget developer: SDK reference under Packages ──
    {
      type: 'category',
      label: 'Packages',
      items: [
        'schemas',
        'core',
        'workflow',
        'runtime',
        'accessibility',
        'telemetry',
        'rewards',
        'storage',
        'pwa-core',
        'pwa',
        'dev-server',
        'course-compiler',
        'pipeline',
        'llm-config',
        'ai-companion',
        'i18n',
        'widgets/overview', // ← moved here from the old "Widgets" category
      ],
    },
    // ...
  ],
};
```

Key changes:

- The old top-level "Widgets" category (containing only `widgets/overview`) is **removed**
- A new top-level "Widget Library" category is added as a sibling to `package-authoring` — both serve content developers
- `widgets/overview` is added to the "Packages" category — it's the SDK reference for the `@open-edu/widgets` package, sitting alongside `schemas`, `core`, `runtime`, etc.
- `overview.md` file content is **not modified** — only its sidebar entry moves

## Per-Widget Page Template

Every generated page follows this structure (rendered via TypeScript template literals, not a Mustache file):

````markdown
---
sidebar_position: { { sidebarPosition } }
---

# {{name}}

**Widget ID:** `{{id}}` | **Domain:** {{domain}} | **Status:** {{status}}

> {{oneLiner}}

## What it does

{{whatItDoes}}

{{#whenToUse.length}}

## When to use this widget

{{#whenToUse}}

- {{.}}
  {{/whenToUse}}
  {{/whenToUse.length}}

## Setting it up

{{#setupSteps}}
{{@number}}. {{.}}
{{/setupSteps}}

## Configuration fields

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |

{{#configFields}}
| `{{name}}` | {{type}} | {{#required}}Yes{{/required}}{{^required}}No{{/required}} | {{description}} |
{{/configFields}}

## Example

```json
{{{exampleJson}}}
```
````

{{#tips.length}}

## Tips

{{#tips}}

- {{.}}
  {{/tips}}
  {{/tips.length}}

{{#relatedWidgets}}

## See also

{{#relatedWidgets}}

- [{{name}}]({{domain}}/{{slug}}.md)
  {{/relatedWidgets}}
  {{/relatedWidgets}}

````

The template is a **string in the generator script** (template literal), not a separate `.md` file with a Mustache engine. The generator renders each section using plain TypeScript string concatenation — matching the approach of `generate-catalog.ts`. Cross-reference links use relative paths from within `widget-library/{domain}/` to sibling domain directories.

## Structured Data Source

**No new file.** Teacher-facing guide data is added as an optional `guide` field on the existing `WidgetCatalogEntry` interface in `packages/widgets/src/widget-catalog-source.ts`. This avoids a second source of truth — catalog metadata and guide content live in the same entry, in the same file.

### Type Extension

```typescript
// Added as an optional field on the existing WidgetCatalogEntry interface
export interface WidgetGuideConfigField {
  name: string;            // e.g., "pairs", "pairs[].itemA"
  type: string;            // Human-friendly: "string", "array of objects", "boolean"
  required: boolean;
  description: string;     // Plain language, no jargon
}

export interface WidgetGuideData {
  oneLiner: string;        // One sentence
  whatItDoes: string;      // 2-3 sentences
  whenToUse: string[];     // Bullet list
  setupSteps: string[];    // Numbered steps
  configFields: WidgetGuideConfigField[];
  exampleJson: string;     // Raw JSON string for code block
  tips: string[];
  sidebarPosition: number; // Order within domain group
  relatedWidgets?: Array<{ id: string; name: string; domain: string; slug: string }>;
}

// WidgetCatalogEntry gains an optional `guide` field:
export interface WidgetCatalogEntry {
  // ... existing fields (id, name, description, domain, status, etc.) ...
  guide?: WidgetGuideData;
}
````

The generator reads `WIDGET_CATALOG_ENTRIES`, filters `e => !e.deprecated && e.guide`, and uses existing catalog fields (`id`, `name`, `domain`, `status`, `description`) alongside the `guide` nested object — no duplication.

### Design Rationale

- **Single source of truth.** Adding or removing a widget requires only one edit to `widget-catalog-source.ts`. No risk of catalog and guide diverging.
- **Guide is optional.** Widgets that don't yet have teacher-facing docs simply omit the `guide` field. The generator skips them. A widget can be catalog-registered without guide content during development.
- **Existing fields reused.** `id`, `name`, `domain`, `status`, and `description` are read from the top-level catalog entry — only teacher-specific content lives in `guide`.
- `exampleJson` is a string (not object) — renders as a fenced code block verbatim, no escaping issues
- `configFields` are manually described — Zod schemas don't have human-friendly descriptions
- `setupSteps` are generic by default, overridable per widget for special cases
- `relatedWidgets` includes `domain` and `slug` pre-computed — the generator doesn't need an ID-to-slug resolver

## Getting Started Tutorial

**File:** `apps/docs/docs/widget-library/getting-started.md` (hand-written)

### Tutorial Flow

1. **Prerequisites** — package directory exists, can edit `.json` files
2. **Create lesson intro** — write a Markdown node with a title
3. **Add a Multiple Choice quiz** — create JSON node, fill in config
4. **Add a Matching activity** — create JSON node, fill in config
5. **Add Flashcards for review** — create JSON node, fill in config
6. **Connect the nodes** — write `workflow.json` linking the three steps
7. **Preview your lesson** — run `edu dev` to see it in the browser

### Tutorial Principles

- No JSON knowledge assumed — each field is explained as it appears
- Copy-pasteable at every step
- Builds a complete, working lesson (not isolated snippets)
- Under 10 minutes to complete
- Uses only stable, commonly-used widgets

## Build Pipeline

### Script: `packages/widgets/scripts/generate-widget-docs.ts`

````typescript
#!/usr/bin/env node
/**
 * Generates per-widget documentation pages from the guide field in widget-catalog-source.ts.
 *
 * Run: pnpm --filter @open-edu/widgets generate:widget-docs
 */
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { WIDGET_CATALOG_ENTRIES } = await import('../src/widget-catalog-source.ts');

// Filter to entries that have teacher-facing guide content
const entriesWithGuide = WIDGET_CATALOG_ENTRIES.filter((e) => !e.deprecated && e.guide);

const outputBaseDir = resolve(__dirname, '../../../apps/docs/docs/widget-library');

// 1. Determine active domains from entries
const domains = [...new Set(entriesWithGuide.map((e) => e.domain!))];

// 2. Clean up stale files per domain directory
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

// 3. Generate each page using pure TypeScript (no template engine)
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

// --- Page rendering (pure TypeScript, matching generate-catalog.ts approach) ---

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
            ...g.relatedWidgets.map((r) => `- [${r.name}](${r.domain}/${r.slug}.md)`),
          ]
        : []),
    ].join('\n') + '\n'
  );
}
````

### Key Design Points

- **No template engine.** The generator uses TypeScript string concatenation — the same approach as `generate-catalog.ts`. No Mustache, no external template files, no parsing code to maintain.
- **Stale file cleanup.** Before generation, the script deletes all `.md` files in each active domain directory, then regenerates from scratch. This prevents orphaned pages when widgets are removed or renamed.
- **Pre-computed slugs.** Related widget objects include pre-computed `domain` and `slug` fields — the generator never needs to parse IDs for cross-references.
- **Conditional sections.** `whenToUse`, `tips`, and `relatedWidgets` sections are only emitted when their arrays are non-empty.
- **Separate output directory.** Writing to `widget-library/` keeps generated content cleanly separated from the existing SDK reference at `widgets/overview.md`.

### Package Script

Add to `packages/widgets/package.json`:

```json
"generate:widget-docs": "tsx scripts/generate-widget-docs.ts"
```

### When to Run

- After adding or modifying the `guide` field on any `WidgetCatalogEntry`
- When adding a new widget (add `guide` block + re-run)
- Same workflow as `generate:catalog`

## CI Guardrail

Generated docs are committed to the repository. To prevent drift between source and output, add a CI check:

```bash
# In CI workflow
pnpm --filter @open-edu/widgets generate:widget-docs
git diff --exit-code -- apps/docs/docs/widget-library/
```

This ensures the generated docs always match the source, and a PR that changes `widget-catalog-source.ts` guide fields without re-running the generator will fail CI.

## Testing Strategy

- **Generation test:** Run `generate:widget-docs` and verify 26 files are created in the correct directories under `widget-library/`, with the deprecated entry excluded
- **Content test:** Spot-check 3-5 generated pages for correct field rendering, valid JSON in code blocks, no template artifacts
- **Cleanup test:** Create an extra `.md` file in a domain directory, re-run generation, verify it's deleted
- **Build test:** Run `pnpm --filter @open-edu/docs build` and verify no broken links or missing pages
- **Sidebar test:** Verify all 26 widget pages plus the tutorial appear under "Widget Library" in the sidebar, and `widgets/overview` appears under "Packages"
- **CI gate test:** Run `generate:widget-docs && git diff --exit-code -- apps/docs/docs/widget-library/` and verify it passes on clean state

## Deliverables

| #   | Deliverable              | Files                                                | Approach                                                                           |
| --- | ------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | Guide data in catalog    | `packages/widgets/src/widget-catalog-source.ts`      | Add `guide` field to existing `WidgetCatalogEntry` interface and entries           |
| 2   | Build script             | `packages/widgets/scripts/generate-widget-docs.ts`   | New file — pure TypeScript, no template engine                                     |
| 3   | 26 per-widget pages      | `apps/docs/docs/widget-library/{domain}/{widget}.md` | Generated                                                                          |
| 4   | Getting started tutorial | `apps/docs/docs/widget-library/getting-started.md`   | Hand-written                                                                       |
| 5   | Updated sidebar          | `apps/docs/sidebars.ts`                              | New "Widget Library" top-level category; `widgets/overview` moved under "Packages" |
| 6   | Package script           | `packages/widgets/package.json`                      | Add `generate:widget-docs`                                                         |
| 7   | CI guardrail             | `.github/workflows/ci.yml`                           | Add `git diff --exit-code` check for `apps/docs/docs/widget-library/`              |

**Overview.md** (`apps/docs/docs/widgets/overview.md`) is **not modified** — it remains the widget developer SDK reference. Only its sidebar entry is moved from a standalone "Widgets" category into the "Packages" category.

**Total new/modified files:** ~31
