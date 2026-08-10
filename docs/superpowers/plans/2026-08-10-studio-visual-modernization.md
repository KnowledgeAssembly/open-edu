# Studio Visual Modernization — Implementation Plan

> **For agentic workers:** Implement phase-by-phase. Prefer small PRs (one phase per PR when practical). Every UI change needs Vitest coverage + i18n keys. Use design-system tokens only.

**Goal:** Make OpenEdu Course Creator Studio look and feel like a modern branded authoring product — without changing package format, StudioAPI semantics, or Creator/Developer progressive disclosure.

**Architecture:** Evolve Creator chrome and views under `apps/dev-server/src/studio/` to compose `@open-edu/design-system` Visual DNA (`OpenEduLogo`, `PageHeader`, primitives). Keep Developer power tools; relocate prototype FABs into a proper toolbar. Token-only styling via `--oe-*`.

**Tech stack:** React 18, Vitest, Testing Library, `@open-edu/design-system`, `@open-edu/i18n`, Tailwind token classes

**Design spec:** [`docs/superpowers/specs/2026-08-10-studio-visual-modernization-design.md`](../specs/2026-08-10-studio-visual-modernization-design.md)  
**Parent product spec:** [`docs/superpowers/specs/2026-08-05-course-creator-studio-design.md`](../specs/2026-08-05-course-creator-studio-design.md)  
**Wireframes (hierarchy reference only):** [`docs/superpowers/specs/course-creator-studio/wireframes/`](../specs/course-creator-studio/wireframes/)

**Out of scope:** Hosted Studio, new activity types, LMS features, literal wireframe cream/teal theme, redesign of DevTools inspector internals.

---

## Constraints (mandatory)

1. **Design system only** — no new local UI kit; no hardcoded hex/rgb; no non-token palette classes.
2. **i18n** — all user-facing strings via `t('studio.*')` in `packages/i18n/locales/en/studio.json`.
3. **Tests** — co-located Vitest for every new/changed component; extend `studio-a11y.test.tsx` for shell/Home/Outline/Share.
4. **One package model** — chrome is presentation only; no format fork.
5. **Reduced motion** — honor `prefers-reduced-motion` for enter/select/reorder animations.
6. **Conventional commits** — e.g. `feat(dev-server): modernize Studio chrome`.

---

## Phase A — Chrome & hierarchy

**Outcome:** Branded shell, clearer Home, no floating prototype buttons.

### A1. Studio chrome

- [ ] Inventory current `StudioTopBar` props/consumers (`StudioApp`, bundle-unsupported header)
- [ ] Implement `StudioChrome` (evolve `StudioTopBar` in place **or** rename + re-export)
  - [ ] `OpenEduLogo` + OpenEdu Studio wordmark
  - [ ] Breadcrumbs from `view` + `courseTitle` + optional activity title
  - [ ] Nav items with **active** styles: Library, Outline, Preview
  - [ ] Primary **Share** CTA
  - [ ] Quiet mode control (compact `ModeToggle` or overflow)
  - [ ] Disabled + tooltip (or agreed alternative) when course-required destinations need a package
- [ ] Add i18n keys for new aria-labels / tooltips / overflow labels
- [ ] Tests: render, active nav, Share click, mode change, a11y smoke
- [ ] Responsive: overflow menu path for `< md`

**Files:** `StudioTopBar.tsx` / `StudioChrome.tsx`, `ModeToggle.tsx`, `StudioApp.tsx`, `studio.json`, tests

### A2. Home start composition

- [ ] Restructure `HomeView` first viewport per design spec §8.2
  - [ ] `PageHeader` for title + lede
  - [ ] Continue-current as single contextual strip (not Card section)
  - [ ] Selectable template gallery + single Use action (selection state)
  - [ ] AI band secondary (`AiStartPanel`)
  - [ ] Quiet recent list; EmptyState with real description + CTA
- [ ] Remove decorative equal-card stacking
- [ ] Tests: template select → confirm; continue strip visibility; empty recent

**Files:** `HomeView.tsx`, optional `HomeTemplateGallery.tsx`, `HomeView.test.tsx`, i18n

### A3. Preview bar + Developer toolbar

- [ ] `CreatorPreview`: thin top/overlay bar with Exit + Reset (i18n); no corner FABs
- [ ] `DevApp`: remove `fixed bottom-4 right-96` Edit/Reset/Mode clusters
- [ ] Add `DeveloperToolbar` (header-adjacent or `EditorShell` top slot) with Edit Package / Reset / Mode
- [ ] Replace hardcoded English FAB labels with i18n
- [ ] Tests: preview exit/reset; developer toolbar actions; ensure Creator path has no fixed FAB nodes

**Files:** `CreatorPreview.tsx`, `DevApp.tsx`, `EditorShell.tsx`, i18n, tests

### A4. Loading & empty polish (shared)

- [ ] Replace bare `…` loaders on Outline (and any Home stubs) with skeletons or Spinner + label
- [ ] Audit Creator `EmptyState` usages with `description=""`; supply copy + CTA where missing

**Exit criteria (Phase A):**

- [ ] Cold open shows logo + Studio wordmark without scrolling
- [ ] Active nav visible on Outline/Preview/Share/Library
- [ ] No fixed floating Edit/Reset cluster in DOM for Creator or Developer default layouts
- [ ] `pnpm --filter @open-edu/dev-server test` green
- [ ] `pnpm lint:hardcoded-strings` clean for touched files

---

