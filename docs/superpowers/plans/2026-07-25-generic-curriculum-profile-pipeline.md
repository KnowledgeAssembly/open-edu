# Generic Curriculum Profile Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the merged model-routed pipeline into a generic PDF-to-OpenEdu curriculum compiler that supports any subject, any textbook/curriculum format, and either a complete multi-chapter PDF or a standalone chapter PDF.

**Architecture:** Keep extraction, provenance, routing, orchestration, output, resume, and quality reporting in a generic pipeline core. Move NIOS, mathematics, science, language, and other curriculum behavior into independently registered profiles that contribute prompt context, source classification, widgets, assets, question families, and validators.

**Tech Stack:** TypeScript 5, pnpm workspaces, Vitest, Zod, `pdf-parse`, OpenAI/OpenRouter providers, OpenEdu course-spec JSON, widget catalog, deterministic asset renderers.

---

## Product contract

The CLI must support all of these inputs:

```text
1. A textbook PDF containing multiple chapters.
2. A PDF containing one chapter.
3. A PDF containing a chapter without recognizable chapter headings.
4. A PDF from NIOS or another known curriculum.
5. A generic textbook with no curriculum adapter.
6. A caller-provided subject/curriculum profile.
```

The generic pipeline must always produce:

```text
source-inventory.json
document-structure.json
concept-map.json
lesson-blueprints.json
assets/manifest.json
coverage-ledger.json
quality-report.json
course-spec.json
course-spec.md
```

The generated course must never depend on Math-specific fields, NIOS-only headings, or a hardcoded chapter number.

## Design principles

1. The pipeline core owns orchestration; profiles own domain behavior.
2. A single unknown subject must still generate useful generic lessons.
3. Known profiles improve quality but are not required for execution.
4. Deterministic validators decide publication, not model confidence alone.
5. Source evidence is preserved from PDF page to final activity.
6. A single-chapter PDF is a valid document scope, not an error condition.
7. Full-text generation and chapter-scoped generation use the same artifact contracts.
8. Model routing remains stage-based and profile-independent.

## Current implementation constraints to address

The merged implementation currently has these constraints:

- `source/inventory.ts` contains NIOS-specific markers.
- `concepts/prompt.ts`, `blueprint/prompt.ts`, and `assets/asset-plan-prompt.ts` say mathematics explicitly.
- Asset renderers are math-only.
- `graph/index.ts` rebuilds a reduced fake concept before activity generation.
- `widgetCategories` is passed as an empty array by the CLI.
- `concept_enrichment` and `review` are configured stages but are not complete generation stages.
- The report always includes math validation and math-oriented publish gates.
- `--chapter` assumes lesson units and does not express document scope robustly.
- Resume hashes do not fully represent input content, profile, scope, prompt version, or widget capabilities.

## File map

Create:

- `packages/pipeline/src/profile/types.ts` — profile interfaces and schemas.
- `packages/pipeline/src/profile/registry.ts` — profile registration and resolution.
- `packages/pipeline/src/profile/builtins/generic.ts` — fallback profile for arbitrary subjects.
- `packages/pipeline/src/profile/builtins/nios.ts` — NIOS structural adapter.
- `packages/pipeline/src/profile/builtins/math.ts` — mathematics extensions and validators.
- `packages/pipeline/src/profile/builtins/science.ts` — initial science extension.
- `packages/pipeline/src/profile/__tests__/registry.test.ts` — profile tests.
- `packages/pipeline/src/scope/types.ts` — full-document/chapter/page/unit scope.
- `packages/pipeline/src/scope/resolve.ts` — scope resolution and synthetic chapter handling.
- `packages/pipeline/src/scope/__tests__/resolve.test.ts` — scope tests.
- `packages/pipeline/src/structure/types.ts` — document/chapter/section hierarchy.
- `packages/pipeline/src/structure/detect.ts` — generic and profile-aware boundary detection.
- `packages/pipeline/src/structure/__tests__/detect.test.ts` — structure tests.
- `packages/pipeline/src/assets/registry.ts` — profile-aware asset renderer registry.
- `packages/pipeline/src/assets/__tests__/registry.test.ts` — renderer tests.
- `packages/pipeline/src/validation/registry.ts` — generic/domain validator registry.
- `packages/pipeline/src/validation/__tests__/registry.test.ts` — validator tests.
- `packages/pipeline/src/__tests__/generic-pipeline.test.ts` — generic end-to-end fixture.
- `packages/pipeline/src/fixtures/generic-science/README.md` — non-NIOS/non-math fixture instructions.
- `packages/pipeline/src/fixtures/generic-science/source-inventory.json` — reviewed fixture inventory.
- `packages/pipeline/src/fixtures/single-chapter/README.md` — single-chapter fixture instructions.

