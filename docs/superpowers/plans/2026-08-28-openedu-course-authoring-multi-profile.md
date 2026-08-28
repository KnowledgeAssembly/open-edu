# Implementation Plan: Multi-Profile Variants for Open-Edu Course Authoring Skill

- Date: 2026-08-28
- Status: Ready for implementation
- Spec: [`docs/superpowers/specs/SKILL-SPEC.md`](../specs/SKILL-SPEC.md)
- Prior plan (superseded): `~/.gemini/antigravity/brain/09a92588-ddab-444c-9543-e8e61c0a6934/implementation_plan.md`
- Source reference: [`docs/AUTISM-LEARNING-SPEC.md`](../../AUTISM-LEARNING-SPEC.md) (ALX 2.0)

---

## 1. Goal

Add four student-profile variants — `neurotypical` (default), `autism`, `school`, `college` — to the `skills/openedu-course-authoring` skill. Each profile varies **both** the authoring guidance the agent follows and the content it produces, while conforming to the same canonical `course-spec.json` contract and compiler pipeline.

## 2. Design (from SKILL-SPEC.md)

Hybrid approach: a thin shared `SKILL.md` core + `references/profile-*.md` files encoding layered deltas (guidance + output), plus a machine-readable `profiles.config.json` for script-enforced knobs.

```
skills/openedu-course-authoring/
├── SKILL.md                              # thin dispatch core (edit)
├── references/
│   ├── authoring-workflow.md             # add learnerProfile to Stage 1/2 (edit)
│   ├── quality-rubric.md                 # add profile-scoped QC checks (edit)
│   ├── profile-neurotypical.md           # NEW: baseline
│   ├── profile-autism.md                 # NEW: derived from ALX 2.0
│   ├── profile-school.md                 # NEW: skeleton
│   └── profile-college.md                # NEW: skeleton
├── scripts/
│   ├── profiles.config.json              # NEW: machine-checkable knobs
│   ├── profiles.mjs                      # NEW: resolveProfile + loadProfileConfig
│   ├── validate-course-spec.mjs          # edit: validate optional metadata
│   ├── summarize-quality.mjs             # edit: profile-scoped QC checks
│   └── quality-report.mjs                # edit: inject learnerProfile
└── evals/
    ├── evals.json                        # edit: +2 per-profile evals
    └── schema.test.mjs                   # edit: +contrast assertion, bump count
```

## 3. Resolved Design Decisions (from review)

These decisions reconcile SKILL-SPEC.md and the prior implementation plan with the actual codebase. They are binding for this plan.

### D1. Compiler silently drops metadata — propagation must be explicit (SKILL-SPEC §10 Q2)

Verified: `packages/course-compiler/src/parser/json-input.ts` parses `course-spec.json` with a plain `z.object({...})` metadata schema (lines 50–58, **no** `.strict()`/`.passthrough()`) and `safeParse` (line 157). Zod strips unknown keys without error, and the reconstruction at lines 178–186 copies only `title`, `description`, `author`, `version`, `language`, `difficulty`, `estimatedHours`. **Consequence:** `audience`/`accessibility` do _not_ fail compilation, but are silently dropped from the compiled `package/`. They would only survive in `course-spec.json`.

**Decision:** make propagation explicit in a dedicated compiler PR (PR 1). The compiled package must carry the profile, otherwise downstream runtime/tooling cannot act on it.

### D2. Reuse the existing `targetAudience` field for the human description; add `audience` + `accessibility`

`packages/course-compiler/src/schemas/course-model.ts:219` `CourseMetadataSchema` is `.strict()` and already has `targetAudience: z.string().optional()`, but the JSON input path never forwards it (see D1). We keep `targetAudience` for the human-readable description ("8–10 year old students") and add:

- `audience: z.string().optional()` — machine-readable profile key (`autism | neurotypical | school | college`).
- `accessibility: z.array(z.string()).optional()` — accessibility tags.

