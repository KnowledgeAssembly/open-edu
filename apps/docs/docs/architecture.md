---
sidebar_position: 2
---

# Architecture

## High-Level Architecture

```
Educational Package / Bundle (Markdown + JSON)
        │
        ▼
  ┌──────────────┐
  │     Core     │  Package loader, scanner, patcher, lint, generator
  ├──────────────┤
  │ scanPackages │  Discover packages → catalog
  │ scanBundles  │  Discover bundles → bundle catalog
  │ loadBundle   │  Load multi-module bundles
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │   Workflow   │  XState + skill tracking + mastery routing
  ├──────────────┤
  │ BundleEngine │  Orchestrates per-module WorkflowEngine instances,
  │              │  prerequisite unlock, resume/checkpoint snapshots
  └──────┬───────┘
         │
         ▼
  ┌──────────────────────────┐
  │        Runtime           │  React renderer — lessons, quizzes, widgets
  │                          │  3 themes, Tailwind-styled (--oe-* tokens)
  ├──────────────────────────┤
  │ Layout Components:       │
  │  SideNav     TopAppBar   │
  │  CourseTree  AITutorPanel│
  │  AICallout   ReadingRuler│
  ├──────────────────────────┤
  │ Bundle Components:       │
  │  BundleOverview          │  Syllabus page with module status + progress
  ├──────────────────────────┤
  │ Renderers: Markdown, Quiz│
  │  Reflection, Widget,     │
  │  Placeholder, Node       │
  ├──────────────────────────┤
  │ Theming: RuntimeTheme-   │
 │  Provider,               │
 │  useThemePreference,     │
  │  ThemeSelector           │
  └──┬───┬───┬───────┬──────┘
     ▼   ▼   ▼       ▼
  ┌────┐┌────┐┌────────┐┌──────────┐
  │A11y││Widgets││Telemetry││ Theming  │
  │    ││      ││        ││(runtime) │
  └────┘└────┘└───┬────┘└──────────┘
                  ▼
           ┌──────────┐
           │ Rewards  │  Badges, conditions, verification
           │          │  moduleCompleted / bundleCompleted conditions
           └──────────┘
                  │
                  ▼
   ┌─────────────────────────────────────┐
   │           PWA Layer                  │
   │  vite-plugin-pwa · Workbox           │
   │  Service Worker · Runtime Caching    │
   ├──────────────┬──────────────────────┤
   │ pwa-core     │ storage               │
   │ Install · SW │ IndexedDB (6 stores)  │
   │ Connectivity │ Courses · Progress    │
   │ Update       │ Badges · Cards        │
   └──────┬───────┴──────────┬───────────┘
          ▼                  ▼
   ┌────────────────────┐
   │   Learner App      │  Standalone app
   │   Catalog · Course  │  · Bundles · Progress · Themes
   │   shadcn/ui + Radix │  · Lucide icons · Offline-first
   └────────────────────┘
```

## Technology Stack

| Layer           | Technology                                     |
| --------------- | ---------------------------------------------- |
| Language        | TypeScript 5.x                                 |
| Package Manager | pnpm 9.x                                       |
| Monorepo        | pnpm workspaces                                |
| Build Tool      | Vite 5.x                                       |
| Schemas         | Zod 3.x                                        |
| State Machine   | XState 5.x                                     |
| UI Framework    | React 18.x                                     |
| UI Primitives   | Radix UI + shadcn/ui + Lucide Icons            |
| Styling         | Tailwind CSS 3.x + clsx + cva + tailwind-merge |
| Accessibility   | React Aria + axe-core                          |
| Telemetry       | RxJS 7.x                                       |
| CLI             | Commander 12.x                                 |
| Testing         | Vitest 1.x                                     |
| E2E             | Playwright 1.x                                 |
| PWA             | vite-plugin-pwa + Workbox                      |
| Storage         | IndexedDB via idb                              |

## Package Architecture

Educational experiences are distributed as portable packages:

```
my-package/
├── package.json         # Manifest — id, title, version, author, entry, skills
├── workflow.json        # Routing — linear, conditional, skill-based branching
├── rewards.json         # Rewards — badges, conditional rules, verification
├── nodes/               # Content — markdown lessons, JSON quizzes/reflections
├── assets/              # Static files — images, etc.
└── skills.json          # Skill definitions and assessments (optional)
```

Packages remain human readable, AI generatable, git friendly, and platform independent.

## Schema Layer

Zod serves as the single source of truth for runtime validation, TypeScript types, JSON Schema, and AI agent contracts. Schemas cover manifests, workflows, nodes, rewards, telemetry, progress snapshots, skill graphs, and remote widget manifests.

## Workflow Engine

The workflow engine (XState) controls navigation, progression, remediation loops, and adaptive routing through declarative routing rules defined in `workflow.json`. It also supports **skill tracking** — accumulating weighted scores per skill and emitting `SKILL_UPDATED` / `SKILL_ACHIEVED` events when mastery thresholds are crossed.

### BundleEngine

For multi-module bundles, the `BundleEngine` (at `@open-edu/workflow`) orchestrates per-module `WorkflowEngine` instances:

