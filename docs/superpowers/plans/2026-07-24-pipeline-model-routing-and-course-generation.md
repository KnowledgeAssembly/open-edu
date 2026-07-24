# OpenEdu Course Generation and Model Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a source-grounded PDF-to-OpenEdu pipeline that supports a different LLM provider/model configuration per stage while generating complete, visual, interactive, mathematically verified course material from NIOS textbooks.

**Architecture:** Add a typed stage router above the existing `LlmProvider`, then evolve the pipeline from chapter-to-activities generation into source inventory → concept map → lesson blueprint → assets/widgets → activities → validation → course package. `gpt-5.4-mini` is the default high-volume model; stronger models are used for concept boundaries, lesson planning, and final review; deterministic code owns extraction metadata, math checks, schemas, coverage, and asset integrity.

**Tech Stack:** TypeScript 5, pnpm, Vitest, Zod, `pdf-parse`, OpenAI/OpenRouter providers, OpenEdu course-spec JSON, OpenEdu widget catalog, deterministic SVG.

---

## Scope and acceptance fixture

This plan covers `packages/llm-config`, `packages/pipeline`, pipeline documentation, source provenance, visual assets, widget planning, validation, and output artifacts. It does not redesign the learner runtime or add new widgets.

The first golden fixture is:

```text
/Users/sarthakpatnaik/Code/learn-easy/pdf/Math_Level_B_english_medium.pdf
```

It is a 203-page NIOS Level B mathematics book with seven lessons. Implement and validate Lesson 1 (Numbers) before attempting the full book.

## Model-routing contract

Stages:

```text
source_inventory
concept_map
concept_enrichment
lesson_blueprint
asset_plan
activity_generation
review
```

Recommended initial routing:

| Stage                 | Initial role             |
| --------------------- | ------------------------ |
| `source_inventory`    | `gpt-5.4-mini`           |
| `concept_map`         | stronger reasoning model |
| `concept_enrichment`  | `gpt-5.4-mini`           |
| `lesson_blueprint`    | stronger reasoning model |
| `asset_plan`          | `gpt-5.4-mini`           |
| `activity_generation` | `gpt-5.4-mini`           |
| `review`              | stronger reasoning model |

The stronger model is an escalation path, not a mandatory call for every item. The pipeline must retain the legacy single-model fallback.

Configuration precedence:

```text
CLI stage override > stage environment variable > config-file value
> legacy LLM_MODEL/LLM_PROVIDER > safe defaults
```

Required environment variables:

```text
LLM_PROVIDER=openai
LLM_MODEL=gpt-5.4-mini
LLM_STAGE_SOURCE_INVENTORY_MODEL=gpt-5.4-mini
LLM_STAGE_CONCEPT_MAP_MODEL=gpt-5.4
LLM_STAGE_CONCEPT_ENRICHMENT_MODEL=gpt-5.4-mini
LLM_STAGE_LESSON_BLUEPRINT_MODEL=gpt-5.4
LLM_STAGE_ASSET_PLAN_MODEL=gpt-5.4-mini
LLM_STAGE_ACTIVITY_GENERATION_MODEL=gpt-5.4-mini
LLM_STAGE_REVIEW_MODEL=gpt-5.4
```

## File map

Create:

- `packages/llm-config/src/stages.ts` — stage names and configuration types.
- `packages/llm-config/src/router.ts` — per-stage provider/model dispatch.
- `packages/llm-config/src/__tests__/router.test.ts` — routing tests.
- `packages/pipeline/src/config.ts` and `config.test.ts` — config resolution.
- `packages/pipeline/src/source/types.ts`, `inventory.ts`, `inventory-prompt.ts` — source inventory.
- `packages/pipeline/src/source/__tests__/inventory.test.ts` — inventory tests.
- `packages/pipeline/src/concepts/types.ts`, `index.ts`, `prompt.ts` — concept map.
- `packages/pipeline/src/concepts/__tests__/concept-map.test.ts` — concept tests.
- `packages/pipeline/src/blueprint/types.ts`, `index.ts`, `prompt.ts` — lesson blueprints.
- `packages/pipeline/src/blueprint/__tests__/blueprint.test.ts` — blueprint tests.
- `packages/pipeline/src/assets/types.ts`, `svg.ts`, `manifest.ts` — visual assets.
- `packages/pipeline/src/assets/__tests__/svg.test.ts` and `manifest.test.ts` — asset tests.
- `packages/pipeline/src/coverage/types.ts`, `index.ts` — coverage ledger.
- `packages/pipeline/src/coverage/__tests__/coverage.test.ts` — coverage tests.
- `packages/pipeline/src/validation/math.ts`, `math.test.ts` — math validation.
- `packages/pipeline/src/validation/widgets.ts`, `widgets.test.ts` — widget validation.
- `packages/pipeline/src/validation/report.ts`, `report.test.ts` — quality report.
- `packages/pipeline/src/fixtures/math-level-b/README.md` — golden fixture instructions.
- `packages/pipeline/src/fixtures/math-level-b/source-inventory.json` — reviewed Lesson 1 inventory.
- `packages/pipeline/src/__tests__/math-level-b-lesson1.test.ts` — end-to-end fixture test.

