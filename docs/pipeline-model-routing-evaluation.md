# Pipeline Model Routing Evaluation

## Legacy Single-Model Usage

Set `LLM_MODEL=gpt-4o-mini` and all 7 stages use that model through the legacy fallback in `resolveStageConfigs`.

## Stage Overrides

Per-stage control via CLI flags or environment variables:

```bash
# CLI overrides (repeatable)
--stage-model source_inventory=gpt-5.4-mini
--stage-model concept_map=gpt-5.4
--stage-provider concept_map=openrouter
--stage-temperature review=0.5
--stage-max-tokens activity_generation=8192

# Environment variables
LLM_STAGE_SOURCE_INVENTORY_MODEL=gpt-5.4-mini
LLM_STAGE_CONCEPT_MAP_MODEL=gpt-5.4
LLM_STAGE_REVIEW_MODEL=gpt-5.4
```

Configuration precedence: CLI stage override > stage environment variable > legacy `LLM_MODEL`/`LLM_PROVIDER` > safe defaults.

## Artifacts

| File                     | Description                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| `source-inventory.json`  | Source units with page number, type, confidence, and required coverage flags                              |
| `concept-map.json`       | Concepts with source evidence, dependencies, representations, and enrichment metadata                     |
| `lesson-blueprints.json` | Per-concept lesson plans with arc steps, asset requests, and widget requests                              |
| `assets/manifest.json`   | Asset manifest with renderer type, parameters, concept IDs, and source references                         |
| `course-spec.json`       | OpenEdu course specification (compiler-compatible JSON)                                                   |
| `course-spec.md`         | Human-readable Markdown export with YAML frontmatter                                                      |
| `coverage-ledger.json`   | Source-to-concept-to-activity coverage with statuses (covered/partially_covered/uncovered/not_applicable) |
| `quality-report.json`    | Stage model usage, retries, duration, coverage percentages, validation counts, publish gate results       |

## Quality Gates

Output reported as `complete` only when ALL gates pass:

| Gate               | Criterion                                              |
| ------------------ | ------------------------------------------------------ |
| Required Coverage  | 100% of required source units covered                  |
| Math Correctness   | All numerical answers pass deterministic validation    |
| Widget Validity    | All widget IDs/configs are canonical and schema-valid  |
| Asset Completeness | Every visual concept has at least one accessible asset |
| Concept Coverage   | Every concept has at least one activity                |
| Dependency Cycles  | No cycles in the concept prerequisite graph            |

## Deterministic Validators

Models do NOT replace these deterministic systems:

| Validator                | What It Checks                                                                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Math validation (18 ops) | Addition, subtraction, multiplication, division, place value, expanded form, comparison, ordering, fraction equivalence/comparison, decimals, unit conversions, area/perimeter/volume, clock, money |
| MCQ validation           | Duplicate options, correctIndex out of range, fewer than 2 options                                                                                                                                  |
| Widget config validation | Zod schemas for all 27 widget catalog entries                                                                                                                                                       |
| Coverage computation     | Source→concept→blueprint→activity→asset link completeness                                                                                                                                           |
| Asset SVG rendering      | 11 deterministic SVG renderers with accessibility metadata                                                                                                                                          |

## Model Evaluation Plan

Evaluate Lesson 1 (Numbers) with three configurations:

1. **Baseline**: `gpt-5.4-mini` for every stage
2. **Selective escalation**: `gpt-5.4-mini` base + `gpt-5.4` for concept_map, lesson_blueprint, review
3. **Strong**: `gpt-5.4` for every stage

**Metrics**: coverage percentages, concept-boundary accuracy, prerequisite accuracy, math validation pass rate, widget validity rate, asset usefulness rating, human acceptance score, latency, retries, tokens consumed, estimated cost.

**Decision rule**: Promote a stage to the stronger model only when it materially improves a publication metric. Retain `gpt-5.4-mini` where quality is equivalent.

## Production Command

```bash
pnpm --filter @open-edu/pipeline build
pnpm --filter @open-edu/pipeline curriculum:generate \
  --pdf /Users/sarthakpatnaik/Code/learn-easy/pdf/Math_Level_B_english_medium.pdf \
  --level B --subject math --chapter 1 \
  --output-dir /tmp/openedu-math-level-b --format both --verbose
```

With stage overrides:

```bash
pnpm --filter @open-edu/pipeline curriculum:generate \
  --pdf /Users/sarthakpatnaik/Code/learn-easy/pdf/Math_Level_B_english_medium.pdf \
  --level B --subject math --chapter 1 \
  --output-dir /tmp/openedu-math-level-b --format both --verbose \
  --stage-model concept_map=gpt-5.4 \
  --stage-model lesson_blueprint=gpt-5.4 \
  --stage-model review=gpt-5.4
```

To resume from intermediate artifacts:

```bash
pnpm --filter @open-edu/pipeline curriculum:generate \
  ... --resume --output-dir /tmp/openedu-math-level-b
```
