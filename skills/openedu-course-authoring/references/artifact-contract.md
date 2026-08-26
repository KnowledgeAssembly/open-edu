# Artifact Contract

Every run of the Open-Edu Course Authoring skill produces an output directory with these artifacts:

```
course-output/
├── course-brief.md
├── lesson-blueprints.json
├── course-spec.json
├── course-spec.md
├── quality-report.json
└── package/                 # only when Open-Edu tooling is detected
```

## Canonical Artifact

`course-spec.json` is the single source of truth. It conforms to the schema defined by `packages/course-compiler/src/parser/json-input.ts`.

### Top-Level Schema

| Field         | Type                    | Required | Description                |
| ------------- | ----------------------- | -------- | -------------------------- |
| `format`      | `"openedu-course-spec"` | yes      | Fixed value                |
| `version`     | `1`                     | yes      | Fixed numeric literal      |
| `generatedAt` | ISO 8601 string         | yes      | Timestamp of generation    |
| `metadata`    | object                  | yes      | Course-level metadata      |
| `lessons`     | `LessonObject[]`        | yes      | Non-empty array of lessons |

### Metadata Schema

| Field            | Type                                         | Required | Description                  |
| ---------------- | -------------------------------------------- | -------- | ---------------------------- |
| `title`          | string                                       | yes      | Course title                 |
| `description`    | string                                       | yes      | Course description           |
| `author`         | string                                       | no       | Author name                  |
| `version`        | string                                       | no       | Course version               |
| `difficulty`     | `"beginner" \| "intermediate" \| "advanced"` | no       | Difficulty level             |
| `estimatedHours` | number                                       | no       | Total estimated hours        |
| `generated`      | boolean                                      | yes      | Always `true` for LLM output |

### Lesson Schema

| Field              | Type                | Required | Description                            |
| ------------------ | ------------------- | -------- | -------------------------------------- |
| `id`               | string (kebab-case) | yes      | Unique lesson ID                       |
| `title`            | string              | yes      | Human-readable lesson title            |
| `objectives`       | `string[]`          | yes      | Non-empty array of learning objectives |
| `coreIdea`         | string              | yes      | Main concept in 1-3 sentences          |
| `examples`         | `string[]`          | yes      | Illustrative examples                  |
| `misconceptions`   | `string[]`          | yes      | Common misconceptions to address       |
| `estimatedMinutes` | number              | no       | Estimated duration in minutes          |
| `activities`       | `ActivityObject[]`  | yes      | Ordered array of activities            |

### Activity Schema

| Field          | Type                                                                                                   | Required | Description                                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `step`         | `"observe" \| "guided_practice" \| "independent_practice" \| "mastery_check" \| "positive_completion"` | yes      | Pedagogical step role                                                                                                                                           |
| `order`        | number                                                                                                 | yes      | Sequential order (starting at 1)                                                                                                                                |
| `type`         | `"reading" \| "exercise" \| "quiz" \| "reflection" \| "widget"`                                        | yes      | Activity type                                                                                                                                                   |
| `description`  | string                                                                                                 | yes      | Short description of the activity                                                                                                                               |
| `instructions` | string                                                                                                 | no       | For reading/exercise types: the content or instructions                                                                                                         |
| `examples`     | `string[]`                                                                                             | no       | For exercise types: example problems                                                                                                                            |
| `questions`    | `MCQQuestion[]`                                                                                        | no       | For quiz type: array with exactly 4-option MCQs                                                                                                                 |
| `widgetId`     | string                                                                                                 | no       | For widget type: canonical widget ID                                                                                                                            |
| `widgetConfig` | `Record<string, unknown>`                                                                              | no       | For widget type: widget-specific config                                                                                                                         |
| `widgetRef`    | `WidgetReference`                                                                                      | no       | For community widgets: `{ id, version, source, integrity, fallback }` — see [Community Widgets Developer Guide](../../apps/docs/docs/widgets/community-widgets) |

### MCQQuestion Schema

| Field          | Type        | Required | Description                        |
| -------------- | ----------- | -------- | ---------------------------------- |
| `question`     | string      | yes      | Question text                      |
| `options`      | `string[4]` | yes      | Exactly 4 options                  |
| `correctIndex` | 0-3         | yes      | Zero-based index of correct answer |

## ID Generation Rules

- Lesson IDs: kebab-case, unique within course. Pattern: `{course-prefix}-{number}` or a descriptive slug.
- Activity IDs: auto-generated by compiler from step + description. Not manually specified in JSON.

## Failure Semantics

- Compiler errors (schema validation failures, duplicate IDs, broken references) fail the run.
- Compiler warnings (missing objectives, empty lessons) are reported but do not fail.
- A run is successful only when `course-spec.json` exists and every required validation gate passes.

## Bundle-level artifacts

A multi-module bundle is a directory with its own manifest and module subdirectories. Each module is a standard Open-Edu package.

