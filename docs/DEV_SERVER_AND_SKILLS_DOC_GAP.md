# Documentation Gap Analysis & Fix Plan — `apps/dev-server` & `skills`

**Created:** 2026-09-02
**Ground truth:** code at HEAD (`40bab7f`), git log, `docs/superpowers/specs/` + `docs/superpowers/plans/`, OpenWiki `.last-update.json`.
**Surfaces audited:** `apps/docs` (Docusaurus), root `README.md`, `openwiki/`, root `AGENTS.md`.
**Subjects:** `apps/dev-server` (OpenEdu Course Creator Studio) and the agentic course-authoring skills (`skills/openedu-course-authoring/` + `packages/cli/skills/`).

---

## Executive summary

The biggest gap is existential, not cosmetic: **the Course Creator Studio's "Creator/Developer mode" model no longer exists in code, yet all four documentation surfaces still describe it.** The unified Studio view landed in `125a11e` (`feat(dev-server): unified Studio view with Outline | Files and preview DevTools`) and `40bab7f`, per spec `docs/superpowers/specs/2026-09-01-studio-unified-view-design.md` (which explicitly supersedes §3.4–3.5 of the Aug 5 Studio spec). `DevApp.tsx` always mounts `StudioApp`; `DevApp.test.tsx:93` asserts "does not render a studio mode toggle"; `CreatorPreview.tsx` now owns a DevTools drawer with `TelemetrySession` + `RewardBroker` + `InspectorPanel`; bundle authoring shows an unsupported empty state.

In parallel, three new workspace packages — **`@open-edu/companion`**, **`@open-edu/domain-guidance`**, **`@open-edu/logger`** — exist in code and are either barely or entirely undocumented. And the **skills surface has outgrown its docs**: 15 eval scenarios exist (docs say 9, the evals README itself says 11), learner profiles, bundle-authoring and rewards/cards references are missing from every outer surface, and the skill reference files are now **generated** from `@open-edu/domain-guidance` without that being noted anywhere except inside the generated files.

| #   | Gap                                                                                         | Apps/docs       | README     | OpenWiki   | AGENTS.md  | Severity     |
| --- | ------------------------------------------------------------------------------------------- | --------------- | ---------- | ---------- | ---------- | ------------ |
| G1  | Studio mode model obsolete (unified view)                                                   | ❌ stale        | ❌ stale   | ❌ stale   | ❌ stale   | **Critical** |
| G2  | `@open-edu/companion` / `domain-guidance` / `logger` undocumented                           | ❌ missing      | ❌ missing | ❌ partial | ❌ partial | **High**     |
| G3  | Skills surface outdated (evals count, profiles, references, generated-from-domain-guidance) | ❌ stale/broken | ❌ thin    | ❌ stale   | ❌ thin    | **High**     |
| G4  | `packages/cli/skills/` orphaned (no cross-links)                                            | ❌              | ❌         | ❌         | ❌         | Medium       |
| G5  | OpenWiki `.last-update.json` at 2026-07-19 → ~6 wks stale                                   | —               | —          | ⚠️         | —          | Medium       |
| G6  | `apps/docs/dev-server.md` bundle-mode section now misleading                                | ⚠️              | —          | —          | —          | Medium       |
| G7  | README dependency graph + Packages table incomplete for dev-server deps                     | —               | ⚠️         | —          | —          | Medium       |

---

## Detailed findings

### G1 — The mode model is obsolete (Critical)

Signal from spec/plan/impl: `docs/superpowers/specs/2026-09-01-studio-unified-view-design.md` ("There is no Creator/Developer mode toggle. `StudioApp` is the only shell."), `docs/superpowers/plans/2026-09-01-studio-unified-view.md`, commits `125a11e` + `40bab7f`.

**Current behavior (ground truth):**

- Single shell: **Home · Library · Outline · Preview · Share**.
- Outline page has **Outline | Files** page-local tabs (Files = package tree + typed/raw editors + asset upload).
- **Author Assistant** is pinned in `StudioLayout` across Outline and Files (same instance).
- Preview is the learner runtime with a collapsed-by-default **DevTools bottom drawer** (Telemetry · Logs · Rewards · A11y; Bundle only when bundle data is present).
- **No mode toggle.** `openedu.studio.mode` / `OPEN_EDU_STUDIO_MODE` are removed.
- **Bundles are unsupported** in Studio (empty state); old `BundleDevApp` is not mounted.

**Stale claims to fix:**

