# Open-Edu Course Authoring Skill — Detailed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a portable agent skill (`skills/openedu-course-authoring/`) that generates compiler-compatible Open-Edu course specs anywhere, and validates + compiles full packages when run inside an Open-Edu repository.

**Architecture:** The skill is an instruction-first workflow with small bundled helper scripts. It discovers the available Open-Edu compiler, widget catalog, examples, and pipeline at runtime. `course-spec.json` is canonical; `course-spec.md` is a human-readable export; `quality-report.json` records diagnostics. The existing `packages/cli/skills/course-spec-generator.skill.md` is reduced to a compatibility reference.

**Tech Stack:** Markdown skill format, JSON artifacts, shell/Node helper scripts (ESM), pnpm, `@open-edu/course-compiler`, `@open-edu/core`, `@open-edu/pipeline`, Vitest, Node built-in test runner.

---

## Pre-Flight: Codebase Reference Summary

These are the key source files the implementation references. Read them before starting any task.

### Course-Compiler Schema (the canonical spec format)

**File: `packages/course-compiler/src/parser/json-input.ts`**

The JSON course-spec uses these exact Zod schemas:

```typescript
// Inline schemas in json-input.ts
const MCQQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().min(0).max(3),
});

const ActivityJSONSchema = z.object({
  step: z.enum([
    'observe',
    'guided_practice',
    'independent_practice',
    'mastery_check',
    'positive_completion',
  ]),
  order: z.number(),
  type: z.enum(['reading', 'exercise', 'quiz', 'reflection', 'widget']),
  description: z.string(),
  instructions: z.string().optional(),
  examples: z.array(z.string()).optional(),
  questions: z.array(MCQQuestionSchema).optional(),
  widgetId: z.string().optional(),
  widgetConfig: z.record(z.unknown()).optional(),
});

const LessonJSONSchema = z.object({
  id: z.string(),
  title: z.string(),
  objectives: z.array(z.string()),
  coreIdea: z.string(),
  examples: z.array(z.string()),
  misconceptions: z.array(z.string()),
  estimatedMinutes: z.number().optional(),
  activities: z.array(ActivityJSONSchema),
});

const CourseSpecJSONSchema = z.object({
  format: z.literal('openedu-course-spec'),
  version: z.literal(1),
  generatedAt: z.string(),
  metadata: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string().optional(),
    version: z.string().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    estimatedHours: z.number().optional(),
    generated: z.boolean(),
  }),
  lessons: z.array(LessonJSONSchema),
});
```

**Output types** (from `packages/course-compiler/src/schemas/course-model.ts`): `Activity` is a discriminated union of `reading`, `exercise`, `discussion`, `reflection`, `video`, `widget`. Widget activities require `widgetId: string` and `config: Record<string, unknown>`.

### Widget Catalog

**Canonical source:** `packages/widgets/src/widget-catalog-source.ts` (27 entries)
**Generated data:** `packages/core/src/widget-catalog-data.json` (generated via `pnpm --filter @open-edu/widgets generate:catalog`)
**Catalog functions:** `packages/core/src/widget-catalog.ts` exports `generateWidgetCatalog()`, `getDefaultWidgetCatalog()`, `WIDGET_ALIAS_MAP`
**Widget IDs (canonical, non-deprecated):**

- `core.matching`, `core.multiple-choice`, `core.visual-counting`, `core.drag-drop`, `core.sequencing`, `core.fill-blank`, `core.story-question`, `core.real-world`, `core.chart-reader`, `core.callout`_, `core.image-compare`_, `core.hotspot`_, `core.timeline`_, `core.audio-player`, `core.video-player`
- `math.fraction-visual`, `math.place-value-chart`, `math.grid-area`, `math.clock-time`, `math.measurement-scale`, `math.number-line`
- `science.label-diagram`_, `science.image-label`_, `science.process-diagram`
- `language.flashcard`
- `social.map`
  (\* = experimental status)

**Legacy → Canonical alias map:**

```
open-edu.matching → core.matching
open-edu.multiple-choice → core.multiple-choice
open-edu.multiple-choice-practice → core.multiple-choice
open-edu.visual-counting → core.visual-counting
open-edu.drag-drop → core.drag-drop
open-edu.sequencing → core.sequencing
open-edu.fill-blank → core.fill-blank
open-edu.story-question → core.story-question
open-edu.real-world → core.real-world
open-edu.fraction-visual → math.fraction-visual
open-edu.place-value-chart → math.place-value-chart
open-edu.grid-area → math.grid-area
open-edu.chart-reader → core.chart-reader
open-edu.clock-time → math.clock-time
open-edu.measurement-scale → math.measurement-scale
```

### Pipeline Profiles

**Registry:** `packages/pipeline/src/profile/registry.ts`

- `resolveProfile({ profileId?, subject?, curriculum? })` → returns `CurriculumProfile`
- Built-in profiles: `generic`, `math`, `science`, `nios`
- Profile fields: `id`, `subject`, `curriculum?`, `locale`, `language`, `sourceTaxonomy`, `conceptKinds`, `representations`, `questionFamilies`, `widgetCategories`, `assetRendererTypes`, `validatorIds`, `promptContext`

### CLI Commands

```bash
edu compile <spec.json|spec.md> --output <dir> --validate
edu validate <package-dir>
edu lint-content <package-dir>
edu dev <package-dir>
```

### Existing Skill File

**File:** `packages/cli/skills/course-spec-generator.skill.md` (815 lines)
Contains: Markdown + JSON format documentation, all 15 widget schemas, activity types, ID rules, validation rules, compiler CLI usage. This will be replaced with a thin compatibility entry point.

---

## File Structure to Create

```text
skills/openedu-course-authoring/
├── SKILL.md
├── references/
│   ├── artifact-contract.md
│   ├── authoring-workflow.md
│   ├── quality-rubric.md
│   ├── repository-adapter.md
│   └── source-materials.md
├── scripts/
│   ├── discover-openedu.mjs
│   ├── validate-course-spec.mjs
│   ├── summarize-quality.mjs
│   └── __tests__/
│       ├── discover-openedu.test.mjs
│       ├── validate-course-spec.test.mjs
│       └── summarize-quality.test.mjs
└── evals/
    ├── evals.json
    └── README.md
```

Files to modify:

- `packages/cli/skills/course-spec-generator.skill.md` — reduce to compatibility reference
- `packages/cli/skills/README.md` — new installation/usage docs
- `packages/cli/skills/course-spec-generator.skill.test.ts` — new compatibility test

---

## Task 1: Scaffold the Portable Skill Directory and Artifact Contract

**Files:**

- Create: `skills/openedu-course-authoring/SKILL.md`
- Create: `skills/openedu-course-authoring/references/artifact-contract.md`
- Create: `skills/openedu-course-authoring/references/authoring-workflow.md`
- Create: `skills/openedu-course-authoring/references/repository-adapter.md`

- [ ] **Step 1: Create the skill directory structure**

```bash
mkdir -p skills/openedu-course-authoring/references
mkdir -p skills/openedu-course-authoring/scripts/__tests__
mkdir -p skills/openedu-course-authoring/evals
```