Modify:

- `packages/pipeline/src/graph/index.ts` — profile/scope-aware orchestration.
- `packages/pipeline/src/cli/index.ts` — profile, curriculum, language, and scope options.
- `packages/pipeline/src/config/config.ts` — profile and scope configuration.
- `packages/pipeline/src/source/types.ts` and `inventory.ts` — generic classification hooks.
- `packages/pipeline/src/source/inventory-prompt.ts` — profile-neutral prompt context.
- `packages/pipeline/src/extract/index.ts` — document structure and page metadata.
- `packages/pipeline/src/concepts/index.ts` and `prompt.ts` — profile context and evidence.
- `packages/pipeline/src/blueprint/index.ts`, `prompt.ts`, and `types.ts` — generic blueprint capabilities.
- `packages/pipeline/src/generate-activities/index.ts` and `prompts/*.ts` — complete concept/blueprint input.
- `packages/pipeline/src/assets/types.ts`, `manifest.ts`, `asset-plan-prompt.ts` — renderer registry integration.
- `packages/pipeline/src/validation/math.ts` and `report.ts` — validator registry integration.
- `packages/pipeline/src/coverage/index.ts` — document/profile-aware coverage.
- `packages/pipeline/package.json` — profile prompt/build scripts.
- `openwiki/operations/testing-and-changes.md` — generic pipeline operations.

## Task 1: Define the curriculum profile contract

**Files:**

- Create: `packages/pipeline/src/profile/types.ts`
- Create: `packages/pipeline/src/profile/registry.ts`
- Create: `packages/pipeline/src/profile/__tests__/registry.test.ts`
- Modify: `packages/pipeline/src/types.ts`

- [ ] Define the profile shape:

```ts
export interface CurriculumProfile {
  id: string;
  subject: string;
  curriculum?: string;
  locale: string;
  language: string;
  sourceTaxonomy: SourceTaxonomy;
  conceptKinds: string[];
  representations: string[];
  questionFamilies: string[];
  widgetCategories: string[];
  assetRendererTypes: string[];
  validatorIds: string[];
  promptContext: Record<string, unknown>;
}

export interface SourceTaxonomy {
  lessonLabels: string[];
  sectionLabels: string[];
  objectiveLabels: string[];
  definitionLabels: string[];
  exampleLabels: string[];
  exerciseLabels: string[];
  reviewLabels: string[];
  assessmentLabels: string[];
}
```

- [ ] Add `CurriculumProfileSchema` with non-empty IDs, valid locale/language, and no duplicate capability IDs.
- [ ] Implement registry methods `register`, `get`, `list`, and `resolve({ profileId, subject, curriculum })`.
- [ ] Make unknown profile resolution return the generic profile rather than failing.
- [ ] Test duplicate registration, explicit profile selection, subject fallback, unknown fallback, and profile immutability.
- [ ] Run `pnpm --filter @open-edu/pipeline test -- registry`.

## Task 2: Add generic and built-in profiles

**Files:**

- Create: `packages/pipeline/src/profile/builtins/generic.ts`
- Create: `packages/pipeline/src/profile/builtins/nios.ts`
- Create: `packages/pipeline/src/profile/builtins/math.ts`
- Create: `packages/pipeline/src/profile/builtins/science.ts`
- Modify: `packages/pipeline/src/profile/registry.ts`
- Test: `packages/pipeline/src/profile/__tests__/registry.test.ts`

- [ ] Define the generic profile with neutral English labels, generic concept kinds, generic representations, core widgets, no domain validator, and no NIOS assumptions.
- [ ] Move NIOS markers from `source/inventory.ts` into the NIOS profile’s `sourceTaxonomy` and structural hints.
- [ ] Move mathematics prompt context, math question families, math widgets, math asset renderers, and `math` validator ID into the math profile.
- [ ] Add the first science profile with concepts such as `knowledge`, `process`, `classification`, and `application`; include process diagrams, image labels, and core quiz widgets.
- [ ] Register built-ins once at package initialization and expose `getCurriculumProfile` from the pipeline package.
- [ ] Test that generic, NIOS, math, and science profiles resolve independently and that generic does not contain math-only renderers.
- [ ] Run `pnpm --filter @open-edu/pipeline test -- profile`.

