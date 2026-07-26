# Open-Edu Course Authoring Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a portable agent skill that can generate a compiler-compatible Open-Edu course specification anywhere and generate, validate, and optionally preview a complete Open-Edu package when run inside an Open-Edu repository.

**Architecture:** The skill is an instruction-first workflow with small bundled helper scripts and references. It discovers the available Open-Edu compiler, widget catalog, examples, and pipeline capabilities at runtime; it uses `course-spec.json` as the canonical artifact, emits readable Markdown as an export, and keeps intermediate planning and quality artifacts for inspection and revision. The existing `packages/cli/skills/course-spec-generator.skill.md` remains a compatibility reference and is reduced or regenerated from the same source where practical, rather than becoming a second independently maintained specification.

**Tech Stack:** Markdown skill format, JSON artifacts, shell/Node helper scripts, pnpm, `@open-edu/course-compiler`, `@open-edu/core`, `@open-edu/pipeline`, Vitest, and the skill-creator evaluation format.

---

## Current Context and Boundaries

- The canonical compiler input is parsed by `packages/course-compiler/src/parser/json-input.ts`; the skill must follow that schema instead of relying on the older examples in `packages/cli/skills/course-spec-generator.skill.md`.
- Widget metadata is generated from `packages/widgets/src/widget-catalog-source.ts` and exposed through `packages/core/src/widget-catalog.ts`; the skill must discover or request this catalog instead of embedding a fixed widget list.
- Package validation is available through `edu validate`; course-spec compilation is available through `edu compile <file> --validate`; content checks are available through `edu lint-content`.
- The PDF/curriculum pipeline already has generic, math, science, and NIOS profiles under `packages/pipeline/src/profile/`; the skill should call or reference that pipeline when the user supplies source material, not duplicate profile logic.
- The working tree currently contains unrelated uncommitted changes in `packages/pipeline/src/` and generated `output/`; do not reset, overwrite, or include those changes in this feature.

## Proposed Skill Layout

Create a portable source tree at:

```text
skills/openedu-course-authoring/
├── SKILL.md
├── references/
│   ├── artifact-contract.md
│   ├── authoring-workflow.md
│   ├── quality-rubric.md
│   └── repository-adapter.md
├── scripts/
│   ├── discover-openedu.mjs
│   ├── validate-course-spec.mjs
│   └── summarize-quality.mjs
└── evals/
    └── evals.json
```

The skill should be installable by copying `skills/openedu-course-authoring/` into an agent’s skills directory. Repository-local execution should use the same source directory, while `packages/cli/skills/course-spec-generator.skill.md` should remain a thin compatibility entry point or generated prompt reference.

## Artifact Contract

Every run creates an output directory with these artifacts:

```text
course-output/
├── course-brief.md
├── lesson-blueprints.json
├── course-spec.json
├── course-spec.md
├── quality-report.json
└── package/                 # only when Open-Edu tooling is detected
```

`course-spec.json` is canonical. `course-spec.md` is a human-readable export. `quality-report.json` records structural diagnostics, objective coverage, assessment alignment, accessibility checks, widget decisions, unresolved assumptions, and generated commands. A run is successful only when the requested output exists and every required validation gate passes.

### Task 1: Scaffold the portable skill and artifact contract

**Files:**

- Create: `skills/openedu-course-authoring/SKILL.md`
- Create: `skills/openedu-course-authoring/references/artifact-contract.md`
- Create: `skills/openedu-course-authoring/references/authoring-workflow.md`
- Create: `skills/openedu-course-authoring/references/repository-adapter.md`

- [ ] **Step 1: Define triggering metadata and compatibility requirements**

Use frontmatter that triggers for requests to create, design, generate, author, or compile Open-Edu courses, lessons, curricula, bundles, or course-spec files. State that the skill works in two modes: portable spec mode and repository package mode.

- [ ] **Step 2: Define the mandatory input interview**