- **Module lifecycle** — manages status transitions (`locked` → `unlocked` → `in_progress` → `completed`) based on prerequisite completion
- **Prerequisite unlocking** — when a module completes, `evaluatePrerequisites()` walks the reverse dependency graph and unlocks dependents whose all dependencies are met
- **Resume/checkpoint** — serializes per-module `ModuleProgressSnapshot` snapshots and restores on return visits
- **Events** — emits `module.changed`, `module.completed`, `module.unlocked`, and `bundle.completed` events

## Skill Tracking

Workflows can define a skill graph with dependencies and mastery thresholds. When nodes with skill assessments are completed, the engine accumulates scores and determines mastery levels (`not_attempted`, `in_progress`, `achieved`, `mastered`). Workflow routes can branch based on skill mastery, enabling adaptive progression.

## Accessibility Engine

Accessibility is a core subsystem, not a plugin. It manages:

- **Focus traps** — modal-like nodes keep keyboard focus within the active region
- **Live regions** — screen readers announce node transitions and feedback
- **ARIA generation** — semantic roles, labels, and descriptions
- **Automated auditing** — axe-core validation in the dev-server inspector

## Theming System

The framework ships with 3 built-in themes that control colors, typography, spacing, and border radii. Each theme is a `ThemeDefinition` object that gets flattened into 60+ `--oe-*` CSS custom properties on a wrapper `<div>`.

| Name          | ID                   | Type  | Description                       | Font Stack                              |
| ------------- | -------------------- | ----- | --------------------------------- | --------------------------------------- |
| OpenEdu Light | `lumina-scholastica` | Light | Default calm everyday learning    | Inter + Source Serif 4 + JetBrains Mono |
| OpenEdu Dark  | `nocturnal`          | Dark  | Calm dark for deep focus          | Inter + Source Serif 4 + JetBrains Mono |
| OpenEdu Zen   | `zen`                | Light | Reduced-stimulation quiet reading | Inter + Source Serif 4 + JetBrains Mono |

The `RuntimeThemeProvider` accepts a `themeId` prop and flattens the corresponding definition. `useThemePreference()` persists the selected theme to `localStorage`. `ThemeSelector` provides a popover UI for switching themes at runtime.

Both the learner app and dev-server map `--oe-*` tokens to Tailwind utility classes via `tailwind.config.ts` / `tailwind.config.js`.

## Runtime Renderer

The React-based renderer handles node rendering, widget loading, progress tracking, and accessibility integration. Key layout components include `SideNav` (fixed left navigation), `TopAppBar` (sticky header with breadcrumbs and theme selector), `AITutorPanel` (right sidebar for AI chat, notes, highlights), `CourseTree` (expandable module tree), `AICallout` (insight callout boxes), `ReadingRuler` (focus band overlay), and `BundleOverview` (syllabus page for multi-module bundles with module status badges and progress bars). It supports:

- **Progress snapshots** — serialize and restore learner state via `initialProgress` / `onProgressChange`
- **Embed adapter** — mount the runtime in any DOM element via `createRuntime()` without importing React directly
- **Widget rendering** — delegates to the Widget SDK for exercise and custom nodes

## Widget SDK

The Widget SDK provides a typed contract (`WidgetDefinition`, `WidgetRenderProps`) for interactive nodes. Widgets are registered via a `WidgetRegistry` and rendered by the runtime through `WidgetRenderer`. The SDK includes:

- **Built-in widgets** — `open-edu.multiple-choice-practice` for interactive practice
- **Remote loading** — fetch and cache widget bundles from URLs with integrity verification
- **Scaffold templates** — `edu widget create` generates publishable widget packages

## Telemetry Architecture

All learner interactions are modeled as RxJS event streams and persisted as JSONL (append-only, human readable, stream friendly). The telemetry package includes:

- **JSONL reader** — parse telemetry files with typed error reporting
- **Summary functions** — calculate events by type, node completions, quiz score averages, session counts
- **CLI reporting** — `edu report` generates text or JSON summaries

## Reward Broker

The reward broker consumes learning events and executes configured reward actions — badges, webhooks, or scripts — keeping incentives separate from content. It supports:

- **Conditional rules** — score thresholds, skill mastery, completion chains, and `and`/`or` combinators
- **Verification** — confirm receipts match telemetry events
- **Replay** — re-dispatch reward actions from telemetry files, skipping duplicates

## CLI Architecture

The `edu` CLI provides 12+ commands organized around the package lifecycle:

| Command             | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| `dev`               | Start development server                        |
| `validate`          | Schema validation + integrity checks            |
| `build`             | Package build with manifest metadata            |
| `package`           | Deterministic archive creation                  |
| `create`            | Scaffold a new package directory                |
| `report`            | Summarize telemetry JSONL files                 |
| `lint-content`      | Content quality checks beyond schemas           |
| `patch`             | Apply surgical, validated JSON patches          |
| `generate`          | Agent-ready prompt and package generation       |
| `widget create`     | Scaffold a new widget package                   |
| `compile`           | Compile course-spec.md into a validated package |
| `import learn-easy` | Import Learn-Easy content as an Open-Edu bundle |

All commands support `--json` for machine-readable output.