## Task 3: Add explicit document scope

**Files:**

- Create: `packages/pipeline/src/scope/types.ts`
- Create: `packages/pipeline/src/scope/resolve.ts`
- Create: `packages/pipeline/src/scope/__tests__/resolve.test.ts`
- Modify: `packages/pipeline/src/cli/index.ts`
- Modify: `packages/pipeline/src/config/config.ts`

- [ ] Define scope types:

```ts
export type DocumentScope =
  | { kind: 'all' }
  | { kind: 'chapter-index'; index: number }
  | { kind: 'chapter-id'; id: string }
  | { kind: 'pages'; start: number; end: number }
  | { kind: 'source-units'; ids: string[] };
```

- [ ] Add CLI options `--scope all`, `--chapter <index>`, `--chapter-id <id>`, `--pages <start-end>`, and `--source-units <id,id>`.
- [ ] Preserve `--chapter` as an alias for `--scope chapter-index:<index>`.
- [ ] Resolve scope after structural detection and before concept generation.
- [ ] If a PDF contains no detected chapter boundary, synthesize one chapter with ID `document.chapter-1`.
- [ ] Reject invalid ranges, zero-based indices, missing chapter IDs, and source-unit IDs outside the inventory.
- [ ] Test full textbook, multi-chapter selection, single-chapter PDF, page selection, and synthetic chapter behavior.
- [ ] Run `pnpm --filter @open-edu/pipeline test -- scope`.

## Task 4: Separate generic extraction from curriculum classification

**Files:**

- Create: `packages/pipeline/src/structure/types.ts`
- Create: `packages/pipeline/src/structure/detect.ts`
- Create: `packages/pipeline/src/structure/__tests__/detect.test.ts`
- Modify: `packages/pipeline/src/extract/index.ts`
- Modify: `packages/pipeline/src/source/types.ts`
- Modify: `packages/pipeline/src/source/inventory.ts`
- Modify: `packages/pipeline/src/source/inventory-prompt.ts`

- [ ] Add hierarchy types for document, chapter, section, page, and source-unit relationships. Every node must carry stable ID, page range, heading, parent ID, and confidence.
- [ ] Implement generic boundary heuristics for numbered headings, all-caps headings, Markdown-like headings, table-of-contents entries, repeated header/footer removal, and page transitions.
- [ ] Add profile hooks for curriculum-specific labels and boundary patterns; the generic detector runs first and profile rules refine it.
- [ ] Replace `NIOS_*` constants in the generic inventory module with profile-provided taxonomy and detector rules.
- [ ] Keep unknown content as `unclassified` and send only unresolved units to the source-inventory LLM stage.
- [ ] Require the LLM to classify original unit IDs only; reject unknown IDs, duplicate classifications, and missing classifications without silently losing units.
- [ ] Test generic textbook headings, NIOS headings, a single chapter without headings, tables, repeated headers, and mixed-language markers.
- [ ] Run `pnpm --filter @open-edu/pipeline test -- extract source structure`.

## Task 5: Make concepts and blueprints profile-neutral

**Files:**

- Modify: `packages/pipeline/src/concepts/types.ts`
- Modify: `packages/pipeline/src/concepts/index.ts`
- Modify: `packages/pipeline/src/concepts/prompt.ts`
- Modify: `packages/pipeline/src/blueprint/types.ts`
- Modify: `packages/pipeline/src/blueprint/index.ts`
- Modify: `packages/pipeline/src/blueprint/prompt.ts`
- Test: `packages/pipeline/src/concepts/__tests__/concept-map.test.ts`, `blueprint/__tests__/blueprint.test.ts`

- [ ] Replace subject-specific prompt text with profile fields: subject, curriculum, level, language, concept kinds, representations, question families, and prompt context.
- [ ] Preserve generic fields such as `conceptId`, `sourceUnitIds`, `learningObjective`, `coreIdea`, `difficulty`, `prerequisites`, `representations`, and `estimatedMinutes`.
- [ ] Move `adultContext` into profile extension metadata or an optional `applicationContext` field; do not require it for every subject.
- [ ] Validate profile-supported concept kinds, representations, question families, widget categories, and asset renderer types before calling the model.
- [ ] Ensure blueprint generation receives the complete `Concept`, source evidence, profile capability context, and resolved scope.
- [ ] Add an `extensions` record for domain-specific structured metadata instead of adding math-only top-level fields.
- [ ] Test generic history/science concepts, math concepts, unsupported capability rejection, and source-evidence enforcement.
- [ ] Run `pnpm --filter @open-edu/pipeline test -- concepts blueprint`.

