# Learner Experience Design

**Date:** 2026-06-25
**Status:** Draft

## 1. Personas

### Persona D — Child learner (special needs, autism-spectrum, reading difficulties)

- One thing at a time. No visual clutter, no distractions.
- Predictable layout: same structure on every screen, every session.
- Large touch targets, high contrast, minimal text density.
- No dead ends, no ambiguous states.

### Persona A — Student (K-12)

- Self-directed: "what have I done, what's next."
- Needs to see a course as a whole, not just the current node.
- Linear progress feel, even when the workflow branches.

### Shared constraint

Both personas need the UI to feel calm, structured, and never surprising. The runtime is single-node-at-a-time by design. The catalog, sidebar, and completion screen supplement this without introducing complexity.

## 2. Deployment

- **Local-first** for authoring and development (existing CLI + dev-server).
- **Web-hosted** for learner delivery (new `apps/learner` Vite app).
- No server, no database, no auth in MVP. Progress persists to localStorage.
- Teacher/caregiver view is out of scope.

## 3. Screen Architecture

Three screens, one app.

```
apps/learner/
  App.tsx             → state: 'catalog' | 'course' | 'complete'
  CatalogPage.tsx     → grid of CourseCard components
  CoursePage.tsx      → embeds @open-edu/runtime with Sidebar
  progressStorage.ts  → get/save ProgressSnapshot per packageId
  main.tsx            → renders App
```

### Screen 1 — Catalog

A simple grid of course cards. Each `CourseCard` shows:

- Course title
- Author
- Node count (e.g. "5 lessons")
- Badge count from rewards.json (e.g. "3 badges available" or "1 earned / 3")
- Progress badge: Not started / In progress / Complete
- One action button: "Start" or "Continue"

No search, no filters, no categories. Calm, uncluttered.

### Screen 2 — Course View

The existing `LayoutShell` gains a left sidebar via an optional `sidebar` prop:

```
┌──────────┬──────────────────────────────────┐
│ Sidebar  │  Content area (existing)          │
│          │                                   │
│ ○ Intro  │  # Lesson Title                   │
│ ○ Setup  │                                   │
│ ● Topic  │  Markdown content here...         │
│ ○ Quiz   │                                   │
│ ○ Done   │                        [Next]     │
│          │                                   │
│ 2 of 5   │                                   │
└──────────┴──────────────────────────────────┘
```

The `Sidebar` shows:

- Course title at top
- Ordered list of all nodes, each with status icon:
  - Not visited: empty circle
  - Visited: filled circle
  - Current: highlighted with accent color
- Simple "X of Y complete" count at bottom

The sidebar is **read-only** — no node-jumping (preserves predictability for Persona D).

#### Badge Toast

When `onReceipt` fires with `status === 'delivered'` and `actionType === 'badge.award'`, the `CoursePage` renders a small non-disruptive toast in the bottom-right corner:

```
┌─────────────────────┐
│ Badge earned!       │
│    Quiz Master      │
└─────────────────────┘
```

Auto-dismisses after 3 seconds. No animation beyond fade-in/out.

### Screen 3 — Completion

When `isCompleted` is true, a full-screen completion state:

```
You finished [Course Title]!

Skills achieved:
  ● Numbers — Mastered

Badges earned:
  Quiz Master
  Perfect Score

[Back to catalog]
```

Uses existing `SkillSummary` component. Earned badges come from `broker.awardedBadges`.

## 4. Data Flow

```
scanPackages(dir) → PackageSummary[]
    ↓
merge with localStorage progress (Record<packageId, ProgressSnapshot>)
    ↓
Catalog grid (manifest + completion % + badge count)
    ↓ user clicks course
mount runtime via createRuntime({
    packageSource,
    initialProgress: getProgress(packageId),
    onProgressChange: (snapshot) => saveProgress(packageId, snapshot),
})
    ↓
RewardBroker.onReceipt → BadgeToast (if badge delivered)
    ↓
onProgressChange → sidebar re-render + localStorage write
    ↓ workflow completes
CompletionScreen → back button → catalog
```

