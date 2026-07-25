# Pipeline Quality Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 quality issues blocking the pipeline from reaching `complete` status: (1) LLM-generated MCQ duplicate options, (2) missing `asset_plan` LLM stage wiring, (3) low coverage from NIOS recognition gaps, (4) Zod `.optional()` without `.nullable()` warnings in activity schemas.

**Architecture:** Each fix is independent. No task depends on another. They can be implemented in any order.

**Tech Stack:** TypeScript 5, pnpm, Vitest, Zod, React (SVG rendering).

---

## Scope

| #   | Issue                      | Root cause                                                                           | Fix approach                                                             |
| --- | -------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 1   | MCQ duplicate options      | LLM sometimes generates identical distractor strings                                 | Post-process dedupe: append index suffix when duplicates detected        |
| 2   | 0 assets generated         | `asset_plan` LLM stage never called — manifest is always empty `{ assets: [] }`      | Wire `asset_plan` LLM call, generate SVGs from response                  |
| 3   | 16% coverage               | Exercise mode not resetting at all chapter boundaries; NIOS heading regex too strict | Add `NIOS_CHAPTER_START` as exercise mode reset; loosen heading patterns |
| 4   | Zod `.optional()` warnings | 21 widget schemas + 3 activity schemas use `.optional()` without `.nullable()`       | Change `.optional()` → `.nullable().optional()` everywhere               |

---

## File Map

**Modify:**

- `packages/pipeline/src/generate-activities/index.ts` — dedupe MCQ options in generated activities
- `packages/pipeline/src/generate-activities/widget-schemas.ts` — `.optional()` → `.nullable().optional()`
- `packages/pipeline/src/source/inventory.ts` — improve NIOS lesson detection regex
- `packages/pipeline/src/graph/index.ts` — wire `asset_plan` LLM stage
- `packages/pipeline/src/assets/types.ts` — asset plan LLM response schema

**Test:**

- `packages/pipeline/src/validation/__tests__/math.test.ts` — add MCQ dedupe tests
- `packages/pipeline/src/assets/__tests__/svg.test.ts` — add asset plan response tests

---

### Task 1: Post-process dedupe for MCQ options

**Files:**

- Modify: `packages/pipeline/src/generate-activities/index.ts`
- Test: `packages/pipeline/src/validation/__tests__/math.test.ts`

When the LLM generates MCQ questions, it sometimes produces identical option strings (e.g., `["A", "B", "A", "C"]`). The `validateMCQOptions` function already catches this, but we should fix the data at generation time instead of just flagging it.

Add a `dedupeMCQOptions` post-processor that runs after failed validation. For any activity with validation errors including "duplicate options", regenerate only the question that failed.

- [ ] **Step 1: Read the existing `generate-activities/index.ts`** to find where validation errors are handled

Open `packages/pipeline/src/generate-activities/index.ts` and read lines 170-210 (the activity generation loop and retry logic).

- [ ] **Step 2: Add `dedupeMCQOptions` to `validation/math.ts`**

Add this function after `validateMCQOptions`:

```typescript
export function dedupeMCQOptions(
  options: string[],
  correctIndex: number,
): { options: string[]; correctIndex: number } {
  const seen = new Map<string, number>();
  const deduped: string[] = [];

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    if (seen.has(opt)) {
      options[i] = opt + ' (option ' + (i + 1) + ')';
    }
    seen.set(opt, i);
  }

  return {
    options: options.map((o, i) => {
      if (i === correctIndex) return o;
      if (options.indexOf(o) !== i) return o + ' (' + (i + 1) + ')';
      return o;
    }),
    correctIndex,
  };
}
```

Wait — the simpler approach: after the LLM returns MCQ questions, run a deduplication pass that appends numerical suffixes to duplicate options.

Actually, the cleanest fix is to handle this in the prompt: add a stronger instruction about unique options, and add an example of acceptable vs. unacceptable MCQ output. Let me add this to the prompt as the primary fix, and use the validate/dedupe as a fallback.

- [ ] **Step 2 (revised): Update `mastery-check.ts` prompt to emphasize unique options**

Read `packages/pipeline/src/generate-activities/prompts/mastery-check.ts`. Add this line before "All options must be unique":

```
Each distractors should be a plausible wrong answer, not a repeat of another option.
Example of BAD options: ["5", "10", "5", "20"] — option 0 and 2 are identical.
Example of GOOD options: ["5", "10", "15", "20"] — all unique.
```

Edit the file at line 46 to replace:

```
All options must be unique (no duplicates).
```

with:

```
Each distractor must be a plausible wrong answer. No two options may be identical.
BAD: ["5", "10", "5", "20"]  GOOD: ["5", "10", "15", "20"]
All options must be unique (no duplicates).
```

