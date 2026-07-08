# Learner App Shell Unification & Course Flow Activation — Design

**Date:** 2026-06-26
**Status:** Draft
**Scope:** Production-grade MVP redesign of `apps/learner/`

## Problem

The learner app (`apps/learner/`) has two parallel course-viewing implementations:

1. **Active (`App.tsx` + 6 hand-rolled pages):** renders raw `LoadedNode`s via `NodeRenderer` outside any `RuntimeProvider`. Consequences:
   - Course catalog lives _outside_ the app shell (no persistent frame; no way back to the catalog from inside a course).
   - Left nav (`SideNav`) has 5 decorative, non-functional tabs (local `useState` only); no `onTabSelect` callback.
   - No Next/Back on lessons; navigation only via the `CourseTree` folder list.
   - Progress tracking broken — `saveProgress` only runs on quiz submit and only writes `scores`; `currentNodeId`/`visitedNodes` never update, so "Resume"/percent-complete are dead.
   - Rewards fully implemented in the package but disconnected (`CourseCard.earnedBadgeCount` hardcoded `0`).
   - Course tree groups by filesystem folder (`buildModules`), not workflow steps — learners see the author's directory layout.
   - Theme switching missing on `AssessmentPage` (App.tsx:81 omits theme props).

2. **Orphaned (`CoursePage.tsx`):** the canonical flow — `WorkflowEngine` → `RuntimeProvider` → `Sidebar` steps + `LayoutShell` Next + `RewardBroker` + toast + `CompletionScreen` + progress persistence. Fully built, has a test, **never imported by `App.tsx`**.

**Goal:** A single persistent app shell that owns a functional left nav (Section 1: app navigation; Section 2: workflow-ordered course steps), with the catalog and all views rendered in one center region; the catalog _inside_ the shell; course material driven by the revived canonical runtime flow with Next/Back, real progress, rewards, and consistent theming. Learners see steps, not the filesystem.

## Non-goals

- No new features beyond unifying existing, already-shipped pieces.
- No changes to packaging, the dev-server, or non-learner apps.
- Mobile is in-scope only as a responsive nav-collapse; no separate mobile UI.

## Decisions (from brainstorm)

| Question            | Decision                                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Section 2 nav shape | Workflow-ordered steps via `getOrderedNodes` (replaces folder-based `CourseTree`)                                                         |
| Next/Back scope     | Full step sequence with workflow advance (Next calls `completeNode()`, Back moves to previous visited step without re-running completion) |
| Catalog placement   | Nav target rendered in the center region inside the persistent shell                                                                      |
| My Progress scope   | Cross-course dashboard aggregating `getAllProgress()`                                                                                     |
| Architecture        | **A:** Revive canonical `CoursePage` flow and unify under one `AppShell`                                                                  |

## Architecture

### Section 1 — App Shell

A single persistent `AppShell` replaces `App.tsx`'s conditional-page rendering. State lives in an `AppView` discriminated union at the shell level:

```
AppView =
  | { view: 'home' }
  | { view: 'catalog' }
  | { view: 'progress' }
  | { view: 'settings' }
  | { view: 'course'; pkg: LoadedPackage }
```

- `AppShell` renders `RuntimeThemeProvider` (theme applied app-wide, including catalog/assessments) + fixed `LeftNav` + `TopAppBar` + `<main>` center region switching on `AppView`.
- The theme provider wraps the **whole shell**, fixing the `AssessmentPage` theme-gap (and every other view).
- `handleStartCourse(rootDir)` no longer switches to a `course-home` page — it sets `{ view: 'course', pkg }`. The course-home / lesson / assessment / code page split is removed; the in-course center region is driven by the runtime engine's `currentNodeId`.
- `packageEntries` / `catalogPackages` from `virtual:edu-data` load into shell state; the shell resolves a `pkg` by `rootDir` on catalog start.

**Deleted:** `CourseHomePage.tsx`, `LessonPage.tsx`, `AssessmentPage.tsx`, `CodePage.tsx`, `ProgressPage.tsx` (concerns move into center-region components or the runtime flow). `CatalogPage.tsx` retained as a _center-region component_ (loses its own chrome). `buildModules.ts` deleted (folder grouping replaced by `getOrderedNodes` steps).

### Section 2 — Left Navigation

A single `LeftNav` component in the shell replaces `SideNav`'s decorative tabs with a functional two-section nav.

**Section 1 — always present (app navigation):**

| Item           | Target                 |
| -------------- | ---------------------- |
| Home           | `{ view: 'home' }`     |
| My Progress    | `{ view: 'progress' }` |
| Course catalog | `{ view: 'catalog' }`  |
| Settings       | `{ view: 'settings' }` |

- Active item derived from `AppView` (not local `useState`); real `onNavigate(view)` callback to the shell; `aria-current="page"`.
- Replaces the decorative `navTabs` array in `SideNav.tsx:11-17`.

