---
type: Operations Guide
title: Operations, Commands, and Change Workflow
description: Runbook-style guide for building, testing, linting, and regenerating derived assets in the Open-Edu monorepo, including the widget catalog pipeline and the current `edu generate` flow.
tags: [openwiki, operations, testing, runbook]
---

# Operations, Commands, and Change Workflow

This repo is optimized for local development and agentic code changes. The root `package.json` and `AGENTS.md` define the main commands and constraints.

## Core commands

From the repository root:

- `pnpm install` — install dependencies
- `pnpm build` — build every package
- `pnpm test` — run all package tests
- `pnpm lint` — run package linting plus repo-wide style checks
- `pnpm typecheck` — type-check the workspace
- `pnpm format:check` — check formatting
- `pnpm format` — apply formatting
- `pnpm test:e2e` — run Playwright end-to-end tests
- `pnpm --filter @open-edu/learner dev` — start the learner app
- `pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js ...` — use the CLI after building it
- `pnpm --filter @open-edu/widgets generate:catalog` — regenerate the widget catalog JSON from the canonical source in `packages/widgets/src/widget-catalog-source.ts`

## Package-local commands

Examples of package-specific scripts from `package.json` files:

- `apps/learner` uses `vite`, `vitest run`, `tsc --noEmit`, and `eslint src/`
- `packages/cli` uses `tsc`, `vitest run`, and `eslint 'src/**/*.{ts,tsx}'`

## Testing expectations

The repo treats tests as a primary change guard. The agent instructions and root scripts emphasize:

- every story should include tests
- components should have rendering, interaction, and accessibility tests
- schema-driven changes should be validated at the package level
- learner flows rely on Vitest and Playwright coverage

## Tailwind and styling maintenance

The repo has an explicit workflow for CSS freshness:

- root linting checks for inline styles and Tailwind CSS staleness
- after changing runtime Tailwind classes, regenerate `apps/dev-server/src/tailwind.css` using the command in `AGENTS.md`

This matters because runtime and dev-server styling are intentionally coupled through generated CSS output.

## What to watch out for when making changes

- Preserve schema authority: do not hand-maintain types where Zod should own them.
- Preserve package boundaries: many packages expose behavior only through their public exports.
- Preserve accessibility: especially in runtime and learner-app surfaces.
- Preserve progress persistence and local-storage behavior when changing learner flows.
- Be careful with bundle navigation, because module-level navigation can bypass some normal exit warnings.
- When touching widget catalogs, update the canonical source in `packages/widgets/src/widget-catalog-source.ts` and regenerate the derived JSON rather than editing the JSON by hand.

## Best starting points by change type

- content structure or validation: `packages/schemas`, `packages/core`
- workflow logic: `packages/workflow`
- learner UI: `apps/learner`, `packages/runtime`, `packages/design-system`
- CLI behavior: `packages/cli`
- test coverage and test utilities: the package-level `src/**/*.test.ts[x]` files plus `tests/e2e/`
