# Profile: School (K-12)

- key: school
- default: false
- description: School-age learners (K-12). Age-graded register, curriculum-aligned objectives, developmentally appropriate pacing.

## Guidance Deltas

- **Vocabulary / Reading Level**: TODO — grade-band vocabulary targets and sentence-length ranges per band.
- **Objectives**: TODO — align objectives to a curriculum framework and grade-band expectations.
- **Examples**: TODO — choose concrete, in-domain examples appropriate to the grade band.
- **Pacing**: TODO — per-lesson duration guidance for school-age attention spans (see profiles.config.json `pacingRangeMinutes`).
- **Register**: TODO — concise, encouraging register; no adult-academic tone.

## Output Deltas

- **metadata.audience**: `set` to `"school"`
- **metadata.accessibility**: `set` to `[]`
- **lesson.estimatedMinutes**: TODO — age-appropriate pacing ranges.
- **activity.instructions style**: TODO — direct, concrete instructions with worked examples.
- **quiz question style**: TODO — single-topic questions at grade reading level.
