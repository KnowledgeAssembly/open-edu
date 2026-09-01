# Profile: Autism Spectrum

> GENERATED reference — do not hand-edit. Regenerate with `pnpm --filter @open-edu/domain-guidance generate`.
> Source of truth: `packages/domain-guidance/src/data/profiles.json`.

- key: autism
- default: false
- name: Autism Spectrum
- description: Autistic learners. Prioritizes predictability, visual support, literal language, and errorless learning.
- accessibility: sensory-friendly, predictable-structure, literal-language
- difficultyBias: beginner
- pacingRangeMinutes: 10–30

## Guidance Deltas

- Vocabulary / Reading Level (ALX 18): use literal language; target sentence length of 5-12 words; no idioms, sarcasm, or abstract metaphors (avoid 'conquer', 'on fire', 'genius').
- One Concept per Activity (ALX-3): never introduce multiple concepts simultaneously; each activity must have exactly one learning objective, one task, and one decision; split multi-concept lessons.
- Predictability (ALX-1): keep lesson flow fixed across the whole course; never vary the structure between lessons.
- Structured Work Systems (ALX-9): every activity must answer four questions — what am I doing, how much work is there, how do I know I am finished, and what happens next.
- Shaping (ALX-14): break complex skills into smaller, achievable sub-steps (task decomposition); sequence sub-steps into a graduated path.
- Errorless Learning (ALX-13): build confidence before introducing challenge; new concepts start with high early success.
- Prompt Hierarchy (ALX-12): support fades as mastery improves — full demonstration, visual hint, partial hint, verbal cue, independent; never remove support abruptly.
- Visual First (ALX-2): images carry primary meaning, text is secondary; every concept must begin with a visual example before explanation.
- Executive Function & Transitions (ALX-10, ALX-11): support task initiation and sequencing; never jump abruptly between activities; end each activity with an explicit 'next:' orientation and expected duration.
- Feedback & Praise (ALX-5, 19): use specific, calm, literal praise; never exaggerate; never use failure framing; prefer 'Let's try again'.
- AI Tutor Sequence (19): follow show, explain, practice; establish what the learner is doing and what comes next before explaining.
- Reinforcement (ALX-8, ALX-15, ALX-16): mastery-based and independence-based; no leaderboards, rankings, or excessive gamification; reward prompt-free completion and growth over raw accuracy.
- Calm Zone & Breaks (ALX-17, ALX-18): every lesson includes a calm break/reflection opportunity; keep zones single-purpose.

## Output Deltas

- metadata.audience `set` to `"autism"`
- metadata.accessibility `add` `["sensory-friendly", "predictable-structure", "literal-language"]`
- metadata.difficulty prefer 'beginner' unless explicitly overridden
- lesson.estimatedMinutes use pacing range [10, 30]
- activityPlan.progression `set` to `[observe, guided_practice, independent_practice, mastery_check, positive_completion]`
- activity.instructions style restrict to short, direct instructions (e.g. 'Count the apples')
- widget selection restrict away from high-sensory-load, autoplay-media, or flashing widgets; prefer calm, predictable visual layouts with large touch targets
- quiz question style set literal one-step questions with one correct, unambiguous answer; no penalties, unlimited retries, no trick wording or implied-meaning distractors
- rewards/cards framing restrict use of competitive rewards; prefer progress-visible, mastery-based recognition and independence

## Prompt Instructions

Adapt content for an autistic learner: use strict literal language (5-12 words per sentence, no idioms/metaphors), direct step-by-step instructions, one concept per activity, predictable structure, visual emphasis, and calm non-exaggerated feedback.
