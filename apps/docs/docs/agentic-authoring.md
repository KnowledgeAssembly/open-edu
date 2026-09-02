---
sidebar_position: 5
---

# Agentic Course Authoring

The Open-Edu framework provides an **agentic course-authoring skill** that lets LLM agents generate complete, validated course specifications without manually writing JSON or Markdown. This guide covers using the skill, understanding quality reports, and integrating with your workflow.

## Overview

The `openedu-course-authoring` skill is a portable agent skill located at `skills/openedu-course-authoring/`. It is the recommended way to create new Open-Edu courses programmatically.

**Capabilities:**

- Generate `course-spec.json` and `course-spec.md` from natural language prompts
- Validate specs against the Open-Edu compiler schema
- Select widgets from the live widget catalog (not hardcoded lists)
- Adapt content to one of four learner profiles (neurotypical, autism, school, college) plus educational context (`educationLevel`, `gradeBand`, `curriculum`)
- Author multi-module bundles and module/bundle rewards & cards
- Produce a detailed quality report with pedagogical diagnostics
- Compile, validate, and lint packages (in repository mode)

The skill's reference files (`references/*.md`) are **generated** from `@open-edu/domain-guidance` — do not hand-edit them; regenerate with `pnpm --filter @open-edu/domain-guidance generate` (see `openedu-way/ADR-0009-unified-course-authoring-guidance.md`).

> **Two skill mechanisms:** this guide covers the full `openedu-course-authoring` skill. The CLI also ships a thin reference skill (`packages/cli/skills/course-spec-generator.skill.md`) that `edu generate --prompt` prints for single-shot spec generation without validation or quality checks. Use the full skill for real authoring.

## Modes

The skill auto-detects whether it runs inside an Open-Edu monorepo:

### Portable Mode (Anywhere)

No repository required. Produces:

- `course-spec.json` — canonical compiler input
- `course-spec.md` — human-readable export
- `course-brief.md` — scope, assumptions, lesson outline
- `quality-report.json` — structural diagnostics

Validation is **structural-only** — compiler and package phases are skipped because there is no CLI to invoke.

### Repository Mode (Inside Open-Edu Monorepo)

Detected when `pnpm-workspace.yaml` and `packages/cli/dist/cli.js` exist. Adds:

- Full compilation via `edu compile --validate`
- Package validation via `edu validate`
- Content linting via `edu lint-content`
- Merged quality report with all phase evidence

Repository mode requires the CLI to be built. If `dist/cli.js` is missing, the skill reports a `cli-unavailable` prerequisite (`pnpm --filter @open-edu/cli build`).

## Quick Start

```
1. Skill loads and discovers environment (portable or repository)
2. Agent interviews you about topic, learner level, goals, duration
3. Agent generates a course brief with explicit assumptions
4. Agent creates lesson blueprints with objectives, activities, widgets
5. Agent outputs course-spec.json and validates structurally
6. (Repository mode only) Agent compiles, validates, and lints the package
7. Quality report summarizes all findings
```

## Quality Report

Every run produces a `quality-report.json` with the following schema:

```json
{
  "schemaVersion": 1,
  "success": true,
  "mode": "portable",
  "validationMode": "structural-only",
  "capabilities": {
    "compiler": "absent",
    "cli": "absent"
  },
  "artifacts": {
    "specPath": "./course-spec.json",
    "outputDir": "./course-output"
  },
  "phases": [
    {
      "name": "validation",
      "status": "passed",
      "errors": [],
      "warnings": [],
      "validationMode": "structural-only"
    },
    {
      "name": "quality",
      "status": "passed",
      "errors": [],
      "warnings": []
    }
  ],
  "findings": {
    "errors": [],
    "warnings": [],
    "infos": []
  },
  "summary": {
    "totalPhases": 2,
    "passed": 2,
    "failed": 0,
    "skipped": 0,
    "totalErrors": 0,
    "totalWarnings": 0
  }
}
```

The report preserves evidence from every validation phase — structural checks, compiler output, package validation results, and lint output — without data loss. `success` is `true` only when all phases pass.

### Quality Rubric Dimensions

