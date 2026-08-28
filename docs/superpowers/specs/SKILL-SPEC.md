# Spec Plan: Multi-Profile Variants for the Open-Edu Course Authoring Skill

Status: Draft for review
Scope: `skills/openedu-course-authoring/`
Feature: Support four student-profile variants of the authoring skill — `neurotypical`, `autism`, `school`, `college` — that vary **both** the authoring guidance the agent follows **and** the content it produces.

---

## 1. Problem Statement

Today the skill is single-profile. It interviews the user for learner level and accessibility needs (SKILL.md:26, authoring-workflow.md:9), but every run follows the same guidance and produces content with the same default choices (vocabulary, pacing, sentence length, examples, widget selection, assessment format).

Different learner profiles need measurably different output:

- **Autism spectrum** → short unambiguous sentences, literal language, concrete examples, predictable structure, sensory-friendly widgets, explicit instructions, reduced metaphor/idiom, longer scaffolding, patience with pacing.
- **Neurotypical** → standard default (current behavior).
- **School/College** → age-graded register, curriculum-aligned objectives, academic rigor, formal register at college level.

The goal is for the same topic to be authored differently per profile, while still conforming to the same canonical Open-Edu artifact contract, compiler, and validation pipeline.

## 2. Design Decision

Adopt the **hybrid approach (C)**: a single shared skill core with **profile-specific reference files** (`references/profile-*.md`) that encode layered deltas (guidance + output). The core `SKILL.md` stays thin and dispatches to the selected profile.

Rationale (vs. alternatives):

- **A — sibling skills per profile:** rejects — duplicates the shared flow (~100 lines + scripts + evals), risks drift, expensive to maintain as profiles grow.
- **B — single file with inline branches:** rejects — SKILL.md grows unreadable once profiles have distinct lexicon tables, widget subsets, and rubric variations.
- **C — single core + profile references:** accepts — single source of truth for shared flow, isolated per-profile content, one-file add for future profiles, and naturally handles the "both guidance and output" requirement.
- **E — templated skill generation:** defer — only if profiles multiply (10+). Not needed now.

## 3. Profiles

Initial profiles:

| Profile key    | Description                        | Relationship |
| -------------- | ---------------------------------- | ------------ |
| `neurotypical` | Default; current skill behavior.   | `default`    |
| `autism`       | Autistic learners.                 | independent  |
| `school`       | School-age learners (K-12).        | independent  |
| `college`      | Higher-education / adult learners. | independent  |

> Profile **composition** (e.g. `autism` + `college`) is future work. The reference file format must make deltas composable (see §7) so combinations can merge instead of override, but the first iteration supports single-profile selection only.

## 4. User-Facing Input

A new `learnerProfile` field is added to the Stage 1 interview (authoring-workflow.md:26).

- Sequence: Ask for this _after_ Learner Age/Level, as the age might naturally imply the profile (e.g. school vs college).
- Validation: Require the profile when a `learnerProfile` isn't clearly inferable, matching Critical Rule 3.
- Valid values: `neurotypical | autism | school | college` (first iteration; case-insensitive).
- Default (if inferred/omitted): `neurotypical`.
- Every profile selection (or default) is recorded explicitly in `course-brief.md` under a new `## Learner Profile` section.
- If the user names a profile not yet supported, the skill maps it to the closest supported profile and records the mapping as an assumption (and asks a clarifying question where ambiguous).

## 5. Architecture

### 5.1 File layout

```
skills/openedu-course-authoring/
├── SKILL.md                              # thin dispatch core (edit)
├── references/
│   ├── authoring-workflow.md             # shared stages (edit: add profile step)
│   ├── artifact-contract.md              # unchanged (canonical contract shared)
│   ├── quality-rubric.md                 # add per-profile rubric checks (edit)
│   ├── profile-neurotypical.md           # NEW: baseline/default deltas
│   ├── profile-autism.md                 # NEW
│   ├── profile-school.md                 # NEW
│   ├── profile-college.md                # NEW
│   └── ... (existing refs unchanged)
├── scripts/
│   └── profiles.mjs                      # NEW: resolution + delta lookup (shared by helpers)
├── evals/
│   └── . (extend evals.json + schema.test.mjs; add per-profile evals)
└── (This spec is hosted in `docs/superpowers/specs/SKILL-SPEC.md`)
```

### 5.2 SKILL.md (thin core)

