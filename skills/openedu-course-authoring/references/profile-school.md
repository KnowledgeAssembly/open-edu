# Profile: School (K-12)

- key: school
- default: false
- description: School-age learners (K-12). Age-graded register, curriculum-aligned objectives, grade-band-appropriate pacing and complexity.

## Guidance Deltas

- **Vocabulary / Reading Level**: Match the grade band. See the band table below — from very short concrete sentences (early_primary) to academically precise vocabulary with explicit definitions for new technical terms (senior_secondary). Prefer developmental appropriateness over mechanical word-count rules.
- **Objectives**: Align objectives to the stated curriculum where curriculum information exists; keep them grade-band appropriate and observable; connect each objective directly to an activity and an assessment signal. Follow the progression concept → learning objective → learning activity → practice → assessment. Do not force higher-order objectives onto every lesson — use the cognitive complexity appropriate to the grade and subject.
- **Examples**: Prefer concrete → familiar → visual → abstract, especially for younger learners. Examples must be age-appropriate, culturally/contextually appropriate, subject-related, and understandable without unnecessary background knowledge. Do not add advanced examples merely to make a course look sophisticated.
- **Activity Instructions**: Use direct, concrete, age-appropriate, sequential instructions that are easy to scan (e.g. "Look at the picture. Count the apples. Choose the number." over dense academic phrasing). Include a worked example when introducing a new procedure.
- **Assessment**: Each assessment item should primarily measure one learning objective, with complexity appropriate to the grade band. Items may span recall, recognition, application, multi-step reasoning, and analysis depending on grade/subject/objective; keep question text readable at the intended grade level. Do not impose a universal single-topic rule.
- **Pacing**: Use shorter learning blocks than college. Per-band authoring defaults are listed below; `profiles.config.json` is the machine-readable source.

### Grade Bands

| Grade Band         | Authoring Characteristics                                                                | Pacing default |
| ------------------ | ---------------------------------------------------------------------------------------- | -------------- |
| `early_primary`    | very short sentences, concrete vocabulary, strong visual support                         | 10–20 min      |
| `upper_primary`    | simple explanations, gradually increasing technical vocabulary                           | 15–25 min      |
| `middle_school`    | moderate sentence complexity, explicit subject terminology                               | 20–35 min      |
| `secondary`        | increasingly abstract explanations, subject-specific terminology                         | 25–40 min      |
| `senior_secondary` | academically appropriate vocabulary with explicit definitions for new technical concepts | 30–45 min      |

## Output Deltas

- **metadata.audience**: `set` to `"school"`
- **metadata.accessibility**: `set` to `[]` — do not add autism accessibility tags (school profile ≠ autism profile)
- **lesson.estimatedMinutes**: `prefer` the grade-band pacing range above.
- **activity.instructions style**: `restrict` to direct, concrete, sequential instructions; include a worked example for new procedures.
- **quiz question style**: `set` each item primarily measures one objective; readability and complexity match the grade band. Recall/recognition/application/multi-step/analysis are all permitted per grade and subject.