Modify:

- `packages/llm-config/src/types.ts` and `src/index.ts` — export routing APIs while preserving `LlmProvider`.
- `packages/pipeline/src/types.ts` — source, blueprint, asset, coverage, and review metadata.
- `packages/pipeline/src/extract/index.ts` — page-aware extraction and source boundaries.
- `packages/pipeline/src/extract/__tests__/extract.test.ts` — NIOS-shaped cases.
- `packages/pipeline/src/chunk/index.ts` and `chunk/prompts/chapter-concepts.txt` — source-driven concepts.
- `packages/pipeline/src/generate-concept/index.ts` and `prompts/enrich-concept.txt` — routed enrichment.
- `packages/pipeline/src/generate-activities/index.ts`, `exemplars.ts`, and `prompts/*.ts` — blueprint-driven activities.
- `packages/pipeline/src/generate-activities/widget-schemas.ts` — strict canonical widget validation.
- `packages/pipeline/src/graph/index.ts` — new orchestration and checkpoints.
- `packages/pipeline/src/validate/index.ts` — unified validation.
- `packages/pipeline/src/output/index.ts` — all generated artifacts.
- `packages/pipeline/src/cli/index.ts` — stage model flags and reports.
- `packages/pipeline/package.json` — prompt copying and fixture scripts.
- `openwiki/operations/testing-and-changes.md` — operational documentation.

Inspect before changing:

- `packages/widgets/src/widget-catalog-source.ts`
- `packages/core/src/widget-catalog.ts`
- `packages/course-compiler/src/schemas/course-model.ts`
- `packages/course-compiler/src/parser/json-input.ts`
- `packages/course-compiler/src/plugins/plugin-engine.ts`
- `openwiki/domain/content-and-workflows.md`

## Task 1: Implement stage-aware LLM routing

**Files:** `packages/llm-config/src/stages.ts`, `router.ts`, `types.ts`, `index.ts`, `__tests__/router.test.ts`

- [ ] Define:

```ts
export const LLM_STAGES = [
  'source_inventory',
  'concept_map',
  'concept_enrichment',
  'lesson_blueprint',
  'asset_plan',
  'activity_generation',
  'review',
] as const;
export type LlmStage = (typeof LLM_STAGES)[number];
export interface LlmStageConfig {
  provider: string;
  model: string;
  maxTokens: number;
  temperature: number;
}
export type LlmStageConfigs = Record<LlmStage, LlmStageConfig>;
```

- [ ] Implement `LlmRouter.generateStructured(stage, prompt, schema, options)` above the existing `LlmProvider` interface. Cache one provider instance per unique `(provider, model)` pair, apply request overrides, and include stage/provider/model in failures.
- [ ] Add an adapter so existing tests passing one `LlmProvider` continue to work.
- [ ] Test stage selection, provider reuse, request overrides, unknown-stage rejection, failure context, and legacy adapter behavior.
- [ ] Run `pnpm --filter @open-edu/llm-config test` and `pnpm --filter @open-edu/llm-config typecheck`.

## Task 2: Add configuration resolution and CLI overrides

**Files:** `packages/pipeline/src/config.ts`, `config.test.ts`, `src/cli/index.ts`, `src/graph/index.ts`, `packages/llm-config/src/types.ts`

- [ ] Implement pure `resolveStageConfigs(env, overrides): LlmStageConfigs`, supporting legacy `LLM_PROVIDER`, `LLM_MODEL`, `LLM_MAX_TOKENS`, and `LLM_TEMPERATURE`.
- [ ] Add repeatable CLI options: `--stage-model stage=model`, `--stage-provider stage=provider`, `--stage-temperature stage=value`, and `--stage-max-tokens stage=value`.
- [ ] Reject unknown stages, malformed assignments, non-numeric temperatures, and non-positive token limits.
- [ ] Log stage/model/provider in verbose mode without logging credentials.
- [ ] Test precedence: CLI → environment → config → legacy defaults.
- [ ] Run `pnpm --filter @open-edu/pipeline test -- config.test.ts` and `pnpm --filter @open-edu/pipeline typecheck`.

