---
type: Architecture Overview
title: Architecture Overview
description: High-level map of the Open-Edu monorepo architecture, including content loading, workflow execution, runtime rendering, the widget catalog pipeline used by core and the CLI, the SVG explorer widget family, course distribution, and the Pipili AI companion.
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

### Agentic Course Authoring Skill

The `skills/openedu-course-authoring/` directory contains the portable agentic course-authoring skill. It uses the course-compiler and CLI as its authoritative validation backend, distinguishing between structural-only validation (portable mode) and full compiler validation (repository mode). See [content and workflows](../domain/content-and-workflows.md#agentic-course-authoring) for the complete reference.

### `@open-edu/llm-config`

LLM provider abstraction (OpenAI + OpenRouter) with per-stage model routing, environment-variable and CLI overrides, and a **ModelFactory** with two-tier routing (fast/escalation) for AI SDK v4 streaming. Consumed by the learner app's Pipili/LLM proxies.

> The curriculum pipeline (`@open-edu/pipeline`) moved to the standalone [`open-edu-pipeline`](https://github.com/KnowledgeAssembly/open-edu-pipeline) repository, which vendors a renamed copy of this package as `@open-edu/pipeline-llm`.

### `@open-edu/ai-companion`

Provides search, dictionary, conversation, and provider interfaces for the AI companion feature. Includes the **Pipili subsystem**:

- **Context normalization/bounding** (`src/pipili/context-utils.ts`) — priority-based context assembly from page, widget, lesson, module, course, notes, assessment, and learner profile
- **Hint progression engine** (`src/pipili/hint-utils.ts`) — graduated hint levels (nudge → scaffold → answer) with configurable instructions
- **Pipili metadata and V2 extension seams** for future capability expansion

The learner app implements the server-side Pipili endpoint using AI SDK v4's `streamText` with `pipeDataStreamToResponse`, including Zod request validation, assessment policy, accessibility profiles, and a 7-tool registry.

### `@open-edu/oep-distribution`

Course distribution system for portable `.oep` (Open-Edu Package) archives:

- **OepWriter** — builds portable `.oep` ZIP archives with SHA-256 content integrity
- **OepReader** — reads, validates, and extracts `.oep` packages (ZIP security, manifest validation, checksum verification)
- **InstallCoordinator** — stage-then-activate install flow with version detection (upgrade/downgrade/same-version guards)
- **ZIP security** — path traversal, absolute path, decompression bomb, archive size limit protection
- **Source adapters** — file, URL, and catalog source adapters
- **Catalog loader** — fetch and parse static JSON catalogs
- **Version comparison** — SEMVER comparison utilities

### `@open-edu/registry`

Node-only course registry tooling for GitHub-native distribution, published to npm:

- **GitHub API client** — list/get releases, download assets, parse `<id>-v<semver>` tags and `checksums.txt`
- **Catalog builder** — `buildCatalog()` merges `courses/*/metadata.json` + GitHub Releases into a `catalog.json` conforming to `CatalogSchema` (reuses `computeSha256`, `parseSemver`)
- **Release validation** — `validateRelease()` checks metadata presence, `.oep` asset + `checksums.txt`, SHA-256 cross-check, and validates the package with `OepReader`
- **JSON Schema generation** — emits `metadata.schema.json` / `catalog.schema.json` from the Zod schemas via `toJsonSchemaDraft7`
- **CLI** — `open-edu-registry validate-metadata | validate-catalog | generate-catalog | validate-release | generate-schemas`

Consumed by the `openedu-library` course registry repo (GitHub Actions call the CLI via `npx --no-install`).

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
- course distribution (`.oep` build, install, catalog, updates): `packages/oep-distribution`
- course registry (catalog build, release validation, schema generation): `packages/registry` + the `openedu-library` repo
- Pipili AI companion (chat, hints, context mapping): `packages/ai-companion/src/pipili/` and `apps/learner/src/pipili/`
- end-user navigation and app composition: `apps/learner`
