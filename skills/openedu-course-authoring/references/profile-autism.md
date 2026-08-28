# Profile: Autism

- key: autism
- default: false
- description: Autistic learners preparing for NIOS Open Basic Education. Prioritizes predictability, visual support, literal language, and errorless learning based on TEACCH and Modern ABA principles (ALX 2.0).

## Guidance Deltas

- **Vocabulary / Reading Level** (ALX §18): Use literal language. Target sentence length of 5–12 words. No idioms, sarcasm, or abstract metaphors (avoid "conquer", "on fire", "genius").
- **One Concept per Activity** (ALX-3): Never introduce multiple concepts simultaneously. Each activity must have exactly one learning objective, one task, and one decision. Split multi-concept lessons.
- **Predictability** (ALX-1): Keep lesson flow fixed across the whole course; never vary the structure between lessons. Always state "what comes next" explicitly.
- **Shaping** (ALX-14): Break complex skills into smaller, achievable sub-steps (task decomposition). Sequence sub-steps into a graduated path.
- **Errorless Learning** (ALX-13): Build confidence before introducing challenge. New concepts start with high early success; support fades gradually.
- **Visual First** (ALX-2): Images carry primary meaning, text is secondary. Every concept must begin with a visual example before explanation.
- **Transitions and Executive Function** (ALX-11): Do not abruptly jump between activities. End each activity with an explicit "next:" orientation (e.g. "You are practicing addition. Next: Quiz").
- **One Concept at a Time** (ALX-3): Compound objectives are flagged as a quality issue.
- **Feedback & Praise** (ALX-5, §19): Use specific, calm, literal praise (e.g. "You counted correctly", "You completed the lesson"). Do not use exaggerated praise ("You're a genius!"). Never use failure framing; prefer "Let's try again" / "Count one more time".
- **AI Tutor Sequence** (§19): Follow show → explain → practice. Establish what the learner is doing and what comes next before explaining.
- **Reinforcement** (ALX-8, ALX-15): Mastery-based, no leaderboards, rankings, or excessive gamification. Rewards/cards must use calm, predictable framing — avoid "slot-machine" rewards, confetti, or dopamine-heavy badge mechanics.

## Output Deltas

- **metadata.audience**: `set` to `"autism"`
- **metadata.accessibility**: `add` `["sensory-friendly", "predictable-structure", "literal-language"]`
- **metadata.difficulty**: `prefer` `"beginner"` unless explicitly overridden.
- **lesson.estimatedMinutes**: `prefer` shorter, frequent chunks over long sessions, with explicit breaks. Use profiles.config.json `pacingRangeMinutes` [10, 30].
- **activityPlan progression**: `set` strictly to:
  1. `observe` (Learn Zone)
  2. `guided_practice` (Practice Zone - Hint/Support level high)
  3. `independent_practice` (Practice Zone)
  4. `mastery_check` (Quiz Zone)
  5. `positive_completion`
- **activity.instructions style**: `restrict` to short, direct instructions (e.g. "Count the apples").
- **widget selection** (ALX-6): `restrict` away from high-sensory-load, autoplay-media, or flashing widgets. `prefer` calm, predictable visual layouts with large touch targets. Avoid gamified "slot-machine" or excessive-badge widgets.
- **quiz question style**: `set` literal one-step questions with one correct, unambiguous answer; avoid trick wording and distractors built on implied meaning.
- **rewards/cards framing** (ALX-8, ALX-15): `restrict` use of competitive rewards; `prefer` progress-visible, mastery-based recognition (e.g. "You counted correctly", "You completed the lesson").