## Task 3: Build a page-aware source inventory

**Files:** `packages/pipeline/src/source/*`, `src/types.ts`, `src/extract/index.ts`, `src/extract/__tests__/extract.test.ts`

- [ ] Add these types:

```ts
export type SourceUnitType =
  | 'lesson'
  | 'section'
  | 'objective'
  | 'definition'
  | 'worked_example'
  | 'exercise'
  | 'review'
  | 'assessment'
  | 'diagram'
  | 'unclassified';
export interface SourceLocation {
  pageStart: number;
  pageEnd?: number;
  heading?: string;
  sectionId?: string;
}
export interface SourceUnit {
  id: string;
  type: SourceUnitType;
  text: string;
  location: SourceLocation;
  parentId?: string;
  extractionConfidence: number;
  requiredCoverage: boolean;
}
export interface SourceInventory {
  documentId: string;
  title: string;
  totalPages: number;
  units: SourceUnit[];
  warnings: string[];
}
```

- [ ] Preserve page boundaries during PDF parsing; do not infer pages after concatenation. Keep unclassified text and extraction warnings.
- [ ] Recognize NIOS headings, objectives, examples, “Let us see what you have learnt,” practice, revision, and tests. Reset exercise mode at section/lesson boundaries.
- [ ] Use the `source_inventory` model only for semantic classification. The model may reference deterministic source IDs but may not invent pages or IDs.
- [ ] Test page retention, stable NIOS IDs, example/exercise attachment, exercise-mode reset, unclassified preservation, and no dropped pages.
- [ ] Run `pnpm --filter @open-edu/pipeline test -- extract inventory`.

## Task 4: Replace chapter-level extraction with a coverage-aware concept map

**Files:** `packages/pipeline/src/concepts/*`, `src/chunk/index.ts`, `chunk/prompts/chapter-concepts.txt`, `src/generate-concept/index.ts`, `prompts/enrich-concept.txt`

- [ ] Define concept fields for hierarchical IDs, source-unit evidence, concept kind, prerequisites, representations, exercise families, and misconception targets.
- [ ] Generate concepts from bounded source-unit groups, not whole chapters. Remove the fixed 3–8-per-chapter rule.
- [ ] Require one or more source IDs per concept, coverage of objectives and assessment families, and one concept per independently teachable skill.
- [ ] Deduplicate IDs and reject self-dependencies, missing dependencies, dependency cycles, and concepts without evidence.
- [ ] Route enrichment through `concept_enrichment`; require difficulty, mastery threshold, misconceptions, interventions, concrete/visual/symbolic representations, adult-life context, and recommended widget categories.
- [ ] Test concept splitting, deduplication, source evidence, graph cycles, and the Lesson 1 concept family.
- [ ] Run `pnpm --filter @open-edu/pipeline test -- chunk concepts generate-concept`.

## Task 5: Add lesson blueprints

**Files:** `packages/pipeline/src/blueprint/*`, `src/types.ts`

- [ ] Define a Zod-backed `LessonBlueprint` with `conceptId`, `sourceUnitIds`, `objective`, `priorKnowledge`, `representations`, `lessonArc`, `assetRequests`, `widgetRequests`, `questionFamilies`, and `misconceptionTargets`.
- [ ] Support these lesson-arc steps: `hook`, `observe`, `worked_example`, `guided_practice`, `widget_practice`, `independent_practice`, `mastery_check`, `remediation`, and `extension`.
- [ ] Route planning through `lesson_blueprint`; the model plans the lesson but does not write final prose.
- [ ] Reject blueprints with no source units, no mastery check, missing visual representation for visual concepts, or unsupported widget/asset requests.
- [ ] Test complete fractions and place-value blueprints plus all rejection cases.
- [ ] Run `pnpm --filter @open-edu/pipeline test -- blueprint`.

## Task 6: Build deterministic visual assets

**Files:** `packages/pipeline/src/assets/*`

- [ ] Define asset manifest fields: ID, relative path, media type, alt text, caption, provenance, concept IDs, and deterministic renderer data.
- [ ] Implement SVG renderers for Indian place-value charts, number lines, fraction bars/circles, decimal grids, measurement scales, area/perimeter grids, basic geometry, and bar/pictograph charts.
- [ ] Ensure SVG output has escaped labels plus accessible `<title>` and `<desc>` elements and is deterministic for identical input.
- [ ] Route semantic asset requests through `asset_plan`; accept only allowlisted renderer types and never accept arbitrary model-generated paths or raw SVG.
- [ ] Write `assets/manifest.json`, reject duplicate IDs/path traversal/missing files, and link every asset to concepts and source evidence.
- [ ] Test deterministic output, accessibility nodes, escaping, path safety, duplicates, and missing-file failures.
- [ ] Run `pnpm --filter @open-edu/pipeline test -- assets`.