Run: `ls -d skills/openedu-course-authoring/*/`
Expected: the four directories exist (references, scripts, evals, scripts/**tests**).

- [ ] **Step 2: Write `references/artifact-contract.md`**

Write file `skills/openedu-course-authoring/references/artifact-contract.md`:

```markdown
# Artifact Contract

Every run of the Open-Edu Course Authoring skill produces an output directory with these artifacts:
```

course-output/
├── course-brief.md
├── lesson-blueprints.json
├── course-spec.json
├── course-spec.md
├── quality-report.json
└── package/ # only when Open-Edu tooling is detected

```

## Canonical Artifact

`course-spec.json` is the single source of truth. It conforms to the schema defined by `packages/course-compiler/src/parser/json-input.ts`.

### Top-Level Schema

| Field         | Type                 | Required | Description                                          |
|---------------|----------------------|----------|------------------------------------------------------|
| `format`      | `"openedu-course-spec"` | yes   | Fixed value                                          |
| `version`     | `1`                  | yes   | Fixed numeric literal                               |
| `generatedAt` | ISO 8601 string      | yes   | Timestamp of generation                              |
| `metadata`    | object               | yes   | Course-level metadata                                |
| `lessons`     | `LessonObject[]`     | yes   | Non-empty array of lessons                           |

### Metadata Schema

| Field            | Type                                            | Required | Description               |
|------------------|-------------------------------------------------|----------|---------------------------|
| `title`          | string                                          | yes      | Course title              |
| `description`    | string                                          | yes      | Course description        |
| `author`         | string                                          | no       | Author name               |
| `version`        | string                                          | no       | Course version            |
| `difficulty`     | `"beginner" \| "intermediate" \| "advanced"`    | no       | Difficulty level          |
| `estimatedHours` | number                                          | no       | Total estimated hours     |
| `generated`      | boolean                                         | yes      | Always `true` for LLM output |

### Lesson Schema

| Field              | Type               | Required | Description                          |
|--------------------|--------------------|----------|--------------------------------------|
| `id`               | string (kebab-case)| yes      | Unique lesson ID                     |
| `title`            | string             | yes      | Human-readable lesson title          |
| `objectives`       | `string[]`         | yes      | Non-empty array of learning objectives |
| `coreIdea`         | string             | yes      | Main concept in 1-3 sentences        |
| `examples`         | `string[]`         | yes      | Illustrative examples                |
| `misconceptions`   | `string[]`         | yes      | Common misconceptions to address     |
| `estimatedMinutes` | number             | no       | Estimated duration in minutes        |
| `activities`       | `ActivityObject[]` | yes      | Ordered array of activities          |

### Activity Schema

| Field          | Type      | Required | Description                                            |
|----------------|-----------|----------|--------------------------------------------------------|
| `step`         | `"observe" \| "guided_practice" \| "independent_practice" \| "mastery_check" \| "positive_completion"` | yes | Pedagogical step role |
| `order`        | number    | yes      | Sequential order (starting at 1)                       |
| `type`         | `"reading" \| "exercise" \| "quiz" \| "reflection" \| "widget"` | yes | Activity type |
| `description`  | string    | yes      | Short description of the activity                      |
| `instructions` | string    | no       | For reading/exercise types: the content or instructions |
| `examples`     | `string[]`| no       | For exercise types: example problems                   |
| `questions`    | `MCQQuestion[]` | no  | For quiz type: array with exactly 4-option MCQs        |
| `widgetId`     | string    | no       | For widget type: canonical widget ID                   |
| `widgetConfig` | `Record<string, unknown>` | no | For widget type: widget-specific config        |

### MCQQuestion Schema

| Field          | Type        | Required | Description                     |
|----------------|-------------|----------|---------------------------------|
| `question`     | string      | yes      | Question text                   |
| `options`      | `string[4]` | yes      | Exactly 4 options               |
| `correctIndex` | 0-3         | yes      | Zero-based index of correct answer |

## ID Generation Rules

- Lesson IDs: kebab-case, unique within course. Pattern: `{course-prefix}-{number}` or a descriptive slug.
- Activity IDs: auto-generated by compiler from step + description. Not manually specified in JSON.

## Failure Semantics

- Compiler errors (schema validation failures, duplicate IDs, broken references) fail the run.
- Compiler warnings (missing objectives, empty lessons) are reported but do not fail.
- A run is successful only when `course-spec.json` exists and every required validation gate passes.
```

- [ ] **Step 3: Write `references/authoring-workflow.md`**

Write file `skills/openedu-course-authoring/references/authoring-workflow.md`:

````markdown
# Authoring Workflow

The skill follows a staged generation sequence. Each stage produces an artifact that informs the next.

## Modes

### Portable Mode (no Open-Edu repository detected)

1. **Interview** → gather topic, learner level, goals, language, duration, prerequisites, accessibility needs, source materials
2. **Brief** → `course-brief.md` records all assumptions explicitly
3. **Objectives** → derive measurable learning objectives from goals
4. **Lesson Blueprints** → `lesson-blueprints.json` defining each lesson's structure
5. **Generate Spec** → produce `course-spec.json` and `course-spec.md`
6. **Quality Report** → `quality-report.json` with structural diagnostics
7. **Summary** → agent reports artifact locations and validation instructions

### Repository Mode (Open-Edu tooling detected)

Same as portable mode, plus:
5a. **Widget Selection** → choose widgets from discovered catalog by learning intent
5b. **Compile** → `edu compile course-spec.json --output package --validate`
5c. **Validate Package** → `edu validate package`
5d. **Lint Content** → `edu lint-content package`
6+. **Quality Report** includes compiler/validation/lint diagnostics

## Stage Details

### Stage 1: Input Interview

The agent MUST obtain or explicitly assume:

- **Topic/Subject** — What is being taught
- **Learner Age/Level** — Target grade/age range
- **Learning Goals** — 3-6 specific things learners should achieve
- **Language/Locale** — Content language (default: `en`)
- **Expected Duration** — Total course hours or lesson count
- **Prerequisites** — Prior knowledge assumed
- **Delivery Constraints** — Self-paced, instructor-led, blended
- **Accessibility Needs** — Screen reader, keyboard-only, reading level
- **Source Materials** — Any PDFs, textbooks, or curriculum documents supplied

Every unstated input becomes an explicit assumption in `course-brief.md`.

### Stage 2: Course Brief

`course-brief.md` structure:

```markdown
# Course Brief: {title}

## Scope

- Topic: ...
- Audience: ...
- Level: ...

## Learning Goals

1. ...
2. ...

## Assumptions

- [Assumption 1]
- [Assumption 2]

## Lesson Outline

1. Lesson 1: ... (estimated 15 min)
2. Lesson 2: ... (estimated 20 min)

## Accessibility Requirements

- ...
```
````

### Stage 3: Learning Objectives

Each objective must be:

- **Measurable** — uses observable action verbs (identify, explain, calculate, compare, construct)
- **Aligned** — maps to at least one activity and one assessment signal
- **Scoped** — achievable within the lesson duration

### Stage 4: Lesson Blueprints

`lesson-blueprints.json` structure:

```json
[
  {
    "id": "lesson-01",
    "title": "Introduction to Fractions",
    "objectives": ["Identify numerator and denominator", "Represent fractions visually"],
    "coreIdea": "A fraction represents a part of a whole...",
    "examples": ["1/2 of a pizza", "3/4 of a chocolate bar"],
    "misconceptions": ["Larger denominator means larger fraction", "1/3 > 1/2"],
    "estimatedMinutes": 20,
    "activityPlan": [
      { "type": "reading", "step": "observe", "description": "Introduction to fractions" },
      {
        "type": "widget",
        "step": "guided_practice",
        "widgetId": "math.fraction-visual",
        "description": "Shade fractions"
      },
      {
        "type": "exercise",
        "step": "independent_practice",
        "description": "Identify fractions from diagrams"
      },
      { "type": "quiz", "step": "mastery_check", "description": "Fraction identification quiz" }
    ]
  }
]
```

### Stage 5: Generation

Transform lesson blueprints into `course-spec.json` following the artifact contract.
Generate `course-spec.md` as a human-readable export.

### Stage 6: Quality Report

Run structural checks (Task 4) and record in `quality-report.json`.

## Activity Progression

Every lesson should follow this progression:

1. **observe** — introduce concept, show examples (reading, video)
2. **guided_practice** — walk through together (widget with observe mode, exercise with hints)
3. **independent_practice** — learner tries alone (widget interactive, exercise)
4. **mastery_check** — assess understanding (quiz, exercise)
5. **positive_completion** — celebrate, reflect, preview next lesson (reflection)

## Widget Selection Rules

1. Choose widgets by learning intent, not by what's available
2. Prefer stable widgets (status: "stable") over experimental ones
3. Use canonical IDs from the discovered catalog (e.g., `core.matching`, not `open-edu.matching`)
4. Provide `widgetConfig` that matches the widget's required fields
5. Fall back to reading/exercise/quiz when no suitable widget exists
6. Record widget choices and rationale in quality report

````

- [ ] **Step 4: Write `references/repository-adapter.md`**

Write file `skills/openedu-course-authoring/references/repository-adapter.md`:

```markdown
# Repository Adapter

This reference describes how the skill detects and interfaces with an Open-Edu repository.

## Discovery

The script `scripts/discover-openedu.mjs` walks upward from the working directory looking for:
- `pnpm-workspace.yaml` → repository root
- `packages/course-compiler/` → compiler available
- `packages/cli/` → CLI available
- `packages/widgets/` → widget catalog available
- `packages/pipeline/` → PDF pipeline available
- `packages/core/src/widget-catalog-data.json` → catalog data available

## Output JSON

```json
{
  "mode": "repository" | "portable",
  "repoRoot": "/path/to/root" | null,
  "capabilities": {
    "compiler": true | false,
    "cli": true | false,
    "widgetCatalog": true | false,
    "pipeline": true | false,
    "examples": true | false
  },
  "commands": {
    "compile": "edu compile {spec} --output {dir} --validate" | null,
    "validate": "edu validate {dir}" | null,
    "lintContent": "edu lint-content {dir}" | null,
    "dev": "edu dev {dir}" | null,
    "generateCatalog": "pnpm --filter @open-edu/widgets generate:catalog" | null,
    "pipelineGenerate": "pnpm --filter @open-edu/pipeline curriculum:generate ..." | null
  },
  "paths": {
    "compilerRoot": "/path/to/course-compiler" | null,
    "cliRoot": "/path/to/cli" | null,
    "widgetsRoot": "/path/to/widgets" | null,
    "pipelineRoot": "/path/to/pipeline" | null,
    "catalogData": "/path/to/widget-catalog-data.json" | null,
    "examplesDir": "/path/to/examples" | null
  },
  "unavailable": ["compiler", "pipeline"]
}
````

## Command Execution Rules

When in repository mode:

1. **Compile:** Run `edu compile <course-spec.json> --output <package-dir> --validate`
   - Capture exit code, stdout, stderr
   - Non-zero exit = failure

2. **Validate:** Run `edu validate <package-dir>`
   - Capture exit code, stdout, stderr
   - Non-zero exit = failure

3. **Lint:** Run `edu lint-content <package-dir>`
   - Capture exit code, stdout, stderr
   - Non-zero exit = failure (errors found)

4. **Dev:** Suggest `edu dev <package-dir>`, but do NOT claim visual verification unless actually running the command

## Package Safety Rules

- Create a new output directory by default (do not overwrite)
- If the output directory exists, prompt the user before overwriting
- Keep all generated assets within the output directory
- Verify `package.json` or `bundle.json` manifest exists after compilation
- Verify workflow references resolve before reporting success

## Catalog Discovery

The widget catalog is generated from `packages/widgets/src/widget-catalog-source.ts` into `packages/core/src/widget-catalog-data.json`. If the JSON file exists, parse it. If not, suggest running:

```bash
pnpm --filter @open-edu/widgets generate:catalog
```

If the catalog cannot be loaded, the skill MUST NOT invent widget IDs or configurations.

## Pipeline Integration

When source materials (PDFs, textbooks) are supplied:

1. Check if `@open-edu/pipeline` is available (via discovery)
2. Resolve a profile: `--subject <subject>` or `--profile <id>`
3. Run: `pnpm --filter @open-edu/pipeline curriculum:generate --pdf <file> --subject <subject>`
4. Preserve pipeline output artifacts: source inventory, concept map, blueprint
5. If pipeline unavailable: use supplied material as context only, mark source extraction as manual/unverified

## Profile Resolution

The pipeline supports four built-in profiles:

- `generic` — fallback for any subject
- `math` — triggered by `--subject math` or `--subject mathematics`
- `science` — triggered by `--subject science`
- `nios` — triggered by `--curriculum nios`

When using the pipeline, use the profile that matches the user's subject. The registry auto-resolves via `resolveProfile({ subject: "mathematics" })` → math profile.

````

- [ ] **Step 5: Write the main `SKILL.md`**

Write file `skills/openedu-course-authoring/SKILL.md`:

```markdown
---
name: openedu-course-authoring
description: Generate, validate, and compile Open-Edu educational courses. Use this whenever you need to create educational content, design curricula, author course specifications, or build structured educational packages for the Open-Edu framework. Supports both portable mode (spec-only, works anywhere) and repository mode (full compilation with validation).
trigger:
  - create.*open-edu.*course
  - generate.*educational.*content
  - author.*curriculum
  - design.*learning.*experience
  - build.*educational.*package
  - compile.*course.spec
  - create.*lesson.plan
  - generate.*course.*spec
  - author.*course.*spec
---

# Open-Edu Course Authoring Skill

You are an expert educational content author for the Open-Edu framework. This skill guides you through generating a compiler-compatible `course-spec.json` and optionally compiling it into a validated Open-Edu package.

## Quick Start

1. **Discover environment:** Run `node skills/openedu-course-authoring/scripts/discover-openedu.mjs` to detect repository capabilities.
2. **Interview:** Ask the user for topic, learner level, goals, language, duration, prerequisites, accessibility needs, and source materials. Record unstated inputs as assumptions.
3. **Generate:** Follow the staged workflow in `references/authoring-workflow.md`.
4. **Output:** Produce artifacts per `references/artifact-contract.md`.
5. **Validate:** In repository mode, compile, validate, and lint the package.

## Modes

### Portable Mode (no repo detected)
- Output: `course-spec.json`, `course-spec.md`, `course-brief.md`, `quality-report.json`
- Validation: structural checks only, report commands the user can run

### Repository Mode (Open-Edu detected)
- Output: all portable artifacts + compiled `package/` directory
- Validation: structural checks + `edu compile --validate` + `edu validate` + `edu lint-content`

## Critical Rules

1. **`course-spec.json` is canonical.** The Markdown export is secondary.
2. **Validate before claiming success.** A run is successful only when all validation gates pass.
3. **Record assumptions.** Never silently invent learner level, prerequisites, or scope.
4. **Widget IDs must come from the discovered catalog.** Never guess widget IDs.
5. **Preserve pipeline artifacts.** When using the PDF pipeline, keep source inventory, concept map, and blueprint.
6. **Respect output safety.** Create new directories, prompt before overwriting.
7. **Be truthful about capability.** Never claim compilation or validation that wasn't actually run.
8. **Each lesson must be complete.** Include measurable objectives, core explanation, examples, misconceptions, progressive activities, and aligned assessment.

## References

- **Artifact Contract:** `references/artifact-contract.md` — exact JSON schema, field requirements, ID rules
- **Authoring Workflow:** `references/authoring-workflow.md` — staged generation sequence, activity progression, widget selection rules
- **Repository Adapter:** `references/repository-adapter.md` — discovery, commands, catalog loading, pipeline integration
- **Quality Rubric:** `references/quality-rubric.md` — objective coverage, alignment, accessibility, inclusion checks
- **Source Materials:** `references/source-materials.md` — PDF and curriculum document handling via pipeline

## Helper Scripts

- `scripts/discover-openedu.mjs` — detect repository, capabilities, commands, paths
- `scripts/validate-course-spec.mjs` — validate `course-spec.json` structurally and via compiler
- `scripts/summarize-quality.mjs` — generate `quality-report.json` from validation + blueprint

## Output Directory Structure

````

course-output/
├── course-brief.md # Scope, assumptions, lesson outline
├── lesson-blueprints.json # Detailed plan for each lesson
├── course-spec.json # Canonical compiler input
├── course-spec.md # Human-readable export
├── quality-report.json # Diagnostics and quality findings
└── package/ # Compiled package (repo mode only)
├── package.json # Package manifest
├── workflow.json # Routing graph
└── nodes/ # Content nodes

```

## 500-Line Guidance

This SKILL.md provides the high-level workflow. Detailed schemas, rules, and procedures live in the `references/` directory. When implementing, read the relevant reference file before each stage.
```

- [ ] **Step 6: Commit scaffold**

```bash
git add skills/openedu-course-authoring/
git commit -m "feat(skill): scaffold course-authoring skill directory and artifact contract"
```

---

## Task 2: Implement Repository Discovery Helper

**Files:**

- Create: `skills/openedu-course-authoring/scripts/discover-openedu.mjs`
- Create: `skills/openedu-course-authoring/scripts/__tests__/discover-openedu.test.mjs`

- [ ] **Step 1: Write the discovery test file**

Write file `skills/openedu-course-authoring/scripts/__tests__/discover-openedu.test.mjs`:

```javascript
import { describe, it } from 'node:test';
import { ok, strictEqual, deepStrictEqual } from 'node:assert';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { discoverOpenEdu } from '../discover-openedu.mjs';

function createTempRepo() {
  const base = join(
    tmpdir(),
    `openedu-discovery-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(base, { recursive: true });
  return base;
}

function addFile(dir, subpath, content = '') {
  const full = join(dir, subpath);
  const parent = join(full, '..');
  if (!existsSync(parent)) mkdirSync(parent, { recursive: true });
  writeFileSync(full, content);
}

describe('discover-openedu', () => {
  it('reports portable mode for a non-repo directory', () => {
    const dir = createTempRepo();
    try {
      const result = discoverOpenEdu(dir);
      strictEqual(result.mode, 'portable');
      strictEqual(result.repoRoot, null);
      deepStrictEqual(result.capabilities, {
        compiler: false,
        cli: false,
        widgetCatalog: false,
        pipeline: false,
        examples: false,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects an Open-Edu repository root via pnpm-workspace.yaml', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'pnpm-workspace.yaml', 'packages:\n  - "packages/*"');
      const result = discoverOpenEdu(dir);
      strictEqual(result.mode, 'repository');
      strictEqual(result.repoRoot, dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects compiler capability when packages/course-compiler exists', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'pnpm-workspace.yaml');
      addFile(dir, 'packages/course-compiler/package.json', '{"name":"@open-edu/course-compiler"}');
      const result = discoverOpenEdu(dir);
      strictEqual(result.capabilities.compiler, true);
      ok(result.paths.compilerRoot !== null);
      ok(result.commands.compile !== null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects CLI capability when packages/cli exists', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'pnpm-workspace.yaml');
      addFile(dir, 'packages/cli/package.json', '{"name":"@open-edu/cli"}');
      const result = discoverOpenEdu(dir);
      strictEqual(result.capabilities.cli, true);
      ok(result.commands.validate !== null);
      ok(result.commands.lintContent !== null);
      ok(result.commands.dev !== null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects widget catalog when catalog data file exists', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'pnpm-workspace.yaml');
      addFile(dir, 'packages/core/src/widget-catalog-data.json', '[]');
      const result = discoverOpenEdu(dir);
      strictEqual(result.capabilities.widgetCatalog, true);
      ok(result.paths.catalogData !== null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects pipeline capability when packages/pipeline exists', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'pnpm-workspace.yaml');
      addFile(dir, 'packages/pipeline/package.json', '{"name":"@open-edu/pipeline"}');
      const result = discoverOpenEdu(dir);
      strictEqual(result.capabilities.pipeline, true);
      ok(result.paths.pipelineRoot !== null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects examples when examples/ directory exists', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'pnpm-workspace.yaml');
      addFile(dir, 'examples/.gitkeep');
      const result = discoverOpenEdu(dir);
      strictEqual(result.capabilities.examples, true);
      ok(result.paths.examplesDir !== null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('walks upward to find repo root from a subdirectory', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'pnpm-workspace.yaml');
      const subDir = join(dir, 'some/deep/nested/path');
      mkdirSync(subDir, { recursive: true });
      const result = discoverOpenEdu(subDir);
      strictEqual(result.repoRoot, dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('lists unavailable capabilities', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'pnpm-workspace.yaml');
      const result = discoverOpenEdu(dir);
      ok(Array.isArray(result.unavailable));
      ok(result.unavailable.length > 0);
      ok(result.unavailable.includes('compiler'));
      ok(result.unavailable.includes('pipeline'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns explicit false capabilities, not undefined', () => {
    const dir = createTempRepo();
    try {
      addFile(dir, 'pnpm-workspace.yaml');
      const result = discoverOpenEdu(dir);
      for (const [key, val] of Object.entries(result.capabilities)) {
        strictEqual(typeof val, 'boolean', `capability ${key} must be boolean, got ${typeof val}`);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test skills/openedu-course-authoring/scripts/__tests__/discover-openedu.test.mjs`
Expected: FAIL — `discoverOpenEdu` is not exported from `../discover-openedu.mjs`.

- [ ] **Step 3: Implement `discover-openedu.mjs`**

Write file `skills/openedu-course-authoring/scripts/discover-openedu.mjs`:

```javascript
#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * @typedef {Object} DiscoveryCapabilities
 * @property {boolean} compiler
 * @property {boolean} cli
 * @property {boolean} widgetCatalog
 * @property {boolean} pipeline
 * @property {boolean} examples
 */

/**
 * @typedef {Object} DiscoveryCommands
 * @property {string|null} compile
 * @property {string|null} validate
 * @property {string|null} lintContent
 * @property {string|null} dev
 * @property {string|null} generateCatalog
 * @property {string|null} pipelineGenerate
 */

/**
 * @typedef {Object} DiscoveryPaths
 * @property {string|null} compilerRoot
 * @property {string|null} cliRoot
 * @property {string|null} widgetsRoot
 * @property {string|null} pipelineRoot
 * @property {string|null} catalogData
 * @property {string|null} examplesDir
 */

/**
 * @typedef {Object} DiscoveryResult
 * @property {'repository'|'portable'} mode
 * @property {string|null} repoRoot
 * @property {DiscoveryCapabilities} capabilities
 * @property {DiscoveryCommands} commands
 * @property {DiscoveryPaths} paths
 * @property {string[]} unavailable
 */

/**
 * Walks upward from `startDir` to find an Open-Edu repository root.
 * Returns a DiscoveryResult with explicit capabilities and commands.
 * @param {string} startDir
 * @returns {DiscoveryResult}
 */
export function discoverOpenEdu(startDir = process.cwd()) {
  const repoRoot = findRepoRoot(startDir);

  const result = {
    mode: repoRoot ? 'repository' : 'portable',
    repoRoot,
    capabilities: {
      compiler: false,
      cli: false,
      widgetCatalog: false,
      pipeline: false,
      examples: false,
    },
    commands: {
      compile: null,
      validate: null,
      lintContent: null,
      dev: null,
      generateCatalog: null,
      pipelineGenerate: null,
    },
    paths: {
      compilerRoot: null,
      cliRoot: null,
      widgetsRoot: null,
      pipelineRoot: null,
      catalogData: null,
      examplesDir: null,
    },
    unavailable: [],
  };

  if (!repoRoot) {
    result.unavailable = ['compiler', 'cli', 'widgetCatalog', 'pipeline', 'examples'];
    return result;
  }

  // Compiler
  const compilerPath = join(repoRoot, 'packages', 'course-compiler');
  if (existsSync(join(compilerPath, 'package.json'))) {
    result.capabilities.compiler = true;
    result.paths.compilerRoot = compilerPath;
    result.commands.compile = 'edu compile {spec} --output {dir} --validate';
  }

  // CLI
  const cliPath = join(repoRoot, 'packages', 'cli');
  if (existsSync(join(cliPath, 'package.json'))) {
    result.capabilities.cli = true;
    result.paths.cliRoot = cliPath;
    result.commands.validate = 'edu validate {dir}';
    result.commands.lintContent = 'edu lint-content {dir}';
    result.commands.dev = 'edu dev {dir}';
  }

  // Widgets
  const widgetsPath = join(repoRoot, 'packages', 'widgets');
  if (existsSync(join(widgetsPath, 'package.json'))) {
    result.paths.widgetsRoot = widgetsPath;
    result.commands.generateCatalog = 'pnpm --filter @open-edu/widgets generate:catalog';
  }

  // Widget Catalog Data
  const catalogDataPath = join(repoRoot, 'packages', 'core', 'src', 'widget-catalog-data.json');
  if (existsSync(catalogDataPath)) {
    result.capabilities.widgetCatalog = true;
    result.paths.catalogData = catalogDataPath;
  }

  // Pipeline
  const pipelinePath = join(repoRoot, 'packages', 'pipeline');
  if (existsSync(join(pipelinePath, 'package.json'))) {
    result.capabilities.pipeline = true;
    result.paths.pipelineRoot = pipelinePath;
    result.commands.pipelineGenerate =
      'pnpm --filter @open-edu/pipeline curriculum:generate --pdf {file} --subject {subject}';
  }

  // Examples
  const examplesPath = join(repoRoot, 'examples');
  if (existsSync(examplesPath)) {
    result.capabilities.examples = true;
    result.paths.examplesDir = examplesPath;
  }

  // Unavailable
  for (const [key, val] of Object.entries(result.capabilities)) {
    if (!val) result.unavailable.push(key);
  }

  return result;
}

/**
 * Walks upward from `start` looking for `pnpm-workspace.yaml`.
 * @param {string} start
 * @returns {string|null}
 */
function findRepoRoot(start) {
  let dir = start;
  for (let i = 0; i < 20; i++) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// CLI mode: print JSON to stdout
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = discoverOpenEdu(process.argv[2] || process.cwd());
  console.log(JSON.stringify(result, null, 2));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test skills/openedu-course-authoring/scripts/__tests__/discover-openedu.test.mjs`
Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/openedu-course-authoring/scripts/discover-openedu.mjs skills/openedu-course-authoring/scripts/__tests__/discover-openedu.test.mjs
git commit -m "feat(skill): implement repository discovery helper with tests"
```

---

## Task 3: Implement Course Spec Validation Helper

**Files:**

- Create: `skills/openedu-course-authoring/scripts/validate-course-spec.mjs`
- Create: `skills/openedu-course-authoring/scripts/__tests__/validate-course-spec.test.mjs`

- [ ] **Step 1: Write the validation test file**

Write file `skills/openedu-course-authoring/scripts/__tests__/validate-course-spec.test.mjs`:

```javascript
import { describe, it } from 'node:test';
import { ok, strictEqual } from 'node:assert';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateCourseSpec } from '../validate-course-spec.mjs';

function createTempDir() {
  const base = join(tmpdir(), `validate-spec-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(base, { recursive: true });
  return base;
}

function writeJSON(dir, filename, obj) {
  writeFileSync(join(dir, filename), JSON.stringify(obj, null, 2));
}

function makeValidSpec() {
  return {
    format: 'openedu-course-spec',
    version: 1,
    generatedAt: new Date().toISOString(),
    metadata: {
      title: 'Test Course',
      description: 'A test course',
      author: 'Test Author',
      difficulty: 'beginner',
      estimatedHours: 1,
      generated: true,
    },
    lessons: [
      {
        id: 'lesson-01',
        title: 'Lesson One',
        objectives: ['Learn something'],
        coreIdea: 'The main concept',
        examples: ['Example 1'],
        misconceptions: ['Misconception 1'],
        estimatedMinutes: 15,
        activities: [
          {
            step: 'observe',
            order: 1,
            type: 'reading',
            description: 'Read the introduction',
          },
          {
            step: 'guided_practice',
            order: 2,
            type: 'exercise',
            description: 'Try this exercise',
            instructions: 'Solve the problem',
          },
        ],
      },
    ],
  };
}

describe('validate-course-spec (structural)', () => {
  it('passes valid spec', () => {
    const dir = createTempDir();
    try {
      writeJSON(dir, 'course-spec.json', makeValidSpec());
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir, null);
      strictEqual(result.success, true);
      strictEqual(result.errors.length, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects missing file', () => {
    const dir = createTempDir();
    try {
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir, null);
      strictEqual(result.success, false);
      ok(result.errors.some((e) => e.code === 'FILE_NOT_FOUND'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects malformed JSON', () => {
    const dir = createTempDir();
    try {
      writeFileSync(join(dir, 'course-spec.json'), '{ not valid json }');
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir, null);
      strictEqual(result.success, false);
      ok(result.errors.some((e) => e.code === 'JSON_PARSE_ERROR'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects missing required metadata', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      delete spec.metadata.title;
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir, null);
      strictEqual(result.success, false);
      ok(result.errors.length > 0, 'should have at least one error');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects invalid activity type', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.lessons[0].activities[0].type = 'INVALID_TYPE';
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir, null);
      strictEqual(result.success, false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects duplicate lesson IDs', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.lessons.push({ ...spec.lessons[0] });
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir, null);
      strictEqual(result.success, false);
      ok(result.errors.some((e) => e.code === 'DUPLICATE_LESSON_ID'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects widget activity without widgetId', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.lessons[0].activities.push({
        step: 'independent_practice',
        order: 3,
        type: 'widget',
        description: 'A widget activity',
      });
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir, null);
      strictEqual(result.success, false);
      ok(result.errors.some((e) => e.code === 'MISSING_WIDGET_ID'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports compilerAvailable as false when no compiler path given', () => {
    const dir = createTempDir();
    try {
      writeJSON(dir, 'course-spec.json', makeValidSpec());
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir, null);
      strictEqual(result.compilerAvailable, false);
      strictEqual(result.success, true, 'structural-only validation should succeed for valid spec');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('warns on lessons with no objectives', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.lessons[0].objectives = [];
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir, null);
      ok(result.warnings.some((w) => w.code === 'MISSING_OBJECTIVES'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('warns on lessons with no activities', () => {
    const dir = createTempDir();
    try {
      const spec = makeValidSpec();
      spec.lessons[0].activities = [];
      writeJSON(dir, 'course-spec.json', spec);
      const result = validateCourseSpec(join(dir, 'course-spec.json'), dir, null);
      ok(result.warnings.some((w) => w.code === 'NO_ACTIVITIES'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('generates quality-report.json on success', () => {
    const dir = createTempDir();
    try {
      writeJSON(dir, 'course-spec.json', makeValidSpec());
      validateCourseSpec(join(dir, 'course-spec.json'), dir, null);
      ok(existsSync(join(dir, 'quality-report.json')), 'quality-report.json should be written');
      const report = JSON.parse(readFileSync(join(dir, 'quality-report.json'), 'utf-8'));
      strictEqual(report.success, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test skills/openedu-course-authoring/scripts/__tests__/validate-course-spec.test.mjs`
Expected: FAIL — `validateCourseSpec` is not exported.

- [ ] **Step 3: Implement `validate-course-spec.mjs`**

Write file `skills/openedu-course-authoring/scripts/validate-course-spec.mjs`:

```javascript
#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @typedef {Object} ValidationDiagnostic
 * @property {'error'|'warning'} severity
 * @property {string} message
 * @property {string} code
 * @property {string} [detail]
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} success
 * @property {ValidationDiagnostic[]} errors
 * @property {ValidationDiagnostic[]} warnings
 * @property {object|null} data
 * @property {boolean} compilerAvailable
 */

const VALID_STEPS = [
  'observe',
  'guided_practice',
  'independent_practice',
  'mastery_check',
  'positive_completion',
];
const VALID_ACTIVITY_TYPES = ['reading', 'exercise', 'quiz', 'reflection', 'widget'];
const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

/**
 * Validates a course-spec.json file structurally. If `compilerPath` is provided,
 * attempts to invoke the course-compiler for deeper validation.
 * @param {string} specPath - path to course-spec.json
 * @param {string} outputDir - directory for quality-report.json
 * @param {string|null} compilerPath - path to packages/course-compiler (or null)
 * @returns {ValidationResult}
 */
export function validateCourseSpec(specPath, outputDir, compilerPath) {
  /** @type {ValidationDiagnostic[]} */
  const errors = [];
  /** @type {ValidationDiagnostic[]} */
  const warnings = [];
  let data = null;
  let compilerAvailable = false;

  // Check file exists
  if (!existsSync(specPath)) {
    errors.push({
      severity: 'error',
      message: `File not found: ${specPath}`,
      code: 'FILE_NOT_FOUND',
    });
    writeReport(outputDir, false, errors, warnings, data, false);
    return { success: false, errors, warnings, data, compilerAvailable: false };
  }

  // Parse JSON
  let spec;
  try {
    const raw = readFileSync(specPath, 'utf-8');
    spec = JSON.parse(raw);
  } catch (err) {
    errors.push({
      severity: 'error',
      message: `JSON parse error: ${err instanceof Error ? err.message : String(err)}`,
      code: 'JSON_PARSE_ERROR',
    });
    writeReport(outputDir, false, errors, warnings, data, false);
    return { success: false, errors, warnings, data, compilerAvailable: false };
  }

  // Structural checks
  checkTopLevel(spec, errors);
  checkMetadata(spec, errors, warnings);
  checkLessons(spec, errors, warnings);
  checkLessonIdUniqueness(spec, errors);

  data = {
    format: spec?.format,
    version: spec?.version,
    lessonCount: spec?.lessons?.length || 0,
    activityCount: spec?.lessons?.reduce((sum, l) => sum + (l.activities?.length || 0), 0) || 0,
  };

  const success = errors.length === 0;

  writeReport(outputDir, success, errors, warnings, data, compilerAvailable);

  return { success, errors, warnings, data, compilerAvailable };
}

function checkTopLevel(spec, errors) {
  if (!spec || typeof spec !== 'object') {
    errors.push({ severity: 'error', message: 'Spec is not an object', code: 'INVALID_TOP_LEVEL' });
    return;
  }
  if (spec.format !== 'openedu-course-spec') {
    errors.push({
      severity: 'error',
      message: `Invalid format: expected "openedu-course-spec", got "${spec.format}"`,
      code: 'INVALID_FORMAT',
    });
  }
  if (spec.version !== 1) {
    errors.push({
      severity: 'error',
      message: `Invalid version: expected 1, got ${spec.version}`,
      code: 'INVALID_VERSION',
    });
  }
  if (typeof spec.generatedAt !== 'string') {
    errors.push({
      severity: 'error',
      message: 'Missing or invalid generatedAt field',
      code: 'MISSING_GENERATED_AT',
    });
  }
}

function checkMetadata(spec, errors, warnings) {
  const meta = spec?.metadata;
  if (!meta || typeof meta !== 'object') {
    errors.push({
      severity: 'error',
      message: 'Missing metadata object',
      code: 'MISSING_METADATA',
    });
    return;
  }
  if (typeof meta.title !== 'string' || meta.title.trim().length === 0) {
    errors.push({
      severity: 'error',
      message: 'Missing or empty metadata.title',
      code: 'MISSING_TITLE',
    });
  }
  if (typeof meta.description !== 'string' || meta.description.trim().length === 0) {
    errors.push({
      severity: 'error',
      message: 'Missing or empty metadata.description',
      code: 'MISSING_DESCRIPTION',
    });
  }
  if (meta.generated !== true) {
    warnings.push({
      severity: 'warning',
      message: 'metadata.generated should be true for LLM-generated specs',
      code: 'GENERATED_FALSE',
    });
  }
  if (meta.difficulty && !VALID_DIFFICULTIES.includes(meta.difficulty)) {
    errors.push({
      severity: 'error',
      message: `Invalid difficulty: "${meta.difficulty}". Must be one of: ${VALID_DIFFICULTIES.join(', ')}`,
      code: 'INVALID_DIFFICULTY',
    });
  }
  if (
    meta.estimatedHours !== undefined &&
    (typeof meta.estimatedHours !== 'number' || meta.estimatedHours < 0)
  ) {
    errors.push({
      severity: 'error',
      message: 'metadata.estimatedHours must be a non-negative number',
      code: 'INVALID_ESTIMATED_HOURS',
    });
  }
}

function checkLessons(spec, errors, warnings) {
  const lessons = spec?.lessons;
  if (!Array.isArray(lessons)) {
    errors.push({
      severity: 'error',
      message: 'Missing or invalid lessons array',
      code: 'MISSING_LESSONS',
    });
    return;
  }
  if (lessons.length === 0) {
    errors.push({ severity: 'error', message: 'lessons array is empty', code: 'EMPTY_LESSONS' });
    return;
  }

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    const prefix = `lessons[${i}]`;

    if (typeof lesson.id !== 'string' || lesson.id.trim().length === 0) {
      errors.push({
        severity: 'error',
        message: `${prefix}.id is missing or empty`,
        code: 'MISSING_LESSON_ID',
      });
    }
    if (typeof lesson.title !== 'string' || lesson.title.trim().length === 0) {
      errors.push({
        severity: 'error',
        message: `${prefix}.title is missing or empty`,
        code: 'MISSING_LESSON_TITLE',
      });
    }
    if (!Array.isArray(lesson.objectives) || lesson.objectives.length === 0) {
      warnings.push({
        severity: 'warning',
        message: `${prefix} has no objectives`,
        code: 'MISSING_OBJECTIVES',
        detail: `Lesson "${lesson.title || lesson.id}"`,
      });
    }
    if (typeof lesson.coreIdea !== 'string' || lesson.coreIdea.trim().length === 0) {
      warnings.push({
        severity: 'warning',
        message: `${prefix} has no coreIdea`,
        code: 'MISSING_CORE_IDEA',
        detail: `Lesson "${lesson.title || lesson.id}"`,
      });
    }
    if (!Array.isArray(lesson.activities) || lesson.activities.length === 0) {
      warnings.push({
        severity: 'warning',
        message: `${prefix} has no activities`,
        code: 'NO_ACTIVITIES',
        detail: `Lesson "${lesson.title || lesson.id}"`,
      });
    } else {
      checkActivities(lesson.activities, i, errors, warnings);
    }
    if (
      lesson.estimatedMinutes !== undefined &&
      (typeof lesson.estimatedMinutes !== 'number' || lesson.estimatedMinutes < 0)
    ) {
      warnings.push({
        severity: 'warning',
        message: `${prefix}.estimatedMinutes must be a non-negative number`,
        code: 'INVALID_ESTIMATED_MINUTES',
      });
    }
  }
}

function checkActivities(activities, lessonIndex, errors, warnings) {
  for (let j = 0; j < activities.length; j++) {
    const act = activities[j];
    const prefix = `lessons[${lessonIndex}].activities[${j}]`;

    if (!VALID_STEPS.includes(act.step)) {
      errors.push({
        severity: 'error',
        message: `${prefix}.step "${act.step}" is invalid. Must be one of: ${VALID_STEPS.join(', ')}`,
        code: 'INVALID_STEP',
      });
    }
    if (typeof act.order !== 'number') {
      errors.push({
        severity: 'error',
        message: `${prefix}.order must be a number`,
        code: 'MISSING_ORDER',
      });
    }
    if (!VALID_ACTIVITY_TYPES.includes(act.type)) {
      errors.push({
        severity: 'error',
        message: `${prefix}.type "${act.type}" is invalid. Must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}`,
        code: 'INVALID_ACTIVITY_TYPE',
      });
    }
    if (typeof act.description !== 'string' || act.description.trim().length === 0) {
      errors.push({
        severity: 'error',
        message: `${prefix}.description is missing or empty`,
        code: 'MISSING_ACTIVITY_DESCRIPTION',
      });
    }
    if (
      act.type === 'widget' &&
      (!act.widgetId || typeof act.widgetId !== 'string' || act.widgetId.trim().length === 0)
    ) {
      errors.push({
        severity: 'error',
        message: `${prefix} is type "widget" but has no widgetId`,
        code: 'MISSING_WIDGET_ID',
      });
    }
    if (act.type === 'quiz' && (!Array.isArray(act.questions) || act.questions.length === 0)) {
      errors.push({
        severity: 'error',
        message: `${prefix} is type "quiz" but has no questions`,
        code: 'EMPTY_QUIZ',
      });
    }
  }
}

function checkLessonIdUniqueness(spec, errors) {
  const lessons = spec?.lessons;
  if (!Array.isArray(lessons)) return;
  const seen = new Map();
  for (let i = 0; i < lessons.length; i++) {
    const id = lessons[i].id;
    if (seen.has(id)) {
      errors.push({
        severity: 'error',
        message: `Duplicate lesson ID "${id}" at index ${i} (first seen at index ${seen.get(id)})`,
        code: 'DUPLICATE_LESSON_ID',
      });
    } else {
      seen.set(id, i);
    }
  }
}

function writeReport(outputDir, success, errors, warnings, data, compilerAvailable) {
  const report = {
    success,
    timestamp: new Date().toISOString(),
    compilerAvailable,
    errorCount: errors.length,
    warningCount: warnings.length,
    errors,
    warnings,
    data,
  };
  const reportPath = join(outputDir, 'quality-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
}

// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
  const specPath = process.argv[2];
  const outputDir = process.argv[3] || process.cwd();
  if (!specPath) {
    console.error('Usage: node validate-course-spec.mjs <course-spec.json> [output-dir]');
    process.exit(1);
  }
  const result = validateCourseSpec(specPath, outputDir, null);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test skills/openedu-course-authoring/scripts/__tests__/validate-course-spec.test.mjs`
Expected: all 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add skills/openedu-course-authoring/scripts/validate-course-spec.mjs skills/openedu-course-authoring/scripts/__tests__/validate-course-spec.test.mjs
git commit -m "feat(skill): implement course-spec validation helper with tests"
```

---

## Task 4: Implement Quality Summary Helper

**Files:**

- Create: `skills/openedu-course-authoring/references/quality-rubric.md`
- Create: `skills/openedu-course-authoring/scripts/summarize-quality.mjs`
- Create: `skills/openedu-course-authoring/scripts/__tests__/summarize-quality.test.mjs`

- [ ] **Step 1: Write the quality rubric reference**

Write file `skills/openedu-course-authoring/references/quality-rubric.md`:

````markdown
# Quality Rubric

The quality report evaluates a course spec against pedagogical dimensions. Each check has a severity (`pass`, `warning`, or `error`) and evidence.

## Dimension 1: Objective Coverage

Every learning objective must map to at least one learning activity and one assessment signal.

| Check ID    | Rule                                                                                            | Severity  |
| ----------- | ----------------------------------------------------------------------------------------------- | --------- |
| `QC-OBJ-01` | Every objective is covered by at least one activity                                             | `error`   |
| `QC-OBJ-02` | Every objective has an assessment signal (quiz, exercise with feedback, or mastery_check)       | `warning` |
| `QC-OBJ-03` | No lesson has more than 6 objectives                                                            | `warning` |
| `QC-OBJ-04` | Objectives use measurable action verbs (identify, explain, calculate, compare, construct, etc.) | `warning` |

## Dimension 2: Assessment Alignment

Assessments must test what was taught, not introduce new concepts.

| Check ID    | Rule                                                              | Severity  |
| ----------- | ----------------------------------------------------------------- | --------- |
| `QC-ASM-01` | Quiz questions reference only concepts introduced in the lesson   | `error`   |
| `QC-ASM-02` | Every lesson with > 0 activities has a mastery_check or quiz step | `warning` |
| `QC-ASM-03` | Assessment difficulty matches the stated course difficulty level  | `warning` |

## Dimension 3: Duration Consistency

| Check ID    | Rule                                                              | Severity  |
| ----------- | ----------------------------------------------------------------- | --------- |
| `QC-DUR-01` | Sum of lesson.estimatedMinutes within 20% of total estimatedHours | `warning` |
| `QC-DUR-02` | No single lesson exceeds 45 minutes                               | `warning` |
| `QC-DUR-03` | No single lesson is under 5 minutes                               | `warning` |

## Dimension 4: Activity Progression

| Check ID     | Rule                                                             | Severity  |
| ------------ | ---------------------------------------------------------------- | --------- |
| `QC-PROG-01` | Lesson contains at least one activity from each step type        | `warning` |
| `QC-PROG-02` | Activity `order` values are sequential (1,2,3...) and start at 1 | `warning` |
| `QC-PROG-03` | First activity is observe (introduce concept)                    | `info`    |

## Dimension 5: Widget Decisions

| Check ID    | Rule                                                               | Severity |
| ----------- | ------------------------------------------------------------------ | -------- |
| `QC-WDG-01` | Widget IDs are from the discovered catalog (canonical, not legacy) | `error`  |
| `QC-WDG-02` | Widget is not marked deprecated                                    | `error`  |
| `QC-WDG-03` | widgetConfig includes all required fields for the widget           | `error`  |
| `QC-WDG-04` | Widget choice is justified by learning intent                      | `info`   |

## Dimension 6: Accessibility & Inclusion

| Check ID    | Rule                                                                | Severity  |
| ----------- | ------------------------------------------------------------------- | --------- |
| `QC-ACC-01` | Instructions use plain language (reading level appropriate)         | `warning` |
| `QC-ACC-02` | Widget choices support keyboard-only interaction where possible     | `info`    |
| `QC-ACC-03` | Color is not the sole differentiator (non-color-only distinctions)  | `warning` |
| `QC-ACC-04` | Content is chunked into readable segments (not single large blocks) | `warning` |

## Dimension 7: Completeness

| Check ID    | Rule                                                     | Severity  |
| ----------- | -------------------------------------------------------- | --------- |
| `QC-COM-01` | Every required field in the artifact contract is present | `error`   |
| `QC-COM-02` | No unresolved assumptions in course-brief.md             | `warning` |
| `QC-COM-03` | Every lesson has coreIdea, examples, and misconceptions  | `warning` |

## Finding Severity Codes

Findings use these severity levels:

- `error` — fails the run (must be fixed)
- `warning` — degrades quality but does not fail
- `info` — advisory only
- `pass` — check satisfied

## Quality Report Format

```json
{
  "success": true,
  "timestamp": "2026-07-25T...",
  "summary": {
    "lessons": 3,
    "objectives": 9,
    "activities": 12,
    "widgetsUsed": 2,
    "totalEstimatedMinutes": 60,
    "errors": 0,
    "warnings": 2,
    "infos": 3
  },
  "findings": [
    {
      "checkId": "QC-OBJ-04",
      "severity": "warning",
      "message": "Objective \"understand photosynthesis\" uses a non-measurable verb"
    }
  ]
}
```
````

````

- [ ] **Step 2: Write the summarize-quality test file**

Write file `skills/openedu-course-authoring/scripts/__tests__/summarize-quality.test.mjs`:

```javascript
import { describe, it } from 'node:test';
import { ok, strictEqual } from 'node:assert';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { summarizeQuality } from '../summarize-quality.mjs';

function createTempDir() {
  const base = join(tmpdir(), `quality-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(base, { recursive: true });
  return base;
}

function makeBlueprint() {
  return [
    {
      id: 'lesson-01',
      title: 'Lesson One',
      objectives: ['Identify parts of a fraction', 'Compare fractions with same denominator'],
      activityPlan: [
        { type: 'reading', step: 'observe' },
        { type: 'widget', step: 'guided_practice', widgetId: 'math.fraction-visual' },
        { type: 'quiz', step: 'mastery_check' },
      ],
      estimatedMinutes: 20,
    },
    {
      id: 'lesson-02',
      title: 'Lesson Two',
      objectives: ['Add fractions with like denominators'],
      activityPlan: [
        { type: 'reading', step: 'observe' },
        { type: 'exercise', step: 'independent_practice' },
      ],
      estimatedMinutes: 60,
    },
  ];
}

function makeValidationResult(overrides = {}) {
  return {
    success: true,
    errors: [],
    warnings: [],
    data: {
      lessonCount: 2,
      activityCount: 5,
    },
    compilerAvailable: false,
    ...overrides,
  };
}

const canonicalIds = new Set([
  'core.matching', 'core.multiple-choice', 'core.visual-counting', 'core.drag-drop',
  'core.sequencing', 'core.fill-blank', 'core.story-question', 'core.real-world',
  'core.chart-reader', 'core.audio-player', 'core.video-player',
  'math.fraction-visual', 'math.place-value-chart', 'math.grid-area',
  'math.clock-time', 'math.measurement-scale', 'math.number-line',
  'science.process-diagram', 'language.flashcard', 'social.map',
]);

describe('summarize-quality', () => {
  it('reports success for fully aligned course', () => {
    const dir = createTempDir();
    try {
      writeFileSync(join(dir, 'lesson-blueprints.json'), JSON.stringify(makeBlueprint()));
      const result = summarizeQuality(dir, makeValidationResult(), null);
      strictEqual(result.success, true);
      ok(result.findings.length > 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports error for uncovered objective when no matching activity exists', () => {
    const dir = createTempDir();
    try {
      const blueprint = [
        {
          id: 'lesson-01',
          title: 'L1',
          objectives: ['Objective with no matching activity type'],
          activityPlan: [], // no activities
          estimatedMinutes: 15,
        },
      ];
      writeFileSync(join(dir, 'lesson-blueprints.json'), JSON.stringify(blueprint));
      const result = summarizeQuality(dir, makeValidationResult({ data: { lessonCount: 1, activityCount: 0 } }), null);
      const objErrors = result.findings.filter((f) => f.checkId === 'QC-OBJ-01');
      ok(objErrors.length > 0, 'should have objective coverage errors');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('flags overlong lesson', () => {
    const dir = createTempDir();
    try {
      writeFileSync(join(dir, 'lesson-blueprints.json'), JSON.stringify(makeBlueprint()));
      const result = summarizeQuality(dir, makeValidationResult(), null);
      const durFindings = result.findings.filter((f) => f.checkId === 'QC-DUR-02');
      ok(durFindings.length > 0, 'should flag the 60-minute lesson');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('flags legacy widget IDs', () => {
    const dir = createTempDir();
    try {
      const blueprint = [
        {
          id: 'lesson-01',
          title: 'L1',
          objectives: ['obj1'],
          activityPlan: [
            { type: 'widget', step: 'guided_practice', widgetId: 'open-edu.multiple-choice' },
          ],
          estimatedMinutes: 15,
        },
      ];
      writeFileSync(join(dir, 'lesson-blueprints.json'), JSON.stringify(blueprint));
      const result = summarizeQuality(dir, makeValidationResult(), null);
      const wdgFindings = result.findings.filter((f) => f.checkId === 'QC-WDG-01');
      ok(wdgFindings.length > 0, 'should flag legacy widget ID');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('flags deprecated widget IDs', () => {
    const dir = createTempDir();
    try {
      const blueprint = [
        {
          id: 'lesson-01',
          title: 'L1',
          objectives: ['obj1'],
          activityPlan: [
            { type: 'widget', step: 'guided_practice', widgetId: 'open-edu.multiple-choice-practice' },
          ],
          estimatedMinutes: 15,
        },
      ];
      writeFileSync(join(dir, 'lesson-blueprints.json'), JSON.stringify(blueprint));
      const result = summarizeQuality(dir, makeValidationResult(), null);
      const depWarnings = result.findings.filter((f) => f.checkId === 'QC-WDG-02');
      ok(depWarnings.length > 0, 'should flag deprecated widget');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('flags lessons with no mastery_check or quiz', () => {
    const dir = createTempDir();
    try {
      const blueprint = [
        {
          id: 'lesson-01',
          title: 'L1',
          objectives: ['obj1'],
          activityPlan: [
            { type: 'reading', step: 'observe' },
            { type: 'exercise', step: 'independent_practice' },
          ],
          estimatedMinutes: 15,
        },
      ];
      writeFileSync(join(dir, 'lesson-blueprints.json'), JSON.stringify(blueprint));
      const result = summarizeQuality(dir, makeValidationResult({ data: { lessonCount: 1, activityCount: 2 } }), null);
      const asmFindings = result.findings.filter((f) => f.checkId === 'QC-ASM-02');
      ok(asmFindings.length > 0, 'should flag missing assessment');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes quality-report.json', () => {
    const dir = createTempDir();
    try {
      writeFileSync(join(dir, 'lesson-blueprints.json'), JSON.stringify(makeBlueprint()));
      summarizeQuality(dir, makeValidationResult(), null);
      const report = JSON.parse(readFileSync(join(dir, 'quality-report.json'), 'utf-8'));
      ok(report.findings.length > 0);
      ok(typeof report.summary === 'object');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
````

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test skills/openedu-course-authoring/scripts/__tests__/summarize-quality.test.mjs`
Expected: FAIL — `summarizeQuality` is not exported.

- [ ] **Step 4: Implement `summarize-quality.mjs`**

Write file `skills/openedu-course-authoring/scripts/summarize-quality.mjs`:

```javascript
#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const canonicalWidgetIds = new Set([
  'core.matching',
  'core.multiple-choice',
  'core.visual-counting',
  'core.drag-drop',
  'core.sequencing',
  'core.fill-blank',
  'core.story-question',
  'core.real-world',
  'core.chart-reader',
  'core.callout',
  'core.image-compare',
  'core.hotspot',
  'core.timeline',
  'core.audio-player',
  'core.video-player',
  'math.fraction-visual',
  'math.place-value-chart',
  'math.grid-area',
  'math.clock-time',
  'math.measurement-scale',
  'math.number-line',
  'science.label-diagram',
  'science.image-label',
  'science.process-diagram',
  'language.flashcard',
  'social.map',
]);

const deprecatedWidgetIds = new Set(['open-edu.multiple-choice-practice']);

const legacyToCanonical = {
  'open-edu.matching': 'core.matching',
  'open-edu.multiple-choice': 'core.multiple-choice',
  'open-edu.visual-counting': 'core.visual-counting',
  'open-edu.drag-drop': 'core.drag-drop',
  'open-edu.sequencing': 'core.sequencing',
  'open-edu.fill-blank': 'core.fill-blank',
  'open-edu.story-question': 'core.story-question',
  'open-edu.real-world': 'core.real-world',
  'open-edu.fraction-visual': 'math.fraction-visual',
  'open-edu.place-value-chart': 'math.place-value-chart',
  'open-edu.grid-area': 'math.grid-area',
  'open-edu.chart-reader': 'core.chart-reader',
  'open-edu.clock-time': 'math.clock-time',
  'open-edu.measurement-scale': 'math.measurement-scale',
};

const nonMeasurableVerbs = [
  'understand',
  'know',
  'learn',
  'appreciate',
  'be familiar',
  'grasp',
  'realize',
  'believe',
  'think about',
  'feel',
  'perceive',
];

/**
 * @typedef {Object} QualityFinding
 * @property {string} checkId
 * @property {'error'|'warning'|'info'} severity
 * @property {string} message
 */

/**
 * @typedef {Object} QualitySummary
 * @property {number} lessons
 * @property {number} objectives
 * @property {number} activities
 * @property {number} widgetsUsed
 * @property {number} totalEstimatedMinutes
 * @property {number} errors
 * @property {number} warnings
 * @property {number} infos
 */

/**
 * @typedef {Object} QualityResult
 * @property {boolean} success
 * @property {string} timestamp
 * @property {QualitySummary} summary
 * @property {QualityFinding[]} findings
 */

/**
 * Combines validation diagnostics with a lesson blueprint to produce a quality report.
 * @param {string} outputDir - directory containing blueprint and report artifacts
 * @param {object} validationResult - result from validateCourseSpec
 * @param {string|null} catalogPath - path to widget-catalog-data.json (or null)
 * @returns {QualityResult}
 */
export function summarizeQuality(outputDir, validationResult, catalogPath) {
  /** @type {QualityFinding[]} */
  const findings = [];

  // Load blueprint
  let blueprint = [];
  const blueprintPath = join(outputDir, 'lesson-blueprints.json');
  if (existsSync(blueprintPath)) {
    try {
      blueprint = JSON.parse(readFileSync(blueprintPath, 'utf-8'));
    } catch {
      findings.push({
        checkId: 'QC-COM-02',
        severity: 'warning',
        message: 'lesson-blueprints.json could not be parsed',
      });
    }
  }

  // Merge validation errors/warnings
  if (validationResult?.errors) {
    for (const e of validationResult.errors) {
      findings.push({
        checkId: 'QC-COM-01',
        severity: 'error',
        message: e.message,
      });
    }
  }
  if (validationResult?.warnings) {
    for (const w of validationResult.warnings) {
      findings.push({
        checkId: 'QC-COM-03',
        severity: 'warning',
        message: w.message,
      });
    }
  }

  // Check each lesson in blueprint
  let totalObjectives = 0;
  let totalActivities = 0;
  let totalMinutes = 0;
  let widgetsUsed = 0;

  for (const lesson of blueprint) {
    const lessonObj = lesson.objectives || [];
    const activities = lesson.activityPlan || [];
    const lessonId = lesson.id || 'unknown';
    totalObjectives += lessonObj.length;
    totalActivities += activities.length;
    totalMinutes += lesson.estimatedMinutes || 0;

    // QC-OBJ-01: Every objective covered by at least one activity
    if (lessonObj.length > 0 && activities.length === 0) {
      findings.push({
        checkId: 'QC-OBJ-01',
        severity: 'error',
        message: `Lesson "${lessonId}" has ${lessonObj.length} objective(s) but no activities`,
      });
    }

    // QC-OBJ-03: No lesson > 6 objectives
    if (lessonObj.length > 6) {
      findings.push({
        checkId: 'QC-OBJ-03',
        severity: 'warning',
        message: `Lesson "${lessonId}" has ${lessonObj.length} objectives (max recommended: 6)`,
      });
    }

    // QC-OBJ-04: Measurable action verbs
    for (const obj of lessonObj) {
      const lower = obj.toLowerCase();
      for (const verb of nonMeasurableVerbs) {
        if (lower.startsWith(verb)) {
          findings.push({
            checkId: 'QC-OBJ-04',
            severity: 'warning',
            message: `Objective "${obj}" in lesson "${lessonId}" uses non-measurable verb "${verb}"`,
          });
          break;
        }
      }
    }

    // QC-ASM-02: Mastery check or quiz present
    if (activities.length > 0) {
      const hasAssessment = activities.some((a) => a.step === 'mastery_check' || a.type === 'quiz');
      if (!hasAssessment) {
        findings.push({
          checkId: 'QC-ASM-02',
          severity: 'warning',
          message: `Lesson "${lessonId}" has activities but no mastery_check or quiz`,
        });
      }
    }

    // QC-DUR-02: No single lesson > 45 min
    if (lesson.estimatedMinutes && lesson.estimatedMinutes > 45) {
      findings.push({
        checkId: 'QC-DUR-02',
        severity: 'warning',
        message: `Lesson "${lessonId}" is ${lesson.estimatedMinutes} min (max recommended: 45)`,
      });
    }

    // QC-DUR-03: No lesson < 5 min unless intentional
    if (lesson.estimatedMinutes !== undefined && lesson.estimatedMinutes < 5) {
      findings.push({
        checkId: 'QC-DUR-03',
        severity: 'warning',
        message: `Lesson "${lessonId}" is only ${lesson.estimatedMinutes} min`,
      });
    }

    // QC-PROG-02: Sequential order
    for (let i = 0; i < activities.length; i++) {
      const act = activities[i];
      if (act.order !== undefined && act.order !== i + 1) {
        findings.push({
          checkId: 'QC-PROG-02',
          severity: 'warning',
          message: `Lesson "${lessonId}" activity ${i} has order ${act.order} (expected ${i + 1})`,
        });
        break;
      }
    }

    // Check widget activities
    for (let i = 0; i < activities.length; i++) {
      const act = activities[i];
      if (act.type !== 'widget' || !act.widgetId) continue;
      widgetsUsed++;

      // QC-WDG-01: Canonical ID
      if (!canonicalWidgetIds.has(act.widgetId)) {
        const canonical = legacyToCanonical[act.widgetId];
        findings.push({
          checkId: 'QC-WDG-01',
          severity: 'error',
          message: `Widget "${act.widgetId}" in lesson "${lessonId}" is not a canonical ID${canonical ? ` (use "${canonical}" instead)` : ''}`,
        });
      }

      // QC-WDG-02: Not deprecated
      if (deprecatedWidgetIds.has(act.widgetId)) {
        findings.push({
          checkId: 'QC-WDG-02',
          severity: 'error',
          message: `Widget "${act.widgetId}" in lesson "${lessonId}" is deprecated (use "core.multiple-choice" instead)`,
        });
      }
    }

    // QC-COM-03: coreIdea, examples, misconceptions
    if (!lesson.coreIdea || lesson.coreIdea.trim().length === 0) {
      findings.push({
        checkId: 'QC-COM-03',
        severity: 'warning',
        message: `Lesson "${lessonId}" is missing coreIdea`,
      });
    }
    if (!Array.isArray(lesson.examples) || lesson.examples.length === 0) {
      findings.push({
        checkId: 'QC-COM-03',
        severity: 'warning',
        message: `Lesson "${lessonId}" is missing examples`,
      });
    }
    if (!Array.isArray(lesson.misconceptions) || lesson.misconceptions.length === 0) {
      findings.push({
        checkId: 'QC-COM-03',
        severity: 'warning',
        message: `Lesson "${lessonId}" is missing misconceptions`,
      });
    }
  }

  // QC-DUR-01: Total minutes vs estimatedHours (if available)
  // This is informational; we just record total minutes

  const errorCount = findings.filter((f) => f.severity === 'error').length;
  const warningCount = findings.filter((f) => f.severity === 'warning').length;
  const infoCount = findings.filter((f) => f.severity === 'info').length;

  const report = {
    success: errorCount === 0,
    timestamp: new Date().toISOString(),
    summary: {
      lessons: blueprint.length || validationResult?.data?.lessonCount || 0,
      objectives: totalObjectives,
      activities: totalActivities || validationResult?.data?.activityCount || 0,
      widgetsUsed,
      totalEstimatedMinutes: totalMinutes,
      errors: errorCount,
      warnings: warningCount,
      infos: infoCount,
    },
    findings,
  };

  writeFileSync(join(outputDir, 'quality-report.json'), JSON.stringify(report, null, 2));

  return report;
}

// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
  const outputDir = process.argv[2] || process.cwd();
  let validationResult = null;
  const vrPath = join(outputDir, 'quality-report.json');
  if (existsSync(vrPath)) {
    try {
      validationResult = JSON.parse(readFileSync(vrPath, 'utf-8'));
    } catch {
      /* ignore */
    }
  }
  const result = summarizeQuality(
    outputDir,
    validationResult || { errors: [], warnings: [], data: null },
    null,
  );
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test skills/openedu-course-authoring/scripts/__tests__/summarize-quality.test.mjs`
Expected: all 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add skills/openedu-course-authoring/references/quality-rubric.md skills/openedu-course-authoring/scripts/summarize-quality.mjs skills/openedu-course-authoring/scripts/__tests__/summarize-quality.test.mjs
git commit -m "feat(skill): implement quality summary helper with rubric and tests"
```

---

## Task 5: Write Source Materials Reference & Complete SKILL.md Integration

**Files:**

- Create: `skills/openedu-course-authoring/references/source-materials.md`
- Modify: `skills/openedu-course-authoring/SKILL.md` (add source materials section)

- [ ] **Step 1: Write `references/source-materials.md`**

Write file `skills/openedu-course-authoring/references/source-materials.md`:

````markdown
# Source Materials Integration

When a user supplies source materials (PDFs, textbooks, curriculum documents), the skill can leverage `@open-edu/pipeline` for AI-driven content extraction and course spec generation.

## Detection

Source materials are detected during the input interview. Common signals:

- User provides a `.pdf` file path
- User mentions a textbook or curriculum document
- User uploads or references a document

## Pipeline Integration

### When Pipeline is Available

1. **Resolve Profile:** Use `resolveProfile({ subject, curriculum })` to select the appropriate profile.
   - `--subject math` → math profile
   - `--subject science` → science profile
   - `--subject nios` or `--curriculum nios` → nios profile
   - anything else → generic profile

2. **Run Pipeline:**
   ```bash
   pnpm --filter @open-edu/pipeline curriculum:generate --pdf <file> --subject <subject>
   ```
````

3. **Additional Pipeline Options:**

   ```bash
   # Full pipeline with specific profile
   pnpm --filter @open-edu/pipeline curriculum:generate --pdf textbook.pdf --profile math

   # Single chapter only
   pnpm --filter @open-edu/pipeline curriculum:generate --pdf textbook.pdf --profile math --scope chapter-index:1

   # JSON-only output
   pnpm --filter @open-edu/pipeline curriculum:generate --pdf textbook.pdf --format json
   ```

4. **Preserve Pipeline Artifacts:**
   - Source inventory (list of chapters/sections found)
   - Concept map (extracted concepts and relationships)
   - Blueprint (lesson and activity plan)
   - Coverage report (which sections were processed)

### When Pipeline is Unavailable

1. Use the supplied material as context for LLM-based generation
2. Read the PDF/source content directly where possible
3. Mark source extraction as **manual/unverified** in the quality report
4. Provide the pipeline command that the user could run later

## Profile Selection Guide

| Subject/Context | Profile   | Key Features                                         |
| --------------- | --------- | ---------------------------------------------------- |
| Mathematics     | `math`    | CPA teaching style, math widgets, 11 asset renderers |
| Science         | `science` | Process/classification concepts, science widgets     |
| NIOS Curriculum | `nios`    | Bilingual (Hindi/English) taxonomy, NIOS structure   |
| Anything else   | `generic` | Scaffolded discovery, core widgets only              |

## Pipeline Output Integration

When the pipeline produces output:

1. **course-spec.md** → convert to `course-spec.json` following the artifact contract
2. **Concept map** → use to validate objective coverage
3. **Blueprint** → save as `lesson-blueprints.json`
4. **Coverage report** → include in `quality-report.json`

## Handling Pipeline Errors

- If the pipeline fails, report the error clearly and fall back to manual generation
- If the pipeline is not built, suggest `pnpm build` in the pipeline package
- If LLM provider is not configured, explain the `.env` setup required

````

- [ ] **Step 2: Update SKILL.md with source materials reference**

Add the following section to `skills/openedu-course-authoring/SKILL.md` after the "Helper Scripts" section (before "Output Directory Structure"):

```markdown
## Source Material Pipeline

When source materials (PDFs, textbooks) are provided:

1. Detect pipeline availability via `discover-openedu.mjs`
2. Resolve the appropriate profile (`generic`, `math`, `science`, or `nios`)
3. Run: `pnpm --filter @open-edu/pipeline curriculum:generate --pdf <file> --subject <subject>`
4. Preserve pipeline artifacts: source inventory, concept map, blueprint, coverage report
5. Transform pipeline output (`course-spec.md`) into canonical `course-spec.json`
6. If pipeline unavailable: use material as context, mark extraction as manual

See `references/source-materials.md` for full profile selection guide and pipeline options.
````

- [ ] **Step 3: Commit**

```bash
git add skills/openedu-course-authoring/references/source-materials.md skills/openedu-course-authoring/SKILL.md
git commit -m "feat(skill): add source materials reference and SKILL.md integration"
```

---

## Task 6: Maintain Compatibility with Existing CLI Skill Reference

**Files:**

- Modify: `packages/cli/skills/course-spec-generator.skill.md`
- Create: `packages/cli/skills/README.md`
- Create: `packages/cli/skills/course-spec-generator.skill.test.ts`

- [ ] **Step 1: Write the compatibility test**

Write file `packages/cli/skills/course-spec-generator.skill.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SKILL_PATH = join(__dirname, 'course-spec-generator.skill.md');
const README_PATH = join(__dirname, 'README.md');

describe('CLI skill reference compatibility', () => {
  it('skill file exists', () => {
    expect(existsSync(SKILL_PATH)).toBe(true);
  });

  it('README exists', () => {
    expect(existsSync(README_PATH)).toBe(true);
  });

  it('skill references the portable skill or portable spec approach', () => {
    const content = readFileSync(SKILL_PATH, 'utf-8');
    // Must mention the portable skill or JSON format
    const mentionsPortable =
      content.includes('skills/openedu-course-authoring') ||
      content.includes('portable') ||
      content.includes('repository mode');
    expect(mentionsPortable).toBe(true);
  });

  it('skill recommends JSON format', () => {
    const content = readFileSync(SKILL_PATH, 'utf-8');
    expect(content).toMatch(/course-spec\.json|JSON.*recommended|JSON.*preferred/i);
  });

  it('skill identifies compiler validation', () => {
    const content = readFileSync(SKILL_PATH, 'utf-8');
    expect(content).toMatch(/--validate|compiler.*valid|edu.*compile/i);
  });

  it('skill does not present a hardcoded widget catalog as authoritative', () => {
    const content = readFileSync(SKILL_PATH, 'utf-8');
    // Should reference catalog discovery or the portable skill rather than listing all widgets
    const hasHardcodedCatalog =
      content.includes('### 1. `open-edu.') &&
      content.includes('### 2. `open-edu.') &&
      content.includes('### 3. `open-edu.');
    expect(hasHardcodedCatalog).toBe(false);
  });

  it('skill does not exceed reasonable size for a compatibility reference', () => {
    const content = readFileSync(SKILL_PATH, 'utf-8');
    const lines = content.split('\n').length;
    // As a thin compatibility reference, it should be under 300 lines
    expect(lines).toBeLessThan(300);
  });

  it('README documents installation and usage', () => {
    const content = readFileSync(README_PATH, 'utf-8');
    expect(content).toMatch(/install|usage|setup|how to/i);
    expect(content).toMatch(/portable|repository/i);
    expect(content).toMatch(/skills\/openedu-course-authoring/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run packages/cli/skills/course-spec-generator.skill.test.ts`
Expected: FAIL — multiple assertions fail (skill still has hardcoded catalog, no README, etc.).

- [ ] **Step 3: Rewrite `course-spec-generator.skill.md` as thin compatibility reference**

Replace the entire content of `packages/cli/skills/course-spec-generator.skill.md` with:

````markdown
# Skill: course-spec-generator

Generate OpenEdu `course-spec.json` files for the course-compiler using an LLM. This is the CLI prompt reference; **for full authoring workflows (including discovery, validation, quality checks, package compilation, and pipeline integration), use the portable `openedu-course-authoring` skill.**

## Quick Reference

### JSON Format (RECOMMENDED for LLM generation)

```json
{
  "format": "openedu-course-spec",
  "version": 1,
  "generatedAt": "2026-01-01T00:00:00.000Z",
  "metadata": {
    "title": "Course Title",
    "description": "Course description",
    "author": "Author Name",
    "version": "1.0.0",
    "difficulty": "beginner",
    "estimatedHours": 2,
    "generated": true
  },
  "lessons": [
    {
      "id": "lesson-01",
      "title": "Lesson Title",
      "objectives": ["Objective 1", "Objective 2"],
      "coreIdea": "The main concept",
      "examples": ["Example 1"],
      "misconceptions": ["Misconception 1"],
      "estimatedMinutes": 15,
      "activities": [
        {
          "step": "observe",
          "order": 1,
          "type": "reading",
          "description": "Introduction to the concept"
        },
        {
          "step": "guided_practice",
          "order": 2,
          "type": "widget",
          "description": "Interactive practice",
          "widgetId": "core.matching",
          "widgetConfig": {}
        },
        {
          "step": "mastery_check",
          "order": 3,
          "type": "quiz",
          "description": "Check understanding",
          "questions": [
            {
              "question": "Question text?",
              "options": ["A", "B", "C", "D"],
              "correctIndex": 0
            }
          ]
        }
      ]
    }
  ]
}
```
````

### Compiler CLI Usage

```bash
# Compile and validate
edu compile course-spec.json --output ./output --validate

# Validate a compiled package
edu validate ./output

# Lint content quality
edu lint-content ./output

# Dev server
edu dev ./output
```

### Activity Types

| Type         | Required Fields                             |
| ------------ | ------------------------------------------- |
| `reading`    | `instructions` (content), `description`     |
| `exercise`   | `instructions`, `description`               |
| `quiz`       | `questions[]` (4 options, one correctIndex) |
| `reflection` | `instructions` (prompt), `description`      |
| `widget`     | `widgetId`, `widgetConfig`, `description`   |

### Pedagogical Steps

| Step                   | Purpose             |
| ---------------------- | ------------------- |
| `observe`              | Introduce concept   |
| `guided_practice`      | Scaffolded practice |
| `independent_practice` | Solo practice       |
| `mastery_check`        | Assessment          |
| `positive_completion`  | Celebrate & reflect |

### Widget Selection

Widget IDs must come from the **discovered widget catalog**, not a hardcoded list. The canonical IDs use domain prefixes:

- `core.*` — general-purpose widgets (matching, multiple-choice, sequencing, drag-drop, fill-blank, story-question, real-world, chart-reader, audio-player, video-player)
- `math.*` — math-specific widgets (fraction-visual, place-value-chart, grid-area, clock-time, measurement-scale, number-line)
- `science.*` — science-specific widgets (process-diagram, label-diagram, image-label)
- `language.*` — language widgets (flashcard)
- `social.*` — social studies widgets (map)

**Important:** Legacy `open-edu.*` IDs (e.g., `open-edu.matching`) are auto-resolved by the compiler but **should not be used in new specs**. Always use the canonical domain-prefixed IDs.

See `skills/openedu-course-authoring/references/repository-adapter.md` for catalog discovery instructions.

### Validation Rules

| Rule                    | Severity |
| ----------------------- | -------- |
| Duplicate lesson IDs    | error    |
| Missing title           | error    |
| Missing objectives      | warning  |
| Empty quiz              | error    |
| Invalid step            | error    |
| Widget without widgetId | error    |
| No activities           | warning  |

### ID Rules

- Lesson IDs: kebab-case, unique within course
- All IDs must be unique within scope

## Using the Portable Skill

For complete workflows (discovery, validation, quality reports, pipeline integration, package compilation), use the `openedu-course-authoring` skill:

```
skills/openedu-course-authoring/SKILL.md
```

The portable skill handles:

- Repository detection and capability discovery
- Widget catalog loading and validation
- Compiler-aware structural + compiler validation
- Quality rubric with pedagogical checks
- PDF pipeline integration with profile resolution
- Package compilation, validation, and linting

````

- [ ] **Step 4: Write `packages/cli/skills/README.md`**

Write file `packages/cli/skills/README.md`:

```markdown
# CLI Skills

Skills that extend the Open-Edu CLI with agent-ready prompts and workflows.

## `course-spec-generator`

**File:** `course-spec-generator.skill.md`

A thin compatibility reference for the `edu generate --prompt` command. Contains the minimal JSON format specification, CLI usage, activity types, and pedagogical steps needed to produce a compiler-compatible `course-spec.json`.

**When to use:** Quick reference when an agent needs the course spec format but does not need full validation, quality checks, or package compilation.

## `openedu-course-authoring` (Portable Skill)

**Location:** `skills/openedu-course-authoring/SKILL.md`

The full-featured course authoring skill. Use this for complete workflows.

### Installation

Copy the skill directory to your agent's skills directory:

```bash
cp -r skills/openedu-course-authoring ~/.agents/skills/openedu-course-authoring
````

### How Repository Mode is Detected

The skill's `scripts/discover-openedu.mjs` walks upward from the working directory looking for `pnpm-workspace.yaml`. If found, it detects available capabilities (compiler, CLI, widget catalog, pipeline, examples) and exposes the correct commands.

### Portable Mode vs Repository Mode

| Feature                     | Portable Mode | Repository Mode |
| --------------------------- | ------------- | --------------- |
| Generate `course-spec.json` | Yes           | Yes             |
| Structural validation       | Yes           | Yes             |
| Quality report              | Yes           | Yes             |
| Compiler validation         | No            | Yes             |
| Widget catalog validation   | No            | Yes             |
| Package compilation         | No            | Yes             |
| Package validation          | No            | Yes             |
| Content linting             | No            | Yes             |
| PDF pipeline integration    | No            | Yes             |
| Dev server preview          | No            | Yes (suggested) |

### Relationship to CLI Prompt

- `course-spec-generator.skill.md` — minimal reference used by `edu generate --prompt`
- `openedu-course-authoring` — full authoring skill with discovery, validation, compilation

When `--prompt` is used, the CLI outputs the content of `course-spec-generator.skill.md` as the agent context. For interactive authoring, prefer the portable skill.

````

- [ ] **Step 5: Run compatibility test to verify it passes**

Run: `pnpm exec vitest run packages/cli/skills/course-spec-generator.skill.test.ts`
Expected: all 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/skills/course-spec-generator.skill.md packages/cli/skills/README.md packages/cli/skills/course-spec-generator.skill.test.ts
git commit -m "feat(skill): reduce CLI skill to thin compatibility reference with tests"
````

---

## Task 7: Add Skill Evaluations

**Files:**

- Create: `skills/openedu-course-authoring/evals/evals.json`
- Create: `skills/openedu-course-authoring/evals/README.md`

- [ ] **Step 1: Write `evals/evals.json`**

Write file `skills/openedu-course-authoring/evals/evals.json`:

```json
{
  "skill": "openedu-course-authoring",
  "version": 1,
  "evaluations": [
    {
      "id": "eval-portable-fractions",
      "mode": "portable",
      "description": "Generate a fractions course in portable mode (no repo)",
      "prompt": "Create an Open-Edu course about fractions for 8-10 year old students. Should have 3 lessons covering: 1) What fractions are, 2) Comparing fractions, 3) Adding fractions with like denominators.",
      "expectedResult": {
        "artifacts": [
          "course-spec.json",
          "course-spec.md",
          "course-brief.md",
          "quality-report.json"
        ],
        "checks": [
          "course-spec.json is valid JSON and parses successfully",
          "format is 'openedu-course-spec' and version is 1",
          "metadata.generated is true",
          "has exactly 3 lessons",
          "each lesson has objectives, coreIdea, examples, misconceptions",
          "each lesson has at least one activity",
          "lesson IDs are unique",
          "course-brief.md records explicit assumptions",
          "quality-report.json includes structural checks"
        ]
      }
    },
    {
      "id": "eval-portable-javascript",
      "mode": "portable",
      "description": "Generate an intro JavaScript course in portable mode",
      "prompt": "Create an Open-Edu course for complete beginners learning JavaScript. Cover variables, data types, and basic functions. Target adult learners with no prior programming. 4 lessons, 30 minutes each.",
      "expectedResult": {
        "artifacts": [
          "course-spec.json",
          "course-spec.md",
          "course-brief.md",
          "quality-report.json"
        ],
        "checks": [
          "course-spec.json is valid JSON",
          "has 4 lessons",
          "metadata.difficulty is 'beginner'",
          "each lesson has at least one exercise activity",
          "lesson IDs are kebab-case and unique",
          "total estimated minutes is approximately 120"
        ]
      }
    },
    {
      "id": "eval-portable-non-stem",
      "mode": "portable",
      "description": "Generate a non-STEM course (language learning)",
      "prompt": "Create an Open-Edu course for learning basic French greetings and introductions. 2 lessons, for adult travelers. Include vocabulary, pronunciation, and practice activities.",
      "expectedResult": {
        "artifacts": [
          "course-spec.json",
          "course-spec.md",
          "course-brief.md",
          "quality-report.json"
        ],
        "checks": [
          "course-spec.json is valid JSON",
          "has exactly 2 lessons",
          "activities include reading and exercise types",
          "each lesson has learning objectives",
          "course-brief states target audience as adult travelers"
        ]
      }
    },
    {
      "id": "eval-repo-package",
      "mode": "repository",
      "description": "Generate a complete compiled package inside the Open-Edu repo",
      "prompt": "Create an Open-Edu course about the solar system for 10-12 year olds. 3 lessons. Generate the full package: compile, validate, and lint it. Output to ./course-output/.",
      "expectedResult": {
        "artifacts": ["course-spec.json", "quality-report.json", "package/package.json"],
        "checks": [
          "course-spec.json compiles without errors",
          "edu validate succeeds on the package",
          "edu lint-content passes or reports only warnings",
          "package/package.json exists with valid manifest",
          "package/workflow.json exists",
          "quality-report.json includes compiler output"
        ]
      }
    },
    {
      "id": "eval-repo-pdf",
      "mode": "repository",
      "description": "Generate a course from a supplied PDF textbook chapter",
      "prompt": "I have a PDF textbook at ./textbook.pdf covering basic algebra. Create a course spec for chapter 1 only. Use the pipeline with the math profile.",
      "expectedResult": {
        "artifacts": ["course-spec.json", "quality-report.json"],
        "checks": [
          "pipeline is invoked with math profile",
          "pipeline output (course-spec.md) is transformed to course-spec.json",
          "pipeline artifacts (concept map, blueprint) are preserved",
          "quality-report references pipeline source"
        ]
      }
    },
    {
      "id": "eval-edge-missing-level",
      "mode": "portable",
      "description": "Handle missing learner level by asking for clarification",
      "prompt": "Create an Open-Edu course about photosynthesis. Make it good.",
      "expectedBehavior": "ASYMMETRIC: Should ask follow-up questions about learner age/level, duration, and learning goals before generating. Should NOT assume defaults silently.",
      "expectedResult": {
        "checks": [
          "agent asks clarifying questions before generating",
          "agent does NOT produce course-spec.json without sufficient input",
          "agent records assumptions when user doesn't specify"
        ]
      }
    },
    {
      "id": "eval-edge-unsupported-widget",
      "mode": "repository",
      "description": "Handle a request for an unsupported widget gracefully",
      "prompt": "Create a course about music theory. Use a widget called 'open-edu.piano-simulator' for the practice activities.",
      "expectedBehavior": "ASYMMETRIC: Should note that 'open-edu.piano-simulator' is not in the catalog and fall back to reading/exercise instead.",
      "expectedResult": {
        "checks": [
          "generated spec does NOT include 'open-edu.piano-simulator' as a widgetId",
          "quality report warns about unsupported widget request",
          "appropriate fallback activities are suggested"
        ]
      }
    },
    {
      "id": "eval-edge-existing-output",
      "mode": "any",
      "description": "Handle existing output directory by asking before overwriting",
      "prompt": "Create a fractions course. Output to an existing directory at ./course-output/ (which already has a previous course-spec.json).",
      "expectedBehavior": "ASYMMETRIC: Should detect existing output and ask for confirmation before overwriting.",
      "expectedResult": {
        "checks": [
          "agent detects existing output directory",
          "agent asks for confirmation before overwriting",
          "agent does NOT auto-overwrite without permission"
        ]
      }
    },
    {
      "id": "eval-edge-multilingual",
      "mode": "portable",
      "description": "Generate course with non-English locale",
      "prompt": "Create an Open-Edu course about basic arithmetic in Spanish (locale es-MX). For 6-8 year olds. 2 lessons.",
      "expectedResult": {
        "artifacts": ["course-spec.json", "course-spec.md", "course-brief.md"],
        "checks": [
          "course-spec.json uses Spanish content",
          "course-brief.md notes language/locale as es-MX",
          "metadata language/locale is recorded",
          "content is age-appropriate for 6-8 year olds"
        ]
      }
    }
  ]
}
```

- [ ] **Step 2: Write `evals/README.md`**

Write file `skills/openedu-course-authoring/evals/README.md`:

```markdown
# Open-Edu Course Authoring Skill Evaluations

These evaluations test the skill across multiple scenarios. Each eval is a prompt + expected result + machine-checkable assertions.

## Running Evaluations

Run each evaluation by providing the prompt to the agent with the `openedu-course-authoring` skill loaded.

## Evaluation Criteria

### Machine-Checkable Assertions

For each evaluation, verify these mechanical properties:

1. **Artifact presence** — all expected files exist in the output directory
2. **JSON parseability** — `course-spec.json` parses as valid JSON
3. **Schema conformance** — `course-spec.json` passes structural validation
4. **Compiler success** — (repo mode) `edu compile --validate` exits 0
5. **No unknown widget IDs** — every `widgetId` is from the canonical catalog or legacy alias map
6. **Stable IDs** — lesson IDs are unique kebab-case
7. **Objective coverage** — every objective maps to at least one activity
8. **Truthful capability reporting** — agent never claims validation it didn't run

### Qualitative Review

For ASYMMETRIC evaluations (where the "correct" output is open-ended), review:

- Does the agent ask clarifying questions before generating?
- Does the agent detect and handle edge cases gracefully?
- Are assumptions recorded rather than silently applied?
- Does the agent refuse to fabricate validation results?

## Eval Types

- **Portable mode:** Runs outside an Open-Edu repo. Tests structural validation and artifact generation.
- **Repository mode:** Runs inside an Open-Edu repo. Tests compilation, validation, and linting.
- **Edge case:** Tests error handling, missing input, unsupported requests, and safety behavior.

## Evaluation List

| ID                             | Mode       | Description                         |
| ------------------------------ | ---------- | ----------------------------------- |
| `eval-portable-fractions`      | portable   | Fractions course for 8-10 year olds |
| `eval-portable-javascript`     | portable   | Intro JavaScript for adults         |
| `eval-portable-non-stem`       | portable   | French greetings for travelers      |
| `eval-repo-package`            | repository | Complete package compilation        |
| `eval-repo-pdf`                | repository | PDF pipeline math profile           |
| `eval-edge-missing-level`      | any        | Missing learner level               |
| `eval-edge-unsupported-widget` | repository | Unsupported widget fallback         |
| `eval-edge-existing-output`    | any        | Existing output directory safety    |
| `eval-edge-multilingual`       | portable   | Spanish (es-MX) locale              |
```

- [ ] **Step 3: Commit**

```bash
git add skills/openedu-course-authoring/evals/
git commit -m "feat(skill): add skill evaluations across topics and edge cases"
```

---

## Task 8: Final Verification and Handoff

- [ ] **Step 1: Run all helper tests**

Run: `node --test skills/openedu-course-authoring/scripts/__tests__/*.test.mjs`
Expected: all tests pass (discovery: 8 tests, validation: 10 tests, quality: 7 tests = 25 total).

- [ ] **Step 2: Run the compatibility test**

Run: `pnpm exec vitest run packages/cli/skills/course-spec-generator.skill.test.ts`
Expected: all 6 tests pass.

- [ ] **Step 3: Run typecheck for the CLI skills test**

Run: `pnpm --filter @open-edu/cli typecheck`
Expected: no type errors (may need to adjust if tsconfig excludes the skills directory).

- [ ] **Step 4: Validate a real generated fixture**

Create a temporary valid spec and test the full pipeline:

```bash
# Create a test spec
mkdir -p /tmp/openedu-test

cat > /tmp/openedu-test/course-spec.json << 'SPECEOF'
{
  "format": "openedu-course-spec",
  "version": 1,
  "generatedAt": "2026-07-25T00:00:00.000Z",
  "metadata": {
    "title": "Verification Test",
    "description": "A test course",
    "difficulty": "beginner",
    "generated": true
  },
  "lessons": [
    {
      "id": "test-lesson-01",
      "title": "Test Lesson",
      "objectives": ["Verify the pipeline works"],
      "coreIdea": "This lesson validates the toolchain",
      "examples": ["Example 1"],
      "misconceptions": ["None"],
      "activities": [
        { "step": "observe", "order": 1, "type": "reading", "description": "Read this" }
      ]
    }
  ]
}
SPECEOF

# Run structural validation
node skills/openedu-course-authoring/scripts/validate-course-spec.mjs /tmp/openedu-test/course-spec.json /tmp/openedu-test/

# Check quality report was generated
cat /tmp/openedu-test/quality-report.json

# If in repo, also test compilation (skip if CLI not built)
# pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js compile /tmp/openedu-test/course-spec.json --output /tmp/openedu-test/package --validate

# Clean up
rm -rf /tmp/openedu-test
```

Expected: structural validation passes, `quality-report.json` exists with `success: true`.

- [ ] **Step 5: Perform the plan self-review**

Check these items:

1. **Both output modes covered?**
   - [x] Portable mode spec generation (SKILL.md, authoring-workflow.md)
   - [x] Repository mode compilation (repository-adapter.md, discover-openedu.mjs)

2. **Runtime catalog discovery?**
   - [x] discover-openedu.mjs detects `packages/core/src/widget-catalog-data.json`
   - [x] Legacy → canonical alias map in summarize-quality.mjs

3. **Compiler/package validation?**
   - [x] Structural validation in validate-course-spec.mjs
   - [x] Compiler integration via compilerPath parameter

4. **Quality report?**
   - [x] Quality rubric in quality-rubric.md
   - [x] summarize-quality.mjs with 6 dimensions

5. **Source-material support?**
   - [x] source-materials.md reference
   - [x] Pipeline integration via discover-openedu.mjs + SKILL.md section

6. **Safe overwrite behavior?**
   - [x] Documented in repository-adapter.md

7. **Portability?**
   - [x] discover-openedu.mjs works in any directory
   - [x] Portable mode requires no local tools

8. **Evaluations?**
   - [x] 9 eval entries covering portable, repo, and edge cases

9. **CLI compatibility?**
   - [x] Thin reference in course-spec-generator.skill.md
   - [x] Compatibility test passes

10. **No placeholders?**
    - [x] All files have complete content
    - [x] No TBD, TODO, or "similar to" patterns

- [ ] **Step 6: Inspect the final diff**

Run: `git diff -- skills packages/cli/skills docs/superpowers/plans/2026-07-25-openedu-course-authoring-skill.md`
Expected: only the new skill directory, modified CLI skill file, new CLI README, new CLI test. No changes to existing pipeline code.

- [ ] **Step 7: Final commit (if any remaining changes)**

```bash
git status
```

Commit any remaining changes with `feat(skill): final verification and polish`.

---

## Execution Notes

- Do not reset or clean the current working tree. Existing pipeline edits and generated output belong to the user.
- Do not commit until explicitly requested. Each task includes a commit step that may be skipped if the user wants to batch commits.
- The `SKILL.md` file is intentionally kept under 500 lines; detail lives in `references/`.
- Helper scripts are deterministic; pedagogical decisions (which widget to pick, how many objectives) are left to the agent's judgment guided by the rubric.
