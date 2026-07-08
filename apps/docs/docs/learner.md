---
sidebar_position: 5
---

# Learner App

The **learner app** (`@open-edu/learner`) is a standalone application that provides the full course-taking experience — catalog browsing, course navigation, **bundle overviews**, progress tracking, reward integration, **theme switching**, and a **modernized UI** built on shadcn/ui components with Radix UI primitives and Lucide icons.

## Quick Start

```bash
pnpm --filter @open-edu/learner dev
```

Opens at `http://localhost:4001`. The app scans all example packages and bundles in the repository and presents them as a browsable catalog. You can switch between all 3 built-in themes using the palette icon in the TopAppBar.

## Architecture

The learner app is built on top of the Open-Edu runtime packages:

```
@open-edu/learner
  ├── @open-edu/core          — scanPackages, scanAll, loadPackage, loadBundle
  ├── @open-edu/workflow      — WorkflowEngine, BundleEngine, getOrderedNodes
  ├── @open-edu/runtime       — RuntimeThemeProvider, useThemePreference,
  │                              TopAppBar, SideNav, AITutorPanel, NodeRenderer,
  │                              BundleOverview, etc.
  ├── @open-edu/rewards       — RewardBroker for badge delivery
  ├── @open-edu/telemetry     — TelemetrySession for event capture
  ├── @open-edu/accessibility — AccessibilityProvider
  ├── @open-edu/widgets       — createDefaultRegistry
  ├── @open-edu/design-system — AppSidebar, AppLayout, SideNav, TopAppBar, etc.
  ├── @open-edu/ai-companion  — CompanionProvider, SearchManager, DictionaryService
  ├── @open-edu/schemas       — TypeScript types derived from Zod schemas
  └── @open-edu/llm-config    — LLM provider abstraction
```

## Page Router

The app uses **react-router-dom** 6.x (`useNavigate`, `useLocation`, `useBlocker`) for navigation with an `AppView` union type that drives path-to-view mapping:

| View           | Route         | Description                                                               |
| -------------- | ------------- | ------------------------------------------------------------------------- |
| **Home**       | `/`           | Landing page with quick-start actions                                     |
| **Catalog**    | `/catalog`    | Scans and displays all packages as CourseCards                            |
| **Progress**   | `/progress`   | Bento-grid dashboard — completion, AI insights, mastery profile, activity |
| **Settings**   | `/settings`   | Theme switching, preferences, accessibility controls                      |
| **Course**     | `/course/:id` | 3-panel viewer — SideNav + content canvas + AITutorPanel                  |
| **Bundle**     | `/bundle/:id` | Multi-module bundle overview page                                         |
| **Collection** | `/collection` | Collection Binder — Knowledge Cards gallery                               |
| **Break**      | `/break`      | Break reminder page                                                       |

## Course Catalog

On startup, the app uses `scanPackages()` to discover all valid packages and `scanBundles()` to discover multi-module bundles in the `../../examples` directory. Each package is displayed as a **CourseCard** showing its title, progress badge (not started / in progress / completed), and a Start or Continue button.

### Bundle Cards

Bundles appear in a separate **"Learning Bundles"** section of the catalog. Each bundle card (`[data-testid="bundle-card"]`) shows:

- Bundle title and description
- Module count and total activity count
- Overall progress bar (if started)
- A **"Browse Bundle"** button to navigate to the bundle overview

## Bundle Overview

When you click a bundle card, the app loads the bundle via `loadBundle()` and renders a **BundleOverviewPage** (`[data-testid="bundle-overview"]`). This page shows:

- Bundle title and metadata
- **Module cards** (`[data-testid="module-card"]`) — one per module with status badges:
  - `locked` — prerequisite modules not yet completed
  - `unlocked` — ready to start
  - `completed` — finished with score
- Per-module progress bars and estimated duration
- **Start Module** buttons on unlocked modules (launches the course runtime for that module)

### Module-to-Module Navigation

When a module is completed within a bundle, the app updates the `BundleProgressSnapshot` (persisted to `localStorage` under `open-edu-bundle-progress`), evaluates prerequisites, and unlocks dependent modules. The exit warning dialog is suppressed when navigating between modules within the same bundle.

## Course View

Clicking a course loads it via `loadPackage()` and renders:

- **SideNav** — course outline with node-by-node progress, active tab highlighting, and `aria-current` indication
- **TopAppBar** — sticky header with breadcrumbs, theme selector, accessibility controls, and search
- **AITutorPanel** (lesson/code pages) — right sidebar for AI chat, notes, and highlights
- **Node renderers** — markdown for lessons, quiz with scoring, reflection with text input, widget renderer for exercises

### Node Navigation

