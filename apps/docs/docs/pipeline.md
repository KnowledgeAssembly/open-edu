---
sidebar_position: 9
---

# Pipeline

The `@open-edu/pipeline` package is an AI-driven content generation pipeline that transforms PDF textbooks into course specification files (`course-spec.md` and/or `course-spec.json`) through 6 stages, using LLM-based concept detection, activity scaffolding, and **widget-based interactive content**.

## Pipeline Stages

```
PDF Textbook
    │
    ▼
┌────────────────┐
│    Extract     │  PDF parsing (pdf-parse) + regex chapter/section detection
├────────────────┤
│     Chunk      │  LLM identifies 3-8 concept candidates per chapter
├────────────────┤
│   Concepts     │  Enrich with pedagogical metadata (difficulty, mastery criteria, dependencies)
├────────────────┤
│  Activities    │  LLM generates 5 scaffolded activities per concept,
│                │  choosing from 14 widgets or text types dynamically
├────────────────┤
│   Validate     │  Schema validation + widget config validation with retry
├────────────────┤
│    Output      │  Render markdown (.md), JSON (.json), or both
└────────────────┘
    │
    ▼
  course-spec.md + course-spec.json
```

### Stage Details

1. **Extract** — Parses the PDF using `pdf-parse`, detects chapter/section boundaries with regex, and separates content from examples and exercises.

2. **Chunk** — Sends chapter content to an LLM which identifies 3-8 concept candidates with learning objectives, core ideas, examples, and prerequisite suggestions.

3. **Generate Concepts** — Enriches each concept candidate with pedagogical metadata: difficulty level (`beginner` / `intermediate` / `advanced`), mastery criteria, accessibility supports, and dependency validation against a known concept registry.

4. **Generate Activities** — The LLM generates 5 scaffolded activity steps per concept, dynamically choosing output types per step:

   | Step                 | Available Types                                      |
   | -------------------- | ---------------------------------------------------- |
   | observe              | `reading`, `widget` (prefer non-interactive widgets) |
   | guided_practice      | `exercise`, `widget` (with hints)                    |
   | independent_practice | `exercise`, `widget` (without hints)                 |
   | mastery_check        | `quiz` (multiple-choice with scenario questions)     |
   | positive_completion  | `reflection` (with real-world activity suggestion)   |

   When the LLM chooses a widget, it selects from **14 built-in widgets**:

   | Widget ID                    | Best For                              |
   | ---------------------------- | ------------------------------------- |
   | `open-edu.matching`          | Matching terms to definitions         |
   | `open-edu.drag-drop`         | Sorting items into categories         |
   | `open-edu.story-question`    | Narrative comprehension               |
   | `open-edu.fraction-visual`   | Parts of a whole, fractions           |
   | `open-edu.chart-reader`      | Bar charts and pictographs            |
   | `open-edu.clock-time`        | Reading/setting clocks                |
   | `open-edu.measurement-scale` | Ruler/thermometer/cylinder            |
   | `open-edu.place-value-chart` | Place value (Indian system)           |
   | `open-edu.grid-area`         | Area/perimeter counting               |
   | `open-edu.visual-counting`   | Counting objects                      |
   | `open-edu.fill-blank`        | Fill-in-the-blank exercises           |
   | `open-edu.sequencing`        | Ordering steps or events              |
   | `open-edu.real-world`        | Real-world scenario + self-assessment |
   | `open-edu.multiple-choice`   | Multiple choice quiz                  |

   Each LLM prompt includes a widget catalog describing available widgets, key config fields, and per-step guidance (e.g., prefer non-interactive widgets for observe, include hints for guided practice).

5. **Validate** — Runs schema validation on each concept-activity pair plus **widget config validation** against the widget's own Zod schema. Invalid widget configs fall back gracefully to `reading` type. Retries with LLM correction up to `maxRetries` times.

6. **Output** — Renders validated pairs into `course-spec.md` (human-readable with widget badges) and/or `course-spec.json` (machine-consumable with full widget configs preserved as first-class objects). Widget configs display a clean badge in markdown instead of raw JSON.

## Usage

```bash
# Generate both markdown and JSON (default)
pnpm --filter @open-edu/pipeline curriculum:generate --pdf ./textbook.pdf --level B --subject math

# JSON-only output
pnpm --filter @open-edu/pipeline curriculum:generate --pdf ./textbook.pdf --format json

# Markdown-only output
pnpm --filter @open-edu/pipeline curriculum:generate --pdf ./textbook.pdf --format md

# Process a single chapter
pnpm --filter @open-edu/pipeline curriculum:generate --pdf ./textbook.pdf --chapter 1 --verbose

# Dry run (validate without writing files)
pnpm --filter @open-edu/pipeline curriculum:generate --pdf ./textbook.pdf --dry-run

# Custom output directory
pnpm --filter @open-edu/pipeline curriculum:generate --pdf ./textbook.pdf --output-dir ./my-course
```

### Options

| Option           | Default        | Description                                 |
| ---------------- | -------------- | ------------------------------------------- |
| `--pdf`          | (required)     | Path to the PDF file                        |
| `--level`        | `B`            | Level code (e.g., B, C)                     |
| `--subject`      | `math`         | Subject name                                |
| `--format`       | `both`         | Output format: `md`, `json`, or `both`      |
| `--chapter`      | (all chapters) | Process only a single chapter               |
| `--output-dir`   | `./output`     | Custom output directory                     |
| `--max-retries`  | `3`            | Max retries per concept on validation error |
| `--llm-provider` | from env       | LLM provider override                       |
| `--llm-model`    | from env       | LLM model override                          |
| `--force`        | `false`        | Overwrite existing output file              |
| `--dry-run`      | `false`        | Validate but don't write files              |
| `--verbose`      | `false`        | Detailed logging per stage                  |
| `--interactive`  | `false`        | Human-in-the-loop checkpoints               |

### Compiling Output

```bash
# Compile the generated JSON course spec (auto-detected)
pnpm --filter @open-edu/course-compiler edu compile course-spec.json -o ./package

# Or compile the markdown version (unchanged)
pnpm --filter @open-edu/course-compiler edu compile course-spec.md -o ./package
```

## Configuration

The pipeline reads LLM configuration from environment variables:

| Variable          | Default       | Description         |
| ----------------- | ------------- | ------------------- |
| `LLM_PROVIDER`    | `openai`      | Provider name       |
| `LLM_MODEL`       | `gpt-4o-mini` | Model name          |
| `OPENAI_API_KEY`  | —             | API key             |
| `LLM_API_KEY`     | —             | Alternative API key |
| `LLM_MAX_TOKENS`  | `4096`        | Max tokens per call |
| `LLM_TEMPERATURE` | `0.3`         | LLM temperature     |

## Dependencies

- `@open-edu/llm-config` — LLM provider abstraction (supports OpenAI + OpenRouter)
- `pdf-parse` — PDF text extraction
- `zod` — Runtime schema validation