Document the minimum inputs the agent must obtain or explicitly assume: topic, learner age/level, learning goals, language/locale, expected duration, prerequisites, delivery constraints, accessibility needs, and whether source materials are supplied. The agent must record assumptions in `course-brief.md` rather than silently inventing them.

- [ ] **Step 3: Define staged generation**

Specify the sequence `brief → objectives → lesson blueprints → activities/assessment → canonical JSON → Markdown export → validation → package`. Require each lesson to include measurable objectives, core explanation, examples, misconceptions, progressive activities, and an assessment aligned to its objectives.

- [ ] **Step 4: Define portable and repository output behavior**

Portable mode writes the spec and reports without assuming local Open-Edu commands. Repository mode additionally discovers the CLI/compiler, widget catalog, examples, package conventions, and optional pipeline entry points before generating package files.

- [ ] **Step 5: Document artifact schemas and failure semantics**

Record exact required fields, stable IDs, deterministic naming, diagnostics severity, and the rule that warnings may be reported but compiler errors, schema errors, broken references, or missing required artifacts fail the run.

### Task 2: Add runtime repository discovery and deterministic validation helpers

**Files:**

- Create: `skills/openedu-course-authoring/scripts/discover-openedu.mjs`
- Create: `skills/openedu-course-authoring/scripts/validate-course-spec.mjs`
- Test: `skills/openedu-course-authoring/scripts/__tests__/validate-course-spec.test.mjs`

- [ ] **Step 1: Write discovery tests**

Cover a non-repository directory, an Open-Edu repository root, a repository with a built CLI, and a repository where only package-local source is available. Assert that discovery returns explicit capabilities rather than guessing commands.

- [ ] **Step 2: Implement repository discovery**

Have `discover-openedu.mjs` walk upward from the requested working directory and detect `pnpm-workspace.yaml`, `packages/course-compiler`, `packages/cli`, `packages/widgets`, `packages/pipeline`, and the relevant package scripts. Return JSON containing `mode`, `repoRoot`, available commands, source/reference paths, and a list of unavailable capabilities.

- [ ] **Step 3: Write validation-helper tests**

Test valid JSON, malformed JSON, missing required metadata, an invalid activity shape, duplicate lesson IDs, and a widget activity without a widget ID. Assertions should inspect machine-readable diagnostics and exit status.

- [ ] **Step 4: Implement compiler-aware validation**

Have `validate-course-spec.mjs` run local structural checks first, then invoke the discovered course compiler with `--validate` when available. Emit one JSON report with `errors`, `warnings`, `commands`, `compilerAvailable`, and `success`; never claim compiler validation when the compiler was not found.

- [ ] **Step 5: Run focused helper tests**

Run: `node --test skills/openedu-course-authoring/scripts/__tests__/validate-course-spec.test.mjs`

Expected: all discovery and validation tests pass.

### Task 3: Make widget selection catalog-driven

**Files:**

- Modify: `skills/openedu-course-authoring/SKILL.md`
- Modify: `skills/openedu-course-authoring/references/repository-adapter.md`
- Modify: `skills/openedu-course-authoring/scripts/discover-openedu.mjs`
- Test: `skills/openedu-course-authoring/scripts/__tests__/discover-openedu.test.mjs`

- [ ] **Step 1: Specify widget selection rules**

Require the agent to choose widgets by learning intent, age/level, accessibility, and cognitive load. It must prefer stable non-deprecated widgets, use canonical IDs from the discovered catalog, explain each widget choice, and fall back to standard reading/exercise/quiz activities when no suitable widget is available.

- [ ] **Step 2: Add catalog capability discovery**

Detect the generated catalog or the canonical widget catalog source and expose the command/path needed to obtain it. If the catalog cannot be loaded, the skill must not invent widget IDs or configurations.

- [ ] **Step 3: Test stale-catalog and unavailable-widget behavior**