Progress key: single localStorage key `"open-edu-progress"`, value is `Record<packageId, ProgressSnapshot>`.

## 5. Component Specifications

### New components in `@open-edu/runtime`

#### `Sidebar`

| Prop      | Type           | Description                                             |
| --------- | -------------- | ------------------------------------------------------- |
| nodes     | `LoadedNode[]` | All nodes in the package, ordered by workflow discovery |
| className | `string?`      | Optional CSS class                                      |

States: empty (0 nodes), in-progress, completed.
Accessibility: `<nav>` landmark, `aria-current="true"` on active node.
Nodes must be provided in course-order (use `getOrderedNodes` from `@open-edu/workflow`).

Reads `currentNodeId` and `visitedNodes` from `useRuntime()` context.

#### `CourseOutline`

Wraps `Sidebar` with a progress summary. No props — reads entirely from `RuntimeContext`.

Renders: `Sidebar` + "X of Y complete" + collapsible toggle. Default open on desktop, hidden behind hamburger on narrow screens.

#### `CourseCard`

| Prop             | Type                          | Description                               |
| ---------------- | ----------------------------- | ----------------------------------------- |
| manifest         | `PackageManifest`             | From scanPackages                         |
| nodeCount        | `number`                      | Total nodes in the package                |
| badgeCount       | `number`                      | Total badge.award actions in rewards.json |
| earnedBadgeCount | `number`                      | Badges already earned by this learner     |
| progress         | `ProgressSnapshot \| null`    | Current progress, null if not started     |
| onStart          | `(packageId: string) => void` | Click handler for the action button       |

States: not-started (blue badge), in-progress (amber badge), completed (green check).
Accessibility: `<article>` landmark, action button has `aria-label` with course title.

#### `CompletionScreen`

| Prop      | Type         | Description                              |
| --------- | ------------ | ---------------------------------------- |
| className | `string?`    | Optional CSS class                       |
| onBack    | `() => void` | Click handler for back-to-catalog button |

Reads `useRuntime()` for: `loadedPackage.title`, `scores`, `skillScores`.
Earned badges passed as `badges` prop from `CoursePage`.

#### `ProgressBadge`

| Prop            | Type      | Description                            |
| --------------- | --------- | -------------------------------------- |
| percentComplete | `number`  | 0-100                                  |
| isCompleted     | `boolean` | Whether the package is fully completed |

Renders: colored badge (not-started/in-progress/complete). Used inside `CourseCard`.

### Modified components in `@open-edu/runtime`

#### `LayoutShell`

Add one new prop:

| Prop    | Type         | Description                                      |
| ------- | ------------ | ------------------------------------------------ |
| sidebar | `ReactNode?` | Optional sidebar rendered to the left of content |

When `sidebar` is omitted, renders full-width — fully backward compatible.
When present, renders two-column layout: sidebar (fixed width, 280px) + content (flex-1).

### New function in `@open-edu/workflow`

#### `getOrderedNodes(workflow: Workflow, entry: string): string[]`

Traverses the workflow routing table starting from `entry`, following `onComplete` and all `conditions[].then` edges via BFS. Returns node IDs in course-order (the order they would be encountered during linear traversal). Handles cycles by tracking visited nodes. This provides the ordering used by the `Sidebar` component.

### New function in `@open-edu/core`

#### `scanPackages(dir: string): PackageSummary[]`

- Reads directory entries synchronously
- For each subdirectory: reads `package.json`, validates with `PackageManifestSchema.parse()`
- Counts nodes from the `nodes/` subdirectory
- Counts `badge.award` actions from `rewards.json` (returns 0 if no rewards file)
- Returns `PackageSummary[]` (see section 10 for type)
- Skips invalid/unparseable directories silently
- Returns `[]` if directory doesn't exist or is empty

### New app `apps/learner`

