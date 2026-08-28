# Profile: Neurotypical

- key: neurotypical
- default: true
- description: Default profile. Standard default skill behavior; the base authoring layer already describes neurotypical behavior, so this file lists only profile-specific overrides.

## Guidance Deltas

(none — the base layer already describes neurotypical authoring behavior)

## Output Deltas

- **metadata.audience**: `set` to `"neurotypical"`
- **metadata.accessibility**: `set` to `[]` (empty)
- **metadata.difficulty**: no bias — any value the interview supports.
- **lesson.estimatedMinutes**: use profiles.config.json `pacingRangeMinutes` [15, 45].