Assert that the adapter reports missing catalog data, deprecated IDs, and unknown requested widgets as actionable diagnostics instead of silently passing them through.

- [ ] **Step 4: Document current/future catalog compatibility**

Reference `packages/core/src/widget-catalog.ts` and `packages/widgets/src/widget-catalog-source.ts` as sources of truth. Keep examples short and explicitly mark them as illustrative; do not copy all widget schemas into the skill.

### Task 4: Add quality rubric and quality-report generation

**Files:**

- Create: `skills/openedu-course-authoring/references/quality-rubric.md`
- Create: `skills/openedu-course-authoring/scripts/summarize-quality.mjs`
- Test: `skills/openedu-course-authoring/scripts/__tests__/summarize-quality.test.mjs`
- Modify: `skills/openedu-course-authoring/SKILL.md`

- [ ] **Step 1: Define objective coverage and alignment rules**

Require every objective to map to at least one learning activity and one assessment signal. Flag objectives that are not observable, lessons with no practice, assessments that test unintroduced concepts, and duration totals that do not match the requested scope.

- [ ] **Step 2: Define accessibility and inclusion checks**

Require plain-language instructions, keyboard-compatible interaction choices, alt text for referenced visuals, non-color-only distinctions, readable content chunking, and alternatives for widget-only activities. Record checks as `pass`, `warning`, or `error` with evidence.

- [ ] **Step 3: Implement quality summary generation**

Have `summarize-quality.mjs` combine validation diagnostics with a supplied blueprint/objective ledger and emit deterministic counts plus detailed findings. Keep pedagogical judgments explainable; do not reduce the entire quality decision to an opaque score.

- [ ] **Step 4: Test representative quality findings**

Cover complete alignment, an uncovered objective, an overlong lesson, inaccessible widget-only content, unresolved assumptions, and compiler errors. Assert exact severity and finding codes.

- [ ] **Step 5: Run focused quality tests**

Run: `node --test skills/openedu-course-authoring/scripts/__tests__/summarize-quality.test.mjs`

Expected: all quality-report tests pass.

### Task 5: Integrate package generation and optional source-material pipeline

**Files:**

- Modify: `skills/openedu-course-authoring/SKILL.md`
- Modify: `skills/openedu-course-authoring/references/repository-adapter.md`
- Modify: `skills/openedu-course-authoring/references/authoring-workflow.md`
- Create: `skills/openedu-course-authoring/references/source-materials.md`

- [ ] **Step 1: Define package-mode command sequence**

When repository capabilities are present, generate `course-spec.json`, run `edu compile <spec> --output <package> --validate`, then run `edu validate <package>` and `edu lint-content <package>`. Capture stdout/stderr and exit codes in `quality-report.json`.

- [ ] **Step 2: Define package safety rules**

Use a new output directory by default, refuse to overwrite an existing package unless the user explicitly requests it, keep generated assets within the output directory, and verify manifest entry/workflow references before reporting success.

- [ ] **Step 3: Define source-material behavior**

For PDFs or curriculum documents, use `@open-edu/pipeline` when available and resolve a generic or subject/curriculum profile through the existing profile registry. Preserve source inventory, concept map, blueprint, and coverage artifacts. If the pipeline is unavailable, use the supplied material as context and mark source extraction as manual/unverified.

- [ ] **Step 4: Define preview behavior**

The skill may suggest `edu dev <package>` or the learner/dev-server workflow, but must not claim visual or accessibility verification unless the agent actually runs the preview/test command and records the result.

### Task 6: Maintain compatibility with the existing CLI skill reference

**Files:**

- Modify: `packages/cli/skills/course-spec-generator.skill.md`
- Create: `packages/cli/skills/README.md`
- Test: `packages/cli/skills/course-spec-generator.skill.test.ts`

- [ ] **Step 1: Add a compatibility test for required guidance**

Assert that the existing CLI skill reference points agents to the portable skill, recommends JSON, identifies compiler validation, and does not present a hardcoded widget catalog as authoritative.