## Task 7: Make widgets catalog-driven and strict

**Files:** `packages/pipeline/src/widgets/*`, `src/generate-activities/widget-schemas.ts`, `src/generate-activities/index.ts`, `src/generate-activities/prompts/*.ts`

- [ ] Build prompt context from `packages/widgets/src/widget-catalog-source.ts` or its public catalog interface. Include canonical ID, objectives, generation hints, misconceptions, example configs, observe support, and capabilities.
- [ ] Normalize generated IDs to canonical values such as `math.fraction-visual`, `math.place-value-chart`, `math.number-line`, and `core.matching`. Keep aliases only for input migration.
- [ ] Reject unknown widget IDs and any known ID without a schema. Do not silently fall back to reading after final widget validation failure.
- [ ] Restrict widget selection to blueprint `widgetRequests`; enforce observe/interative mode rules.
- [ ] Test canonical resolution, unknown IDs, malformed configs, alias migration, and representative Math Level B configurations.
- [ ] Run `pnpm --filter @open-edu/pipeline test -- widget-schemas catalog-context` and `pnpm --filter @open-edu/widgets test`.

## Task 8: Generate activities from blueprints and evidence

**Files:** `packages/pipeline/src/generate-activities/index.ts`, `exemplars.ts`, `prompts/*.ts`, `src/types.ts`

- [ ] Pass source-unit excerpts, blueprint, asset manifest entries, catalog context, misconceptions, and required question families into every activity request.
- [ ] Add structured fields for source IDs, asset IDs, answer explanations, distractor rationales, misconception targets, difficulty, and machine-checkable answer metadata.
- [ ] Update prompts: observe must use concrete→visual→symbolic explanation and worked examples; guided practice must scaffold misconceptions; independent practice must include varied and transfer questions; mastery must cover conceptual/procedural/application forms with explanations.
- [ ] Add exemplars for place value, fractions, decimals, measurement, area, geometry, and charts using canonical widget IDs.
- [ ] Preserve the existing five-step compatibility mode while allowing blueprint-driven arcs.
- [ ] Test context propagation, output normalization, explanations, widget configs, and blueprint order.
- [ ] Run `pnpm --filter @open-edu/pipeline test -- generate-activities output`.

## Task 9: Add deterministic math validation

**Files:** `packages/pipeline/src/validation/math.ts`, `math.test.ts`, `src/validate/index.ts`, `src/types.ts`

- [ ] Extend numerical questions with structured expression/problem data, expected answer, unit, and answer type. Do not parse arbitrary prose for the first implementation.
- [ ] Validate addition, subtraction, multiplication, division, place value, expanded form, comparison/order, fraction equivalence/comparison, decimals, unit conversions, area/perimeter/volume, clock/money, and chart questions.
- [ ] Reject MCQs with zero or multiple correct options, invalid indices, duplicate options where uniqueness is required, incorrect explanations, or mismatched widget answers.
- [ ] Add table-driven tests including zeros, Indian digit grouping, units, fractions, and invalid answers.
- [ ] Run `pnpm --filter @open-edu/pipeline test -- math`.

## Task 10: Add coverage, assets, and publish-quality gates

**Files:** `packages/pipeline/src/coverage/*`, `packages/pipeline/src/validation/report.*`, `src/validate/index.ts`

- [ ] Define a coverage ledger linking every required source unit to concepts, blueprints, activities, assets, status, and review notes. Statuses: `covered`, `partially_covered`, `uncovered`, `not_applicable`.
- [ ] Calculate required source, objective, worked-example-family, exercise-family, assessment, concept/activity, and asset-reference coverage.
- [ ] Prevent `complete` output when required coverage is below threshold, any numerical answer fails, any widget is invalid, any asset is missing, any concept lacks activities/evidence, or the dependency graph cycles.
- [ ] Emit `quality-report.json` with stage model usage, retries, duration, token/cost metadata when available, coverage percentages, validation counts, and review items. Never emit credentials or raw private prompts.
- [ ] Test complete output and every publish-gate failure mode.
- [ ] Run `pnpm --filter @open-edu/pipeline test -- validate coverage report`.

## Task 11: Rebuild graph orchestration and outputs

**Files:** `packages/pipeline/src/graph/index.ts`, `src/cli/index.ts`, `src/output/index.ts`, `src/types.ts`, `package.json`