- `apps/docs/docs/course-creator-studio.md` — mode table (:9–12), "toggle is in the top bar and persists to `localStorage`" (:28), `## Creator mode` heading (:34), "no DevTools in Creator mode" (:62), `## Developer mode` section (:68–70).
- `apps/docs/docs/dev-server.md` — "In the Studio these tools live in **Developer mode**" (:7), "Creator/Developer modes" bullet (:27), full "Multi-Module Bundle Mode" section (:29–39).
- `README.md` — Quick Start comment (:27–28), Studio section mode table (:98–105), ":114" preview claim, ":122" comment, ":272" ("Developer mode includes a **Bundle Inspector**"), Packages table row (:295), Project Structure comment (:514).
- `AGENTS.md` — :7 (project blurb), :70 (commands comment), :81 (structure comment), :309 (Cursor Cloud: "Studio defaults to Creator mode… Developer mode… toggled in-app").
- `openwiki/quickstart.md` — :26, :101; `openwiki/architecture/overview.md` — :95–99, :204; `openwiki/operations/testing-and-changes.md` — :27.

### G2 — New packages undocumented (High)

- `@open-edu/companion` — `./chat` subpath (`StudioChatRequestSchema`, `toAiSdkMessages`/`fromUIMessage`), plus tool/skill/task/event/permission contracts. Referenced only inside openwiki AI middleware paragraphs and `AGENTS.md:311`.
- `@open-edu/domain-guidance` — canonical home for learner profiles + quality rubric; **generates** the skill reference files (`scripts/copy-data.mjs` + `dist/generate.js`; CI freshness discipline). Zero mentions in README, apps/docs, AGENTS, openwiki quickstart, or the openwiki architecture package list.
- `@open-edu/logger` — grep across all four surfaces: **zero mentions**.

The AGENTS.md "Package Naming" section (:184–190) also omits `companion`, `domain-guidance`, `logger`, `storage`, `pwa-core`. The apps/docs sidebar "Packages" category has no pages for them.

### G3 — Skills surface outgrown its docs (High)

- **Eval count drift:** `apps/docs/docs/agentic-authoring.md:203–216` says "9 evaluation scenarios"; `openwiki/domain/content-and-workflows.md:148` says "9"; `skills/.../evals/evals.json` actually defines **15**; and `skills/.../evals/README.md:3` itself says "11 scenarios" while its own table lists 15.
- **Missing feature coverage in agentic-authoring.md + openwiki:** 4 learner profiles (`profile-{neurotypical,autism,school,college}.md`, `profiles.md`), educational context (`educationLevel`, `gradeBand`, `curriculum`), `references/bundle-authoring.md`, `references/rewards-cards-authoring.md`, and the **"GENERATED reference — do not hand-edit, regenerate with domain-guidance"** contract (ADR-0009).
- **Broken links in the published site:** `agentic-authoring.md:222–227` links `./skills/openedu-course-authoring/...` which resolves to `apps/docs/docs/skills/...` → 404 on Docusaurus.
- **Skill "Key components" table in openwiki** (:117–125) omits newer scripts: `discover-openedu.mjs`, `profiles.mjs`; `validate-course-spec.mjs` / `validate-package.mjs` roles changed.

### G4 — `packages/cli/skills/` orphaned (Medium)

`course-spec-generator.skill.md` (used by `edu generate --prompt`) + its README are complete but linked from nowhere outside `packages/cli`. No surface points agents to it or distinguishes it from the full skill.

### G5 — OpenWiki freshness (Medium)

`openwiki/.last-update.json` → `2026-07-19`, gitHead `883f3f6` (pre-dates the Aug–Sep wave). Quickstart/architecture/domain pages predate G1–G3 content. `openwiki/` is regenerated by the scheduled OpenWiki workflow per AGENTS.md — the fix is to update source and regen, not hand-edit generated pages.

### G6 — `apps/docs/docs/dev-server.md` bundle section misleading (Medium)

`:29–39` documents bundle auto-detection + module selector + BundleOverview button; with the unified view these are gone from Studio. Needs rewrite or an explicit "Studio does not support bundle authoring (see spec §9 Out of scope)" note.

### G7 — README dependency graph / packages table incomplete (Medium)

The `@open-edu/dev-server` box in the diagram (:368–371) shows only `telemetry → rewards → dev-server → cli` and `runtime → dev-server → cli`. Actual deps (from `apps/dev-server/package.json`): `companion`, `domain-guidance`, `logger`, `course-compiler`, `oep-distribution`, `llm-config`, `storage`, `widgets`, `widget-sdk`, `workflow`, `accessibility`, `core`, `schemas`, `i18n`, `design-system`. `companion`/`domain-guidance`/`logger` have no edges at all.

---

## Fix Plan

### Phase 1 — Correct the mode model everywhere (P0, one PR)

Single canonical source: rewrite `apps/docs/docs/course-creator-studio.md`, then make every other surface agree.