**Section 2 — only when `view === 'course'`:**

- Header: course title (`pkg.manifest.title`) + a "Back to catalog" affordance.
- Body: workflow-ordered steps from `getOrderedNodes(pkg.workflow, entry)`, numbered `1..N`, rendering a refactored runtime `Sidebar` (or new `CourseStepList`):
  - current step → `aria-current="step"`, highlighted dot
  - visited steps → filled dot marker
  - future steps → muted / non-interactive (locked until reached via completion)
- Step selection is driven by the engine's `currentNodeId`; clicking a visited step re-selects it; future steps are locked.

**Provider boundary:** when `view === 'course'`, the `RuntimeProvider` wraps a region containing the left column (both nav sections) + the center `LayoutShell`. Section 1 does not _consume_ runtime context (it only fires `onNavigate(view)`), so sitting inside the provider is harmless; Section 2 calls `useRuntime()` and therefore must be inside it. AppShell owns a single left column that always renders Section 1 and, when course-active, appends Section 2 beneath it — both inside the provider for the course view. When not course-active, there is no `RuntimeProvider` and the left column shows only Section 1. This avoids portal/slot mechanics while preserving the one-column visual outcome.

### Section 3 — Course Center Region

When `view === 'course'`, the `CourseRuntime` subtree (revived from `CoursePage.tsx`) renders the center region.

**Step rendering + Next/Back:**

- Center region renders `LayoutShell`: header `ProgressBar` (current/total + fill), `NodeRenderer` for `currentNodeId`, footer with **Next** and **Back**.
- **Next** calls `completeNode()` → engine evaluates `onComplete`/branching → `RuntimeContext` updates → Section 2 highlight + `ProgressBar` advance (the existing `LayoutShell.tsx:50-57` flow, activated).
- **Back** is a new control (`LayoutShell` only has Next today). Behavior:
  - Navigates to the immediately-preceding visited step via `engine.setCurrent(nodeId)` (or an equivalent setter on `RuntimeContext`).
  - Does **not** re-run completion or re-evaluate branching — pure position move.
  - Disabled on the first step.
- `currentStep / totalSteps` counter beside the buttons replaces dead percent reads.

