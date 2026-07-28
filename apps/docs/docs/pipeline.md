---
sidebar_position: 9
---

# Pipeline

The `@open-edu/pipeline` package is an AI-driven content generation pipeline that transforms educational source files (PDF, DOCX, PPTX, Markdown, Images, ZIP) into course specification files (`course-spec.md` and `course-spec.json`) through 8 stages, using LLM-based concept detection, activity scaffolding, profile-aware generation, and **widget-based interactive content**.

## Pipeline Stages

```
Source File (PDF, DOCX, PPTX, Markdown, Images, ZIP)
    │
    ▼
┌──────────────────┐
│   1. Extract     │  Pluggable extraction via @llamaindex/liteparse
│                  │  (PDF, DOCX, PPTX, XLSX, images, Markdown)
├──────────────────┤
│   2. Source      │  Taxonomy-driven unit classification (lesson, objective,
│      Inventory   │  example, exercise, etc.) + LLM reclassification
├──────────────────┤
│   3. Concept Map │  LLM generates teachable concepts with source evidence,
│                  │  profile-aware prompts (subject, teaching style)
├──────────────────┤
│   4. Lesson      │  One blueprint per concept: lesson arc steps,
│      Blueprints  │  widget requests, asset requests, question families
├──────────────────┤
│   5. Activity    │  Generates activities from blueprint lesson arcs
│      Generation  │  (hook → observe → practice → mastery → reflection)
├──────────────────┤
│   6. Asset Plan  │  LLM plans visual assets; SVG renderer registry
│                  │  generates accessible SVGs (11 math renderers)
├──────────────────┤
│   7. Validation  │  Pluggable validators (structure, math, science),
│                  │  widget config validation, coverage ledger
├──────────────────┤
│   8. Output      │  Renders course-spec.json + course-spec.md,
│                  │  quality report, pipeline manifest
└──────────────────┘
    │
    ▼
  course-spec.json + course-spec.md
```

## Curriculum Profiles

The pipeline uses **curriculum profiles** to adapt generation behavior per subject. Each profile declares:

- **sourceTaxonomy** — labels used to detect lessons, sections, objectives, examples, exercises
- **conceptKinds** — valid concept types for the subject (e.g., `process`, `classification` for science)
- **widgetCategories** — which widget namespaces are available (`core`, `math`, `science`)
- **assetRendererTypes** — which SVG renderers can be used
- **validatorIds** — which validators should run
- **promptContext** — teaching style and subject-specific guidance for LLM prompts

### Built-in Profiles

| Profile   | Subject     | Widgets               | Renderers    | Validators         |
| --------- | ----------- | --------------------- | ------------ | ------------------ |
| `generic` | any         | `core.*`              | none         | structure          |
| `math`    | mathematics | `core.*`, `math.*`    | 11 SVG types | structure, math    |
| `science` | science     | `core.*`, `science.*` | none         | structure, science |
| `nios`    | nios        | `core.*`              | none         | structure          |

Unknown subjects automatically fall back to the `generic` profile.

## Usage

```bash
# Basic: generate a math course from a PDF
pnpm --filter @open-edu/pipeline curriculum:generate \
  --pdf ./textbook.pdf --level B --subject math

# Generate from a DOCX file
pnpm --filter @open-edu/pipeline curriculum:generate \
  --pdf ./lesson.docx --subject english --profile generic

# Generate from a PowerPoint presentation
pnpm --filter @open-edu/pipeline curriculum:generate \
  --pdf ./slides.pptx --subject biology --profile science

# Specify a profile (auto-resolved from --subject if omitted)
pnpm --filter @open-edu/pipeline curriculum:generate \
  --pdf ./textbook.pdf --subject science --profile science

# Generate a single chapter by scope
pnpm --filter @open-edu/pipeline curriculum:generate \
  --pdf ./textbook.pdf --subject math --scope chapter-index:1 --verbose

# Generate with a different locale and language
pnpm --filter @open-edu/pipeline curriculum:generate \
  --pdf ./textbook.pdf --subject math --language hi --locale hi-IN

# JSON-only output
pnpm --filter @open-edu/pipeline curriculum:generate \
  --pdf ./textbook.pdf --format json

# Resume from intermediate artifacts
pnpm --filter @open-edu/pipeline curriculum:generate \
  --pdf ./textbook.pdf --subject math --resume --verbose

# Dry run (validate without LLM calls or file writes)
pnpm --filter @open-edu/pipeline curriculum:generate \
  --pdf ./textbook.pdf --dry-run
```

### Scope

The `--scope` option controls which part of the PDF is processed:

| Value                | Description                               |
| -------------------- | ----------------------------------------- |
| `all`                | Process the entire document (default)     |
| `chapter-index:N`    | Process chapter N (1-based)               |
| `chapter-id:ID`      | Process chapter matching a source unit ID |
| `pages:A-B`          | Process a specific page range             |
| `source-units:id,id` | Process specific source unit IDs          |

Example: `--scope chapter-index:1` processes only the first chapter.

### Options