1. **`apps/docs/docs/course-creator-studio.md`** — replace modes with the unified view: single shell, Outline | Files tabs, pinned Assistant, Preview DevTools drawer, "bundles unsupported in Studio", single Node AI backend, browser/OPFS mode. Update Quick Start (:16–32). Replace the "Developer mode" section with a "Files tab / Preview DevTools" section. Retire the superseded 2026-08-05 spec reference in favor of `docs/superpowers/specs/2026-09-01-studio-unified-view-design.md`.
2. **`apps/docs/docs/dev-server.md`** — same rewrite for the internals page: remove "Creator/Developer" framing (:7, :27), rewrite "Multi-Module Bundle Mode" (:29–39) to "bundles unsupported; Bundle inspector only renders when bundle data is present", describe `StudioApi` (local + browser `BrowserStudioApi`) and the Files tab editors.
3. **`README.md`** — update Quick Start comment (:27–28); collapse the Studio section to the unified view (:98–125); fix :272 (Bundle Inspector wording), :295 (Packages row), :514 (structure comment).
4. **`AGENTS.md`** — update :7, :70, :81, :309; add a line pointing at the unified-view spec.
5. **openwiki** — update `quickstart.md` :26, :101; `architecture/overview.md` :95–99, :204; `operations/testing-and-changes.md` :27 (via regeneration, not hand-edit).

**Verify:** `pnpm --filter @open-edu/docs build`; manually check sidebar pages; run `pnpm --filter @open-edu/dev-server test`.

### Phase 2 — Skills accuracy (P1)

6. **`apps/docs/docs/agentic-authoring.md`** — (a) fix eval count → 15 and add profiles/bundle/rewards-cards evals (IDs 10–15); (b) add Learner Profiles + educational-context sections with links to `profiles.md` and the four `profile-*.md`; (c) add Bundle Authoring + Rewards & Cards authoring sections; (d) note that references are **generated** from `@open-edu/domain-guidance` (regenerate, don't hand-edit) + ADR-0009; (e) **repair broken links** (:222–227) so the Docusaurus build has no dead links.
7. **`openwiki/domain/content-and-workflows.md`** — sync the agentic section: 15 evals, component table (+`discover-openedu.mjs`, `profiles.mjs`), profiles + generated-references note, bundle/rewards references.
8. **`skills/openedu-course-authoring/evals/README.md:3`** — "11 scenarios" → "15 scenarios" in the intro paragraph.
9. **`packages/cli/skills/README.md`** — content unchanged, but now cross-linked (see Phase 4).

**Verify:** `pnpm --filter @open-edu/docs build` (all links resolve); `node --test skills/openedu-course-authoring/evals/schema.test.mjs`.

### Phase 3 — Document the three new packages (P1)

10. **apps/docs** — add `apps/docs/docs/companion.md`, `domain-guidance.md`, `logger.md`; register in `sidebars.ts` Packages category. Cover: purpose; subpath exports (`@open-edu/companion/chat`, `@open-edu/domain-guidance/profiles` + `./data`); consumers (dev-server Studio AI, the authoring skill, learner); regeneration discipline (`pnpm --filter @open-edu/domain-guidance generate` must be diff-free in CI).
11. **README.md** — add three rows to the Packages table; add edges to the dependency graph (`companion → dev-server`, `domain-guidance → dev-server` + `domain-guidance → skills`, `logger → dev-server`) and expand the `dev-server` node.
12. **AGENTS.md** — add `companion`, `domain-guidance`, `logger` (plus missing `storage`, `pwa-core`) to "Package Naming"; add the `generate` + freshness command under Essential Commands; note build-ordering (companion/domain-guidance dist must be built before dev-server typecheck/test).
13. **openwiki** — add package bullets to quickstart "Core packages" + `architecture/overview.md`.

### Phase 4 — Cross-links, orphaning, and freshness (P2)

14. **Cross-link `packages/cli/skills/`**: README "Agentic Course Authoring" section → add "lightweight CLI skill (`edu generate --prompt`)" pointer; `agentic-authoring.md` → compare-and-contrast the two; openwiki agentic section → mention both mechanisms (mirrors ADR-0009).
15. **AGENTS.md skill ops** — add `node --test skills/openedu-course-authoring/evals/schema.test.mjs` and the skill-install command (`cp -r skills/openedu-course-authoring ~/.agents/skills/…`) so agents have runnable instructions.
16. **OpenWiki freshness** — after Phases 1–3, run the OpenWiki update (or let the scheduled workflow regenerate) and confirm `openwiki/.last-update.json` advances; do not hand-maintain generated pages.

---

## Verification gates (apply before marking done)

- `pnpm build` (companion/domain-guidance dist freshness)
- `pnpm --filter @open-edu/docs build` (no broken links; manually open `course-creator-studio`, `dev-server`, `agentic-authoring`, new package pages)
- `pnpm --filter @open-edu/domain-guidance generate` → no diff
- `pnpm lint` (includes hardcoded-string check) + `pnpm format:check`
- `pnpm --filter @open-edu/dev-server test`
- Grep gate: no occurrences of "Creator/Developer toggle" or "Developer mode" as present-tense features in README/AGENTS/docs/openwiki