- Add a `learnerProfile` note to the Quick Start + a "Profiles" section listing supported profiles and pointing to `references/profile-*.md`.
- Keep the Modes, Critical Rules, References, Scripts, and Source-Material Pipeline sections intact — these are shared.
- Dispatch instruction: "Select the matching `profile-<key>.md` in Stage 1 and apply its **Guidance Deltas** to every authoring stage and its **Output Deltas** to every generated artifact."

### 5.3 Reference file contract — `references/profile-*.md`

Each profile file has two sections plus metadata:

```
# Profile: <name>
- key: <profile-key>
- default: true|false
- description: ...

## Guidance Deltas   (how the agent authors)
- vocabulary / reading level
- sentence length / complexity
- pacing (per-lesson duration guidance, scaffolding depth)
- examples (concrete vs abstract; domain choices)
- misconception framing
- activity progression adjustments
- widget selection preferences
- assessment format preferences
- language rules (literal vs idiomatic; avoid implied meaning)

## Output Deltas     (what the artifacts must encode)
- metadata.audience            (recommended value)
- metadata.accessibility       (recommended values)
- metadata.difficulty          (mapping rule, if any)
- lesson.estimatedMinutes      (per-profile pacing ranges)
- lesson.examples style
- activity.instructions style  (register, length)
- quiz question style          (option phrasing, ambiguity rules)
- widget selection allowed set / preferred subset from catalog
- (optional) rewards/cards framing per profile
```

Delta semantics:

- Each delta uses one of: `set` (override), `add` (append), `restrict` (constrain), `prefer` (ordering).
- There is an implicit **base layer** (the default behavior of the skill without any profile applied).
- `profile-neurotypical.md` is a specific profile delta that happens to align closely with the base layer, but is conceptually separate. It should contain only specific overrides for neurotypical learners that shouldn't be forced on the global base layer.
- `autism`/`school`/`college` list changes from the base layer. This keeps files minimal and makes composition (future) trivial (merge deltas by `set`-last / `add`-union / `restrict`-intersect / `prefer`-concat).

### 5.4 Shared resolution helper — `scripts/profiles.mjs`

- `resolveProfile(userInput): { key, file }` — normalizes input, validates against known keys, falls back to `neurotypical`.
- `loadProfileConfig(key): ProfileConfig` — parses `profiles.config.json` for machine-checkable settings.
- Exposed via `openedu-adapter.mjs` patterns (all helpers import the shared adapter).

> Decision note: deltas could live as structured YAML/JSON front-matter in `profile-*.md` (human-readable + machine-parseable) OR be embedded as prose and applied only by the LLM. **Decision:** keep the `profile-*.md` as human/LLM prose (primary) for guidance deltas, and add a small `profiles.config.json` with the machine-checkable knobs (allowed widget list, difficulty mapping, pacing ranges) so scripts can enforce/report profile compliance mechanically. `profiles.mjs` ONLY loads the JSON config, it does not attempt to parse or "apply" the prose guidance deltas — only the LLM does that.

## 6. Artifact & Validation Impact

### 6.1 New metadata fields (optional, forward-compatible)

Extend `course-spec.json` `metadata` with:

- `audience: string` (machine-readable profile key) — `"autism"`, `"neurotypical"`, `"school"`, `"college"`. Validated against the `profiles.config.json` keys.
- `accessibility: string[]` (accessibility tags) — e.g. `["sensory-friendly", "predictable-structure", "literal-language"]`.
- `targetAudience: string` is **retained** as the human-readable prose field (e.g. "8–10 year old students").

_Resolved (PR 1):_ the compiler now forwards `audience`, `accessibility`, `targetAudience`, `keywords`, and `lastUpdated` from `course-spec.json` into the compiled `CourseModel.metadata`, so the fields survive into the `package/`. Both `audience` and `accessibility` are **optional** and additive — existing packages are unaffected.

### 6.2 Quality rubric — per-profile checks

`quality-rubric.md` gains profile-scoped checks, evaluated by `summarize-quality.mjs` when a profile is set:

- `QC-ACC-05` (autism) — instructions use literal, unambiguous language (no idiom/metaphor where avoidable). `warning`
- `QC-ACC-06` (autism) — content is chunked into short, predictable segments. `warning`
- `QC-ACC-07` (autism) — widget selection avoids high-sensory-load defaults where a calmer alternative exists. `info`
- `QC-SCH-01` (school) — objectives and examples are age/grade-appropriate. `warning`
- `QC-COL-01` (college) — register is academic; objectives are rigorous. `info`