## Phase B — Authoring craft

**Outcome:** Outline and editors feel like teaching tools.

### B1. Outline spine

- [ ] Extract `OutlineActivityRow` with badge, title, overflow (Edit / Move up / Move down / Delete)
- [ ] Unified `AddActivityMenu` (Lesson / Quiz / Practice → WidgetPicker)
- [ ] Keyboard reorder retained; implement drag-reorder as progressive enhancement (accessible handle)
- [ ] Selected/hover row styles; row click → edit (excluding handle/menu)
- [ ] Replace native `<details>` Advanced blocks with DS/Radix accordion styling + helper copy
- [ ] Skeleton loading state
- [ ] Tests: add menu, reorder keyboard, delete confirm, drag if implemented

**Files:** `OutlineView.tsx`, new row/menu components, `FlowAdvancedPanel`/`RewardsCardsPanel` wrappers, tests

### B2. Editor coaching layout

- [ ] Add `EditorCoachingPanel` (checklist slot + tips)
- [ ] Wrap Lesson & Quiz editors in canvas | coaching layout (`≥ lg`); stack on small screens
- [ ] Lesson: remove monospace-as-default; optional Write | Preview tabs if markdown preview path is low-risk
- [ ] Quiz: coaching rules (correct answer present, ≥2 options, etc.)
- [ ] Align Practice headers/spacing with shared editor chrome (keep form \| preview)
- [ ] Save success via button state / aria-live (avoid layout jump)
- [ ] Tests: coaching messages update with form state; layout renders; save flow

**Files:** `LessonActivityEditor.tsx`, `QuizActivityEditor.tsx`, `PracticeActivityEditor.tsx`, `ActivityEditorRouter.tsx`, `EditorCoachingPanel.tsx`, tests

### B3. PageHeader consistency

- [ ] Apply `PageHeader` to Library, Share, AI review, Unit builder
- [ ] Normalize primary/secondary button placement

**Exit criteria (Phase B):**

- [ ] Outline Add is one control; rows are not tool strips
- [ ] Lesson & Quiz show at least one coaching item
- [ ] a11y smoke includes Outline + Lesson editor
- [ ] Tests green

---

## Phase C — Atmosphere & cohesion

**Outcome:** Motion, health, theme QA, optional outline rail.

### C1. Motion

- [ ] View enter transition (respect reduced motion)
- [ ] Template selection settle
- [ ] Outline reorder settle

### C2. Course health + Share polish

- [ ] Outline health strip (count + ready affordance → Share) using existing ready-check helpers where possible
- [ ] Share success confirmation state after export

### C3. Outline left rail (optional)

- [ ] Desktop left meta: course title, settings entry point, Advanced accordions, tip
- [ ] Collapse to stacked layout below `lg`

### C4. Theme QA

- [ ] Manual checklist Light / Dark / Zen: chrome, active nav, selected template, outline row, coaching panel
- [ ] Fix contrast/token mistakes only (no new palette)

**Exit criteria (Phase C):**

- [ ] Motions gated by `prefers-reduced-motion`
- [ ] Theme QA notes attached to PR
- [ ] Tests green

---

## Suggested PR slicing

| PR  | Contents                                   |
| --- | ------------------------------------------ |
| PR1 | Phase A1 + A4 (chrome + empty/loading)     |
| PR2 | Phase A2 (Home)                            |
| PR3 | Phase A3 (Preview bar + Developer toolbar) |
| PR4 | Phase B1 (Outline)                         |
| PR5 | Phase B2–B3 (Editors + PageHeaders)        |
| PR6 | Phase C                                    |

Keep docs-only PRs separate from UI PRs when landing the design spec first.

---

## Test matrix

| Surface          | Unit / RTL                              | a11y | Manual              |
| ---------------- | --------------------------------------- | ---- | ------------------- |
| StudioChrome     | active nav, breadcrumbs, Share, mode    | axe  | responsive overflow |
| Home             | template select, continue, recent empty | axe  | first-viewport scan |
| Outline          | reorder, add menu, delete               | axe  | drag + keyboard     |
| Editors          | coaching + save                         | axe  | lg split / sm stack |
| Preview bar      | exit/reset                              | —    | full runtime smoke  |
| DeveloperToolbar | actions present; no fixed FAB           | —    | edit ↔ preview      |
| Themes           | —                                       | —    | Light/Dark/Zen      |

Commands:

```bash
pnpm --filter @open-edu/dev-server test
pnpm lint:hardcoded-strings
pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js dev ./examples/hello-world
```

---

## Dependency / sequencing notes

1. Land **design spec + this plan** (docs) before large UI PRs when stakeholders need review.
2. Phase A1 unlocks consistent breadcrumbs for B/C — do not skip.
3. Drag-and-drop library: prefer existing repo patterns; if none, keyboard-first in B1 and add drag in a follow-up to avoid blocking.
4. If DS lacks DropdownMenu/Accordion exports, check `packages/design-system` before adding local Radix wrappers; upstream thin primitives if reused twice+.

---

## Open questions (block Phase A kickoff only if unresolved)

1. Disabled vs hidden nav when no course is open?
2. Mode control always visible vs overflow-only on Creator?
3. Lesson Markdown preview in B2 or defer?
4. Outline left rail in B1 vs C3?

Default recommendations if unblocked by product: **disabled+tooltip**, **compact mode always visible but muted**, **defer rich Markdown preview**, **Advanced accordion below spine in B1 / rail in C3**.
