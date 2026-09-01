# ADR-0009 — Single Source for Course-Authoring Guidance

## Status

Proposed

## Date

2026-09-01

_Revised 2026-09-01 after architecture review: added the derivation rule, resolved widget rules against the existing catalog, added the versioning model and consumer sequencing, and moved implementation detail to the plan document._

## Context

OpenEdu ships two distinct "skill" systems that share the word _skill_ but serve different consumers:

1. **`skills/openedu-course-authoring/`** — an external _agentic skill package_ for AI coding agents. Markdown references plus `.mjs` helper scripts encode a full course-authoring workflow: staged generation, four learner profiles with Guidance/Output deltas, widget-selection rules, the artifact contract (`course-spec.json`), the quality rubric, and bundle/rewards authoring.

2. **`@open-edu/companion`'s `CompanionSkill`** — a typed runtime structure consumed by the dev-server agent loop to adapt model behavior per request. Today only `learner-adaptation` exists, and it is not yet wired into the live chat loop (the chat handler does not pass `skills` to the agent loop; the mechanism is exercised only by tests).

These are different mechanisms and both remain. The problem is duplicated **content**:

- **Widget selection** — the _data_ is already shared: both sides read the generated `widget-catalog-data.json`, which carries `status`, `deprecated`, `replacement`, `learningIntents`, and per-widget AI generation hints. What is duplicated is the _interpreter logic_ (canonical/deprecated/replacement semantics implemented once in the skill's scripts and once in the dev-server's prompt/catalog guards) plus hand-written selection guidance in the skill's references.
- **Artifact contract** — the authoritative schema lives in `@open-edu/course-compiler` (Zod, enforced at compile time). The skill's `artifact-contract.md` and the companion's hardcoded prompt-contract text are two hand-maintained _descriptions_ of that schema.
- **Profiles** — the four learner profiles and their machine-checkable knobs live only in the skill (profile references plus `profiles.config.json`); the companion branches on learner context with no shared profile content.
- **Quality rubric** — rubric dimensions and thresholds are encoded in the skill's quality-report scripts and separately in the Studio quality mapping.

There is no single place to change a rule ("this widget is deprecated", "this field is now required", "this profile's pacing changed") and have both consumers stay correct. The two descriptions drift.

The `CompanionSkill` runtime mechanism itself is **not** in scope — it is a different abstraction (runtime adaptation of tool access/instructions) from the external authoring skill (a content-generation playbook).

## Decision

Introduce **one canonical data source** — a shared, format-agnostic guidance data package — that both consumers render against, while keeping the two skill _mechanisms_ separate.

### Location

Create a new shared workspace package: **`@open-edu/domain-guidance`**.

Rationale: it must be importable by the companion (TypeScript/Zod, within the monorepo) and readable by the external skill's `.mjs` scripts (which run inside a detected OpenEdu repo). JSON persisted data with a TypeScript reader satisfies both. It also keeps the canonical data out of `apps/` (where the runtime consumer lives) and out of `skills/` (which is a shipping artifact for external agents, not a source of truth).

### Derivation rule (the central constraint)

`@open-edu/domain-guidance` is a **chokepoint for rendering, not a second author of truth**. Every block has exactly one authoritative owner — the package that _enforces_ the rule at runtime. `domain-guidance` derives and renders; it never re-declares.

| Block                          | Authoritative owner                                                    | `domain-guidance`'s role                                         |
| ------------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Artifact contract              | `@open-edu/course-compiler` (Zod schemas)                              | Derive a JSON view from the schemas; regenerate on schema change |
| Widget selection & deprecation | Widget catalog pipeline (`widget-catalog-data.json` enrichment fields) | No parallel file. Render views from catalog data                 |
| Learner profiles               | `@open-edu/domain-guidance` (absorbs `profiles.config.json` + deltas)  | Canonical home                                                   |
| Quality rubric                 | `@open-edu/domain-guidance` (dimensions, thresholds, messages)         | Canonical home                                                   |

Consequences of this rule:

