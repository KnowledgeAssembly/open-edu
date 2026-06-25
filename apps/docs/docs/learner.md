---
sidebar_position: 5
---

# Learner App

The **learner app** (`@open-edu/learner`) is a standalone application that provides the full course-taking experience — catalog browsing, course navigation, progress tracking, and reward integration.

## Quick Start

```bash
pnpm --filter @open-edu/learner dev
```

Opens at `http://localhost:4001`. The app scans all example packages in the repository and presents them as a browsable catalog.

## Architecture

The learner app is built on top of the Open-Edu runtime packages:

```
@open-edu/learner
  ├── @open-edu/core       — scanPackages, loadPackage
  ├── @open-edu/workflow   — WorkflowEngine, getOrderedNodes
  ├── @open-edu/runtime    — RuntimeProvider, LayoutShell, components
  ├── @open-edu/rewards    — RewardBroker for badge delivery
  ├── @open-edu/telemetry  — TelemetrySession for event capture
  ├── @open-edu/accessibility — AccessibilityProvider
  └── @open-edu/widgets    — createDefaultRegistry
```

## Course Catalog

On startup, the app uses `scanPackages()` to discover all valid packages in the `../../examples` directory. Each package is displayed as a **CourseCard** showing its title, progress badge (not started / in progress / completed), and a Start or Continue button.

## Course View

Clicking a course loads it via `loadPackage()` and renders:

- **Sidebar** — course outline with node-by-node progress and `aria-current` indication
- **LayoutShell** — course title, progress bar, and active node renderer
- **Node renderers** — markdown for lessons, quiz with scoring, reflection with text input, widget renderer for exercises

### Node Navigation

- **Lesson nodes** — "Next" button advances to the next node
- **Quiz nodes** — Select an answer and click "Submit" to score
- **Reflection nodes** — Type a response and click "Submit"
- **Exercise nodes** — Interact with the widget and submit

## Progress Persistence

Progress is saved to `localStorage` under the key `open-edu-progress` (a JSON map of package IDs to `ProgressSnapshot`). On return visits, the app resumes from the last uncompleted node.

## Rewards & Badges

If a package includes `rewards.json`, the app creates a `RewardBroker` that listens for events from the `WorkflowEngine`. When a badge is earned, a toast notification appears in the bottom-right corner for 3 seconds, and the badge is recorded for display on the completion screen.

## Completion Screen

After the workflow reaches `COMPLETED`, the app renders a **CompletionScreen** showing:

- Course title
- Skill scores summary (if any skills were assessed)
- List of earned badges (if any)
- "Back to catalog" button

## Virtual Module

The app uses a Vite plugin (`eduDataPlugin`) that exposes a virtual module `virtual:edu-data` at dev time. This module exports:

- `catalogPackages` — `PackageSummary[]` for the catalog grid
- `packageEntries` — `Record<string, LoadedPackage>` keyed by package ID

This avoids filesystem access in the browser while keeping the dev server as the single source of truth for package data.
