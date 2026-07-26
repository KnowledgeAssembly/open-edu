# Open-Edu Course Authoring Skill Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the implementation gaps in the Open-Edu course-authoring skill so its portable and repository modes make truthful capability claims, use live Open-Edu metadata, validate against the real compiler, preserve all diagnostics, and run through standard skill evaluations.

**Architecture:** Keep the skill instruction-first, but centralize repository discovery, command resolution, command execution, and catalog loading in a reusable JavaScript adapter. Make the course compiler the authoritative structural/package validator, retain lightweight preflight checks for fast feedback, and merge preflight, compiler, package, lint, and pedagogical findings into one versioned quality report without overwriting earlier evidence. Keep all behavior local to `skills/openedu-course-authoring/`; update the CLI reference and evaluation data only for compatibility.

**Tech Stack:** Node.js ESM, `node:test`, `@open-edu/course-compiler`, `@open-edu/core`, `pnpm`, Open-Edu generated widget metadata, Markdown skill references, and the standard skill-creator eval schema.

---

## Scope and Current Constraints

- Preserve unrelated working-tree changes in `packages/pipeline/src/` and generated `output/`.
- Do not replace the Open-Edu compiler schema with a second hand-maintained schema. The helper may preflight common errors, but compiler validation remains authoritative.
- Do not hardcode the widget catalog in quality logic. Read `packages/core/src/widget-catalog-data.json` when available and report catalog-unavailable instead of inventing IDs.
- Do not claim a command is available merely because its package directory exists. Discovery must identify how the command will actually run: installed binary, built CLI entrypoint, or package script.
- Do not commit changes unless explicitly requested by the user.

## Files and Responsibilities

```text
skills/openedu-course-authoring/
├── SKILL.md                         # Portable/repository workflow and truthful gates
├── references/                       # Contracts, commands, rubric, and source handling
├── scripts/
│   ├── openedu-adapter.mjs           # Shared discovery, command resolution, execution
│   ├── widget-catalog.mjs            # Live catalog loading and ID/deprecation helpers
│   ├── discover-openedu.mjs          # JSON CLI around the adapter
│   ├── validate-course-spec.mjs      # Preflight + compiler validation
│   └── summarize-quality.mjs         # Merge findings without data loss
└── evals/evals.json                  # Standard skill-creator evaluation schema
```

Tests remain next to the scripts under `scripts/__tests__/`. The implementation should either keep the existing public exports (`discoverOpenEdu`, `validateCourseSpec`, `summarizeQuality`) or update all tests and references together with one documented API change.

### Task 1: Add a shared Open-Edu adapter and truthful command resolution

**Files:**

- Create: `skills/openedu-course-authoring/scripts/openedu-adapter.mjs`
- Modify: `skills/openedu-course-authoring/scripts/discover-openedu.mjs`
- Create: `skills/openedu-course-authoring/scripts/__tests__/openedu-adapter.test.mjs`
- Modify: `skills/openedu-course-authoring/scripts/__tests__/discover-openedu.test.mjs`

- [ ] **Step 1: Write failing adapter tests**

Cover these cases:

```text
portable directory → mode=portable, no executable capabilities
repo with package directories but no built CLI → compiler package detected, executable=false
repo with packages/cli/dist/cli.js → CLI commands resolve to node <absolute-cli-path>
repo with package scripts but no dist → command resolution returns a build prerequisite
commands with spaces in paths → arguments remain safely separated
```

Assert that the result distinguishes `packagePresent`, `executable`, `command`, and `prerequisites`; never infer executable availability from directory existence alone.

- [ ] **Step 2: Implement adapter APIs**

Define and export stable functions:

```js
discoverRepository(startDir);
resolveOpenEduCommands(discovery);
runOpenEduCommand(command, args, options);
```

`resolveOpenEduCommands` should prefer an installed `edu` binary, then a built CLI entrypoint, then a package-local build command plus entrypoint. It must return structured argv arrays, not interpolated shell strings. `runOpenEduCommand` must capture `status`, `stdout`, `stderr`, `command`, and `durationMs` without invoking a shell.