## Task 6: Wire complete concepts and blueprints into activity generation

**Files:**

- Modify: `packages/pipeline/src/graph/index.ts`
- Modify: `packages/pipeline/src/generate-activities/index.ts`
- Modify: `packages/pipeline/src/generate-activities/prompts/*.ts`
- Modify: `packages/pipeline/src/types.ts`
- Test: `packages/pipeline/src/__tests__/generic-pipeline.test.ts`

- [ ] Change the activity input from the reconstructed legacy `GeneratedConcept` to the original `Concept`, profile, blueprint, source evidence, asset manifest entries, and widget context.
- [ ] Remove hardcoded `CH1`, empty `coreIdea`, empty `examples`, fixed beginner difficulty, and fixed 30-minute duration from `graph/index.ts`.
- [ ] Generate activity arcs from `blueprint.lessonArc`; retain a compatibility adapter that maps old five-step arcs when no blueprint is available.
- [ ] Add `sourceUnitIds`, `assetIds`, `widgetRequestIds`, `questionFamily`, and `profileId` to generated activity metadata.
- [ ] Make prompts generic and inject profile-specific teaching guidance rather than embedding “mathematics.”
- [ ] Test that generated activities preserve concept evidence, blueprint order, profile ID, asset links, widget requests, and subject-specific question families.
- [ ] Run `pnpm --filter @open-edu/pipeline test -- generic-pipeline generate-activities`.

## Task 7: Make assets extensible through a renderer registry

**Files:**

- Create: `packages/pipeline/src/assets/registry.ts`
- Create: `packages/pipeline/src/assets/__tests__/registry.test.ts`
- Modify: `packages/pipeline/src/assets/types.ts`
- Modify: `packages/pipeline/src/assets/manifest.ts`
- Modify: `packages/pipeline/src/assets/asset-plan-prompt.ts`
- Modify: `packages/pipeline/src/profile/types.ts`

- [ ] Define:

```ts
export interface AssetRenderer {
  type: string;
  mediaType: string;
  render(entry: AssetManifestEntry): string | Uint8Array;
  validate(parameters: Record<string, unknown>): string[];
}
```

- [ ] Register generic renderers plus math renderers. Do not make the asset module import the math profile.
- [ ] Allow profiles to declare permitted renderer types and require every asset plan entry to use a permitted renderer.
- [ ] Change the asset prompt to describe renderer capabilities from the active profile instead of a fixed math list.
- [ ] Preserve SVG accessibility requirements for visual renderers and support future raster/external/source assets through the same manifest.
- [ ] Propagate asset rendering errors into the quality report and publish gates.
- [ ] Test renderer registration, profile filtering, unknown renderer rejection, parameter validation, safe filenames, and accessible SVG output.
- [ ] Run `pnpm --filter @open-edu/pipeline test -- assets`.

## Task 8: Make widgets profile-aware

**Files:**

- Modify: `packages/pipeline/src/generate-activities/widget-schemas.ts`
- Modify: `packages/pipeline/src/generate-activities/index.ts`
- Modify: `packages/pipeline/src/blueprint/prompt.ts`
- Modify: `packages/pipeline/src/cli/index.ts`
- Modify: `packages/widgets/src/widget-catalog-source.ts` only if metadata is missing
- Test: `packages/pipeline/src/validation/__tests__/widgets.test.ts`

- [ ] Load canonical widget metadata from the widget catalog and filter it through `profile.widgetCategories`.
- [ ] Pass widget IDs, learning intents, generation hints, examples, capabilities, and schemas to prompts.
- [ ] Make generated IDs canonical; keep aliases only at input migration boundaries.
- [ ] Reject unknown IDs, unsupported profile categories, missing schemas, invalid configs, and observe/interactive mode mismatches.
- [ ] Ensure a generic profile can use core widgets even when no subject-specific widgets exist.
- [ ] Test math, science, generic, and empty-widget-profile behavior.
- [ ] Run `pnpm --filter @open-edu/pipeline test -- widgets` and `pnpm --filter @open-edu/widgets test`.