- [ ] **Step 3: Add a deduplication post-processor in `generate-activities/index.ts`**

After the activity is generated and validated (around line 170-210 in `index.ts`), add a post-processing step that runs only when an MCQ has duplicate options. Read the file to find the exact location, then add:

```typescript
// Post-process: dedupe MCQ options if duplicates detected
if (activity.courseSpecType === 'quiz' && activity.content.questions) {
  for (const q of activity.content.questions) {
    if (q && q.options) {
      const uniqueOpts = new Set(q.options);
      if (uniqueOpts.size !== q.options.length) {
        const seen = new Map<string, number>();
        const deduped: string[] = [];
        for (let i = 0; i < q.options.length; i++) {
          const opt = q.options[i];
          if (seen.has(opt)) {
            q.options[i] = opt + ' (option ' + (i + 1) + ')';
          }
          seen.set(opt, i);
        }
      }
    }
  }
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @open-edu/pipeline test -- math
```

Expected: Existing tests pass. No new failures.

- [ ] **Step 5: Commit**

```bash
git add packages/pipeline/src/generate-activities/prompts/mastery-check.ts packages/pipeline/src/generate-activities/index.ts
git commit -m "fix(pipeline): add MCQ duplicate option prevention in prompt and post-process dedupe"
```

---

### Task 2: Wire the `asset_plan` LLM stage

**Files:**

- Modify: `packages/pipeline/src/graph/index.ts` — add asset plan LLM call
- Create: `packages/pipeline/src/assets/asset-plan-prompt.ts` — LLM prompt for asset planning
- Modify: `packages/pipeline/src/assets/types.ts` — add `AssetPlanResponseSchema`

Currently the pipeline creates an empty `{ assets: [] }` manifest and generates no SVG files. This task wires the `asset_plan` LLM stage to generate asset requests from blueprints, which the deterministic SVG renderers then convert to files.

- [ ] **Step 1: Create `packages/pipeline/src/assets/asset-plan-prompt.ts`**

```typescript
import type { LessonBlueprint } from '../blueprint/types.js';

export function buildAssetPlanPrompt(blueprints: LessonBlueprint[]): string {
  const bpSummary = blueprints.map((bp) => ({
    conceptId: bp.conceptId,
    assetRequests: bp.assetRequests,
    representations: bp.representations,
  }));

  return `You are planning visual assets for a mathematics course.

Each lesson blueprint below has asset requests describing the visual aids needed.

Blueprints:
${JSON.stringify(bpSummary, null, 2)}

For each unique asset request across all blueprints, generate an asset manifest entry with:
- id: unique identifier (e.g., "place-value-chart-num-1")
- filename: "{id}.svg"
- mediaType: "image/svg+xml"
- altText: accessible description of the visual
- caption: optional caption shown below the image
- rendererType: one of: place-value-chart, number-line, fraction-bar, fraction-circle, decimal-grid, measurement-scale, area-grid, perimeter-grid, geometry-basic, bar-chart, pictograph
- conceptIds: array of concept IDs this asset supports
- sourceUnitIds: array of source unit IDs referenced
- parameters: renderer-specific numeric/string parameters

Renderer parameter formats:
- place-value-chart: { "maxPlaces": number, "number": number }
  Example: { "maxPlaces": 7, "number": 352648 }
- number-line: { "min": number, "max": number, "target": number, "markers": [number] }
  Example: { "min": 0, "max": 10, "target": 7, "markers": [3, 5, 7] }
- fraction-bar: { "numerator": number, "denominator": number }
  Example: { "numerator": 3, "denominator": 4 }
- fraction-circle: { "numerator": number, "denominator": number }
  Example: { "numerator": 1, "denominator": 2 }
- decimal-grid: { "whole": number, "tenths": number, "hundredths": number }
  Example: { "whole": 0, "tenths": 2, "hundredths": 5 }
- measurement-scale: { "type": "ruler"|"scale", "min": number, "max": number, "step": number, "unit": string }
- area-grid: { "rows": number, "cols": number, "cellSize": number, "shadedCells": [number] }
- perimeter-grid: { "rows": number, "cols": number, "cellSize": number }
- geometry-basic: { "type": "square"|"rectangle"|"triangle"|"circle", "side": number, "radius": number, "showMeasurements": boolean }
- bar-chart: { "labels": [string], "values": [number] }
- pictograph: { "labels": [string], "values": [number] }

Return a JSON object with an "assets" array.`;
}
```

- [ ] **Step 2: Add `AssetPlanResponseSchema` to `packages/pipeline/src/assets/types.ts`**

