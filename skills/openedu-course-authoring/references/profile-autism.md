# Profile: Autism

- key: autism
- default: false
- description: Autistic learners. Prioritizes predictability, visual support, literal language, and errorless learning based on TEACCH and Modern ABA principles (ALX 2.0). Curriculum context (e.g. NIOS) is configured separately, not assumed by this profile.

> Runtime concerns — visible progress (ALX-4), sensory/audio controls (ALX-6), color/typography/motion (ALX §13–§16), and personalization (§12) — are handled by the framework, not encoded by the author.

## Guidance Deltas

- **Vocabulary / Reading Level** (ALX §18): Use literal language. Target sentence length of 5–12 words. No idioms, sarcasm, or abstract metaphors (avoid "conquer", "on fire", "genius").
- **One Concept per Activity** (ALX-3): Never introduce multiple concepts simultaneously. Each activity must have exactly one learning objective, one task, and one decision. Split multi-concept lessons.
- **Predictability** (ALX-1): Keep lesson flow fixed across the whole course; never vary the structure between lessons.
- **Structured Work Systems** (ALX-9): Every activity must answer four questions — what am I doing, how much work is there, how do I know I am finished, and what happens next.
- **Shaping** (ALX-14): Break complex skills into smaller, achievable sub-steps (task decomposition). Sequence sub-steps into a graduated path.
- **Errorless Learning** (ALX-13): Build confidence before introducing challenge. New concepts start with high early success.
- **Prompt Hierarchy** (ALX-12): Support fades as mastery improves — full demonstration → visual hint → partial hint → verbal cue → independent. Never remove support abruptly.
- **Visual First** (ALX-2): Images carry primary meaning, text is secondary. Every concept must begin with a visual example before explanation.
- **Executive Function & Transitions** (ALX-10, ALX-11): Support task initiation and sequencing; never jump abruptly between activities. End each activity with an explicit "next:" orientation and expected duration (e.g. "You are practicing addition. Next: Quiz").
- **Feedback & Praise** (ALX-5, §19): Use specific, calm, literal praise (e.g. "You counted correctly", "You completed the lesson"). Do not use exaggerated praise ("You're a genius!"). Never use failure framing; prefer "Let's try again" / "Count one more time".
- **AI Tutor Sequence** (§19): Follow show → explain → practice. Establish what the learner is doing and what comes next before explaining.
- **Reinforcement** (ALX-8, ALX-15, ALX-16): Mastery-based and independence-based, no leaderboards, rankings, or excessive gamification. Reward prompt-free completion and growth over raw accuracy.
- **Calm Zone & Breaks** (ALX-17, ALX-18): Every lesson includes a calm break/reflection opportunity; keep zones single-purpose (never mix learn/practice/quiz/calm on one activity).

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

  (ALX-7's "Learn → Practice → Quiz → Complete" maps to this 5-step model; "Practice" splits into guided + independent.)

- **activity.instructions style**: `restrict` to short, direct instructions (e.g. "Count the apples").
- **widget selection** (ALX-6): `restrict` away from high-sensory-load, autoplay-media, or flashing widgets. `prefer` calm, predictable visual layouts with large touch targets. Avoid gamified "slot-machine" or excessive-badge widgets.
- **quiz question style**: `set` literal one-step questions with one correct, unambiguous answer; no penalties, unlimited retries, no trick wording or distractors built on implied meaning.
- **rewards/cards framing** (ALX-8, ALX-15, ALX-16): `restrict` use of competitive rewards; `prefer` progress-visible, mastery-based recognition and independence (e.g. "You completed the lesson on your own").
