# OpenEdu Course Creator Studio — Product & UX Design Spec

**Date:** 2026-08-05  
**Status:** Draft for review  
**Source app:** `apps/dev-server`  
**Owner role:** Product / UX (phased evolution)

---

## 1. Summary

Evolve today’s Open-Edu **dev-server** (local Vite preview + inspector + file editor) into **OpenEdu Course Creator Studio**: a simple, intuitive authoring product for **teachers and tutors** building a few lessons for their class.

**North-star outcome:** A non-technical teacher can start from a **template** or **AI draft**, edit through plain-language screens, preview as a learner, and leave with a **shareable `.oep` (or package folder)** that opens in the learner app — without CLI, file-path wrestling, or schema jargon.

**Strategy:** Progressive disclosure in one product. Full package surface (lessons, quizzes, widgets, branching, rewards, cards, assets) is available over time, but Creator mode reveals it gradually. Developer mode preserves today’s power tools.

**Deployment:** Hybrid — ship on local `dev-server` first; design a thin Studio API so a hosted cloud Studio can follow without rewriting the UX.

---

## 2. Decisions locked

| Decision                  | Choice                                                                          |
| ------------------------- | ------------------------------------------------------------------------------- |
| Primary persona (Phase 1) | Teachers / tutors building a few lessons                                        |
| Start paths               | Template gallery + AI-assisted drafting                                         |
| Deployment                | Hybrid (local first, cloud-ready architecture)                                  |
| Definition of done        | Shareable package (`.oep` and/or folder) for learner app                        |
| Dev tooling               | Hide by default; Creator vs Developer mode                                      |
| Capability ambition       | Full package surface over phases (not permanently capped)                       |
| Product approach          | Progressive disclosure Studio (Approach 1), with AI as a primary path inside it |

---

## 3. Product vision & information architecture

### 3.1 Vision

**OpenEdu Course Creator Studio** is the authoring companion to the learner app. Content stays portable OpenEdu packages (Markdown + JSON). Studio is a **façade** that makes that model teachable to non-engineers.

### 3.2 Creator mental model

Teachers think in this loop:

1. **My courses** — recent work, new from template, new from AI
2. **Course outline** — ordered activities (the spine)
3. **Edit activity** — write, quiz, practice widget, media
4. **Preview as learner** — play through
5. **Share** — validate → export `.oep` → give learner instructions

### 3.3 Primary IA (Creator mode)

| Area                       | Purpose                                                            |
| -------------------------- | ------------------------------------------------------------------ |
| Home / Library             | Open recent; new from template; new from AI                        |
| Outline                    | Drag-reorder activities; add lesson / quiz / practice / reflection |
| Editor canvas              | Activity-specific editor; coaching / validation side panel         |
| Course settings            | Title, description, cover, estimated time (maps to manifest)       |
| Flow (Advanced)            | Linear by default; branching when teacher adds score rules         |
| Rewards & cards (Advanced) | Guided forms before raw condition JSON                             |
| Preview                    | Full learner runtime; no DevTools unless Developer on              |
| Share                      | Ready check → Export `.oep` → copy “how to open” steps             |

### 3.4 Progressive disclosure rules

- **Default path:** Template or AI → Outline → Edit → Preview → Share
- **Never default to:** file tree, `package.json`, `workflow.json`, DevTools inspectors
- **Unlock Advanced** when the teacher needs branching, custom rewards, or non-template widgets
- **Developer mode:** separate persisted toggle; restores file tree, raw JSON, inspectors (telemetry, logs, a11y, rewards)

### 3.5 Creator vs Developer

|                       | Creator (default)          | Developer                              |
| --------------------- | -------------------------- | -------------------------------------- |
| Audience              | Teachers                   | Framework contributors / power authors |
| Navigation            | Outline + activity editors | File tree + typed editors              |
| Validation            | Plain-language coaching    | Schema / path detail OK                |
| Inspectors            | Hidden                     | Telemetry, Logs, A11y, Rewards, Bundle |
| Same on-disk package? | Yes                        | Yes                                    |

One product, one package model. Mode is presentation, not a format fork.

---

## 4. Phased roadmap

Each phase must ship something a teacher can **finish** (preview or share). Full surface is reached by Phase 3 capability; AI start lands in Phase 3; hosted in Phase 5.

### Phase 0 — Studio foundation (rebrand + shell)

**Goal:** `dev-server` becomes Studio chrome without deepening authoring yet.

