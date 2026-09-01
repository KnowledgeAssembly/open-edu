# Profile: School (K-12)

> GENERATED reference — do not hand-edit. Regenerate with `pnpm --filter @open-edu/domain-guidance generate`.
> Source of truth: `packages/domain-guidance/src/data/profiles.json`.

- key: school
- default: false
- name: School (K-12)
- description: School-age learners (K-12). Age-graded register, curriculum-aligned objectives, grade-band-appropriate pacing.
- accessibility: none
- difficultyBias: none
- pacingRangeMinutes: 15–45

## Grade Bands

- `early_primary` 10–20 minutes
- `upper_primary` 15–25 minutes
- `middle_school` 20–35 minutes
- `secondary` 25–40 minutes
- `senior_secondary` 30–45 minutes

## Guidance Deltas

- Vocabulary / Reading Level: match the grade band — very short concrete sentences (early_primary) to academically precise vocabulary with explicit definitions for new technical terms (senior_secondary); prefer developmental appropriateness over mechanical word-count rules.
- Objectives: align objectives to the stated curriculum where it exists; keep them grade-band appropriate and observable; connect each objective directly to an activity and an assessment signal; do not force higher-order objectives onto every lesson.
- Examples: prefer concrete to familiar to visual to abstract, especially for younger learners; age-appropriate, culturally/contextually appropriate, subject-related, and understandable without unnecessary background knowledge.
- Activity Instructions: direct, concrete, age-appropriate, sequential instructions that are easy to scan (e.g. 'Look at the picture. Count the apples. Choose the number.'); include a worked example when introducing a new procedure.
- Assessment: each item should primarily measure one learning objective, with complexity appropriate to the grade band; keep question text readable at the intended grade level.
- Pacing: use shorter learning blocks than college; grade-band pacing ranges live in gradeBands.

## Output Deltas

- metadata.audience set to 'school'
- metadata.accessibility set to [] — do not add autism accessibility tags
- lesson.estimatedMinutes use grade-band appropriate pacing range [15, 45]
- activity.instructions style restrict to direct, concrete, sequential instructions; include a worked example for new procedures
- quiz question style set each item primarily measures one objective; readability and complexity match the grade band

## Prompt Instructions

Adapt content for K-12 school learners: age-appropriate vocabulary and grade-band pacing, concrete visual examples, curriculum-aligned objectives, and direct step-by-step activity instructions.
