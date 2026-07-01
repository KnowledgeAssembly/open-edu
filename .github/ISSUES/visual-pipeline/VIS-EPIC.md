---
name: '🏛️ Epic: Visual & Engaging Pipeline Output'
title: '[Epic] Visual & Engaging Pipeline Output'
labels: ['type:epic']
---

# Epic: Visual & Engaging Pipeline Output

## Objective

Transform the auto-generated course pipeline from producing plain-text lessons to generating visually rich, interactive educational content. The LLM-driven pipeline will choose appropriate widgets per activity, and the output format will support both human-readable markdown and machine-consumable JSON.

## Context

The current pipeline (`packages/pipeline/`) generates `course-spec.md` files with 5 text-only activities per concept (observe → guided_practice → independent_practice → mastery_check → positive_completion). None of the LLM prompts ask for images, diagrams, tables, or interactive elements. The `supports.visual` field on `GeneratedConcept` is populated during concept enrichment but never used downstream.

Meanwhile, the OpenEdu runtime already supports **14 interactive widgets**, Markdown images/tables, and 6 themes — but the pipeline never generates any of these. Content remains text-only and unengaging.

## Design Decisions

1. **LLM chooses the widget, not code** — Each LLM prompt describes available widgets and lets the LLM decide per concept, per step. Scales to new subjects and widgets without code changes.
2. **JSON output alongside markdown** — Widget configs are complex nested objects. The pipeline outputs both `course-spec.md` (human view) and `course-spec.json` (canonical structured data). The course-compiler reads JSON directly.
3. **Widget config validation at pipeline level** — After the LLM emits a widget config, the pipeline validates it against the widget's own Zod schema. Invalid configs fall back to a `reading` activity.
4. **Widget activity = exercise node** — In the compiled package, widget activities become JSON nodes with `{ type: "exercise", widget: "...", config: {...} }`. The runtime already handles this format.
5. **Type-selector deleted** — The hardcoded `type-selector.ts` is removed since the LLM selects types dynamically.

## Technical Notes & Constraints

- The pipeline and course-compiler are separate packages (`@open-edu/pipeline` and `@open-edu/course-compiler`). Changes must respect this boundary.
- Widget Zod schemas live in `@open-edu/widgets`. The pipeline must import them for validation, but should not take a runtime dependency on React.
- The `course-spec.json` format (`openedu-course-spec` v1) is a new schema. It must be validated with Zod in the course-compiler.
- No runtime changes are needed — the widget JSON format (`{ type: "exercise", widget, config }`) is already handled by the existing `WidgetRenderer`.

## Target Deliverables & Stories

- [ ] **VIS-01**: Add `widget` type to pipeline types
- [ ] **VIS-02**: Update LLM prompts with widget catalog + visual instructions
- [ ] **VIS-03**: Add widget content schema + validation to activity generator
- [ ] **VIS-04**: Delete `type-selector.ts` (LLM now chooses type)
- [ ] **VIS-05**: Add JSON output renderer to pipeline
- [ ] **VIS-06**: Wire JSON output into CLI + graph
- [ ] **VIS-07**: Add WidgetActivitySchema to course-compiler
- [ ] **VIS-08**: Create JSON input parser for course-compiler
- [ ] **VIS-09**: Auto-detect `.json` input in course-compiler CLI
- [ ] **VIS-10**: Generate widget JSON nodes in package-generator
- [ ] **VIS-11**: Build exemplars + test the full pipeline
- [ ] **VIS-12**: Markdown output renders widget badge (instead of raw JSON)

## Validation Strategy

Each story must pass `pnpm build && pnpm test && pnpm lint && pnpm typecheck` for its package(s). Story VIS-11 provides an integration test verifying end-to-end. Manual verification: compile an EVS course spec with `--format both` and verify both `.md` and `.json` files contain widget activities.

## Validation Strategy

- Each story must pass `pnpm build && pnpm test && pnpm lint && pnpm typecheck` for its package
- Story VIS-11 provides an integration test verifying end-to-end pipeline → compile → output
- Manual verification: compile an EVS course spec with `--format both` and verify both `.md` and `.json` files contain widget activities

## References

- [Detailed story breakdown](docs/EPIC_VISUAL_PIPELINE.md)
- [AGENTS.md](../../AGENTS.md)
- [Pipeline source](../../packages/pipeline/src/)
- [Course-compiler source](../../packages/course-compiler/src/)
- [Widget source](../../packages/widgets/src/)
