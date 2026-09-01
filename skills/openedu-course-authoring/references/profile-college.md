# Profile: College / Adult

> GENERATED reference — do not hand-edit. Regenerate with `pnpm --filter @open-edu/domain-guidance generate`.
> Source of truth: `packages/domain-guidance/src/data/profiles.json`.

- key: college
- default: false
- name: College / Adult
- description: Higher-education / adult learners. Academic rigor, independence, disciplinary terminology, and deeper conceptual treatment.
- accessibility: none
- difficultyBias: none
- pacingRangeMinutes: 20–60

## Guidance Deltas

- Register: formal, precise, discipline-appropriate language with fewer conversational simplifications; introduce technical terminology when relevant; clarity remains more important than artificial academic verbosity.
- Objectives: prefer higher-order objectives when appropriate (apply, analyze, evaluate, create), but do not force every objective into analyze/evaluate/create — the objective must reflect the actual learning goal.
- Prior Knowledge: assume prerequisite knowledge only when explicitly stated in the course brief; expose important prerequisites explicitly.
- Examples: use realistic disciplinary examples, case studies, authentic problems, research examples, and professional/academic contexts; move from simple explanation to disciplinary application.
- Evidence: where the discipline requires, structure explanation as claim, explanation, evidence/example, implication; cite authoritative sources when the subject demands evidence.
- Pacing: deeper, longer learning blocks; prefer fewer, deeper, more independent activities over many tiny activities.

## Output Deltas

- metadata.audience set to 'college'
- metadata.accessibility set to [] — do not add autism accessibility tags
- metadata.difficulty no automatic 'advanced' bias — difficulty is determined by the course brief and subject
- lesson.estimatedMinutes use pacing range [20, 60]
- activity.instructions style restrict to formal, self-contained, precise instructions sufficiently detailed for independent completion; avoid excessive hand-holding, but do not remove scaffolding from genuinely difficult tasks
- quiz question style set questions that test reasoning rather than terminology memorization; may include multi-step problems, inference, application, analysis, evaluation, synthesis, and case-based questions

## Prompt Instructions

Adapt content for college/adult learners: formal disciplinary register, higher-order objectives (apply, analyze, evaluate), realistic case-based examples, deeper independent learning blocks (20-60 min).