- [ ] **Step 3: Refactor discovery to use the adapter**

Keep the existing JSON shape compatible where possible, add executable/prerequisite fields, and resolve paths with `pathToFileURL`/absolute paths rather than string comparisons. Detect the actual catalog file as an array and record whether it parses successfully.

- [ ] **Step 4: Run focused adapter tests**

Run: `node --test skills/openedu-course-authoring/scripts/__tests__/openedu-adapter.test.mjs skills/openedu-course-authoring/scripts/__tests__/discover-openedu.test.mjs`

Expected: all tests pass, including a fixture repository with no executable CLI.

### Task 2: Load the live widget catalog and remove hardcoded widget authority

**Files:**

- Create: `skills/openedu-course-authoring/scripts/widget-catalog.mjs`
- Modify: `skills/openedu-course-authoring/scripts/openedu-adapter.mjs`
- Modify: `skills/openedu-course-authoring/scripts/summarize-quality.mjs`
- Modify: `skills/openedu-course-authoring/scripts/__tests__/summarize-quality.test.mjs`
- Create: `skills/openedu-course-authoring/scripts/__tests__/widget-catalog.test.mjs`

- [ ] **Step 1: Write catalog-loader tests**

Test loading a valid array catalog, malformed JSON, an absent catalog, deprecated entries, legacy aliases, and unknown IDs. Assert that malformed/unavailable catalogs produce an explicit unavailable result rather than an empty “valid” catalog.

- [ ] **Step 2: Implement catalog loading**

Export:

```js
loadWidgetCatalog(catalogPath);
getWidgetById(catalog, id);
isCanonicalWidget(catalog, id);
isDeprecatedWidget(catalog, id);
```

Use the catalog’s `id`, `status`, `deprecated`, `replacement`, and `legacyId` fields. Keep legacy aliases as metadata; do not silently rewrite a requested ID in the quality report.

- [ ] **Step 3: Refactor quality checks to accept catalog input**

Change `summarizeQuality(outputDir, validationResult, options)` so `options.catalogPath` or a preloaded catalog is required in repository mode. If no catalog is available, emit `QC-WDG-00` with severity `warning` in portable mode and `error` only when repository mode explicitly requires widget validation.

- [ ] **Step 4: Remove the embedded widget ID sets**

Delete the static canonical/deprecated/legacy maps from `summarize-quality.mjs`. Add tests proving a fixture catalog containing a new widget ID is accepted without changing source code, and an unknown/deprecated ID is reported.

- [ ] **Step 5: Run catalog and quality tests**

Run: `node --test skills/openedu-course-authoring/scripts/__tests__/widget-catalog.test.mjs skills/openedu-course-authoring/scripts/__tests__/summarize-quality.test.mjs`

Expected: quality decisions follow the supplied catalog, not a hardcoded list.

### Task 3: Make course-spec validation compiler-authoritative and failure-safe

**Files:**

- Modify: `skills/openedu-course-authoring/scripts/validate-course-spec.mjs`
- Modify: `skills/openedu-course-authoring/scripts/openedu-adapter.mjs`
- Modify: `skills/openedu-course-authoring/scripts/__tests__/validate-course-spec.test.mjs`

- [ ] **Step 1: Add failing tests for actual compiler integration**

Add tests using a fake executable command that returns success and failure. Assert that:

```text
compilerAvailable=true only when an executable command is resolved
compiler failure makes result.success=false
compiler stdout/stderr/status are returned in diagnostics and report.commands
no compiler keeps structural-only status explicit, not falsely successful repository mode
```

Add malformed shapes (`lessons: [null]`, `activities: [null]`) and a missing output directory test; all must return diagnostics without throwing.

- [ ] **Step 2: Align preflight checks with the compiler contract**

