# Open-Edu Course Authoring Skill Evaluations

These evaluations test the skill across multiple scenarios. Each eval is a prompt + expected result + machine-checkable assertions.

## Running Evaluations

Run each evaluation by providing the prompt to the agent with the `openedu-course-authoring` skill loaded.

## Evaluation Criteria

### Machine-Checkable Assertions

For each evaluation, verify these mechanical properties:

1. **Artifact presence** — all expected files exist in the output directory
2. **JSON parseability** — `course-spec.json` parses as valid JSON
3. **Schema conformance** — `course-spec.json` passes structural validation
4. **Compiler success** — (repo mode) `edu compile --validate` exits 0
5. **No unknown widget IDs** — every `widgetId` is from the canonical catalog or legacy alias map
6. **Stable IDs** — lesson IDs are unique kebab-case
7. **Objective coverage** — every objective maps to at least one activity
8. **Truthful capability reporting** — agent never claims validation it didn't run

### Qualitative Review

For ASYMMETRIC evaluations (where the "correct" output is open-ended), review:

- Does the agent ask clarifying questions before generating?
- Does the agent detect and handle edge cases gracefully?
- Are assumptions recorded rather than silently applied?
- Does the agent refuse to fabricate validation results?

## Eval Types

- **Portable mode:** Runs outside an Open-Edu repo. Tests structural validation and artifact generation.
- **Repository mode:** Runs inside an Open-Edu repo. Tests compilation, validation, and linting.
- **Edge case:** Tests error handling, missing input, unsupported requests, and safety behavior.

## Evaluation List

| ID                             | Mode       | Description                         |
| ------------------------------ | ---------- | ----------------------------------- |
| `eval-portable-fractions`      | portable   | Fractions course for 8-10 year olds |
| `eval-portable-javascript`     | portable   | Intro JavaScript for adults         |
| `eval-portable-non-stem`       | portable   | French greetings for travelers      |
| `eval-repo-package`            | repository | Complete package compilation        |
| `eval-repo-pdf`                | repository | PDF pipeline math profile           |
| `eval-edge-missing-level`      | any        | Missing learner level               |
| `eval-edge-unsupported-widget` | repository | Unsupported widget fallback         |
| `eval-edge-existing-output`    | any        | Existing output directory safety    |
| `eval-edge-multilingual`       | portable   | Spanish (es-MX) locale              |