| File                 | Purpose                                                                           |
| -------------------- | --------------------------------------------------------------------------------- |
| `main.tsx`           | Mounts `<App />` to DOM                                                           |
| `App.tsx`            | State machine: catalog → course → completion → catalog                            |
| `CatalogPage.tsx`    | Calls `scanPackages()`, merges with progress, renders `CourseCard` grid           |
| `CoursePage.tsx`     | Loads package, creates runtime + reward broker, manages toast and completion      |
| `progressStorage.ts` | `getAllProgress()`, `getProgress(packageId)`, `saveProgress(packageId, snapshot)` |

Package dependencies: `@open-edu/runtime`, `@open-edu/core`, `@open-edu/rewards`, `@open-edu/schemas`, `react`, `react-dom`, `vite`.

## 6. Rewards Integration

### Catalog card badge count

`scanPackages` is extended to also return `availableBadges: number` by parsing each package's `rewards.json` and counting `badge.award` actions. The `CourseCard` shows this count.

### Inline badge toast

The `CoursePage` in `apps/learner` subscribes to `broker.onReceipt`. When a receipt has `status === 'delivered'` and `actionType === 'badge.award'`, it renders a `BadgeToast` component. The toast auto-dismisses after 3 seconds.

The toast uses existing theme tokens from `RUNTIME_THEME`. No animation beyond CSS fade-in/out.

### Completion screen badges

`broker.awardedBadges` (string array of badge names) is passed as a prop to `CompletionScreen`. Badges render as a simple list below skills — no icons, no images, just badge names.

## 7. Error Handling

| Component                              | Error                                  | User Sees                                                      |
| -------------------------------------- | -------------------------------------- | -------------------------------------------------------------- |
| `CatalogPage` — `scanPackages` fails   | Directory not found, inaccessible      | Empty state: "No courses found" with retry button              |
| `CatalogPage` — 0 packages found       | Valid dir but no valid packages        | Same empty state                                               |
| `CatalogPage` — corrupted localStorage | Unparseable progress data              | Falls back to `null` progress (all courses show "Not started") |
| `CoursePage` — `loadPackage` fails     | Invalid package, missing manifest      | Error screen: "Unable to load this course" + back button       |
| `Sidebar` — no nodes in package        | Empty workflow                         | Sidebar shows "No lessons" placeholder                         |
| `CompletionScreen` — no scores         | Workflow completed with 0 scored nodes | Shows "No skills assessed" instead of empty SkillSummary       |
| `CompletionScreen` — no badges         | No rewards.json or no badges earned    | Omits badges section entirely                                  |

## 8. Testing

| What               | How                                                                           | Package                   |
| ------------------ | ----------------------------------------------------------------------------- | ------------------------- |
| `scanPackages()`   | Unit: empty dir, valid packages, mixed valid/invalid, deep nesting            | `@open-edu/core`          |
| `CourseCard`       | Unit: not-started, in-progress, completed states; click handler; badge counts | `@open-edu/runtime`       |
| `ProgressBadge`    | Unit: 0%, 50%, 100%; isCompleted flag                                         | `@open-edu/runtime`       |
| `Sidebar`          | Unit: renders all nodes, highlights current, marks visited, empty state       | `@open-edu/runtime`       |
| `CourseOutline`    | Unit: renders Sidebar + summary, collapsible toggle                           | `@open-edu/runtime`       |
| `CompletionScreen` | Unit: renders message + skills + badges + back button click                   | `@open-edu/runtime`       |
| `LayoutShell`      | Regression: existing tests must pass; new test for sidebar slot               | `@open-edu/runtime`       |
| `CatalogPage`      | Unit: renders grid, empty state, click-to-launch                              | `apps/learner`            |
| `CoursePage`       | Unit: progress persistence roundtrip, badge toast                             | `apps/learner`            |
| `progressStorage`  | Unit: save, load, multiple packages, corrupted data recovery                  | `apps/learner`            |
| E2E full flow      | Playwright: catalog → course → complete nodes → completion → back to catalog  | `tests/e2e`               |
| E2E progress       | Playwright: complete a node, reload, verify progress survives                 | `tests/e2e`               |
| E2E sidebar        | Playwright: Tab through sidebar, verify aria-current updates                  | `tests/e2e`               |
| E2E badges         | Playwright: earn badge during course, verify toast + completion screen        | `tests/e2e`               |
| Accessibility      | axe-core audit on every rendered screen                                       | `@open-edu/accessibility` |