Keep preflight checks fast, but make compiler-required fields errors: non-empty `objectives`, `coreIdea`, `examples`, `misconceptions`, and `activities`; valid activity steps/types; quiz questions with exactly four options and an in-range `correctIndex`; numeric finite durations; and object-shaped lesson/activity entries. Use guarded record checks before reading properties.

- [ ] **Step 3: Implement compiler invocation**

Extend the API to:

```js
validateCourseSpec(specPath, outputDir, (options = {}));
```

When `options.command` is supplied, invoke it with the spec path, output directory, and `--validate` through `runOpenEduCommand`. When the compiler is unavailable, return `validationMode: "structural-only"`; when it runs, return `validationMode: "compiler"` and merge compiler diagnostics into the result.

- [ ] **Step 4: Make report writing safe and deterministic**

Create `outputDir` recursively before writing. Include `validationMode`, `compilerAvailable`, `commands`, `errors`, `warnings`, `data`, and a stable `success` calculation. Preserve command output without embedding volatile timestamps in diagnostic identity.

- [ ] **Step 5: Run validator tests**

Run: `node --test skills/openedu-course-authoring/scripts/__tests__/validate-course-spec.test.mjs`

Expected: structural, compiler-success, compiler-failure, malformed-input, and missing-directory cases pass.

### Task 4: Add real repository package validation and preserve command evidence

**Files:**

- Create: `skills/openedu-course-authoring/scripts/validate-package.mjs`
- Create: `skills/openedu-course-authoring/scripts/__tests__/validate-package.test.mjs`
- Modify: `skills/openedu-course-authoring/scripts/openedu-adapter.mjs`
- Modify: `skills/openedu-course-authoring/scripts/validate-course-spec.mjs`
- Modify: `skills/openedu-course-authoring/references/repository-adapter.md`

- [ ] **Step 1: Write package-validation tests**

Use fake command runners to verify compile, package validate, and lint are run in order; any non-zero status fails the aggregate result; warnings are retained; and no later command runs after compilation fails.

- [ ] **Step 2: Implement package validation orchestration**

Export:

```js
validateCompiledPackage({ specPath, packageDir, commands, outputDir });
```

Run compiler/package validation/lint through structured argv, verify `package.json` or `bundle.json`, and return `phases[]`, `commands[]`, and `success`. Never invoke `edu validate` when the CLI is not executable.

- [ ] **Step 3: Integrate package phases into the report input**

Pass package results to the report merger instead of writing a second independent report. Record skipped phases with reasons such as `cli-unavailable` or `compile-failed`.

- [ ] **Step 4: Update repository instructions**

Document actual command resolution, build prerequisites, package manifest checks, and the distinction between “suggested command” and “executed command.” Correct any statements that imply package-directory detection is sufficient.

### Task 5: Complete the quality rubric implementation

**Files:**

- Modify: `skills/openedu-course-authoring/scripts/summarize-quality.mjs`
- Modify: `skills/openedu-course-authoring/references/quality-rubric.md`
- Modify: `skills/openedu-course-authoring/scripts/__tests__/summarize-quality.test.mjs`

- [ ] **Step 1: Define machine-readable blueprint mappings**

Extend blueprint activities with optional `objectiveIds`, `assessmentObjectiveIds`, `feedback`, `accessibility`, and `conceptsIntroduced` fields. Preserve compatibility with existing blueprints by treating absent mappings as `unknown` and emitting a warning rather than claiming coverage.

- [ ] **Step 2: Implement missing objective and assessment checks**

Add `QC-OBJ-02`, `QC-ASM-01`, and `QC-ASM-03`. Verify each objective maps to an activity and assessment signal; verify assessment concept references are a subset of introduced concepts; and use course difficulty metadata when available. Do not attempt semantic NLP claims without explicit blueprint metadata.

- [ ] **Step 3: Implement duration and progression checks**

Add `QC-DUR-01`, `QC-PROG-01`, and `QC-PROG-03`. Compare summed lesson minutes with `metadata.estimatedHours`, require sequential orders, and report missing pedagogical steps with a warning because short courses may intentionally omit them.

