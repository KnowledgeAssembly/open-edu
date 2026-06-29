---
sidebar_position: 9
---

# Pipeline

The `@open-edu/pipeline` package is an AI-driven content generation pipeline that transforms PDF textbooks into `course-spec.md` files through 6 stages, using LLM-based concept detection and activity scaffolding.

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
│  Activities    │  Generate 5 scaffolded activity steps per concept
├────────────────┤
│   Validate     │  Schema validation with automatic retry
├────────────────┤
│    Output      │  Render a single course-spec.md file
└────────────────┘
    │
    ▼
  course-spec.md
```

### Stage Details

1. **Extract** — Parses the PDF using `pdf-parse`, detects chapter/section boundaries with regex, and separates content from examples and exercises.

2. **Chunk** — Sends chapter content to an LLM which identifies 3-8 concept candidates with learning objectives, core ideas, examples, and prerequisite suggestions.

3. **Generate Concepts** — Enriches each concept candidate with pedagogical metadata: difficulty level (`beginner` / `intermediate` / `advanced`), mastery criteria, accessibility supports, and dependency validation against a known concept registry.

4. **Generate Activities** — Creates 5 scaffolded activity steps per concept using purpose-built prompts and exemplars:

   | Step                 | Rendered As         |
   | -------------------- | ------------------- |
   | observe              | Reading             |
   | guided_practice      | Exercise (with hints) |
   | independent_practice | Exercise            |
   | mastery_check        | Quiz (MCQ)          |
   | positive_completion  | Reflection          |

5. **Validate** — Runs schema validation on each concept-activity pair and retries with LLM correction up to `maxRetries` times, passing validation errors back into the generation prompt.

6. **Output** — Renders the validated pairs into a single `course-spec.md` file with YAML frontmatter, module/lesson hierarchy, and activity content.

## Usage

```bash
# Generate curriculum from a PDF textbook
pnpm --filter @open-edu/pipeline curriculum:generate --pdf ./textbook.pdf --level B --subject math

# Process a single chapter
pnpm --filter @open-edu/pipeline curriculum:generate --pdf ./textbook.pdf --chapter 1 --verbose

# Dry run (validate without writing files)
pnpm --filter @open-edu/pipeline curriculum:generate --pdf ./textbook.pdf --dry-run

# Custom output directory
pnpm --filter @open-edu/pipeline curriculum:generate --pdf ./textbook.pdf --output-dir ./my-course
```

### Options

| Option              | Default        | Description                                 |
| ------------------- | -------------- | ------------------------------------------- |
| `--pdf`             | (required)     | Path to the PDF file                        |
| `--level`           | `B`            | Level code (e.g., B, C)                     |
| `--subject`         | `math`         | Subject name                                |
| `--chapter`         | (all chapters) | Process only a single chapter               |
| `--output-dir`      | `./output`     | Custom output directory                     |
| `--max-retries`     | `3`            | Max retries per concept on validation error |
| `--llm-provider`    | from env       | LLM provider override                       |
| `--llm-model`       | from env       | LLM model override                          |
| `--force`           | `false`        | Overwrite existing output file              |
| `--dry-run`         | `false`        | Validate but don't write files              |
| `--verbose`         | `false`        | Detailed logging per stage                  |
| `--interactive`     | `false`        | Human-in-the-loop checkpoints               |

## Configuration

The pipeline reads LLM configuration from environment variables:

| Variable             | Default        | Description          |
| -------------------- | -------------- | -------------------- |
| `LLM_PROVIDER`       | `openai`       | Provider name        |
| `LLM_MODEL`          | `gpt-4o-mini`  | Model name           |
| `OPENAI_API_KEY`     | —              | API key              |
| `LLM_MAX_TOKENS`     | `4096`         | Max tokens per call  |
| `LLM_TEMPERATURE`    | `0.3`          | LLM temperature      |

## Dependencies

- `@open-edu/llm-config` — LLM provider abstraction
- `pdf-parse` — PDF text extraction
- `zod` — Runtime schema validation
