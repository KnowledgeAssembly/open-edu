---
sidebar_position: 2
---

# Architecture

## High-Level Architecture

```
Educational Package
        │
        ▼
Package Loader
  Zod Validation
        │
        ▼
Workflow Engine
  XState
        │
        ▼
Runtime Renderer
  React + TypeScript
     ┌──┴──┐
     ▼     ▼
A11y    Widget SDK
Engine  (future)
     └──┬──┘
        ▼
Telemetry Engine
  RxJS Event Streams
        │
        ▼
Reward Broker
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
├── package.json
├── workflow.json
├── rewards.json
├── nodes/
├── assets/
└── widgets/
```

Packages remain human readable, AI generatable, git friendly, and platform independent.

## Schema Layer

Zod serves as the single source of truth for runtime validation, TypeScript types, JSON Schema, and AI agent contracts.

## Workflow Engine

The workflow engine (XState) controls navigation, progression, remediation loops, and adaptive routing through declarative routing rules defined in `workflow.json`.

## Accessibility Engine

Accessibility is a core subsystem, not a plugin. It manages focus, keyboard navigation, screen reader compatibility, and automated axe-core validation.

## Runtime Renderer

The React-based renderer handles node rendering, widget loading, progress tracking, and accessibility integration. It remains stateless whenever possible.

## Telemetry Architecture

All learner interactions are modeled as RxJS event streams and persisted as JSONL (append-only, human readable, stream friendly).

## Reward Broker

The reward broker consumes learning events and executes configured reward actions — badges, webhooks, or scripts — keeping incentives separate from content.