| Field     | Type   | Required | Description                                         |
| --------- | ------ | -------- | --------------------------------------------------- |
| `id`      | string | yes      | Kebab-case, unique                                  |
| `title`   | string | yes      | Bundle title                                        |
| `version` | string | yes      | Semver (`1.0.0`)                                    |
| `author`  | string | yes      | Author name                                         |
| `modules` | array  | yes      | Non-empty array of `{ id, title, path, dependsOn }` |
| `rewards` | string | no       | Relative path to bundle-root `rewards.json`         |
| `cards`   | string | no       | Relative path to bundle-root `cards.json`           |

Bundle-root `rewards.json`/`cards.json` follow the same schemas as module-level files (see below). `rewards`/`cards` paths must stay inside the bundle directory — never absolute paths or `../` escapes.

## Rewards/cards artifacts

Both module packages and bundles may include optional `rewards.json` and `cards.json` files. The schemas mirror `packages/schemas/src/rewards.ts` and `packages/schemas/src/cards.ts`.

### rewards.json

| Field      | Type  | Required | Description                 |
| ---------- | ----- | -------- | --------------------------- |
| `triggers` | array | yes      | Non-empty array of triggers |

Each trigger:

| Field     | Type   | Required | Description                                 |
| --------- | ------ | -------- | ------------------------------------------- |
| `onEvent` | string | yes      | Telemetry event name (e.g. `node_complete`) |
| `rewards` | array  | yes      | Non-empty array of reward actions           |

Each reward action is a discriminated union on `action`:

- `{ action: "badge.award", badge: string, condition?: Condition }`
- `{ action: "webhook", url: string, condition?: Condition }`
- `{ action: "script", exec: string, condition?: Condition }`

`condition` belongs on the **reward**, not the trigger. See `rewards-cards-authoring.md` for condition scope rules.

### cards.json

| Field   | Type  | Required | Description                         |
| ------- | ----- | -------- | ----------------------------------- |
| `cards` | array | yes      | Non-empty array of card definitions |

Each card requires `id` (globally unique across the bundle), `title`, `category`, `type`, `summary`, and `unlock` (a condition). `level`/`maximumLevel` default to 1.

## Quality Report Format

`quality-report.json` is produced by `quality-report.mjs` (the central orchestrator and sole writer) and follows this schema:

```json
{
  "schemaVersion": 1,
  "success": true,
  "mode": "portable|repository",
  "validationMode": "structural-only|compiler",
  "capabilities": {
    "compiler": true | false,
    "cli": true | false,
    "executable": true | false,
    "widgetCatalog": true | false,
    "pipeline": true | false,
    "examples": true | false
  },
  "artifacts": {
    "courseSpecJson": "path/to/course-spec.json",
    "courseSpecMd": "path/to/course-spec.md",
    "courseBrief": "path/to/course-brief.md",
    "lessonBlueprints": "path/to/lesson-blueprints.json",
    "packageDir": "path/to/package" | null,
    "pipelineArtifacts": []
  },
  "phases": [
    {
      "name": "structural-validation|compiler-compile|compiler-validate|compiler-lint",
      "status": "passed|failed|skipped",
      "durationMs": 1234,
      "errors": ["..."],
      "warnings": ["..."],
      "output": "..."
    }
  ],
  "findings": {
    "errors": [{"message": "...", "phase": "...", "detail": "..."}],
    "warnings": [{"message": "...", "phase": "...", "detail": "..."}],
    "infos": [{"message": "...", "phase": "...", "detail": "..."}]
  },
  "summary": {
    "totalPhases": 4,
    "phasesPassed": 3,
    "phasesFailed": 0,
    "phasesSkipped": 1,
    "totalErrors": 0,
    "totalWarnings": 3,
    "overallStatus": "passed|failed|partial",
    "widgetCatalogLoaded": true,
    "rubricDimensions": ["objectives", "alignment", "accessibility", "inclusion", "widgets", "completeness"],
    "sourceMaterialProvenance": {
      "sourceFile": "textbook.pdf" | null,
      "pipelineCommand": "pnpm --filter @open-edu/pipeline ...",
      "pipelineProfile": "math|science|generic|nios" | null,
      "pipelineStatus": "executed|fallback|unavailable"
    }
  }
}
```

### Schema Notes

- `schemaVersion`: always `1`
- `success`: `true` only if all phases pass (no errors in `findings.errors`)
- `mode`: matches the discovery mode (`"portable"` or `"repository"`)
- `validationMode`: `"structural-only"` in portable mode (compiler phases skipped); `"compiler"` in repository mode
- `capabilities.executable`: distinct from `capabilities.cli` — `cli` means the package directory exists; `executable` means `dist/cli.js` is present
- `phases`: records each validation gate with timing and output. Portable mode will have `"skipped"` for compiler phases
- `findings`: deduplicated across all phases, categorized by severity
- `summary.rubricDimensions`: catalog-backed dimensions evaluated by `summarize-quality.mjs`
- `summary.sourceMaterialProvenance`: preserves pipeline command evidence and source-material origin