- [ ] **Step 4: Implement catalog-backed widget checks**

Add `QC-WDG-03` only when a machine-readable widget schema is available. If the catalog has metadata but no config schema, report `unknown`/warning rather than pretending required fields were validated. Preserve widget rationale from the blueprint in findings.

- [ ] **Step 5: Implement accessibility/inclusion checks with explicit evidence**

Check for non-empty instructions, alternatives for widget-only activities, non-color-only wording, and declared keyboard/screen-reader support from catalog metadata. Mark unavailable checks as warnings with evidence, not passes.

- [ ] **Step 6: Add tests for every rubric family**

Add fixtures for uncovered objectives, assessment concept leakage, duration mismatch, missing progression, catalog-provided accessibility metadata, missing widget config schema, and widget-only lessons without alternatives.

### Task 6: Merge reports without data loss

**Files:**

- Create: `skills/openedu-course-authoring/scripts/quality-report.mjs`
- Create: `skills/openedu-course-authoring/scripts/__tests__/quality-report.test.mjs`
- Modify: `skills/openedu-course-authoring/scripts/validate-course-spec.mjs`
- Modify: `skills/openedu-course-authoring/scripts/summarize-quality.mjs`
- Modify: `skills/openedu-course-authoring/references/artifact-contract.md`

- [ ] **Step 1: Write report-merger tests**

Assert that a final report retains structural diagnostics, compiler output, package validation, lint output, quality findings, skipped-phase reasons, capability state, and artifact paths. Assert that `success` is false if any error phase exists.

- [ ] **Step 2: Define the final report schema**

Use this top-level shape:

```json
{
  "schemaVersion": 1,
  "success": true,
  "mode": "portable|repository",
  "validationMode": "structural-only|compiler",
  "capabilities": {},
  "artifacts": {},
  "phases": [],
  "findings": [],
  "summary": {}
}
```

Each phase must include `name`, `status`, `errors`, `warnings`, `command`, `stdout`, `stderr`, and `skippedReason` where applicable.

- [ ] **Step 3: Implement one final writer**

Make `quality-report.mjs` the only module that writes `quality-report.json`. Change the validator and summarizer to return report fragments; the orchestration path merges them and writes once. Keep a CLI mode that can merge an existing validation report and blueprint.

- [ ] **Step 4: Run report tests**

Run: `node --test skills/openedu-course-authoring/scripts/__tests__/quality-report.test.mjs`

Expected: no compiler/package evidence is lost when pedagogical findings are added.

### Task 7: Fix skill portability, source-material documentation, and user-facing contracts

**Files:**

- Modify: `skills/openedu-course-authoring/SKILL.md`
- Modify: `skills/openedu-course-authoring/references/authoring-workflow.md`
- Modify: `skills/openedu-course-authoring/references/repository-adapter.md`
- Modify: `skills/openedu-course-authoring/references/source-materials.md`
- Modify: `skills/openedu-course-authoring/references/artifact-contract.md`

- [ ] **Step 1: Make helper invocation installation-safe**

Document that helper paths resolve relative to the installed skill directory, not the current working directory. Provide a command form using an absolute skill path or a clearly defined `OPENEDU_SKILL_DIR` variable; do not assume the repository contains the installed skill.

- [ ] **Step 2: Correct mode and success semantics**

State that repository mode requires executable compiler/package capabilities, not merely detected directories. State that portable mode can produce a spec but must report structural-only validation and skipped compiler/package phases.

- [ ] **Step 3: Correct source profile guidance**

Make profile examples match the actual pipeline registry and CLI flags. If `mathematics` is not an alias for `math`, document `--subject math` or add a separately tested alias before documenting it. Require the report to preserve source-material provenance and pipeline command evidence.

- [ ] **Step 4: Document widget configuration limits**

Distinguish catalog metadata from executable widget config schemas. The skill may choose IDs from the catalog, but it must only claim config validation when an actual schema is loaded.

