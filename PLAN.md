# Open-Edu Framework Implementation Plan

Version: 0.1.0
Status: Active

---

## Overview

This document breaks down the Open-Edu Framework MVP into 12 epics and ~32 implementable stories. Each story is a GitHub issue with enough technical detail for an AI coding agent (deepseek-v4-flash) to implement independently.

The plan follows the architectural principle: **Schemas before implementation, Content before UI, Accessibility before features, Local-first before cloud.**

---

## Technology Stack

| Layer           | Technology                |
| --------------- | ------------------------- |
| Language        | TypeScript 5.x            |
| Package Manager | pnpm 9.x                  |
| Monorepo        | pnpm workspaces           |
| Build Tool      | Vite 5.x                  |
| Schemas         | Zod 3.x                   |
| State Machine   | XState 5.x                |
| UI Framework    | React 18.x                |
| Styling         | Tailwind CSS 3.x          |
| Markdown        | remark + rehype + unified |
| Accessibility   | React Aria + axe-core     |
| Telemetry       | RxJS 7.x                  |
| CLI             | Commander 12.x            |
| Unit Testing    | Vitest 1.x                |
| E2E Testing     | Playwright 1.x            |
| Docs            | Docusaurus 3.x            |

---

## Monorepo Structure

```
open-edu/
├── apps/
│   ├── dev-server/          # Vite dev server (Epic 10)
│   └── docs/                # Docusaurus docs site (future)
├── packages/
│   ├── schemas/             # Zod schemas + type generation (Epic 2)
│   ├── core/                # Package loader + validation (Epic 3)
│   ├── workflow/            # XState workflow engine (Epic 4)
│   ├── runtime/             # React runtime renderer (Epic 5)
│   ├── accessibility/       # A11y engine (Epic 6)
│   ├── telemetry/           # RxJS telemetry + JSONL (Epic 7)
│   ├── rewards/             # Reward broker (Epic 8)
│   ├── cli/                 # edu CLI (Epic 9)
│   └── widgets/             # Widget SDK + built-in widgets (future)
├── examples/
│   ├── hello-world/         # Minimal example (Epic 11)
│   ├── intro-javascript/    # Multi-node example (Epic 11)
│   ├── fractions/           # Quiz + remediation (Epic 11)
│   └── autism-reading/      # Accessibility-first example (Epic 11)
├── tests/
│   └── e2e/                 # Playwright integration tests (Epic 12)
├── docs/
│   ├── VISION.md
│   ├── ARCHITECTURE.md
│   ├── FRAMEWORK_SPEC.md
│   └── PLAN.md              # This file
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .github/
│   └── workflows/
│       └── ci.yml
└── AGENTS.md
```

---

## Epic Summary

| #   | Epic                        | Stories | Priority | Key Dependencies   |
| --- | --------------------------- | ------- | -------- | ------------------ |
| 1   | Foundation & Monorepo Setup | 3       | P0       | None               |
| 2   | Schema Layer                | 4       | P0       | Epic 1             |
| 3   | Package Loader              | 2       | P0       | Epic 2             |
| 4   | Workflow Engine             | 2       | P0       | Epic 2             |
| 5   | Runtime Renderer            | 5       | P0       | Epics 3, 4         |
| 6   | Accessibility Engine [DONE] | 3       | P0       | Epic 5             |
| 7   | Telemetry Engine            | 3       | P0       | Epic 2             |
| 8   | Reward Broker               | 2       | P1       | Epic 7             |
| 9   | CLI                         | 2       | P0       | Epics 3, 10        |
| 10  | Dev Server                  | 2       | P0       | Epic 5             |
| 11  | Example Packages            | 2       | P1       | Epic 2             |
| 12  | Integration Testing         | 2       | P1       | Epics 5, 6, 10, 11 |

---

## Dependency Graph

```
Epic 1 (Foundation)
  └─► Epic 2 (Schemas)
        ├─► Epic 3 (Package Loader)
        │     └─► Epic 5 (Runtime Renderer)
        │           ├─► Epic 6 (Accessibility)
        │           ├─► Epic 10 (Dev Server)
        │           │     └─► Epic 9 (CLI)
        │           └─► Epic 12 (Testing)
        ├─► Epic 4 (Workflow Engine)
        │     └─► Epic 5 (Runtime Renderer)
        ├─► Epic 7 (Telemetry)
        │     └─► Epic 8 (Rewards)
        └─► Epic 11 (Examples)
```

---

## Story Breakdown

### Epic 1: Foundation & Monorepo Setup

- Story 1.1: Initialize pnpm monorepo with all package directories
- Story 1.2: Set up shared TypeScript, ESLint, Prettier, Vitest configs
- Story 1.3: Create AGENTS.md, CI workflow, and PR template

### Epic 2: Schema Layer

- Story 2.1: Package manifest + node type schemas (Zod → TS types + JSON Schema export)
- Story 2.2: Workflow schema (routing rules + conditional expressions)
- Story 2.3: Rewards schema (triggers + badge/webhook/script actions)
- Story 2.4: Telemetry event schema (event types + JSONL format)

### Epic 3: Package Loader

- Story 3.1: Package directory loader + manifest parsing + schema validation
- Story 3.2: Node file loading + type detection + asset resolution

### Epic 4: Workflow Engine

- Story 4.1: XState machine builder from workflow.json + conditional routing
- Story 4.2: Workflow state events + telemetry integration hooks

### Epic 5: Runtime Renderer

- Story 5.1: Runtime context provider + workflow state integration
- Story 5.2: Markdown rendering pipeline (remark → rehype → accessible React)
- Story 5.3: Quiz node renderer with scoring + answer validation
- Story 5.4: Reflection node renderer with text input
- Story 5.5: Navigation UI + Tailwind design system + layout shell

### Epic 6: Accessibility Engine

- Story 6.1: Focus management + keyboard navigation system
- Story 6.2: ARIA generation (landmarks, labels, roles, descriptions)
- Story 6.3: axe-core dev-mode accessibility validator

### Epic 7: Telemetry Engine

- Story 7.1: Telemetry event emitter (RxJS Subject/Observable pipeline)
- Story 7.2: JSONL append-only persistence layer
- Story 7.3: Telemetry session management (start/stop/restore)

### Epic 8: Reward Broker

- Story 8.1: Reward broker core + badge + webhook action handlers
- Story 8.2: Script reward action (opt-in via --allow-shell-hooks flag)

### Epic 9: CLI

- Story 9.1: CLI framework (Commander) + `edu validate` command
- Story 9.2: `edu dev` + `edu build` + `edu package` commands

### Epic 10: Dev Server

- Story 10.1: Vite dev server + runtime mounting + hot reload
- Story 10.2: Telemetry inspector + accessibility inspector panels

### Epic 11: Example Packages

- Story 11.1: hello-world + intro-javascript example packages
- Story 11.2: fractions + autism-reading example packages

### Epic 12: Integration Testing

- Story 12.1: Playwright setup + package execution end-to-end tests
- Story 12.2: Keyboard navigation + accessibility + telemetry e2e tests

---

## Conventions for AI Agents

1. **Every story must produce tests.** No story is complete without Vitest unit tests.
2. **Schemas are the source of truth.** All types derive from Zod schemas, never hand-written.
3. **Packages must be self-contained.** No cross-package imports except through published interfaces (package.json exports).
4. **Accessibility is not optional.** Every rendered component must pass axe-core.
5. **Commits should be scoped.** Use conventional commits: `feat(schemas): add workflow schema`
6. **One story per PR.** Each story gets its own branch and PR.