**Assessments** render through the same `LayoutShell` flow (`quiz` case via `NodeRenderer` → `QuizRenderer`); the standalone `AssessmentPage` with its own "Finish & Return" is deleted. Next disables until the quiz is submitted (`LayoutShell`'s existing gate).

**Progress persistence:** `RuntimeProvider.onProgressChange` → `saveProgress(pkg.manifest.id, snapshot)` (existing `CoursePage.tsx:112-117`). Fixes the live app's broken progress — `currentNodeId`/`visitedNodes` now write on every entry/completion, so resume and percent-complete work.

**Course Home:** the `course-home` view is removed. The first step of `getOrderedNodes` is the entry node. "Continue" semantics fold into course start: resume at `saved.currentNodeId` if valid, else start at `manifest.entry`/Step 1 (engine constructed with saved entry — `CoursePage.tsx:28`).

**Rewards:** `RewardBroker` wired to the telemetry session (`CoursePage.tsx:57-72`) emits badge-award receipts → badge toast (existing) + `badges` state → `CompletionScreen` (badges + Back → `{ view: 'catalog' }`). Badge list persisted so the catalog `CourseCard` can show real `earnedBadgeCount` (replaces hardcoded `0`).

### Section 4 — Remaining Views

**Home (`{ view: 'home' }`):** new `HomePage` center component. Welcome heading + quick-links (catalog; "Continue last course" from `getAllProgress()` if any in progress) + counts (courses available, in progress, badges earned). Empty-state friendly, `--oe-*` styled.

**My Progress (`{ view: 'progress' }`):** new `ProgressDashboard` replaces `ProgressPage.tsx`. Reads `getAllProgress()` → per-course card row: title, percent complete (`visitedNodes.length / orderedNodes.length` via `getOrderedNodes`), badges earned, last-visited step label, "Continue" button → `{ view: 'course', pkg }`. Resolves each course's `LoadedPackage` from `packageEntries` by id.

**Settings (`{ view: 'settings' }`):** new `SettingsPage`. Hosts the `ThemeSelector` and the accessibility controls currently buried in `TopAppBar`'s a11y panel (font-size scale, reduced motion, high-contrast toggles — whatever exists there). The canonical home for these; `TopAppBar` keeps a compact quick-access theme switch for convenience.

**Catalog (center region):** `CatalogPage` kept but stripped of standalone chrome — just the grid of `CourseCard`. `CourseCard.earnedBadgeCount` wired to real badges from `getAllProgress()` (resolving by `pkg.manifest.id`). Start button → `handleStartCourse` → `{ view: 'course', pkg }`.

**Theme adherence for course material:** structurally satisfied — `RuntimeThemeProvider` wraps the whole `AppShell`, injecting `--oe-*` vars read by `MarkdownRenderer`, widget renderer, and layout components (Tailwind mappings + inline `var(--oe-*)`). No new mechanism; the provider-boundary fix removes theme gaps across all center regions.

**TopAppBar role reduced:** retained in the shell for breadcrumbs + a compact theme quick-switch + a11y quick-toggle. Breadcrumbs reflect `AppView` (e.g., "Catalog › Course Name") with working nav (catalog crumb → `{ view: 'catalog' }`). Heavy panels move to Settings.

### Section 5 — Error states, edge cases & testing

**Error / edge states:**

- **No workflow defined** (`pkg.workflow` null): themed "Course not available" state + Back-to-catalog (kept from `CoursePage.tsx:119-127`).
- **No progress yet:** engine starts at `manifest.entry`; `ProgressDashboard` shows "Not started" instead of 0%.
- **Stale `currentNodeId`** (saved id not in workflow): fall back to `manifest.entry` (extend the `CoursePage.tsx:25-31` guard).
- **Quizzes gated:** `LayoutShell`'s Next-disables-until-submitted preserved.
- **Mobile:** responsive collapse — `LeftNav` becomes a drawer (hamburger in `TopAppBar`); Section 2 keeps working inside the drawer.

**Testing (every story produces Vitest tests; axe-core for a11y):**

- **`AppShell`:** `AppView` transitions; Section 1 active-state-by-view; `RuntimeProvider` mounts only on course view and wraps left column + center; Section 1 inside provider does not consume context.
- **`LeftNav`:** Section 1 `onNavigate` invocation; Section 2 visibility gated on `view === 'course'`; step order matches `getOrderedNodes`; active/visited/future markers from `RuntimeContext`; Back-to-catalog emits `onNavigate('catalog')`.
- **`CourseRuntime`** (revive/extend `CoursePage.test.tsx`): engine uses saved progress entry; `onProgressChange` writes to storage; `RewardBroker` awards badges on `node.completed`; `CompletionScreen` renders badges + Back → catalog; toast shows/hides.
- **`ProgressDashboard`:** reads `getAllProgress`, computes percent via `getOrderedNodes`, resolves packages by id, Continue → course view.
- **`SettingsPage`:** theme switching via `ThemeSelector` writes `oe-theme-preference`; a11y toggles persist.
- **Back:** sets current to previous visited step without emitting `node.completed`.
- **A11y (axe-core):** `LeftNav` `aria-current`, `StepList` `aria-current="step"`, keyboard reachable; catalog/progress/settings audited.
- **E2E (Playwright):** happy path — catalog → start course → Next through steps → badge toast → completion → back to catalog → verified `CourseCard` badge count incremented → My Progress shows course with correct percent.

## File-level changes (summary)

**New (learner app):**

- `apps/learner/src/AppShell.tsx` + test — persistent shell, `AppView` state, provider boundaries.
- `apps/learner/src/LeftNav.tsx` + test — two-section functional nav.
- `apps/learner/src/CourseRuntime.tsx` + test — revived canonical flow (renamed from `CoursePage.tsx`), used as center region.
- `apps/learner/src/HomePage.tsx` + test.
- `apps/learner/src/ProgressDashboard.tsx` + test.
- `apps/learner/src/SettingsPage.tsx` + test.

**New (runtime, if needed):** a `CourseStepList` component (refactor of `Sidebar`) for Section 2; an `engine.setCurrent` (or `RuntimeContext` `setCurrentNodeId`) capability for Back.

**Modified:**

- `apps/learner/src/App.tsx` — delegates to `AppShell`.
- `apps/learner/src/CatalogPage.tsx` — stripped of standalone chrome; `CourseCard.earnedBadgeCount` wired to real badges.
- `packages/runtime/src/layout/SideNav.tsx` — decorative tabs replaced by functional nav callback (or `LeftNav` supersedes it).
- `packages/runtime/src/layout/LayoutShell.tsx` — add Back control + `currentStep/totalSteps` counter.
- `packages/runtime/src/context/RuntimeContext.tsx` — expose `setCurrentNodeId` for Back (if not present).
- `packages/runtime/src/index.ts` — re-exports for any new components.

**Deleted:**

- `apps/learner/src/CourseHomePage.tsx`, `LessonPage.tsx`, `AssessmentPage.tsx`, `CodePage.tsx`, `ProgressPage.tsx`, `buildModules.ts`.
- `apps/learner/src/CoursePage.tsx` (renamed into `CourseRuntime.tsx`).

**Regenerated:** `apps/dev-server/src/tailwind.css` if any new Tailwind classes are introduced in runtime components.