### Task 8: Make evaluations compatible with skill-creator and add regression assertions

**Files:**

- Modify: `skills/openedu-course-authoring/evals/evals.json`
- Modify: `skills/openedu-course-authoring/evals/README.md`
- Create: `skills/openedu-course-authoring/evals/schema.test.mjs`

- [ ] **Step 1: Convert evaluation metadata to the standard schema**

Use the documented top-level shape:

```json
{
  "skill_name": "openedu-course-authoring",
  "evals": [
    {
      "id": 1,
      "prompt": "...",
      "expected_output": "...",
      "files": []
    }
  ]
}
```

Preserve mode, checks, and expected behavior inside `expected_output` or an explicitly documented extension field that the runner ignores safely.

- [ ] **Step 2: Add schema validation tests**

Assert unique IDs, non-empty prompts, string `expected_output`, array `files`, and coverage for portable, repository, source-material, unsupported-widget, missing-input, multilingual, and existing-output cases.

- [ ] **Step 3: Update evaluation README**

Document how to run with-skill and baseline evaluations, how to grade compiler/package assertions, and which checks require qualitative review. Include the new report phase assertions and truthful capability assertions.

- [ ] **Step 4: Run eval schema tests**

Run: `node --test skills/openedu-course-authoring/evals/schema.test.mjs`

Expected: the eval file is consumable by the standard skill-creator workflow.

### Task 9: Full verification and implementation handoff

**Files:**

- Modify: only files required by failed verification

- [ ] **Step 1: Run all skill helper tests**

Run: `node --test skills/openedu-course-authoring/scripts/__tests__/*.test.mjs skills/openedu-course-authoring/evals/schema.test.mjs`

Expected: all tests pass with no unhandled exceptions.

- [ ] **Step 2: Run a real portable fixture**

Generate or use a temporary spec outside the repository and verify that the final report explicitly says `validationMode: "structural-only"` and lists compiler/package phases as skipped.

- [ ] **Step 3: Run a repository fixture**

Use a temporary output directory in this repository, run the resolved compiler/package/lint phases, and verify the final report contains command status and package artifact paths. Do not overwrite an existing example or the user’s current `output/` directory.

- [ ] **Step 4: Run the skill-creator eval workflow**

Run the standard with-skill and baseline evaluations using the corrected `evals/evals.json`; capture timing and grading data according to the skill-creator workflow. Do not treat passing structural assertions as proof of pedagogical quality.

- [ ] **Step 5: Perform final self-review**

Search for hardcoded widget ID sets, unexecuted “validation” claims, shell-interpolated commands, report writers other than `quality-report.mjs`, unfinished placeholder markers, and references to APIs not defined in the plan. Confirm every review finding maps to a completed task.

- [ ] **Step 6: Inspect the diff and report status**

Run:

```bash
git diff -- skills docs/superpowers/plans/2026-07-26-openedu-course-authoring-skill-hardening.md
git status --short
```

Expected: only skill-hardening files are changed by the implementation, while pre-existing pipeline edits remain untouched.

## Verification Matrix

| Review gap                            | Covered by |
| ------------------------------------- | ---------- |
| Compiler never invoked                | Tasks 1, 3 |
| False executable capability detection | Tasks 1, 4 |
| Hardcoded widget catalog              | Task 2     |
| Lost compiler/report evidence         | Task 6     |
| Incomplete quality rubric             | Task 5     |
| Unsafe/malformed input handling       | Task 3     |
| Relative installed-skill paths        | Task 7     |
| Source profile documentation mismatch | Task 7     |
| Non-standard eval schema              | Task 8     |
| Missing end-to-end proof              | Task 9     |

## Execution Notes

- Implementation should use `superpowers:subagent-driven-development` or `superpowers:executing-plans` as directed by the plan header.
- Keep commits scoped by task if the user later authorizes commits; use conventional commit messages.
- Do not claim repository-mode success when only structural validation ran.