**Ship:**

- Branding: Course Creator Studio / OpenEdu Studio
- Creator vs Developer toggle (Creator default)
- Hide DevTools inspectors in Creator
- Relabel jargon in visible chrome (e.g. Course info vs Manifest; Activities vs Nodes)
- Home stub: open package + recent (minimal)
- Preserve all current editor power in Developer

**Exit criteria:** Cold open shows Creator; Developer restores today’s inspectors; preview still works.

### Phase 1 — Teacher creation loop (templates + outline + share)

**Goal:** First “I made something shareable” moment (no AI required).

**Ship:**

- Template gallery (3–5 starters: Reading lesson, Lesson + quiz, Practice widget, Short unit, …)
- Outline as primary spine (not file tree)
- Form editors: course settings, Markdown lesson, MCQ quiz, asset upload
- Linear workflow auto-managed from outline order
- Validate + Export `.oep` + short learner-install instructions
- File tree / raw JSON only in Developer

**Exit criteria:** Teacher creates from template → edits ≥2 activities → previews → exports `.oep` in under ~20 minutes without CLI docs.

### Phase 2 — Practice widgets + guided flow / rewards

**Goal:** Common full-package surface via guided UI.

**Ship:**

- Curated widget picker + schema-driven forms (extend existing `SchemaForm` / widget catalog)
- Live widget preview in editor
- Guided branching UI that writes `workflow.json`
- Guided rewards & knowledge cards (templates + simple conditions)
- Plain-language validation mapped from package/schema errors

**Exit criteria:** Teacher builds lesson → quiz → widget practice → optional badge/branch → export.

### Phase 3 — AI-assisted authoring

**Goal:** AI as first-class start/refine path; local-capable, cloud-ready later.

**Ship:**

- “Create from notes / outline / PDF” → draft package (course-compiler / agentic authoring skill)
- Review UI: accept/reject sections; quality checklist in plain language
- Actions: “Improve this lesson”, “Add a quiz”
- Offline fallback: templates still work if AI unavailable

**Exit criteria:** Teacher pastes notes → gets draft → refines in Outline/Editor → exports `.oep`.

### Phase 4 — Multi-course library + classroom packaging

**Goal:** Beyond a single package.

**Ship:**

- Library: duplicate / rename / archive
- Light bundle / unit support (2–5 lessons) with overview
- Share kit: `.oep` + copyable instructions (optional QR/link stub later)
- Safe import of existing package/folder

**Exit criteria:** Teacher maintains a small library and shares units.

### Phase 5 — Hosted Studio (hybrid payoff)

**Goal:** Same UX, cloud backend.

**Ship:**

- Auth, cloud storage, autosave
- Collaboration-lite (share link and/or comments) optional
- Hosted preview; optional catalog publish
- Local Studio remains supported with parity where practical

**Exit criteria:** Teacher creates and exports with no local CLI/install.

### Near-term non-goals

- Replacing the learner app
- Full LMS (rosters, grades, assignments, attendance)
- Forcing teachers through Developer mode for common tasks
- A second authoring file format for cloud

---

## 5. UX principles & key screens

### 5.1 Principles

1. **One job per screen** — create, outline, edit, preview, or share
2. **Teacher words** — Course / Activity / Share; not manifest / node / schema by default
3. **Outline is truth** — activity order drives linear workflow automatically
4. **Coach, don’t error-dump** — “Add a correct answer” over Zod paths
5. **Power behind glass** — full surface exists; Advanced / Developer reveal it
6. **Done = shareable** — happy paths end at `.oep` (or folder) + learner instructions
7. **Hybrid-safe** — UI talks to Studio API (local FS now, cloud later)

### 5.2 Key screens

| Screen          | Job                                           |
| --------------- | --------------------------------------------- |
| Home            | Templates, AI start, recent courses           |
| Outline         | Course spine; add / reorder activities        |
| Activity editor | Lesson / quiz / widget forms + coaching panel |
| Preview         | Learner runtime without DevTools (Creator)    |
| Share           | Ready check → export → how-to-open            |
| Mode switch     | Creator vs Developer for the same course      |

### 5.3 Wireframes

Low-fidelity HTML wireframes for manual browser review:

- Index: [`docs/superpowers/specs/course-creator-studio/wireframes/index.html`](./course-creator-studio/wireframes/index.html)
- [`01-home.html`](./course-creator-studio/wireframes/01-home.html) — templates + AI + recent
- [`02-outline.html`](./course-creator-studio/wireframes/02-outline.html) — activity spine
- [`03-editor.html`](./course-creator-studio/wireframes/03-editor.html) — quiz editor + coaching
- [`04-share.html`](./course-creator-studio/wireframes/04-share.html) — validate + export
- [`05-modes.html`](./course-creator-studio/wireframes/05-modes.html) — Creator vs Developer

```bash
open docs/superpowers/specs/course-creator-studio/wireframes/index.html
```

### 5.4 Visual modernization (follow-on)

Capability Phases 0–4 largely shipped the teacher loop; visual craft still lags the wireframe intent. See:

- Design: [`2026-08-10-studio-visual-modernization-design.md`](./2026-08-10-studio-visual-modernization-design.md)
- Plan: [`../plans/2026-08-10-studio-visual-modernization.md`](../plans/2026-08-10-studio-visual-modernization.md)

---

## 6. Current state: audit & gaps

### 6.1 What exists today (`apps/dev-server`)

Local Vite app started via `edu dev <packageDir>` (`packages/cli` → `startDevServer` in `apps/dev-server/src/index.ts`).

**Capabilities:**

- Load single package or bundle from `OPEN_EDU_PACKAGE_DIR` / bundle env
- Preview with real `@open-edu/runtime` (workflow, widgets, themes, progress)
- Bundle module switch + `BundleOverview`
- **Edit Package** → `EditorShell`: file tree, Markdown/JSON editors, manifest/workflow/rewards/cards editors, assets, widget preview, validate-on-write via `/api/package/*` (Vite plugin in `vite.config.ts`)
- Inspector panel: Telemetry, Logs, Rewards, Accessibility (axe), Bundle

**Described as:** “Vite dev server for Open-Edu” / OpenWiki: “local development server and inspector UI.” No teacher-oriented README positioning.

### 6.2 Teacher friction

| Gap                                     | Impact                            |
| --------------------------------------- | --------------------------------- |
| CLI + package path required             | Cannot “just open and create”     |
| No home / templates / library           | Must already own a package        |
| File-tree editing                       | IDE mental model                  |
| Preview vs Edit as hard mode swap       | Easy to lose orientation          |
| DevTools always on                      | Noise + jargon                    |
| Technical validation messages           | Blocks non-engineers              |
| No first-class Share / `.oep` export UX | “Done” is undefined in-product    |
| AI authoring lives outside UI           | Skills/CLI/pipeline not in Studio |
| No outline spine                        | Workflow/nodes are file concepts  |

### 6.3 Reuse map

| Capability               | Source                                                          | Studio use                 |
| ------------------------ | --------------------------------------------------------------- | -------------------------- |
| Load / validate packages | `@open-edu/core`                                                | Open course, Ready check   |
| Schemas                  | `@open-edu/schemas`                                             | Hidden validation backbone |
| Preview                  | `@open-edu/runtime`                                             | Preview as learner         |
| Widgets + catalog        | `@open-edu/widgets` + `SchemaForm` / `WidgetPreviewPanel`       | Practice editors           |
| Local file API           | `apps/dev-server` Vite `/api/package`                           | `LocalStudioAdapter`       |
| `.oep`                   | `@open-edu/oep-distribution` + CLI `oep:build`                  | Share                      |
| AI / compile drafts      | `@open-edu/course-compiler` + `skills/openedu-course-authoring` | Phase 3                    |
| UI primitives            | `@open-edu/design-system`                                       | Creator chrome             |

### 6.4 Related authoring ecosystem (do not duplicate blindly)

- `docs/PACKAGE_AUTHORING.md` — canonical package shape for humans who can read docs
- CLI: `edu validate`, `edu lint-content`, `edu generate`, `oep:build`, `compile`
- Agentic skill: `skills/openedu-course-authoring/` (portable + repository modes, quality rubric)
- Pipeline: standalone `open-edu-pipeline` for PDF→course-spec
- Learner app: install `.oep` / catalog — Studio’s share target, not a second authoring UI

---

## 7. Technical boundaries (hybrid-ready)

### 7.1 Studio API

UI must not bind forever to Vite FS APIs:

```
StudioUI  →  StudioAPI  →  LocalAdapter (filesystem + current Vite plugin)   [Phases 0–4]
                      └→  CloudAdapter (auth + storage + export)          [Phase 5]
```

**StudioAPI responsibilities (conceptual):**