- **Lesson nodes** — "Next" button advances to the next node
- **Quiz nodes** — Select an answer and click "Submit" to score
- **Reflection nodes** — Type a response and click "Submit"
- **Exercise nodes** — Interact with the widget and submit

## Theme Switching

All course pages (Course Home, Lesson, Assessment, Code, Progress) include a `ThemeSelector` in the `TopAppBar`. The selected theme is persisted to `localStorage` via `useThemePreference()` and reapplied on return visits. 18 axe-core audits (6 pages × 3 themes) confirm every theme is accessible.

## Progress Persistence

Progress is saved to `localStorage` under the key `open-edu-progress` (a JSON map of package IDs to `ProgressSnapshot`). On return visits, the app resumes from the last uncompleted node.

## Rewards & Badges

If a package includes `rewards.json`, the app creates a `RewardBroker` that listens for events from the `WorkflowEngine`. When a badge is earned, a toast notification appears in the bottom-right corner for 3 seconds, and the badge is recorded for display on the completion screen.

## Collection Binder

The **Collection Binder** is a sidebar-accessible view that displays all unlocked Living Knowledge Cards across every loaded package. Each card category forms a **shelf** with a `ProgressRing` showing collection progress.

**Access:** Click the "Collection Binder" link in the sidebar (`Library` icon) on any non-course page.

**Features:**

- Category shelves sorted alphabetically
- Circular progress ring per shelf (`unlockedCount / totalCount`)
- Card grid with glassmorphism cards showing type icon, level stars, and lock state
- CardViewer dialog on click with full card details and mastery level progression
- Progress persisted to localStorage (`open-edu-cards` key)
- Restores cross-session card levels via `CardBroker.initialLevels`

### Persistence

| Key              | Format                                | Description                     |
| ---------------- | ------------------------------------- | ------------------------------- |
| `open-edu-cards` | `{ [cardId]: { level, unlockedAt } }` | Card level progress per card ID |

### Implementation

The Collection Binder is wired in `AppShell.tsx` through the `collection` view type. It receives all `packageEntries` and aggregates cards from every package that has a `cards.json` file. The `CardBroker` is instantiated inside `CourseRuntime.tsx` and feeds telemetry events to evaluate unlock/level-up conditions.

```typescript
// CourseRuntime.tsx — CardBroker setup
const cardBroker = pkg.cards?.cards
  ? new CardBroker({
      cards: pkg.cards.cards,
      source: session.events$,
      initialLevels: fromEntries(/* saved progress */),
      onCardUnlocked: (card) => {
        /* show toast, save progress */
      },
      onCardLeveledUp: (card, newLevel) => {
        /* show toast, save progress */
      },
    })
  : null;
```

## Completion Screen

After the workflow reaches `COMPLETED`, the app renders a **CompletionScreen** showing:

- Course title
- Skill scores summary (if any skills were assessed)
- List of earned badges (if any)
- "Back to catalog" button

## shadcn/ui Component Library

The learner app uses the **shadcn/ui-style component library** from `@open-edu/design-system` with 10 components built on Radix UI primitives:

| Component  | Radix Primitive | Usage in the app                                        |
| ---------- | --------------- | ------------------------------------------------------- |
| `Button`   | `Slot`          | Start/Continue, navigation, submit actions              |
| `Card`     | —               | Catalog cards, bundle cards, settings panels            |
| `Badge`    | —               | Progress status (not-started/doing/done), bundle badges |
| `Input`    | —               | Search bar, reflection responses                        |
| `Dialog`   | `Dialog`        | Course exit confirmation, course-exit warning           |
| `Select`   | `Select`        | Catalog sort/filter, module selector                    |
| `Progress` | `Progress`      | Course progress bars, bundle progress bars              |
| `Tabs`     | `Tabs`          | Settings page sections, dashboard tabs                  |
| `Switch`   | `Switch`        | Theme auto-switch, preferences toggles                  |
| `Tooltip`  | `Tooltip`       | Icon descriptions, badge explanations                   |

All components use `class-variance-authority` (cva) for variants, the `cn()` utility from `@/lib/utils`, and Tailwind CSS utility classes mapped to `--oe-*` theme tokens.

## Virtual Module

The app uses a Vite plugin (`eduDataPlugin`) that exposes a virtual module `virtual:edu-data` at dev time. This module exports:

- `catalogPackages` — `PackageSummary[]` for the catalog grid
- `packageEntries` — `Record<string, LoadedPackage>` keyed by package ID
- `catalogBundles` — `BundleSummary[]` for the bundle catalog section
- `bundleEntries` — `Record<string, LoadedBundle>` keyed by bundle ID

This avoids filesystem access in the browser while keeping the dev server as the single source of truth for package and bundle data.