| Dimension                | Check IDs                   | Description                                                        |
| ------------------------ | --------------------------- | ------------------------------------------------------------------ |
| **Objective Coverage**   | `QC-OBJ-01` — `QC-OBJ-04`   | Activity coverage, assessment signals, max count, measurable verbs |
| **Assessment Alignment** | `QC-ASM-01` — `QC-ASM-03`   | Concept subset check, mastery/quiz presence, difficulty match      |
| **Duration Consistency** | `QC-DUR-01` — `QC-DUR-03`   | Total hours match, lesson max/min bounds                           |
| **Activity Progression** | `QC-PROG-01` — `QC-PROG-03` | Pedagogical steps, sequential order, observe-first                 |
| **Widget Decisions**     | `QC-WDG-01` — `QC-WDG-04`   | Canonical IDs, deprecation, required config, rationale             |
| **Accessibility**        | `QC-ACC-01` — `QC-ACC-04`   | Plain language, keyboard, non-color, chunked content               |
| **Completeness**         | `QC-COM-01` — `QC-COM-03`   | Schema fields, assumptions, coreIdea/examples/misconceptions       |

Each finding has:

- `checkId` — the check that produced it
- `severity` — `error` (fails the run), `warning` (degrades quality), `info` (advisory), `pass`
- `message` — human-readable description

### Widget Validation

Widget IDs are validated against the **live widget catalog** (`packages/core/src/widget-catalog-data.json`), not a hardcoded list. This means:

- New widgets added to the catalog are automatically recognized without code changes
- Legacy `open-edu.*` IDs are resolved to canonical `core.*`/`math.*` IDs where mapped
- Deprecated widgets (marked `status: "deprecated"`) produce errors
- Widget config validation runs when the catalog entry includes a `requiredConfig` schema

When the catalog is unavailable:

- **Portable mode**: `QC-WDG-00` warning — "widget IDs not validated against catalog"
- **Repository mode**: `QC-WDG-00` error — "widget ID validation cannot run"

## Learner Profiles

The skill adapts authoring guidance _and_ generated output to one of four learner profiles:

| Key            | Default | Reference                            |
| -------------- | ------- | ------------------------------------ |
| `neurotypical` | yes     | `references/profile-neurotypical.md` |
| `autism`       | no      | `references/profile-autism.md`       |
| `school`       | no      | `references/profile-school.md`       |
| `college`      | no      | `references/profile-college.md`      |

In the Stage 1 interview, ask for `learnerProfile` (after age/level) and record it under a `## Learner Profile` section in `course-brief.md`. Record educational context separately — `educationLevel` (`school`/`college`), `gradeBand` (school only), `curriculum` — under `## Educational Context`; these compose with the profile as distinct fields, never as composite profiles (`references/profiles.md`). **Never infer the `autism` profile** from age, level, or behavior — only an explicit user statement (otherwise default to `neurotypical`).

## Bundle & Rewards/Cards Authoring

- **Bundles:** use `references/bundle-authoring.md` when authoring a multi-module bundle — module split rules, the `bundle.json` manifest, `dependsOn` ordering, and bundle-level rewards/cards placement.
- **Rewards & cards:** use `references/rewards-cards-authoring.md` when authoring `rewards.json` / `cards.json` — triggers, conditions, scope rules (module vs bundle), and global card-ID uniqueness.

## Source Materials (PDF Pipeline)

When you supply a PDF textbook, the skill integrates with the standalone `open-edu-pipeline` project:

```bash
# Math textbook — auto-resolves the math profile
pnpm curriculum:generate --pdf ./textbook.pdf --subject math

# Single chapter only
pnpm curriculum:generate --pdf ./textbook.pdf --profile science --scope chapter-index:1
```

Pipeline artifacts (source inventory, concept map, blueprint, coverage report) are preserved in the output. The skill transforms `course-spec.md` into canonical `course-spec.json`.

## Architecture

The skill is organized into modular helper scripts:

| Script                     | Responsibility                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| `openedu-adapter.mjs`      | Repository discovery, command resolution (structured argv), command execution via `spawnSync` |
| `widget-catalog.mjs`       | Live catalog loading, ID lookup, deprecation checks, legacy resolution                        |
| `validate-course-spec.mjs` | Structural preflight + optional compiler invocation                                           |
| `validate-package.mjs`     | Orchestrates compile → validate → lint phases                                                 |
| `summarize-quality.mjs`    | Quality rubric across all dimensions                                                          |
| `quality-report.mjs`       | Central report merger — sole writer of `quality-report.json` during orchestration             |

