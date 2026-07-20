---
type: Domain Guide
title: Content, Workflows, and Examples
description: Canonical explanation of package structure, workflow routing, progress semantics, rewards, bundles, SVG-backed widgets, and example content in the Open-Edu monorepo.
tags: [openwiki, domain, workflows, content]
---

# Content, Workflows, and Examples

This repository models learning content as portable package directories rather than database-backed courses.

## Package model

The package authoring guide and root README describe the core package shape:

- `package.json` manifest with id, title, version, author, and entry node
- `workflow.json` for routing and branching
- optional `rewards.json`
- optional `cards.json`
- `nodes/` containing Markdown or JSON learning nodes
- optional `assets/`

The canonical documentation for authoring details is `docs/PACKAGE_AUTHORING.md`.

## Node and workflow semantics

The repo supports several node types:

- lesson nodes in Markdown
- quiz nodes in JSON
- reflection nodes in JSON
- exercise nodes backed by widgets
- custom JSON nodes for specialized integrations

Workflow routing can be linear or conditional. The examples in `README.md` and `docs/PACKAGE_AUTHORING.md` show:

- sequential completion chains
- score-based branching
- remediation loops
- reflection steps after assessment

The `@open-edu/workflow` package owns the traversal and ordering logic; `getOrderedNodes` is used by the learner app and runtime to present node order consistently.

## Progress and mastery concepts

The platform distinguishes between:

- node traversal progress
- course completion state
- skill/mastery progress
- bundle/module progress
- reward and card unlock state

That separation matters because different UI surfaces summarize different slices of learner state. For example, the progress dashboard aggregates course progress and badges, while bundle overview pages aggregate module completion.

## Rewards and Knowledge Cards

The framework allows packages to attach rewards and card definitions to learning events.

In the learner runtime:

- rewards are handled by `RewardBroker`
- cards are handled by `CardBroker`
- badge and card progress are persisted in local storage helpers
- toasts surface earned badges and unlocked cards

The recent rename from `Card` to `KnowledgeCard` in `packages/runtime` reflects a domain clarification: these are collection-style learning artifacts, not generic UI cards.

## Bundles and module chains

Bundles extend single-package learning into multi-module curricula.

The root README describes bundles as collections of standard packages with prerequisite chaining between modules. This affects both the runtime and the learner app:

- bundle summary and overview surfaces live in the learner catalog
- per-module status is tracked through bundle progress snapshots
- module progression can unlock later modules through prerequisite relationships

## Example set

The examples directory is a useful map of supported behaviors:

- `hello-world` — minimal happy path
- `intro-javascript` — multi-node lesson with quiz
- `fractions` — branching based on score
- `adaptive-study` — remediation loops and badges
- `skill-graph` — mastery-based unlocking
- `level-b-math` — bundle with multiple modules
- `widget-practice` and `widget-showcase` — widget execution
- `remote-widget-demo` — remote widget loading
- `autism-reading` — accessibility-oriented content
- `living-vs-nonliving` — rewards/cards-heavy content

## Internationalization

User-facing strings in runtime renderers (quiz buttons, feedback messages, widget errors, reflection prompts) and learner app screens (navigation, settings, catalog) are translated through `@open-edu/i18n`. The package provides:

- namespace-based translation keys (e.g., `runtime.quiz.submit`, `learner.settings.theme`)
- English locale files in `packages/i18n/locales/en/`
- a `TranslationEngine` with fallback to the default locale
- React `I18nProvider` + `useTranslation` hook for component-level access
- CLI commands (`i18n:extract`, `i18n:validate`, `i18n:missing`) for translation workflow

When adding new user-facing strings to runtime or learner components, use `t('namespace.key')` instead of hardcoded text and add the English translation to the appropriate locale file.

## Where to start when changing content behavior

- Update schema shape or validation rules in `packages/schemas`
- Update content loading or bundle scanning in `packages/core`
- Update route or mastery logic in `packages/workflow`
- Update rendered node behavior in `packages/runtime`
- Add or adjust example content in `examples/` to cover the new behavior

## Widget catalog and ID resolution

Widget-based exercises depend on the registry and catalog pipeline. The canonical widget metadata is defined in `packages/widgets/src/widget-catalog-source.ts`, resolved through `packages/widgets/src/domains.ts`, and consumed by `packages/core/src/widget-catalog.ts` when the CLI builds prompt/catalog output. That separation keeps author-facing widget IDs stable while allowing legacy `open-edu.*` IDs to be migrated automatically. The SVG explorer widget family also lives under `packages/widgets/src/svg-explorer/` and extends the same catalog pathway for interactive content.