This matches SKILL-SPEC §6.1 field names exactly. `targetAudience` remains the prose field.

### D3. Contrast eval asserts deterministic fields, not pacing heuristics (review finding #2)

The prior plan's "autism output has higher `estimatedMinutes`" assertion is brittle. **Decision:** the contrast eval asserts only what the implementation guarantees:

- `metadata.audience` differs (`"autism"` vs `"neurotypical"`)
- `metadata.accessibility` contains `["sensory-friendly", "predictable-structure", "literal-language"]` for autism and is empty/absent for neurotypical.

Pacing/`estimatedMinutes` assertions are deferred until `profiles.config.json` carries meaningful, distinct pacing values (later iteration).

### D4. Profile inference — never infer `autism` (review finding #3)

`learnerProfile` is asked after Learner Age/Level (SKILL-SPEC §4). Age may imply `school` (<~16) or `college` (higher-ed context), but a neurodivergence profile is **never** inferred — it is only ever explicitly stated or defaulted to `neurotypical`. This is an accessibility ethics rule: do not label a learner. It is added to the skill's Critical Rules and covered by an eval.

### D5. `profiles.config.json` schema (review finding #4)

Defined concretely in §6. `profiles.mjs` loads **only** this JSON; it never parses prose guidance deltas (that is the LLM's job).

### D6. Test runner is `node:test`, not Vitest (review finding #5)

The skill's `scripts/__tests__/*.test.mjs` and `evals/schema.test.mjs` all use `node:test` (`import { describe, it } from 'node:test'`). The prior plan's "`pnpm test`" is wrong for this layer. Correct command: `node --test skills/openedu-course-authoring/scripts/__tests__/`.

### D7. Remove the stale `SPEC.md` (review finding #5)

`skills/openedu-course-authoring/SPEC.md` (created earlier) is superseded by `docs/superpowers/specs/SKILL-SPEC.md`. Delete it in PR 7 to avoid two sources of truth.

---

## 4. PR Breakdown

Seven PRs, each shipping tests. PR 1 is independent of the skill; PRs 2–7 depend on it only for the compiler contract.

### PR 1 — Compiler: propagate `audience` + `accessibility` metadata

**Scope:** `packages/course-compiler`

| File                               | Change                                                                                                                                                                                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/schemas/course-model.ts`      | `CourseMetadataSchema`: add `audience: z.string().optional()` and `accessibility: z.array(z.string()).optional()` (keeps `.strict()`).                                                                                                                                        |
| `src/parser/json-input.ts`         | (1) `CourseSpecJSONSchema.metadata` (line 50): add `audience`/`accessibility` optional fields. (2) Reconstruction (lines 178–186): forward `audience`, `accessibility`, `targetAudience`, `keywords`, `lastUpdated` so the JSON path stops dropping already-supported fields. |
| `src/schemas/course-model.test.ts` | Add: strict schema accepts valid `audience`/`accessibility`; rejects malformed `accessibility` (non-array).                                                                                                                                                                   |
| `src/parser/*.test.ts`             | Add: `course-spec.json` with `audience`/`accessibility` compiles and the fields survive in the output `CourseModel.metadata`.                                                                                                                                                 |

**Acceptance:** `pnpm --filter @open-edu/course-compiler test` passes; a spec with the new fields compiles without error and the fields appear in the compiled model.

> Note: the semantic (markdown) parser `semantic-parser.ts:105` already maps `targetAudience`; add `audience`/`accessibility` frontmatter mapping there too for parity (a follow-up commit inside PR 1).

### PR 2 — `profiles.mjs` + `profiles.config.json`

**Scope:** `skills/openedu-course-authoring/scripts/`

| File                          | Change                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| `profiles.config.json`        | NEW — schema per §6.                                                                            |
| `profiles.mjs`                | NEW — `resolveProfile(userInput)`, `loadProfileConfig(key)`, `listProfiles()`.                  |
| `__tests__/profiles.test.mjs` | NEW — normalization, default fallback, unknown→closest mapping, config load, missing-key error. |

**`resolveProfile` semantics:**

- Normalize (trim, lowercase). Valid keys: `neurotypical | autism | school | college`.
- Unknown input → map to closest supported (`autistic`→`autism`, `spectrum`→`autism`, `k12`/`school-age`→`school`, `university`/`higher-ed`/`adult`→`college`, else `neurotypical`) and return `{ key, source: 'mapped' }`.
- No input → `{ key: 'neurotypical', source: 'defaulted' }`.
- Explicit valid input → `{ key, source: 'explicit' }`.

**Acceptance:** `node --test skills/openedu-course-authoring/scripts/__tests__/profiles.test.mjs` passes.

### PR 3 — Profile reference contracts

**Scope:** `skills/openedu-course-authoring/references/`

| File                      | Change                                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| `profile-neurotypical.md` | NEW — baseline; near-empty (lists only deviations from base layer, which are none in v1). |
| `profile-autism.md`       | NEW — fully derived from ALX 2.0 (§7 mapping table).                                      |
| `profile-school.md`       | NEW — skeleton (header + TODO placeholders for K-12 register).                            |
| `profile-college.md`      | NEW — skeleton (header + TODO placeholders for academic register).                        |

Each `profile-*.md` follows the two-section contract from SKILL-SPEC §5.3: metadata block (`key`, `default`, `description`) + `## Guidance Deltas` + `## Output Deltas`.

**Acceptance:** files exist and follow the contract; `profile-autism.md` maps every ALX principle to a delta (§7).

### PR 4 — Skill wiring: SKILL.md + authoring-workflow + validator

**Scope:** skill core

| File                               | Change                                                                                                                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                         | Add `learnerProfile` to Quick Start; add a "Profiles" section listing keys + linking `references/profile-*.md`; add Critical Rule 9: never infer `autism` (D4).                                 |
| `references/authoring-workflow.md` | Stage 1: prompt for `learnerProfile` after Age/Level, default `neurotypical`. Stage 2: add `## Learner Profile` section to `course-brief.md`.                                                   |
| `scripts/validate-course-spec.mjs` | `checkMetadata` (line 196): validate optional `audience` (string, one of known keys) and `accessibility` (array of strings). Hand-rolled checks — **no Zod exists here** (corrects prior plan). |

**Acceptance:** `node --test .../validate-course-spec.test.mjs` passes; a spec with `audience`/`accessibility` validates clean, an invalid `accessibility` (non-array) errors.

### PR 5 — Per-profile rubric + report injection

**Scope:** skill scripts

| File                            | Change                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `references/quality-rubric.md`  | Document `QC-ACC-05/06/07` (autism), `QC-SCH-01` (school), `QC-COL-01` (college).                                                                            |
| `scripts/summarize-quality.mjs` | Read `metadata.audience` from `course-spec.json` (already parsed at lines 94–101); gate profile-scoped checks on the active profile key. Add the new checks. |
| `scripts/quality-report.mjs`    | Inject `learnerProfile: { key, name, source }` into the merged report `summary` (lines 149–158).                                                             |

Profile-scoped checks (supplement, don't replace universal checks):

- `QC-ACC-05` (autism, `warning`): instructions use literal language — flag idiom/metaphor/competition phrasing (e.g. "conquer", "on fire", "genius").
- `QC-ACC-06` (autism, `warning`): one concept per activity — flag instructions with multiple distinct tasks (compound objectives).
- `QC-ACC-07` (autism, `info`): widget selection avoids high-sensory-load defaults (use `accessibility` metadata from catalog entries, parallel to existing `QC-ACC-02`).
- `QC-SCH-01` (school, `warning`): objectives/examples age-appropriate.
- `QC-COL-01` (college, `info`): academic register present.

**Acceptance:** `node --test .../summarize-quality.test.mjs` and `quality-report.test.mjs` pass; autism checks fire only when `metadata.audience === 'autism'`.

### PR 6 — Evals

**Scope:** `skills/openedu-course-authoring/evals/`

| File              | Change                                                                                                                                                                                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `evals.json`      | Add `eval-autism-fractions` (id 12) and `eval-neurotypical-fractions` (id 13). Each prompt specifies the profile; `expected_output`/`expectations` assert `metadata.audience` and `metadata.accessibility`.                                                                  |
| `schema.test.mjs` | Bump hardcoded `data.evals.length` from `11` → `13` (line 23). Add: (1) each new eval declares its profile in prompt + expected_output; (2) **contrast assertion** — the autism eval's `expectations` require `accessibility` tags that the neurotypical eval's do not (D3). |

**Acceptance:** `node --test skills/openedu-course-authoring/evals/schema.test.mjs` passes.

### PR 7 — Docs cleanup + final verification

| File                                      | Change                                                                                                                                         |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `skills/openedu-course-authoring/SPEC.md` | DELETE (superseded — D7).                                                                                                                      |
| `docs/superpowers/specs/SKILL-SPEC.md`    | Update §6.1 to reflect resolved field names (`audience` + `accessibility`, `targetAudience` retained) and mark §10 compiler question resolved. |
| `references/profiles.md`                  | NEW — one-page index of the four profiles + delta semantics (optional but recommended).                                                        |

**Acceptance:** `pnpm lint`, `pnpm typecheck`, `pnpm --filter @open-edu/course-compiler test`, and `node --test` on both skill test dirs all pass.

---

## 5. `profiles.config.json` Schema (v1)

```jsonc
{
  "schemaVersion": 1,
  "defaultProfile": "neurotypical",
  "profiles": {
    "neurotypical": {
      "name": "Neurotypical",
      "audience": "neurotypical",
      "accessibility": [],
      "difficultyBias": null,
      "pacingRangeMinutes": [15, 45],
    },
    "autism": {
      "name": "Autism Spectrum",
      "audience": "autism",
      "accessibility": ["sensory-friendly", "predictable-structure", "literal-language"],
      "difficultyBias": "beginner",
      "pacingRangeMinutes": [10, 30],
    },
    "school": {
      "name": "School (K-12)",
      "audience": "school",
      "accessibility": [],
      "difficultyBias": null,
      "pacingRangeMinutes": [15, 45],
    },
    "college": {
      "name": "College / Adult",
      "audience": "college",
      "accessibility": [],
      "difficultyBias": null,
      "pacingRangeMinutes": [20, 60],
    },
  },
}
```

- `pacingRangeMinutes` are advisory defaults for the LLM (guidance), not hard constraints enforced by scripts in v1.
- `preferredWidgets`/`restrictedWidgets` arrays are reserved for a later catalog review (SKILL-SPEC §10 Q4); omit them in v1 rather than leaving empty noise. Add them only once PR 3's catalog review completes.

---

## 6. `profile-autism.md` — ALX 2.0 derivation

| ALX principle                 | Delta type        | Content                                                                                                         |
| ----------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------- |
| ALX-1 Predictability          | Guidance          | Fixed lesson structure; never vary flow; state "what comes next" explicitly.                                    |
| ALX-3 One Concept at a Time   | Guidance + Output | One objective/task per activity; split multi-concept lessons.                                                   |
| ALX-5 Safe Mistakes           | Output            | Feedback language "Let's try again" / "Count one more time"; never "Wrong"/"Incorrect".                         |
| ALX-6 Controlled Sensory      | Output            | `accessibility` tags; avoid flashing/autoplay references.                                                       |
| ALX-7 Routine-Based Learning  | Output            | Strict activity order: observe → guided_practice → independent_practice → mastery_check → positive_completion.  |
| ALX-11 Transition Preparation | Guidance          | End each activity with explicit "next:" orientation.                                                            |
| ALX-13 Errorless Learning     | Guidance          | Build confidence before challenge; high early success.                                                          |
| ALX-14 Shaping                | Guidance          | Break complex skills into sub-steps (task decomposition).                                                       |
| §18 Language Guidelines       | Guidance          | Literal, 5–12 word sentences, no idioms/sarcasm/metaphor.                                                       |
| §19 AI Tutor Guidelines       | Guidance          | Teaching sequence show → explain → practice; neutral praise ("You counted correctly", never "You're a genius"). |
| ALX-8 / ALX-15                | Guidance          | Mastery-based, no leaderboards/excessive gamification in rewards/cards.                                         |

Output deltas in `profile-autism.md`:

- `metadata.audience = "autism"`
- `metadata.accessibility = ["sensory-friendly", "predictable-structure", "literal-language"]`
- `metadata.difficulty` bias toward `beginner` unless explicitly overridden.

---

## 7. Test Plan

| Layer          | File(s)                                                     | Assertions                                                           |
| -------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| Compiler unit  | `packages/course-compiler/src/schemas/course-model.test.ts` | strict schema accepts/rejects `audience`+`accessibility`.            |
| Compiler parse | `packages/course-compiler/src/parser/*.test.ts`             | new fields survive JSON→model.                                       |
| Skill unit     | `scripts/__tests__/profiles.test.mjs`                       | resolve/normalize/default/map.                                       |
| Skill unit     | `scripts/__tests__/validate-course-spec.test.mjs`           | optional `audience`/`accessibility` accepted; malformed rejected.    |
| Skill unit     | `scripts/__tests__/summarize-quality.test.mjs`              | profile-scoped checks gated on `audience`.                           |
| Skill unit     | `scripts/__tests__/quality-report.test.mjs`                 | `summary.learnerProfile` present with `{ key, name, source }`.       |
| Evals          | `evals/schema.test.mjs`                                     | count 13; contrast assertion autism≠neurotypical on `accessibility`. |

---

## 8. Verification Commands

```bash
# Compiler
pnpm --filter @open-edu/course-compiler test

# Skill unit tests (node:test, NOT vitest)
node --test skills/openedu-course-authoring/scripts/__tests__/

# Eval schema
node --test skills/openedu-course-authoring/evals/schema.test.mjs

# Full monorepo gates
pnpm lint
pnpm typecheck
```

Manual smoke: run the skill against "teach fractions" with `learnerProfile=autism` and `neurotypical`, then `edu compile --validate` both; confirm both compile and the autism package's `metadata.accessibility` is populated while the neurotypical package's is empty.

---

## 9. Risks & Open Items

1. **`audience` vs `targetAudience` redundancy** — resolved to add `audience` (key) alongside existing `targetAudience` (prose). Revisit if downstream tooling finds the split confusing.
2. **Widget catalog allowlists** (SKILL-SPEC §10 Q4) — deferred; needs catalog review before PR 5's `QC-ACC-07` can make concrete "calmer alternative" recommendations. In v1, `QC-ACC-07` is advisory (`info`) using existing catalog `accessibility` metadata only.
3. **Profile composition** (`autism` + `college`) — out of scope v1; the delta format (`set`/`add`/`restrict`/`prefer`) leaves room but merging is not implemented.
4. **Stale `SPEC.md`** — removed in PR 7; do not merge PRs 2–6 referencing it.

## 10. Definition of Done

- All four `profile-*.md` files exist; autism profile fully derived from ALX 2.0.
- `profiles.mjs` + `profiles.config.json` ship with unit tests.
- Compiler propagates `audience` + `accessibility` to the compiled model (verified by test).
- `quality-report.json` records `summary.learnerProfile`.
- Profile-scoped QC checks fire only for their profile.
- Evals pass including the autism-vs-neurotypical contrast assertion.
- `pnpm lint`, `pnpm typecheck`, and all listed test commands pass.
