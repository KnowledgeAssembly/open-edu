---
type: Architecture Overview
title: Architecture Overview
description: High-level map of the Open-Edu monorepo architecture, including content loading, workflow execution, runtime rendering, the widget catalog pipeline used by core and the CLI, and the SVG explorer widget family.
tags: [openwiki, architecture, monorepo, runtime]
---

# Architecture Overview

Open-Edu is a pnpm workspace monorepo built around a content/runtime split:

1. content is authored as portable package directories
2. schemas validate that content
3. workflow engines determine progression
4. runtime packages render the experience
5. apps assemble those packages into learner-facing tools

## Top-level structure

- `apps/` — deployed applications and local dev surfaces
- `packages/` — reusable framework packages
- `examples/` — content packages that exercise the framework
- `docs/` — canonical design and architecture documents

The root `package.json` exposes repo-wide build, test, lint, typecheck, and formatting commands, while `pnpm-workspace.yaml` includes `packages/*`, `apps/*`, and `examples/*`.

## Runtime stack

The architecture described in `docs/ARCHITECTURE.md` and reflected in package manifests is:

- TypeScript 5.x throughout the monorepo
- React 18 + Vite for runtime apps
- Zod for schema validation and type generation
- XState-based workflow execution
- RxJS-based telemetry collection
- Tailwind CSS for styling
- Radix UI + shadcn/ui-style primitives in the design system
- vite-plugin-pwa + Workbox for service worker generation
- IndexedDB via `idb` for offline-first storage

## Main package responsibilities

### `@open-edu/schemas`

Defines the data contracts that everything else relies on: manifests, workflows, node types, progress snapshots, telemetry events, rewards, and card definitions.

### `@open-edu/core`

Loads packages from disk, validates manifests and content, scans collections, and powers CLI/compiler workflows.

### `@open-edu/workflow`

Owns progression logic, node ordering, mastery/skill tracking, and bundle/module orchestration.

### `@open-edu/runtime`

Owns renderers and runtime UI: markdown, quiz, reflection, widget, placeholder, layout shells, theme provider, theme registry, course cards, bundle overview, progress ring, and knowledge-card surfaces.

### `@open-edu/design-system`

Provides two tiers of UI:

- primitives for general UI building blocks
- visual-dna patterns and learning surfaces for Open-Edu-specific pages

### `@open-edu/i18n`

Provides internationalization infrastructure: locale types (en, hi, or), a translation engine with namespace-based dictionary lookup and fallback, a React context provider with `useTranslation` hook, formatting utilities wrapping `Intl` APIs, and a `LanguageSwitcher` radio-group component. CLI commands extract, validate, and diff translation keys across locales. Consumed by `@open-edu/runtime` and `@open-edu/learner` for all user-facing strings.

### `@open-edu/cli`

Exposes the `edu` command for validation, development, building, packaging, creation, reporting, linting, patching, generation, compilation, and content import.

### `@open-edu/telemetry`

Captures learning interaction streams and persists them in JSONL form.

### `@open-edu/rewards`

Translates events into reward receipts, including badge delivery and card progression.

### `@open-edu/widgets`

Provides the widget registry and built-in widgets used by content nodes and runtime renderers. The registry supports alias resolution, domain namespacing, structured search, metadata validation, and catalog generation for LLM prompts. Recent changes moved the canonical widget metadata into `packages/widgets/src/widget-catalog-source.ts` and added the SVG explorer widget family, while `@open-edu/core` now reads the generated catalog data at runtime.

### `@open-edu/course-compiler`

Compiles course-spec Markdown or JSON into validated package structures.

### `@open-edu/pipeline` and `@open-edu/llm-config`

Support AI-assisted curriculum generation from PDFs and abstract over model providers.

**Pipeline** (`@open-edu/pipeline`) implements an 8-stage PDF-to-course-spec pipeline:

1. **Extract** — PDF text extraction with `pdf-parse`
2. **Source Inventory** — Taxonomy-driven unit classification + LLM reclassification
3. **Concept Map** — LLM generates teachable concepts with profile-aware prompts
4. **Lesson Blueprints** — Per-concept blueprints with arcs, widget requests, asset requests
5. **Activity Generation** — Activities generated from blueprint lesson arcs
6. **Asset Plan** — LLM-planned visual assets rendered by SVG registry
7. **Validation** — Pluggable validators (structure, math, science), widget configs, coverage
8. **Output** — Renders course-spec.json + course-spec.md

Key architecture:

- **Curriculum profiles** (`profile/`) — generic, math, science, nios profiles control widgets, renderers, validators, and prompt context. Unknown subjects fall back to generic.
- **Document scope** (`scope/`) — Supports `all`, `chapter-index:N`, `chapter-id:ID`, `pages:A-B`, `source-units:id,id`.
- **Renderer registry** (`assets/registry.ts`) — 11 built-in SVG renderers, extensible per profile.
- **Validator registry** (`validation/registry.ts`) — Pluggable subject validators run only when profile enables them.
- **Resume & artifact identity** — Config hash includes PDF content, profile, scope, language, locale; `pipeline-manifest.json` prevents cross-scope reuse.

**LLM Config** (`@open-edu/llm-config`) provides per-stage model routing with environment variable and CLI override support. Stages with low reasoning needs (classification, generation) use `gpt-4o-mini`; structural stages (concept design, blueprinting, review) use stronger reasoning models like `gpt-4o`.

### `@open-edu/storage`

Provides IndexedDB persistence with 6 typed object stores: courses, progress, badges, cards, search-indexes, and preferences. Built on the `idb` Promise-based wrapper. All learner app persistence (progress, badges, cards, bundle progress, search index) migrated from localStorage to this package.

### `@open-edu/pwa-core`

Framework-agnostic PWA primitives: install prompt detection (`getInstallState`, `promptInstall`), service worker update monitoring (`registerUpdateListener`, `skipWaiting`), connectivity detection (`getOnlineStatus`, `onOnlineStatusChange`), and storage quota queries (`getStorageUsage`). Consumed by the learner app through React hooks.

## Runtime data flow

A typical course launch looks like this:

1. a package is loaded from disk through `@open-edu/core`
2. schemas validate manifest/content shape
3. workflow routing decides which node comes next
4. `@open-edu/runtime` renders the active node
5. telemetry records learner actions
6. rewards and cards react to emitted events
7. learner-app storage persists progress, badges, cards, and bundle state

The learner app's `CourseRuntime` composes `RuntimeProvider`, `LayoutShell`, `WorkflowEngine`, `TelemetrySession`, `AccessibilityProvider`, `RewardBroker`, `CardBroker`, widget registry setup, and local storage helpers.

## Bundle and card architecture

Recent changes in git show a move from generic `Card` naming to `KnowledgeCard` naming in the runtime, and a parallel addition of `BundleCard` and `ProgressCard` in the design system. That split matters:

- runtime components own data-aware runtime surfaces
- design-system components own reusable visual cards and page patterns
- learner pages compose both to build catalog, progress, bundle overview, and collection binder screens

## Why this structure exists

The repo is organized to keep learning content portable and the runtime platform-independent. The architecture favors:

- content-first authoring
- schema-driven contracts
- accessibility by default
- agent-friendly deterministic structures
- modular rendering surfaces that are easy to extend

## Where to look when changing architecture

- package contracts: `packages/schemas`
- filesystem loading and content normalization: `packages/core`
- routing and mastery: `packages/workflow`
- rendering and theme behavior: `packages/runtime`
- visual structure and reusable UI: `packages/design-system`
- widget ID resolution and catalog generation: `packages/widgets/src/domains.ts`, `packages/widgets/src/widget-catalog-source.ts`, `packages/widgets/scripts/generate-catalog.ts`, plus SVG explorer components under `packages/widgets/src/svg-explorer`
- IndexedDB persistence: `packages/storage` (6 stores: courses, progress, badges, cards, search-indexes, preferences)
- PWA infrastructure (install, update, connectivity): `packages/pwa-core`
- service worker and caching config: `apps/learner/vite.config.ts`
- internationalization and locale management: `packages/i18n`
- end-user navigation and app composition: `apps/learner`