No new test dependencies. All existing frameworks (Vitest, React Testing Library, Playwright, axe-core) are sufficient.

## 9. File Manifest

| File                                                        | Change Type                           |
| ----------------------------------------------------------- | ------------------------------------- |
| `packages/core/src/scanner.ts`                              | **New**                               |
| `packages/core/src/scanner.test.ts`                         | **New**                               |
| `packages/core/src/index.ts`                                | **Modify** — export `scanPackages`    |
| `packages/workflow/src/topology.ts`                         | **New**                               |
| `packages/workflow/src/topology.test.ts`                    | **New**                               |
| `packages/workflow/src/index.ts`                            | **Modify** — export `getOrderedNodes` |
| `packages/runtime/src/layout/Sidebar.tsx`                   | **New**                               |
| `packages/runtime/src/layout/Sidebar.test.tsx`              | **New**                               |
| `packages/runtime/src/layout/LayoutShell.tsx`               | **Modify** — add `sidebar` prop       |
| `packages/runtime/src/layout/LayoutShell.test.tsx`          | **Modify** — test sidebar slot        |
| `packages/runtime/src/components/CourseOutline.tsx`         | **New**                               |
| `packages/runtime/src/components/CourseOutline.test.tsx`    | **New**                               |
| `packages/runtime/src/components/CourseCard.tsx`            | **New**                               |
| `packages/runtime/src/components/CourseCard.test.tsx`       | **New**                               |
| `packages/runtime/src/components/CompletionScreen.tsx`      | **New**                               |
| `packages/runtime/src/components/CompletionScreen.test.tsx` | **New**                               |
| `packages/runtime/src/components/ProgressBadge.tsx`         | **New**                               |
| `packages/runtime/src/components/ProgressBadge.test.tsx`    | **New**                               |
| `packages/runtime/src/index.ts`                             | **Modify** — export new components    |
| `apps/learner/src/main.tsx`                                 | **New**                               |
| `apps/learner/src/App.tsx`                                  | **New**                               |
| `apps/learner/src/CatalogPage.tsx`                          | **New**                               |
| `apps/learner/src/CatalogPage.test.tsx`                     | **New**                               |
| `apps/learner/src/CoursePage.tsx`                           | **New**                               |
| `apps/learner/src/CoursePage.test.tsx`                      | **New**                               |
| `apps/learner/src/progressStorage.ts`                       | **New**                               |
| `apps/learner/src/progressStorage.test.ts`                  | **New**                               |
| `apps/learner/package.json`                                 | **New**                               |
| `apps/learner/tsconfig.json`                                | **New**                               |
| `apps/learner/vite.config.ts`                               | **New**                               |
| `apps/learner/index.html`                                   | **New**                               |
| `tests/e2e/learner-experience.spec.ts`                      | **New**                               |

## 10. Package Summary Type

Shared between `scanPackages` and the catalog, exposed from `@open-edu/core`:

```typescript
interface PackageSummary {
  manifest: PackageManifest;
  nodeCount: number;
  availableBadges: number;
}
```

Imported by both `@open-edu/runtime` (for `CourseCard` props) and `apps/learner` (for `CatalogPage`).

## 11. Out of Scope (MVP)

- Search, filter, or category-based browsing in catalog
- Teacher/caregiver dashboard
- Server-side persistence or user accounts
- Node-jumping from sidebar (sidebar is read-only)
- Course sharing, assignment, or enrollment
- Analytics dashboard for learners
- Adaptive routing visualization
- Animated transitions between screens
- Badge images/icons (text names only)
- Mobile-responsive layout beyond basic sidebar collapse
- Multi-language support
