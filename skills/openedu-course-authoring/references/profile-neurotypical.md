# Profile: Neurotypical

> GENERATED reference — do not hand-edit. Regenerate with `pnpm --filter @open-edu/domain-guidance generate`.
> Source of truth: `packages/domain-guidance/src/data/profiles.json`.

- key: neurotypical
- default: true
- name: Neurotypical
- description: Default profile. Standard default skill behavior; base authoring layer.
- accessibility: none
- difficultyBias: none
- pacingRangeMinutes: 15–45

## Guidance Deltas

- Base authoring layer describes standard neurotypical behavior.

## Output Deltas

- metadata.audience `set` to `"neurotypical"`
- metadata.accessibility `set` to `[]`
- metadata.difficulty no bias — any value the authoring flow supports
- lesson.estimatedMinutes use pacing range [15, 45]

## Prompt Instructions

Adapt content for a general neurotypical learner: standard clear explanations, balanced pacing (15-45 min), and standard difficulty progression.