**Key design decisions:**

- Commands use structured `argv` arrays (`['node', '<path>', 'compile', ...]`), never shell-interpolated strings — safe for paths with spaces
- Discovery separates `packagePresent` (directory exists) from `executable` (entrypoint built) — no false capability claims
- The compiler is the authoritative structural validator; helper preflight checks are fast but secondary
- Only `quality-report.mjs` writes the report during orchestration

## Example: Fractions Course

**Prompt:** "Create an Open-Edu course about fractions for 8-10 year old students. 3 lessons."

**Skill workflow:**

1. Discover environment → portable mode (no repo detected)
2. Interview → records age range, topic, lesson count
3. Course brief → `course-brief.md` with explicit assumptions
4. Lesson blueprints → 3 lessons with CPA-style progression
5. Generate → `course-spec.json` + `course-spec.md`
6. Quality report → `quality-report.json` with structural diagnostics

**Output:**

```
course-output/
├── course-brief.md           # Scope, audience, assumptions
├── lesson-blueprints.json    # Per-lesson activity plans
├── course-spec.json          # Canonical compiler input
├── course-spec.md            # Human-readable export
└── quality-report.json       # Diagnostics and findings
```

In repository mode, the output would also include `package/` with the compiled Open-Edu package.

## Evaluation Framework

The skill includes 15 evaluation scenarios that verify correctness:

| Eval                           | Mode       | Description                                      |
| ------------------------------ | ---------- | ------------------------------------------------ |
| `eval-portable-fractions`      | Portable   | Fractions course for 8-10 year olds              |
| `eval-portable-javascript`     | Portable   | Intro JavaScript for adult beginners             |
| `eval-portable-non-stem`       | Portable   | French greetings language course                 |
| `eval-repo-package`            | Repository | Complete package compilation                     |
| `eval-repo-pdf`                | Repository | PDF pipeline with math profile                   |
| `eval-edge-missing-level`      | Any        | Asks for clarification on missing inputs         |
| `eval-edge-unsupported-widget` | Repository | Graceful fallback for unknown widgets            |
| `eval-edge-existing-output`    | Any        | Detects and asks before overwriting              |
| `eval-edge-multilingual`       | Portable   | Spanish (es-MX) locale support                   |
| `eval-bundle-rewards-cards`    | Portable   | Bundle authoring with rewards & cards            |
| `eval-module-rewards-cards`    | Portable   | Module-level rewards & cards                     |
| `eval-autism-fractions`        | Portable   | Fractions course adapted for the autism profile  |
| `eval-neurotypical-fractions`  | Portable   | Fractions course for the default profile         |
| `eval-school-fractions`        | Portable   | Fractions course adapted for the school profile  |
| `eval-college-fractions`       | Portable   | Fractions course adapted for the college profile |

See `skills/openedu-course-authoring/evals/README.md` for running instructions. The manifest (`evals/evals.json`) is validated by `node --test skills/openedu-course-authoring/evals/schema.test.mjs`.

## Reference Documents

The skill and its references live in the repository at `skills/openedu-course-authoring/` (outside the docs tree, so the paths below are shown as code, not links):

- `SKILL.md` — skill definition and critical rules
- `references/profiles.md` + `references/profile-{neurotypical,autism,school,college}.md` — learner profiles
- `references/artifact-contract.md` — exact JSON schema (generated from `@open-edu/domain-guidance`)
- `references/authoring-workflow.md` — staged generation sequence, activity progression, widget selection rules
- `references/bundle-authoring.md` — multi-module bundle authoring (module split, `bundle.json`, `dependsOn`, bundle rewards/cards)
- `references/rewards-cards-authoring.md` — `rewards.json` / `cards.json` triggers, conditions, scope rules
- `references/quality-rubric.md` — quality rubric dimensions and check IDs (generated from `@open-edu/domain-guidance`)
- `references/repository-adapter.md` — discovery, commands, catalog loading, pipeline integration
- `references/source-materials.md` — PDF and curriculum document handling via the pipeline

Related published guides: [Package Authoring Guide](./package-authoring.md), [Course Compiler](./course-compiler.md), [Pipeline](./pipeline.md).
