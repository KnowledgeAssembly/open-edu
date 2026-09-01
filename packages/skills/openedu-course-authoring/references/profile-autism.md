# Profile: Autism Spectrum

- key: autism
- default: false
- description: Autistic learners. Prioritizes predictability, visual support, literal language, and errorless learning.

## Guidance Deltas

- Vocabulary: Use literal language. 5-12 word sentences. No idioms or sarcasm.
- One concept per activity: split multi-concept lessons.
- Predictability: keep lesson flow fixed across the course.
- Errorless learning & gradual prompt hierarchy.
- Visual first: images carry primary meaning, text is secondary.

## Output Deltas

- metadata.audience set to 'autism'
- metadata.accessibility add ['sensory-friendly', 'predictable-structure', 'literal-language']
- metadata.difficulty prefer 'beginner'
- lesson.estimatedMinutes use pacing range [10, 30]
- activityPlan progression: observe -> guided_practice -> independent_practice -> mastery_check -> positive_completion