## Task 9: Replace unconditional math validation with validator plugins

**Files:**

- Create: `packages/pipeline/src/validation/registry.ts`
- Create: `packages/pipeline/src/validation/__tests__/registry.test.ts`
- Modify: `packages/pipeline/src/validation/math.ts`
- Modify: `packages/pipeline/src/validation/report.ts`
- Modify: `packages/pipeline/src/graph/index.ts`

- [ ] Define:

```ts
export interface SubjectValidator {
  id: string;
  supports(profile: CurriculumProfile): boolean;
  validateConcepts(input: ValidationContext): ValidationIssue[];
  validateActivities(input: ValidationContext): ValidationIssue[];
}
```

- [ ] Register generic structure/coverage/asset/widget validators and profile-selected validators.
- [ ] Keep `math` validation as a plugin; it must run only when the active profile enables it.
- [ ] Add a science validator for process-diagram references and classification answers as the first non-math example.
- [ ] Change quality-report fields from mandatory `mathValidation` to a map of validator results, while preserving a compatibility `mathValidation` projection for existing consumers.
- [ ] Make publish gates evaluate enabled validators plus generic gates.
- [ ] Test profile-specific validator selection, generic-only subjects, math failures, science failures, and compatibility report output.
- [ ] Run `pnpm --filter @open-edu/pipeline test -- validation report`.

## Task 10: Fix scope-aware resume and artifact identity

**Files:**

- Modify: `packages/pipeline/src/graph/index.ts`
- Modify: `packages/pipeline/src/config/config.ts`
- Modify: `packages/pipeline/src/source/types.ts`
- Test: `packages/pipeline/src/scope/__tests__/resolve.test.ts`, `packages/pipeline/src/__tests__/generic-pipeline.test.ts`

- [ ] Compute the artifact hash from PDF content hash, profile ID/version, curriculum, subject, level, language, locale, scope, widget capability hash, prompt version, and all stage model configs.
- [ ] Store the hash and input metadata in `pipeline-manifest.json`.
- [ ] Prevent a full-text artifact from being reused for a chapter scope, and prevent a chapter artifact from being reused for full scope.
- [ ] On resume, load and validate intermediate artifacts rather than assuming `course-spec.json` implies in-memory concepts and activities are available.
- [ ] Include `chapterFilter`/scope in the hash and invalidate changed PDFs at the same path.
- [ ] Test full-to-chapter invalidation, chapter-to-full invalidation, changed-PDF invalidation, profile changes, and valid resume.
- [ ] Run `pnpm --filter @open-edu/pipeline test -- scope generic-pipeline`.

## Task 11: Add profile-aware CLI and configuration

**Files:**

- Modify: `packages/pipeline/src/cli/index.ts`
- Modify: `packages/pipeline/src/config/config.ts`
- Modify: `packages/pipeline/src/graph/index.ts`
- Modify: `packages/pipeline/package.json`

- [ ] Add options:

```text
--profile <id>              Explicit profile, e.g. generic, nios, math, science
--curriculum <id>           Curriculum adapter, optional
--language <code>           Content language, default en
--locale <locale>           Locale, default en-IN
--scope <value>             all, chapter-index:N, chapter-id:ID, pages:A-B
--widget-category <id>      Repeatable capability filter
```

- [ ] Preserve `--subject` as user-facing metadata and use it to resolve a profile when `--profile` is absent.
- [ ] Validate subjects with spaces, hyphens, Unicode names, and arbitrary user-provided labels.
- [ ] Load profile metadata before PDF classification and show profile/scope/capabilities in verbose logs.
- [ ] Make `--dry-run` extract and structurally inspect the PDF without making LLM calls or writing generated course content.
- [ ] Add CLI tests for generic subject, explicit profile, single chapter, full book, invalid scope, and unknown profile fallback.
- [ ] Run `pnpm --filter @open-edu/pipeline test -- cli config` and `pnpm --filter @open-edu/pipeline build`.

## Task 12: Add generic fixtures and acceptance tests

**Files:**

- Create: `packages/pipeline/src/fixtures/generic-science/README.md`
- Create: `packages/pipeline/src/fixtures/generic-science/source-inventory.json`
- Create: `packages/pipeline/src/fixtures/single-chapter/README.md`
- Create: `packages/pipeline/src/__tests__/generic-pipeline.test.ts`
- Modify: `packages/pipeline/package.json`

