# Learner Profiles

The skill supports four student-profile variants. Each profile changes **both** how the agent authors and what the artifacts encode, while conforming to the same canonical `course-spec.json` contract and compiler pipeline.

## Profiles at a glance

| Key            | Default | One-line description                                            | Reference                 |
| -------------- | ------- | --------------------------------------------------------------- | ------------------------- |
| `neurotypical` | yes     | Default behavior; the base authoring layer.                     | `profile-neurotypical.md` |
| `autism`       | no      | Predictability, literal language, errorless learning (ALX 2.0). | `profile-autism.md`       |
| `school`       | no      | K-12 register, curriculum-aligned, age-graded.                  | `profile-school.md`       |
| `college`      | no      | Academic register, rigorous objectives.                         | `profile-college.md`      |

## Selection

`scripts/profiles.mjs` (`resolveProfile`) normalizes the user's `learnerProfile`:

- explicit valid key → `source: "explicit"`
- no input → `neurotypical`, `source: "defaulted"`
- known alias (`autistic`→`autism`, `k12`→`school`, `university`→`college`) → `source: "mapped"`
- anything else → `neurotypical`, `source: "mapped"`

**Accessibility rule:** `autism` is never inferred from age or level — only ever explicitly stated or defaulted to `neurotypical` (SKILL.md Critical Rule 9). `school`/`college` may be inferred from age/educational context.

Every selection (or default) is recorded under a `## Learner Profile` section in `course-brief.md` and injected into `quality-report.json` `summary.learnerProfile` as `{ key, name, source }`.

## Delta semantics

Each `profile-*.md` encodes deltas over the implicit base layer (default skill behavior) using four operations:

- `set` — override a field with a concrete value
- `add` — append to a list (e.g. accessibility tags)
- `restrict` — constrain options (e.g. widget selection, instruction style)
- `prefer` — ordering preference (e.g. pacing ranges, difficulty bias)

`neurotypical` is the base-aligned profile and lists only its output encoding (`audience: "neurotypical"`, `accessibility: []`). The other profiles list their deviations.

## Machine-checkable knobs

`scripts/profiles.config.json` carries the machine-checkable settings used by the validation and reporting scripts (pacing ranges, accessibility tags, difficulty bias). Prose guidance deltas in the `profile-*.md` files are applied by the LLM only; scripts never parse them.

## Output encoding

All profiles emit `metadata.audience` and `metadata.accessibility` on the produced `course-spec.json`:

| Profile        | `metadata.audience` | `metadata.accessibility`                                            |
| -------------- | ------------------- | ------------------------------------------------------------------- |
| `neurotypical` | `neurotypical`      | `[]`                                                                |
| `autism`       | `autism`            | `["sensory-friendly", "predictable-structure", "literal-language"]` |
| `school`       | `school`            | `[]`                                                                |
| `college`      | `college`           | `[]`                                                                |

The compiler propagates these (plus `targetAudience`, `keywords`, `lastUpdated`) into the compiled package metadata (course-compiler PR 1).

## Profile-scoped quality checks

`summarize-quality.mjs` gates these checks on the active profile (from `metadata.audience`):

- `QC-ACC-05/06/07` — autism: literal language, one concept per activity, sensory-friendly widgets
- `QC-SCH-01` — school: age-appropriate objectives/examples
- `QC-COL-01` — college: academic register

See `quality-rubric.md` Dimension 6b for the full table.

## Composition (future)

Profile composition (e.g. `autism` + `college`) is future work. The delta format (`set`/`add`/`restrict`/`prefer`) leaves room to merge, but v1 supports single-profile selection only.