- The artifact-contract JSON is **generated from the course-compiler Zod schemas**. CI fails if it is out of sync; hand-editing it is a build break, not a quiet drift. Without this rule, `domain-guidance` would become a third drifting copy of the spec — the very disease this ADR cures.
- **No parallel widget-rules file is created.** Widget selection rules remain enrichment fields on the catalog data both sides already read (`status`, `deprecated`, `replacement`, `learningIntents`, AI generation hints). The duplicated interpreter logic is aligned by **shared fixture tests** that run the same catalog fixtures through both interpreters (TypeScript and `.mjs`) — a new data file would duplicate data that is already shared while leaving the logic duplication untouched.
- Profiles and rubric content move into `domain-guidance` as their first canonical home; today they exist only inside the skill.

### Generation model

The canonical store is JSON with Zod schemas (repo rule: schemas are the source of truth). A single generator produces:

1. The external skill's human-readable `references/` views (artifact contract, profiles, quality rubric) — generated, committed, never hand-edited.
2. Prompt-contract snippets the companion imports, replacing hardcoded contract text in prompt sources.

### Versioning & snapshots

The ADR's thesis is "both consumers agree." Snapshots introduce a third disagreement axis — time — so the versioning model is explicit:

- Each block carries a `schemaVersion` (precedent: `profiles.config.json`'s `schemaVersion: 1`). Bump on incompatible shape changes; additive fields may ship without a bump.
- Generated views are **committed** so the skill directory remains a stable shipping artifact with no build dependency. CI verifies freshness — regeneration must produce no diff (the same discipline as `format:check` and the widget catalog's `generate:catalog` flow).
- Portable mode ships a bundled snapshot of the guidance JSON with its recorded data version. When the skill runs in repository mode and finds a newer `schemaVersion`, it prefers repo data and reports the snapshot version in the quality report rather than silently disagreeing.

### Consumer sequencing

Consumers migrate in order of **live wiring**, so no data is built for a mechanism that is not yet reachable:

1. **Companion prompt layer first** — it is wired today. The hardcoded course-spec prompt contract is replaced by generated snippets; widget sections render from the shared catalog data (already true); profile and rubric text comes from `domain-guidance`.
2. **External skill references second** — the skill's Markdown references become generated views, and portable mode bundles the versioned snapshot.
3. **Companion skill resolution last** — `learner-adaptation` consuming profile guidance is gated on two prerequisites: pass `skills` to the agent loop in the live chat handler, and give the Studio context a learner value — the _target_ profile the author selects for the course being authored. The Studio is a teacher-authoring product with no live learner, and nothing populates that context field today; wiring the resolver alone would resolve nothing. The mechanism exists and is tested; it is not connected, and its trigger has no source.

## Rationale

- **One edit, both consumers correct.** A deprecation or schema change is made once at the authoritative owner and regenerated everywhere, eliminating divergent drift between the external skill and the companion.
- **No third source of truth.** The derivation rule keeps enforcement and declaration in the same place: the schema lives where it is validated (`course-compiler`), the widget rules live where the catalog is generated. `domain-guidance` only renders views of them.
- **Respects the format boundary.** The runtime never parses Markdown; external agents never import TypeScript. JSON is the lowest common denominator both sides already handle.
- **Keeps mechanisms separate.** `CompanionSkill` (runtime tool/instruction adaptation) stays as-is; only the _content_ it and the external skill draw from is unified.
- **Aligns with repo rules.** Zod schemas as source of truth, packages self-contained via published exports, sync guards in CI.
- **Scoped, testable stories.** Each consumer migration is small and independently testable (Vitest for the companion; the skill's existing script tests plus new shared fixture tests for the external side).

## Alternatives Considered

### Make `skills/openedu-course-authoring/` the single source of truth

Keep the canonical data only inside the skill (Markdown + its scripts), and have the companion read/parse it.

Rejected: the companion is bundled TypeScript in the monorepo; parsing Markdown at runtime or build time is fragile and slow, and couples a browser/server bundle to a shipping artifact. The skill directory is a delivery format, not a stable import surface.

### Make `@open-edu/companion` the single source of truth

Keep canonical data inside the companion package and generate the skill's references from ESM.

Rejected: the external skill must run standalone inside an arbitrary detected repo without assuming the companion is built/importable. Putting the source in the companion forces external agents to depend on a heavier TS build just to read guidance.

### Duplicate-free but no new package — put data in `packages/core`

Add the guidance data to `@open-edu/core`.

Rejected: `@open-edu/core` is a large, load-bearing package; the guidance dataset has a distinct lifecycle (frequent content edits, independent generation) and a distinct consumer (external skill scripts) that does not belong to "core." A small dedicated package keeps blast radius and build churn contained.

### A parallel `widget-rules.json` inside `domain-guidance`

Create a dedicated widget-selection rules file alongside the catalog.

Rejected: the widget _data_ — including deprecation, replacement, and AI generation hints — is already shared via `widget-catalog-data.json`, which both consumers read. A parallel rules file would duplicate shared data and still leave the two interpreter implementations separate. Shared fixture tests over the existing catalog address the actual duplication (interpreter semantics) without a new file.

### Re-declare the artifact contract as hand-maintained JSON

Author `artifact-contract.json` by hand inside `domain-guidance`, treating it as the new source of truth.

Rejected: the course-spec schema is _enforced_ by `@open-edu/course-compiler` at compile time. A hand-maintained JSON copy would drift from the enforcing schema exactly as the current Markdown and prompt text do — replacing two drifting descriptions with three. The contract view must be derived from the enforcing schemas.

### "Just document the two systems" (no shared data)

Keep the ADR as description only, and let the two systems continue duplicating content.

Rejected by the scope decision: this addresses comprehension but not the actual drift. The whole point is a single authoritative source for the _content_.

## Consequences

### Benefits

- Single place to update course-authoring domain knowledge; divergence eliminated.
- External skill `references/*.md` become generated views, removing manual sync.
- Companion prompts and tools draw field requirements and widget rules from the same store.
- Schema-owning packages stay authoritative; `domain-guidance` cannot silently fork the truth because CI regeneration guards every derived block.
- Profiles and rubric gain their first canonical home with explicit versioning.
- Each block is independently versioned and testable; shared fixtures keep the two widget interpreters semantically aligned.
- Aligns with existing package/repo conventions (Zod schemas, published exports, Vitest, committed generated artifacts).

### Trade-offs

- New workspace package and a build step; requires a `pnpm build` before consumers resolve it (consistent with existing workspace packages).
- The external skill must resolve a workspace package in repository mode; portable mode falls back to the bundled, versioned snapshot.
- Migration effort: prompt sources and skill references change to read the shared store; profile and rubric content must be extracted from Markdown once.
- The artifact-contract derivation adds a generator dependency on `@open-edu/course-compiler`'s schema exports; schema changes now require a regeneration step (CI-enforced, so failures are loud rather than latent).
- Initial extraction is a one-time content migration with review burden.

## Related Documents

- `skills/openedu-course-authoring/SKILL.md` and its `references/`, `scripts/`
- `packages/companion/src/skill.ts` (`CompanionSkill`, `SkillRegistry`, `SkillResolver`)
- `apps/dev-server/src/studio/ai/` — agent loop, skill registry, prompts, chat handler
- `apps/dev-server/src/studio/widgets/curatedCatalog.ts`
- `packages/course-compiler/src/parser/json-input.ts` (authoritative course-spec schema)
- `packages/core` widget catalog data (`widget-catalog-data.json` and its `generate:catalog` pipeline)
- `docs/AI_COMPANION_REQ_SPEC.md` (spec §11 registry, §13 resolver)
- `docs/STUDIO-AI-COMPANION-SPEC.md`
- Implementation plan: `docs/superpowers/plans/2026-09-01-domain-guidance-consolidation.md`

---

_Guidance has one home. Schemas live where they are enforced; everything else is a view._