- [ ] Build a fake-router integration test that runs the same pipeline with:

```text
generic profile + single-chapter fixture
science profile + multi-section fixture
math profile + existing Math Level B Lesson 1 fixture
nios profile + existing NIOS source inventory
```

- [ ] Assert all profiles produce the same artifact set and valid course-spec JSON.
- [ ] Assert only the math profile runs math validation and only enabled asset renderers are requested.
- [ ] Assert a single-chapter document produces one module without requiring a detected chapter heading.
- [ ] Assert a multi-chapter document preserves chapter order and parent relationships.
- [ ] Assert unknown subjects resolve to generic and still produce core reading, practice, quiz, and core-widget activities.
- [ ] Add machine gates: no missing source evidence, no invalid assets, no unsupported widgets, no dependency cycles, no unhandled validator errors, and compiler-compatible JSON.
- [ ] Run `pnpm --filter @open-edu/pipeline test` and `pnpm --filter @open-edu/course-compiler test`.

## Task 13: Document extension and operational workflows

**Files:**

- Create: `packages/pipeline/README.md`
- Modify: `openwiki/operations/testing-and-changes.md`
- Modify: `openwiki/domain/content-and-workflows.md`

- [ ] Document the generic profile contract with a minimal profile example.
- [ ] Document how to add a new subject without changing graph orchestration.
- [ ] Document how to add a curriculum adapter without changing the generic extractor.
- [ ] Document how to register asset renderers, validators, and widgets.
- [ ] Document single-chapter and multi-chapter CLI examples.
- [ ] Document model-stage overrides and profile-specific defaults.
- [ ] Document generated artifact identity and resume behavior.
- [ ] Add an operational checklist for reviewing a new subject profile before publishing content.
- [ ] Run `pnpm --filter @open-edu/pipeline lint`, `pnpm --filter @open-edu/pipeline typecheck`, and `pnpm --filter @open-edu/pipeline build`.

## Task 14: Evaluate profile quality and routing

**Files:**

- Create: `packages/pipeline/src/evaluation/profile-evaluation.ts`
- Create: `packages/pipeline/src/evaluation/__tests__/profile-evaluation.test.ts`
- Create: `docs/generic-pipeline-evaluation.md`

- [ ] Compare generic, NIOS, math, and science profiles on source-boundary accuracy, concept coverage, activity alignment, widget validity, asset usefulness, validator coverage, latency, retries, and cost.
- [ ] Compare mini-only routing against routed models for each profile.
- [ ] Record profile ID/version, prompt version, model-stage configuration, input hash, and quality metrics for every evaluation.
- [ ] Promote a domain-specific profile only when it improves measured quality over generic behavior.
- [ ] Keep generic fallback behavior as a permanent regression baseline.
- [ ] Run `pnpm --filter @open-edu/pipeline test -- evaluation`.

## End-to-end acceptance checklist

- [ ] Any subject label can be processed through the generic profile.
- [ ] NIOS behavior is implemented by a profile, not generic pipeline logic.
- [ ] Math behavior is implemented by a profile and optional validators/assets.
- [ ] A science profile demonstrates non-math generation.
- [ ] A single-chapter PDF is accepted without chapter headings.
- [ ] A multi-chapter PDF preserves chapter hierarchy and ordering.
- [ ] Full and scoped runs cannot reuse incompatible artifacts.
- [ ] Profile capabilities control widgets, assets, question families, and validators.
- [ ] Activities receive the complete concept and blueprint rather than fabricated defaults.
- [ ] Generic quality gates run for every subject.
- [ ] Domain validators run only when enabled by the active profile.
- [ ] Every required source unit has evidence links into generated content.
- [ ] Generated JSON compiles through the existing course compiler.
- [ ] Existing Math Level B Lesson 1 tests remain green.

## Implementation order

```text
1. Curriculum profile contract and registry
2. Generic/NIOS/math/science built-in profiles
3. Explicit document scope
4. Generic structure detection and profile classification
5. Profile-neutral concepts and blueprints
6. Complete concept/blueprint activity wiring
7. Asset renderer registry
8. Profile-aware widgets
9. Validator registry
10. Scope-aware resume and artifact identity
11. Profile-aware CLI/configuration
12. Generic, science, single-chapter, and NIOS fixtures
13. Documentation
14. Evaluation and routing comparison
```

Do not add more subject-specific prompt branches to the graph. Add or modify a profile instead.
