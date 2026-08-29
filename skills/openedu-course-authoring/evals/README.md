# Open-Edu Course Authoring Skill Evaluations

These evaluations test the skill across 11 scenarios: portable mode, repository mode, source material (PDF), bundles, rewards/cards, and edge cases (missing input, unsupported widgets, existing output, multilingual).

## Running Evaluations

### With-Skill vs. Baseline

The standard skill-creator eval workflow runs two configurations per eval:

1. **With-skill** — the agent has the `openedu-course-authoring` skill loaded
2. **Baseline (without-skill)** — the same prompt, no skill loaded

For each eval, spawn both runs in parallel and save outputs to the workspace:

```
<workspace>/iteration-<N>/eval-<ID>/with_skill/outputs/
<workspace>/iteration-<N>/eval-<ID>/without_skill/outputs/
```

Each run directory must include an `eval_metadata.json`, a `timing.json`, and a `grading.json` (after grading).

### Running Schema Validation

```bash
node --test skills/openedu-course-authoring/evals/schema.test.mjs
```

This validates that `evals.json` conforms to the standard skill-creator eval schema: unique numeric IDs, non-empty prompts and expected_output strings, and array-typed files.

## Grading Compiler/Package Assertions

For repository-mode evals (IDs 4, 5), assertions require verification of compiler artifacts:

| Assertion                    | How to Grade                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `edu compile` exits 0        | Run `pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js compile <spec> -o <output>` and check exit code |
| `edu validate` succeeds      | Run `edu validate <package>` on the compiled output                                                                     |
| `edu lint-content` passes    | Run `edu lint-content <package>` and check for zero errors                                                              |
| `package/package.json` valid | Parse `package/package.json` as JSON and check `format === 'openedu-package'`                                           |
| `package/workflow.json`      | Assert file existence and valid JSON                                                                                    |
| `quality-report.json` valid  | Parse as JSON and check `checks` array exists                                                                           |

## Machine-Checkable Assertions

For portable and structural evals, these assertions can be checked programmatically:

1. **Artifact presence** — all files in `evals[].files` exist in the output directory
2. **JSON parseability** — `course-spec.json` parses as valid JSON without throwing
3. **Schema conformance** — `course-spec.json` passes structural validation (`format`, `version`, `lessons`, `metadata`)
4. **No unknown widget IDs** — every `widgetId` references a known widget from the canonical catalog or legacy alias map
5. **Stable IDs** — lesson IDs are unique kebab-case strings (`/^[a-z0-9]+(-[a-z0-9]+)*$/`)
6. **Objective coverage** — every lesson objective maps to at least one activity
7. **Truthful capability reporting** — the agent never claims it ran validation, compilation, or linting unless the output directory contains the corresponding evidence files

## Qualitative Review

These checks require human judgment and cannot be fully automated:

- **Clarification quality** (eval 6) — Does the agent ask specific, relevant follow-up questions about learner level, duration, and goals? Does it avoid making silent assumptions?
- **Fallback appropriateness** (eval 7) — Are the suggested fallback activities pedagogically reasonable? Does the quality report explain why the widget was rejected?
- **Overwrite safety** (eval 8) — Does the agent clearly communicate what will be overwritten? Does it offer alternatives (e.g., different output directory)?
- **Multilingual fidelity** (eval 9) — Is the Spanish content grammatically correct and age-appropriate? Are cultural references appropriate for es-MX?
- **ASYMETRIC evals** (IDs 6, 7, 8) — These evals have no single "correct" output. Grade based on whether the agent follows the expected behavioral pattern, not whether the output matches a golden file.

## Report Phase Assertions

The quality report (`quality-report.json`) produced by the skill must include:

- **Structural checks** — verified format, version, and top-level schema conformance
- **Widget catalog validation** — every `widgetId` checked against the catalog
- **Compiler/pipeline evidence** — for repo-mode evals, the report references the compiler or pipeline run that produced the package
- **No fabricated results** — every assertion in the report must be traceable to a concrete check that was actually executed

### Truthful Capability Assertions

The agent must never claim it performed an operation it did not run. When grading:

1. Check the agent's transcript for claims like "validation passed" or "linting succeeded"
2. Verify the corresponding output file exists (e.g., `quality-report.json` with the matching check)
3. If the agent claimed compilation succeeded but no compiled output exists, the expectation fails

## Eval Index

| ID  | Name                         | Mode       | Files Present | Expectations |
| --- | ---------------------------- | ---------- | ------------- | ------------ |
| 1   | eval-portable-fractions      | portable   | 4             | 9            |
| 2   | eval-portable-javascript     | portable   | 4             | 6            |
| 3   | eval-portable-non-stem       | portable   | 4             | 5            |
| 4   | eval-repo-package            | repository | 3             | 6            |
| 5   | eval-repo-pdf                | repository | 2             | 4            |
| 6   | eval-edge-missing-level      | any        | 0             | 3            |
| 7   | eval-edge-unsupported-widget | repository | 0             | 3            |
| 8   | eval-edge-existing-output    | any        | 0             | 3            |
| 9   | eval-edge-multilingual       | portable   | 3             | 4            |
| 10  | eval-bundle-rewards-cards    | portable   | 5             | 5            |
| 11  | eval-module-rewards-cards    | portable   | 3             | 4            |
| 12  | eval-autism-fractions        | portable   | 4             | 7            |
| 13  | eval-neurotypical-fractions  | portable   | 4             | 6            |
| 14  | eval-school-fractions        | portable   | 4             | 7            |
| 15  | eval-college-fractions       | portable   | 4             | 7            |
