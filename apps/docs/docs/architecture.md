---
sidebar_position: 2
---

# Architecture

## High-Level Architecture

```
Educational Package (Markdown + JSON)
        │
        ▼
  ┌──────────────┐
  │     Core     │  Package loader, patcher, lint, agent generator
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │   Workflow   │  XState + skill tracking + mastery routing
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │   Runtime    │  React renderer — lessons, quizzes, widgets
  └──┬───┬───┬──┘
     ▼   ▼   ▼
  ┌────┐┌────┐┌──────────┐
  │A11y││Widgets││Telemetry │
  └────┘└────┘└───┬─────┘
                  ▼
           ┌──────────┐
           │ Rewards  │  Badges, conditions, verification
           └──────────┘
```

## Technology Stack

| Layer           | Technology            |
| --------------- | --------------------- |
| Language        | TypeScript 5.x        |
| Package Manager | pnpm 9.x              |
| Monorepo        | pnpm workspaces       |
| Build Tool      | Vite 5.x              |
| Schemas         | Zod 3.x               |
| State Machine   | XState 5.x            |
| UI Framework    | React 18.x            |
| Styling         | Tailwind CSS 3.x      |
| Accessibility   | React Aria + axe-core |
| Telemetry       | RxJS 7.x              |
| CLI             | Commander 12.x        |
| Testing         | Vitest 1.x            |
| E2E             | Playwright 1.x        |

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

## Skill Tracking

Workflows can define a skill graph with dependencies and mastery thresholds. When nodes with skill assessments are completed, the engine accumulates scores and determines mastery levels (`not_attempted`, `in_progress`, `achieved`, `mastered`). Workflow routes can branch based on skill mastery, enabling adaptive progression.

## Accessibility Engine

Accessibility is a core subsystem, not a plugin. It manages:
- **Focus traps** — modal-like nodes keep keyboard focus within the active region
- **Live regions** — screen readers announce node transitions and feedback
- **ARIA generation** — semantic roles, labels, and descriptions
- **Automated auditing** — axe-core validation in the dev-server inspector

## Runtime Renderer

The React-based renderer handles node rendering, widget loading, progress tracking, and accessibility integration. It supports:
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

The `edu` CLI provides 10+ commands organized around the package lifecycle:

| Command          | Purpose                                |
| ---------------- | -------------------------------------- |
| `dev`            | Start development server               |
| `validate`       | Schema validation + integrity checks   |
| `build`          | Package build with manifest metadata   |
| `package`        | Deterministic archive creation         |
| `create`         | Scaffold a new package directory       |
| `report`         | Summarize telemetry JSONL files        |
| `lint-content`   | Content quality checks beyond schemas  |
| `patch`          | Apply surgical, validated JSON patches |
| `generate`       | Agent-ready prompt and package generation |
| `widget create`  | Scaffold a new widget package          |

All commands support `--json` for machine-readable output.