| Option              | Default      | Description                                              |
| ------------------- | ------------ | -------------------------------------------------------- |
| `--pdf`             | _(required)_ | Path to the input file (PDF, DOCX, PPTX, Markdown, ZIP)  |
| `--level`           | `B`          | Level code (e.g., A, B, C)                               |
| `--subject`         | `math`       | Subject name (any string)                                |
| `--profile`         | _(auto)_     | Curriculum profile: `generic`, `math`, `science`, `nios` |
| `--curriculum`      | —            | Curriculum adapter (e.g., `nios`)                        |
| `--scope`           | `all`        | Document scope (see [Scope](#scope))                     |
| `--language`        | `en`         | Content language code                                    |
| `--locale`          | `en-IN`      | Locale (e.g., `en-IN`, `hi-IN`)                          |
| `--widget-category` | —            | Repeatable. Filter widgets by category                   |
| `--format`          | `both`       | Output format: `md`, `json`, or `both`                   |
| `--output-dir`      | `./output`   | Custom output directory                                  |
| `--force`           | `false`      | Overwrite existing output                                |
| `--dry-run`         | `false`      | Validate without LLM calls or file writes                |
| `--resume`          | `false`      | Resume from intermediate artifacts                       |
| `--verbose`         | `false`      | Detailed per-stage logging                               |
| `--max-retries`     | `3`          | Max retries per activity generation                      |
| `--llm-provider`    | from env     | LLM provider override                                    |
| `--llm-model`       | from env     | LLM model override                                       |

### Compiling Output

```bash
# Compile the generated JSON course spec
pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js compile \
  course-spec.json -o ./output-package

# Or compile the markdown version
pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js compile \
  course-spec.md -o ./output-package
```

## Recommended LLM Models per Stage

Different pipeline stages have different reasoning requirements. Use a cost-efficient model for classification/generation stages and a stronger reasoning model for structural design stages.

| Stage                 | Reasoning Need                  | Recommended                  |
| --------------------- | ------------------------------- | ---------------------------- |
| `source_inventory`    | Low — text classification       | `gpt-4o-mini`                |
| `concept_map`         | Moderate — structure design     | `gpt-4o` / `claude-sonnet-4` |
| `concept_enrichment`  | Low — metadata extraction       | `gpt-4o-mini`                |
| `lesson_blueprint`    | Moderate — instructional design | `gpt-4o` / `claude-sonnet-4` |
| `asset_plan`          | Low — asset planning            | `gpt-4o-mini`                |
| `activity_generation` | Low — content generation        | `gpt-4o-mini`                |
| `review`              | Moderate — quality review       | `gpt-4o` / `claude-sonnet-4` |

Per-stage overrides via environment variables:

```bash
LLM_STAGE_CONCEPT_MAP_MODEL=gpt-4o
LLM_STAGE_LESSON_BLUEPRINT_MODEL=claude-sonnet-4
LLM_STAGE_LESSON_BLUEPRINT_PROVIDER=openrouter
```

Or via CLI `--stage-model` flags:

```bash
pnpm --filter @open-edu/pipeline curriculum:generate \
  --pdf ./textbook.pdf --stage-model concept_map=gpt-4o
```

## Output Artifacts

| File                                | Description                                  |
| ----------------------------------- | -------------------------------------------- |
| `source-inventory.json`             | Classified source units with taxonomy labels |
| `concept-map.json`                  | Generated concepts with source evidence      |
| `lesson-blueprints.json`            | Per-concept lesson blueprints with arcs      |
| `asset-manifest.json`               | Planned visual assets                        |
| `assets/`                           | Generated SVG files + `manifest.json`        |
| `{level}-{subject}course-spec.json` | Machine-readable course spec                 |
| `{level}-{subject}course-spec.md`   | Human-readable course spec                   |
| `coverage-ledger.json`              | Source-to-output coverage tracking           |
| `quality-report.json`               | Validation results + publish gates           |
| `pipeline-manifest.json`            | Input identity for resume detection          |

## Resume & Artifact Identity

The pipeline computes a config hash from PDF content, profile, scope, language, locale, prompt version, and stage model configs. On `--resume`:

- If the hash matches, intermediate artifacts are reused.
- If the hash changed (different PDF, profile, or scope), all artifacts are regenerated.
- Cross-scope reuse is prevented — full-document artifacts won't be used for a chapter run.

## Configuration

The pipeline reads LLM configuration from environment variables:

| Variable                     | Default       | Description                 |
| ---------------------------- | ------------- | --------------------------- |
| `LLM_PROVIDER`               | `openai`      | Default provider            |
| `LLM_MODEL`                  | `gpt-4o-mini` | Default model               |
| `OPENAI_API_KEY`             | —             | API key                     |
| `LLM_API_KEY`                | —             | Alternative API key         |
| `LLM_MAX_TOKENS`             | `4096`        | Max tokens per call         |
| `LLM_TEMPERATURE`            | `0.3`         | LLM temperature             |
| `LLM_STAGE_{STAGE}_MODEL`    | —             | Per-stage model override    |
| `LLM_STAGE_{STAGE}_PROVIDER` | —             | Per-stage provider override |

## Dependencies

- `@open-edu/llm-config` — LLM provider abstraction (OpenAI + OpenRouter)
- `@llamaindex/liteparse` — Document extraction (PDF, DOCX, PPTX, images, Markdown)
- `zod` — Runtime schema validation
