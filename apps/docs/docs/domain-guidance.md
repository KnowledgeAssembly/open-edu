---
sidebar_position: 19
---

# Authoring Domain Guidance (`@open-edu/domain-guidance`)

`@open-edu/domain-guidance` is the canonical home for **course-authoring domain knowledge** shared between the `openedu-course-authoring` skill and the Course Creator Studio AI. It renders, it never re-declares: schema-owning packages stay authoritative.

## What it provides

- **Learner profiles** (`src/data/profiles.json`) — the four profiles (`neurotypical`, `autism`, `school`, `college`) and their machine-checkable knobs, plus a browser-safe `@open-edu/domain-guidance/profiles` subpath used by the Studio.
- **Quality rubric** (`src/data/quality-rubric.json`) — dimensions, thresholds, and messages.
- **Generated artifact contract** — `artifact-contract.json` derived from the `@open-edu/course-compiler` Zod schemas, rendered by `src/generate.ts`.

## Generation discipline

The skill reference files under `skills/openedu-course-authoring/references/` (`profile-*.md`, `profiles.md`, `quality-rubric.md`, `artifact-contract.md`) are **generated output**. Regenerate and verify no diff in CI:

```bash
pnpm --filter @open-edu/domain-guidance generate
```

See `openedu-way/ADR-0009-unified-course-authoring-guidance.md` for the design decision.