- List / create / open courses
- Read / write activities and course settings
- Reorder outline (persist nodes + linear/advanced workflow)
- Validate (map to Ready check items)
- Export `.oep` / folder
- Generate-from-AI (Phase 3+)
- Persist Creator/Developer preference

### 7.2 Non-negotiables

- On-disk format remains OpenEdu packages (Markdown + JSON)
- Creator and Developer edit the **same** files
- No LMS scope in this track
- Hosted Phase 5 must not invent a second authoring format
- Preview continues to use `@open-edu/runtime` for parity with learner

### 7.3 Suggested code evolution (directional)

1. Keep `@open-edu/dev-server` package; evolve shell → Studio
2. Add Creator views above existing `EditorShell` (do not delete power editor)
3. Wrap `/api/package` as `LocalStudioAdapter`
4. Add export path using oep writer
5. Add AI generate endpoint wrapping compiler/skill when Phase 3 starts

---

## 8. Success metrics

| Phase | Leading indicator                | Success bar                                                        |
| ----- | -------------------------------- | ------------------------------------------------------------------ |
| 0     | Creator default; DevTools hidden | Cold opens show Creator chrome                                     |
| 1     | Time-to-first-share              | New teacher exports `.oep` in **&lt; 20 min** without docs/CLI     |
| 1     | Jargon exposure                  | No _required_ encounter with `package.json` / Zod paths in Creator |
| 2     | Widget completion                | ≥1 practice widget added via picker without raw JSON               |
| 3     | Start mix                        | ≥50% of new courses start from AI **or** template                  |
| 3     | Human-in-the-loop                | ≥70% of AI drafts edited before export                             |
| 4     | Return use                       | Reopen a recent course within 7 days                               |
| 5     | Hosted activation                | Create + export with no local install                              |

**Qualitative:** In hallway tests with 5 teachers, ≥4 can explain Outline and how a student opens the `.oep`.

---

## 9. Risks & mitigations

| Risk                             | Mitigation                                                       |
| -------------------------------- | ---------------------------------------------------------------- |
| Full surface overwhelms teachers | Progressive disclosure; templates; Advanced collapsed            |
| Creator/Developer drift          | Single package model; shared adapters; mode = chrome only        |
| Weak AI drafts                   | Plain-language quality checklist; encourage preview before share |
| Local→cloud rewrite              | StudioAPI boundary from early phases                             |
| Preview drift from learner app   | Shared runtime; periodic parity checks                           |
| Scope creep into LMS             | Explicit non-goals; share ≠ assign/grade                         |

---

## 10. Open questions

Resolve during Phase 0–1 planning (not blockers for this spec):

1. **Template set v1** — exact templates and subjects for the first gallery
2. **Local AI** — teacher API key vs OpenEdu proxy vs Phase 3 cloud-only generation
3. **Recent courses storage** — preference/index store vs folder scan
4. **Bundle timing** — Phase 4 only vs earlier light multi-lesson unit
5. **Final product name** — “OpenEdu Studio” vs “Course Creator Studio”

---

## 11. Phase 1 acceptance checklist (teacher-usable MVP)

- [ ] Creator mode is default; Developer toggle works and persists
- [ ] Home offers template gallery (AI can be stubbed “Coming soon” only if Phase 3 is explicit)
- [ ] Outline add/reorder updates learner-visible order without editing `workflow.json` by hand
- [ ] Lesson + quiz editable via forms (not raw JSON) in Creator
- [ ] Preview uses runtime without DevTools
- [ ] Share runs Ready check and exports `.oep`
- [ ] Copyable “open in learner app” instructions shown
- [ ] No required CLI steps after Studio is running

---

## 12. Document history

| Date       | Change                                                                                               |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| 2026-08-05 | Initial design from PM/UX review of `apps/dev-server`; decisions A / C+D / C / B / A / D; Approach 1 |

---

## Appendix A — Glossary (Creator-facing → package terms)

| Teacher sees    | Package concept                                 |
| --------------- | ----------------------------------------------- |
| Course          | Package (`package.json` manifest + nodes)       |
| Activity        | Content node (lesson `.md`, quiz `.json`, etc.) |
| Outline order   | Linear workflow routing                         |
| Practice        | Widget node + config                            |
| Badge / card    | Rewards / cards definitions                     |
| Share file      | `.oep` archive                                  |
| Advanced flow   | Non-linear `workflow.json`                      |
| Developer tools | Inspectors + raw/file editors                   |
