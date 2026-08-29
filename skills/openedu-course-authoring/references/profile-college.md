# Profile: College / Adult

- key: college
- default: false
- description: Higher-education / adult learners. Academic rigor, independence, disciplinary terminology, and deeper conceptual treatment.

## Guidance Deltas

- **Register**: Use formal, precise, discipline-appropriate language with fewer conversational simplifications. Introduce technical terminology when relevant; do not unnecessarily simplify college-level content. Clarity remains more important than artificial academic verbosity.
- **Objectives**: Prefer higher-order objectives when appropriate (understand, apply, analyze, evaluate, create), but do not force every objective into analyze/evaluate/create — the objective must reflect the actual learning goal.
- **Prior Knowledge**: Assume prerequisite knowledge only when it is explicitly stated in the course brief or established by the course/curriculum sequence. Do not blindly assume substantial prior knowledge; expose important prerequisites explicitly (e.g. `prerequisites: [basic algebra, functions]`).
- **Examples**: Use realistic disciplinary examples, case studies, authentic problems, research examples, and professional/academic contexts where useful. Move from simple explanation to disciplinary application.
- **Evidence**: Where the discipline requires, structure explanation as claim → explanation → evidence/example → implication. Cite authoritative sources when the subject demands evidence, but do not require citations for every activity.
- **Pacing**: Use deeper, longer learning blocks (30–60 min). Prefer fewer, deeper, more independent activities over many tiny activities.

## Output Deltas

- **metadata.audience**: `set` to `"college"`
- **metadata.accessibility**: `set` to `[]` — do not add autism accessibility tags
- **metadata.difficulty**: no automatic `advanced` bias — difficulty is determined by the course brief and subject.
- **lesson.estimatedMinutes**: `prefer` 30–60 minute blocks.
- **activity.instructions style**: `restrict` to formal, self-contained, precise instructions sufficiently detailed for independent completion. Avoid excessive hand-holding, but do not remove scaffolding from genuinely difficult tasks.
- **quiz question style**: `set` questions that test reasoning rather than terminology memorization. May include multi-step problems, inference, application, analysis, evaluation, synthesis, plausible distractors, case-based questions, and open-ended responses where supported by the course-spec.
