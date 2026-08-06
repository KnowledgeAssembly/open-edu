# Course Creator Studio — Phases 2–4 Plan Index

**Date:** 2026-08-05  
**Spec:** [`docs/superpowers/specs/2026-08-05-course-creator-studio-design.md`](../specs/2026-08-05-course-creator-studio-design.md)  
**Foundation plan:** [`2026-08-05-course-creator-studio-phase0-1.md`](./2026-08-05-course-creator-studio-phase0-1.md)

Phases 2–4 are separate implementation plans (independent subsystems, sequential product dependencies).

| Phase | Plan                                                                                         | Ships                                                              |
| ----- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **2** | [`2026-08-05-course-creator-studio-phase2.md`](./2026-08-05-course-creator-studio-phase2.md) | Practice widgets, guided branching, guided rewards/cards           |
| **3** | [`2026-08-05-course-creator-studio-phase3.md`](./2026-08-05-course-creator-studio-phase3.md) | AI generate-from-notes, review/quality checklist, offline fallback |
| **4** | [`2026-08-05-course-creator-studio-phase4.md`](./2026-08-05-course-creator-studio-phase4.md) | Course library, light units/bundles, import, share kit             |

## Recommended order

```text
Phase 0–1 (foundation) → Phase 2 → Phase 3 → Phase 4 → Phase 5 (hosted, future)
```

Phase 3 does not strictly require Phase 2 (AI can draft lessons/quizzes without widget picker). Phase 4 does not require Phase 3. For the full teacher surface in the design spec, implement 2 then 3 then 4.

## Shared constraints (all phases)

- Creator UI: `@open-edu/design-system` + `--oe-*` tokens only
- Copy: `studio` i18n namespace
- Same on-disk OpenEdu packages; Creator is a façade
- Extend `StudioAPI` / Vite local adapter for hybrid readiness
- Tests required per story/module

## Explicitly not in 2–4

- Phase 5 hosted Studio (auth, cloud storage, collaboration)
- Full LMS (rosters, grades, assignments)