- [ ] Accept `LlmRouter` in production and provide a compatibility adapter for existing single-provider tests.
- [ ] Orchestrate:

```text
extract → source inventory → concept map → enrichment → blueprints
→ asset plan/render → activities/widgets → deterministic validation
→ review → coverage gate → JSON/Markdown/assets/reports
```

- [ ] Write resumable intermediate artifacts: `source-inventory.json`, `concept-map.json`, `lesson-blueprints.json`, `assets/manifest.json`, `course-spec.json`, `course-spec.md`, `coverage-ledger.json`, and `quality-report.json`.
- [ ] Reuse artifacts only when source/config/model hashes match; invalidate mismatches unless `--force` is set.
- [ ] Log stage, model, provider, item count, retries, and elapsed time in verbose mode. `--dry-run` must avoid LLM calls.
- [ ] Ensure JSON is canonical and compiler-compatible; Markdown is a readable export.
- [ ] Test artifact emission, resume/invalidation, compiler compatibility, and failed publish status.
- [ ] Run `pnpm --filter @open-edu/pipeline test`, `pnpm --filter @open-edu/pipeline build`.

## Task 12: Build the Lesson 1 golden vertical slice

**Files:** `packages/pipeline/src/fixtures/math-level-b/*`, `packages/pipeline/src/__tests__/math-level-b-lesson1.test.ts`

- [ ] Create a reviewed inventory covering large numbers, Indian place value, expanded form, comparison, ordering, smallest/greatest number construction, source examples, and exercise families.
- [ ] Require these machine gates: 100% required source coverage, 100% objective coverage, 100% worked-example/exercise-family coverage, zero math failures, zero invalid widgets, zero missing assets, zero concepts without activities, and zero dependency cycles.
- [ ] Use a fake router that records every stage/model request and returns deterministic structured results. Assert all artifact links and a passing quality report.
- [ ] Assert final JSON compiles through `packages/course-compiler`.
- [ ] Document the opt-in real-provider command:

```bash
pnpm --filter @open-edu/pipeline build
pnpm --filter @open-edu/pipeline curriculum:generate \
  --pdf /Users/sarthakpatnaik/Code/learn-easy/pdf/Math_Level_B_english_medium.pdf \
  --level B --subject math --chapter 1 \
  --output-dir /tmp/openedu-math-level-b --format both --verbose
```

- [ ] Run `pnpm --filter @open-edu/pipeline test -- math-level-b-lesson1` and `pnpm --filter @open-edu/course-compiler test`.

## Task 13: Document and evaluate routing

**Files:** `packages/pipeline/README.md`, `openwiki/operations/testing-and-changes.md`, `openwiki/domain/content-and-workflows.md`, `docs/pipeline-model-routing-evaluation.md`

- [ ] Document legacy single-model usage, stage overrides, artifact meanings, quality gates, and the rule that models do not replace deterministic validators.
- [ ] Add focused package scripts only after their implementations exist: `test:fixture` and `validate:generated`.
- [ ] Evaluate the Lesson 1 fixture with: mini for every stage; mini plus stronger-model escalation; stronger model for every stage.
- [ ] Measure coverage, concept-boundary accuracy, prerequisite accuracy, math correctness, widget validity, asset usefulness, human acceptance, latency, retries, tokens, and cost.
- [ ] Promote a stronger-model stage only when it materially improves a publication metric; retain mini where quality is equivalent.

## End-to-end acceptance checklist

- [ ] Legacy `LLM_MODEL` configures every stage.
- [ ] Each stage independently overrides model/provider/config.
- [ ] Stage/model/provider appear in logs and reports.
- [ ] Source pages and unclassified text are preserved.
- [ ] Required source units link to concepts and activities.
- [ ] Concepts are teachable, deduplicated, and acyclic.
- [ ] Every concept has a blueprint and evidence.
- [ ] Every visual reference resolves to an accessible asset.
- [ ] Every widget ID/config is canonical and valid.
- [ ] Every numerical answer passes deterministic validation.
- [ ] Generated JSON compiles.
- [ ] Quality gates prevent incomplete output from reporting `complete`.
- [ ] Lesson 1 passes before full-book generation begins.

## Implementation order

```text
1. Stage router
2. Config and CLI overrides
3. Page-aware source inventory
4. Coverage-aware concept map
5. Lesson blueprints
6. Deterministic assets
7. Strict catalog-driven widgets
8. Blueprint-driven activities
9. Math validation
10. Coverage and publish gates
11. Orchestration and artifacts
12. Lesson 1 golden slice
13. Documentation and routing evaluation
```

Do not generate the full 203-page book until Tasks 1–12 are complete and the Lesson 1 quality report passes.
