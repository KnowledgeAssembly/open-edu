# OpenEdu Quality Rubric Reference

> GENERATED reference — do not hand-edit. Regenerate with `pnpm --filter @open-edu/domain-guidance generate`.
> Source of truth: `packages/domain-guidance/src/data/quality-rubric.json`.

Schema Version: 1

## Dimensions

### Learning Objectives (`objectives`)

- **Description**: Lessons must contain measurable learning objectives with action verbs.
- **Failing Message**: One or more lessons are missing learning objectives.
- **Prompt Guidance**: Use measurable objectives that start with an action verb (e.g. explain, calculate, compare, construct). NEVER use 'understand', 'know', or 'learn'.
- **Thresholds**: `{"minObjectivesPerLesson":1,"prohibitedVerbs":["understand","know","learn","appreciate","grasp"]}`

### Assessment & Practice (`assessment`)

- **Description**: Course lessons must include check-for-understanding quizzes or practice activities.
- **Failing Message**: Add a quiz or practice activity so learners can check understanding.
- **Prompt Guidance**: Include exactly one quiz activity per lesson with multiple-choice questions (4 options each, exactly 1 correct option).
- **Thresholds**: `{"quizOptionsCount":4,"quizRequiredPerLesson":true}`

### Course Duration & Scope (`duration`)

- **Description**: Courses should maintain a focused scope with 1 to 6 lessons.
- **Failing Message**: Outline should have between 1 and 6 lessons/activities for a focused course.
- **Prompt Guidance**: 1 to 6 lessons only (teachers build short, focused courses).
- **Thresholds**: `{"minLessons":1,"maxLessons":6}`

### Course Completeness (`completeness`)

- **Description**: Course spec must be complete with no compilation errors and required metadata.
- **Failing Message**: Outline is empty or compilation reported errors.
- **Prompt Guidance**: All required fields in the course spec contract must be present and non-empty.
- **Thresholds**: `{"requireNonEmpty":true}`