> **Note on check overlap:** These profile-scoped checks _supplement_ (do not replace) the universal checks. For example, `QC-ACC-01` (plain language) still runs and returns a warning if violated, but `QC-ACC-05` acts as a stricter profile-specific add-on check for literal phrasing.

`summarize-quality.mjs` reads the profile key (from `course-spec.json` metadata or an env/flag) and only runs checks whose scope includes that profile. The quality report (`quality-report.json`) records the active profile and per-profile check results.

### 6.3 Quality report additions

`quality-report.json` `summary` gains:

- `learnerProfile: { key, name, source: "explicit|defaulted|mapped" }`
- Profile-scoped findings tagged with their profile.

## 7. Edge Cases & Composition (future)

- **Unknown profile** → map to closest supported; record as assumption; signal in quality report `source: "mapped"`.
- **Composition** (`autism` + `college`) → merge deltas; `restrict`-intersect and `prefer`-concat resolve conflicts; conflicts flagged as `info`. Landed in later iteration (out of scope now but format must support it).
- **Profile × locale** (e.g. Spanish autism) → deltas compose with locale; out of scope now, format must not conflict.
- **Single-profile selection only** in v1; guarantees no merge complexity.

## 8. Testing Strategy

Every change must ship tests (Development Rule 1 / AGENTS.md).

- Unit (Vitest, `scripts/__tests__`):
  - `profiles.mjs` — `resolveProfile` normalization, default fallback, unknown-profile mapping, deltas merge (set/add/restrict/prefer).
  - `summarize-quality.mjs` — profile-scoped checks run only for the active profile; quality report records `learnerProfile`.
  - `validate-course-spec.mjs` — optional `audience`/`accessibility` metadata accepted.
- Evals (`evals/evals.json` + `schema.test.mjs`):
  - Add per-profile evals: `eval-autism-fractions`, `eval-school-fractions`, `eval-college-fractions` comparing output for the same topic across profiles.
  - **Contrast Eval:** Add an explicit test in `schema.test.mjs` asserting that the `autism` output structurally differs from the `neurotypical` output (e.g. asserts that `estimatedMinutes` per lesson is higher for autism, or checks `metadata.difficulty`).
  - Extend `schema.test.mjs` to assert each new eval declares its `learnerProfile` and expected profile in `expected_output`.
- E2E/manual: run the same prompt (e.g. "teach fractions") under two profiles against `edu compile --validate` in repository mode and confirm both compile cleanly.

## 9. Rollout Checklist (PR-by-PR)

1. **PR 1 — Core plumb-up (no behavior change):** add `learnerProfile` to interview + `course-brief.md` assumptions; record default `neurotypical`; add `metadata.audience`/`accessibility` passthrough; add `scripts/profiles.mjs` with `neurotypical` only. Tests.
2. **PR 2 — Profile reference contract:** author `references/profile-*.md` skeleton for all four profiles (baseline `neurotypical` + deltas for others). Tests (deltas parse/merge).
3. **PR 3 — Guidance/output application:** wire deltas into the authoring flow and output generation; SWITCH default stays `neurotypical`. Tests.
4. **PR 4 — Per-profile rubric + reporting:** profile-scoped `QC-*` checks in `summarize-quality.mjs`; report gains `learnerProfile`. Tests.
5. **PR 5 — Evals:** add per-profile evals + extend `schema.test.mjs`; run full eval suite.
6. **PR 6 — Docs:** update SKILL.md sections (Quick Start, Modes, References, and new Profiles section), add a `references/profiles.md` overview (optional), confirm `pnpm lint`, `pnpm typecheck`, `pnpm test`.

## 10. Open Questions

_(Resolved)_

- **Should `audience`/`accessibility` metadata be emitted unconditionally in v1?**
  - _Decision:_ Yes, emit unconditionally. This aids downstream tooling observability and ensures the format is consistent regardless of profile.
- **Does the course-compiler tolerate unknown optional metadata fields?**
  - _Decision (resolved in PR 1):_ confirmed — the compiler previously _stripped_ unknown metadata (dropping `audience`/`accessibility` silently). Propagation was made explicit: the JSON input schema now accepts the fields and the reconstruction forwards them into the compiled model. No gate/whitelist needed.
- **Should the interview _require_ a profile or always default silently to `neurotypical`?**
  - _Decision:_ Require when a `learnerProfile` isn't inferable, matching Critical Rule 3. This was incorporated into §4.
- **Which widget IDs belong in the "allowed/preferred" set per profile?**
  - _Decision:_ To be determined by a catalog review during PR 3 implementation.

---

_This is a spec plan for review — no implementation has been performed._