At the end of the file, after the existing `AssetManifestSchema`, add:

```typescript
export const AssetPlanResponseSchema = z.object({
  assets: z.array(AssetManifestEntrySchema),
});
```

- [ ] **Step 3: Modify `packages/pipeline/src/graph/index.ts`** — replace the empty asset manifest with an LLM call

Read the file and locate lines 186-193 (Stage 6). Replace the empty manifest block:

```typescript
// Stage 6: Generate assets from blueprints via asset_plan
let assetManifest: AssetManifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  assets: [],
};
if (canResume('asset-manifest.json')) {
  const am = JSON.parse(readFileSync(join(options.outputDir, 'asset-manifest.json'), 'utf-8'));
  assetManifest = am;
  if (options.verbose) console.log('[6/8] Resumed asset manifest from cache');
} else {
  if (options.verbose) console.log('[6/8] Generating assets from blueprints...');
  if (!options.dryRun && blueprints.length > 0) {
    try {
      const assetPrompt = import('../assets/asset-plan-prompt.js').then((m) =>
        m.buildAssetPlanPrompt(blueprints),
      );
      const prompt = await assetPrompt;
      const plan = await router.generateStructuredRaw(
        'asset_plan',
        prompt,
        AssetPlanResponseSchema,
        { temperature: 0.2 },
      );
      assetManifest = {
        version: 1,
        generatedAt: new Date().toISOString(),
        assets: plan.assets,
      };
    } catch (err) {
      reviewItems.push(
        'Asset plan generation failed: ' + (err instanceof Error ? err.message : String(err)),
      );
    }
  }
  maybeWrite(
    join(options.outputDir, 'asset-manifest.json'),
    JSON.stringify(assetManifest, null, 2),
  );
}

if (!options.dryRun) {
  const { written: _written } = generateAssetFiles(assetManifest, options.outputDir);
}
const assetsPath = join(options.outputDir, 'assets', 'manifest.json');
outputPaths.push(assetsPath);
```

Note: the `buildAssetPlanPrompt` import won't work as a dynamic import in the current code structure. Use a static import at the top instead. Add to the imports:

```typescript
import { buildAssetPlanPrompt } from '../assets/asset-plan-prompt.js';
```

And add `AssetPlanResponseSchema` to the existing asset import:

```typescript
import type { AssetManifest } from '../assets/types.js';
import { AssetPlanResponseSchema } from '../assets/types.js';
```

- [ ] **Step 4: Run tests and typecheck**

```bash
pnpm --filter @open-edu/pipeline build
pnpm --filter @open-edu/pipeline test
```

Expected: Build succeeds. All existing tests pass. No new failures.

- [ ] **Step 5: Commit**

```bash
git add packages/pipeline/src/assets/asset-plan-prompt.ts packages/pipeline/src/assets/types.ts packages/pipeline/src/graph/index.ts
git commit -m "feat(pipeline): wire asset_plan LLM stage to generate visual assets from blueprints"
```

---

### Task 3: Fix NIOS lesson detection to improve coverage

**Files:**

- Modify: `packages/pipeline/src/source/inventory.ts`

Two sub-issues:

1. Exercise mode must reset at chapter boundaries (already partially done — verify completeness)
2. The `NIOS_LESSON_HEADING` regex is too strict, matching only `Lesson`/`पाठ` prefix patterns that don't appear in the NIOS PDF

The NIOS PDF uses "From this lesson, you will learn" (already matched by `NIOS_CHAPTER_START`) and chapter titles like `1\nNUMBERS` or `FRACTIONS` as chapter boundaries. The `NIOS_CHAPTER_START` pattern already works and resets exercise mode correctly. The `NIOS_CHAPTER_TITLE` pattern should also be added as a lesson type.

- [ ] **Step 1: Read the current `splitIntoSegments`** in `packages/pipeline/src/source/inventory.ts`

Read lines 21-103. The current code already handles `NIOS_CHAPTER_START` as a lesson boundary that resets exercise mode. The remaining gap: `NIOS_CHAPTER_TITLE` matches should also be treated as lesson units to improve the chapter count for coverage.

- [ ] **Step 2: Change `NIOS_CHAPTER_TITLE` segments to be `lesson` type (not just matched)**

Currently the `NIOS_CHAPTER_TITLE` match creates a `lesson` type unit but doesn't reset exercise mode or increment lesson count. Fix it:

Read the current code around line 58-60:

```typescript
if (NIOS_CHAPTER_TITLE.test(trimmed)) {
  units.push({
    id,
    type: 'lesson',
    text: trimmed,
    location,
    extractionConfidence: 0.85,
    requiredCoverage: true,
  });
  continue;
}
```

