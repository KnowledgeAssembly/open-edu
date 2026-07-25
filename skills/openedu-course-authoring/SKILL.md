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

## Source Material Pipeline

When source materials (PDFs, textbooks) are provided:

1. Detect pipeline availability via `discover-openedu.mjs`
2. Resolve the appropriate profile (`generic`, `math`, `science`, or `nios`)
3. Run: `pnpm --filter @open-edu/pipeline curriculum:generate --pdf <file> --subject <subject>`
4. Preserve pipeline artifacts: source inventory, concept map, blueprint, coverage report
5. Transform pipeline output (`course-spec.md`) into canonical `course-spec.json`
6. If pipeline unavailable: use material as context, mark extraction as manual

See `references/source-materials.md` for full profile selection guide and pipeline options.

## Output Directory Structure

```
course-output/
├── course-brief.md           # Scope, assumptions, lesson outline
├── lesson-blueprints.json    # Detailed plan for each lesson
├── course-spec.json          # Canonical compiler input
├── course-spec.md            # Human-readable export
├── quality-report.json       # Diagnostics and quality findings
└── package/                  # Compiled package (repo mode only)
    ├── package.json          # Package manifest
    ├── workflow.json         # Routing graph
    └── nodes/                # Content nodes
```