- [ ] **Step 2: Replace duplicated catalog guidance**

Keep the existing file usable by CLI prompt consumers, but replace long copied widget schemas with a generated/discovery instruction and a link to `skills/openedu-course-authoring/references/repository-adapter.md`. Preserve the package node schema guidance needed by `edu generate --prompt`.

- [ ] **Step 3: Document installation and usage**

In `packages/cli/skills/README.md`, explain how agents install the skill, how repository mode is detected, how to invoke portable mode, and how the CLI prompt reference relates to the skill.

- [ ] **Step 4: Run the CLI skill test**

Run: `pnpm exec vitest run packages/cli/skills/course-spec-generator.skill.test.ts`

Expected: the compatibility test passes without requiring generated package output.

### Task 7: Add skill evaluations across topics and execution modes

**Files:**

- Create: `skills/openedu-course-authoring/evals/evals.json`
- Create: `skills/openedu-course-authoring/evals/README.md`

- [ ] **Step 1: Add portable-mode evaluation prompts**

Include realistic prompts for beginner fractions, introductory JavaScript, language learning, and a non-STEM topic. Each expected result must require `course-spec.json`, explicit assumptions, objective/activity/assessment alignment, and validation instructions.

- [ ] **Step 2: Add repository-mode evaluation prompts**

Include a prompt that asks for a complete package in the Open-Edu repository and a prompt with a supplied PDF/source directory. Expected results must require package compilation, package validation, content linting, and a quality report.

- [ ] **Step 3: Add negative/edge evaluations**

Cover missing learner level, unsupported widget request, unavailable compiler, multilingual content, and an existing output directory. Expected behavior should be clarification or a safe fallback, never fabricated validation.

- [ ] **Step 4: Document evaluation criteria**

Explain qualitative review and machine-checkable assertions: artifact presence, JSON parseability, compiler success, no unknown widget IDs, stable IDs, objective coverage, and truthful capability reporting.

### Task 8: Verify the finished skill and hand it off

**Files:**

- Modify: `skills/openedu-course-authoring/SKILL.md` if verification exposes ambiguity
- Modify: related references/tests only when required by failed checks

- [ ] **Step 1: Run repository-local helper tests**

Run: `node --test skills/openedu-course-authoring/scripts/__tests__/*.test.mjs`

Expected: all helper tests pass.

- [ ] **Step 2: Run the compatibility test**

Run: `pnpm exec vitest run packages/cli/skills/course-spec-generator.skill.test.ts`

Expected: the CLI reference test passes.

- [ ] **Step 3: Validate a real generated fixture**

Use one small fixture from `examples/` or a temporary generated course spec to run `edu compile --validate`, `edu validate`, and `edu lint-content`. Record the exact commands and results in the evaluation notes; do not modify existing examples unless explicitly requested.

- [ ] **Step 4: Perform the plan self-review**

Check that every requirement is covered: both output modes, runtime catalog discovery, compiler/package validation, quality report, source-material support, safe overwrite behavior, portability, and evaluations. Search the plan and skill for unfinished placeholder markers, vague handling instructions, and mismatched artifact or command names.

- [ ] **Step 5: Inspect the final diff**

Run: `git diff -- skills packages/cli/skills docs/superpowers/plans/2026-07-25-openedu-course-authoring-skill.md`

Expected: only the new skill, its focused references/scripts/tests/evals, and the compatibility reference are included; unrelated existing pipeline changes remain untouched.

## Execution Notes

- Do not reset or clean the current working tree; existing pipeline edits and generated output belong to the user.
- Do not commit until the user explicitly requests it, even though the planning workflow commonly suggests commits.
- The first implementation pass should keep the skill under the 500-line `SKILL.md` guidance by moving detail into references.
- Prefer deterministic helper scripts for discovery, validation, and reporting; keep pedagogical generation instructions in the skill where human judgment is required.