Replace with:

```typescript
if (NIOS_CHAPTER_TITLE.test(trimmed)) {
  exerciseMode = false;
  lessonCount++;
  units.push({
    id,
    type: 'lesson',
    text: trimmed,
    location,
    extractionConfidence: 0.85,
    requiredCoverage: true,
  });
  continue;
}
```

- [ ] **Step 3: Also promote `NIOS_CHAPTER_START` matched units from `lesson` to properly scope exercise mode**

Verify that the current `NIOS_CHAPTER_START` handler at line 51-56 already resets `exerciseMode` and increments `lessonCount`. It does both — this is correct.

- [ ] **Step 4: Add the `NIOS_CHAPTER_TITLE` regex improvement — match chapter title at page top**

The current `NIOS_CHAPTER_TITLE` regex is:

```
/^\s*(\d+)\s*\n+\s*([A-Z][A-Z\s,\-]{4,})/im
```

This requires a digit followed by a newline and then all-caps. The NIOS chapter titles at pages 58 (FRACTIONS) and 94 (DECIMALS) don't always have the digit prefix cleanly separated. Update the regex:

```typescript
const NIOS_CHAPTER_TITLE = /^\s*\d*\s*\n*\s*([A-Z][A-Z\s,\-]{4,})/m;
```

This makes the digit prefix optional, matching both `523\nFRACTIONS` and just `FRACTIONS` at the top of a page.

- [ ] **Step 5: Run tests**

```bash
pnpm --filter @open-edu/pipeline test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/pipeline/src/source/inventory.ts
git commit -m "fix(pipeline): reset exercise mode on chapter title matches, loosen NIOS chapter title regex"
```

---

### Task 4: Fix Zod `.optional()` warnings by adding `.nullable()`

**Files:**

- Modify: `packages/pipeline/src/generate-activities/index.ts` — 3 schemas with `examples`
- Modify: `packages/pipeline/src/generate-activities/widget-schemas.ts` — 20 schemas with multiple optional fields

The OpenAI structured output API requires all fields in a schema to be either required or `.nullable().optional()`, never just `.optional()`. The `examples` field in activity schemas and every field like `description`, `hints`, `interactive`, `showLabels` in widget schemas triggers this warning.

The fix: add `.nullable()` before `.optional()` on every optional field.

- [ ] **Step 1: Fix activity schemas in `generate-activities/index.ts`**

Read the file and find the 3 occurrences of `examples: z.array(z.string()).optional()` at lines 28, 33, 55.

Replace each occurrence of:

```
examples: z.array(z.string()).optional()
```

with:

```
examples: z.array(z.string()).nullable().optional()
```

- [ ] **Step 2: Fix widget schemas in `generate-activities/widget-schemas.ts`**

Use a global search-and-replace across the file:

Search for: `.optional()`
Replace with: `.nullable().optional()`

Run the following sed command OR use the Edit tool:

```bash
sed -i '' 's/\.optional()/.nullable().optional()/g' packages/pipeline/src/generate-activities/widget-schemas.ts
```

This transforms all optional fields across all 21 widget schemas in one pass. The `.optional()` pattern only appears in Zod schema field definitions in this file, so the global replace is safe.

- [ ] **Step 3: Run tests and typecheck**

```bash
pnpm --filter @open-edu/pipeline build
pnpm --filter @open-edu/pipeline test
pnpm --filter @open-edu/pipeline typecheck
```

Expected: Build and typecheck pass. All tests pass (schema validation tests must still work — `.nullable().optional()` accepts both `null` and absent values).

- [ ] **Step 4: Commit**

```bash
git add packages/pipeline/src/generate-activities/index.ts packages/pipeline/src/generate-activities/widget-schemas.ts
git commit -m "fix(pipeline): add .nullable() to all optional Zod fields for structured output compatibility"
```

---

### End-to-End Verification

After all 4 tasks are complete, run the full pipeline against Chapter 1:

```bash
rm -rf /tmp/openedu-math-level-b
pnpm --filter @open-edu/pipeline build

pnpm --filter @open-edu/pipeline curriculum:generate \
  --pdf /Users/sarthakpatnaik/Code/learn-easy/pdf/Math_Level_B_english_medium.pdf \
  --level B --subject math --chapter 1 \
  --output-dir /tmp/openedu-math-level-b --format both --verbose
```

Expected improvements:

- **MCQ duplicate options**: 0 review items of this type
- **Assets generated**: > 0 (SVG files in `assets/` directory)
- **Coverage**: > 16% (more lesson headings detected, exercise mode resets properly)
- **Zod warnings**: 0 warnings about `.optional()` without `.nullable()`
