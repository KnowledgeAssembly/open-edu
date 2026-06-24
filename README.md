# Open-Edu Framework

An open runtime for educational experiences that separates content from delivery platforms. Learning packages (Markdown + JSON) are loaded, validated, and rendered through a configurable runtime with built-in accessibility, telemetry, and rewards.

> **Vision:** A world where educational experiences are as portable, extensible, observable, and accessible as modern software. — [Full Vision](./docs/VISION.md) — [Package Authoring Guide](./docs/PACKAGE_AUTHORING.md)

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the dev server with an example package
pnpm --filter @open-edu/cli build
node packages/cli/dist/index.js dev ./examples/hello-world
```

Or use the CLI directly after building:

```bash
edu dev ./examples/intro-javascript
edu validate ./examples/fractions
edu build ./examples/hello-world -o ./dist
```

## What Makes a Learning Package?

A package is a directory with a manifest, optional workflow routing, and content nodes:

```
my-lesson/
├── package.json       # Manifest — id, title, version, author, entry
├── workflow.json      # Routing — how learners navigate between nodes
├── rewards.json       # Rewards — badges, webhooks, scripts (optional)
├── nodes/             # Content — markdown lessons, JSON quizzes/reflections
│   ├── intro.md
│   ├── quiz.json
│   └── reflection.json
└── assets/            # Static files — images, etc. (optional)
```

Manifest fields required by `package.json`:

| Field     | Description                                     |
| --------- | ----------------------------------------------- |
| `id`      | kebab-case identifier                           |
| `title`   | Human-readable name                             |
| `version` | Semver string (e.g. `0.1.0`)                    |
| `author`  | Creator name                                    |
| `entry`   | Path to the first node (e.g. `nodes/lesson.md`) |

### Node Types

| Type         | File    | Description                       |
| ------------ | ------- | --------------------------------- |
| `lesson`     | `.md`   | Markdown content (auto-detected)  |
| `quiz`       | `.json` | Multiple-choice with scoring      |
| `reflection` | `.json` | Open-ended text prompt            |
| `exercise`   | `.json` | Widget-based interactive exercise |
| `custom`     | `.json` | Arbitrary widget integration      |

### Workflow Routing

Simple linear progression:

```json
{
  "routing": {
    "nodes/intro.md": { "onComplete": "nodes/quiz.json" },
    "nodes/quiz.json": { "onComplete": "COMPLETED" }
  }
}
```

Conditional branching (e.g. quiz score-based remediation):

```json
{
  "routing": {
    "nodes/quiz.json": {
      "conditions": [
        { "if": "score >= 80", "then": "nodes/advanced.md" },
        { "if": "score < 80", "then": "nodes/remediation.md" }
      ]
    }
  }
}
```

## Packages

| Package                   | Description                                                                                          | Status |
| ------------------------- | ---------------------------------------------------------------------------------------------------- | ------ |
| `@open-edu/schemas`       | Zod schemas + type generation for manifests, workflows, nodes, rewards, telemetry                    | Done   |
| `@open-edu/core`          | Package directory loader, manifest parsing, node file loading, validation                            | Done   |
| `@open-edu/workflow`      | XState workflow engine — builds state machines from `workflow.json` routing                          | Done   |
| `@open-edu/runtime`       | React runtime renderer — context providers, markdown pipeline, quiz/reflection renderers, navigation | Done   |
| `@open-edu/accessibility` | Focus management, keyboard navigation, ARIA generation, axe-core validator                           | Done   |
| `@open-edu/telemetry`     | RxJS event emitter, JSONL append-only persistence, session management                                | Done   |
| `@open-edu/rewards`       | Reward broker — badge award, webhook, and script action handlers                                     | Done   |
| `@open-edu/cli`           | Commander-based CLI — `validate`, `dev`, `build`, `package` commands                                 | Done   |
| `@open-edu/dev-server`    | Vite dev server with hot reload, runtime mounting, telemetry + accessibility inspector panels        | Done   |
| `@open-edu/widgets`       | Widget SDK for custom interactive nodes (placeholder)                                                | Future |

## Examples

| Example                                         | Description                                                                                | Workflow Pattern                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| [hello-world](./examples/hello-world)           | Minimal single-lesson package                                                              | Linear → COMPLETED                                            |
| [intro-javascript](./examples/intro-javascript) | Multi-node JavaScript lesson with quiz                                                     | Linear chain of 4 nodes                                       |
| [fractions](./examples/fractions)               | Fractions quiz with score-based remediation                                                | Conditional branching                                         |
| [autism-reading](./examples/autism-reading)     | Accessibility-first reading lesson with reflection                                         | Linear + reflection node                                      |
| [adaptive-study](./examples/adaptive-study)     | Advanced adaptive learning with checkpoint, remediation loop, reflection, and badge reward | Conditional branching + remediation loop + reflection + badge |
| [skill-graph](./examples/skill-graph)           | Mastery-based routing with skill dependencies — pass algebra.basics to unlock algebra.advanced | Skill-graph conditional branching + remediation loop |
| [widget-practice](./examples/widget-practice)   | Demonstrates widget-based exercise rendering                                                   | Linear → COMPLETED |
| [remote-widget-demo](./examples/remote-widget-demo) | Demonstrates loading a widget from a remote URL at runtime                                 | Linear → COMPLETED |

Each example includes a validation test that asserts correct loading via `@open-edu/core`:

```bash
pnpm exec vitest run examples/hello-world/validate.test.ts
```

## Development

### Prerequisites

- **Node.js** >= 18
- **pnpm** >= 9

### Setup

```bash
git clone <repo>
cd open-edu
pnpm install
```

### Commands

```bash
pnpm build            # Build all packages
pnpm test             # Run all unit tests
pnpm test:e2e         # Run all E2E tests (requires pnpm build first)
pnpm lint             # Lint all packages
pnpm typecheck        # Type-check all packages
pnpm format:check     # Check formatting
pnpm format           # Auto-format all files
```

### Package Dependency Graph

```
schemas
  ├──► core
  │     └──► runtime ──► accessibility
  │                    ──► dev-server ──► cli
  │                    ──► e2e (Playwright)
  ├──► workflow ──► runtime
  ├──► telemetry ──► rewards
  └──► examples
```

### Architecture

```
Educational Package (Markdown + JSON)
        │
        ▼
Package Loader — Zod validation
        │
        ▼
Workflow Engine — XState state machine
        │
        ▼
Runtime Renderer — React + TypeScript
     ┌──┴──┐
     ▼     ▼
A11y    Widget SDK
Engine  (future)
     └──┬──┘
        ▼
Telemetry Engine — RxJS event streams
        │
        ▼
Reward Broker — badges, webhooks, scripts
```

## Testing

The framework uses **Vitest** for unit tests (~490+ tests across 73 files) and **Playwright** for E2E integration tests (20+ tests).

### Unit Tests

```bash
pnpm test                    # All unit tests
pnpm exec vitest run         # Same, via workspace root
pnpm exec vitest run --coverage  # With coverage
```

Each package has its own `vitest.config.ts` and `src/**/*.test.ts` files. Example packages also have validation tests asserting correct loading.

### E2E Tests

```bash
pnpm build                   # Build packages first
pnpm test:e2e                # Run all Playwright tests
pnpm test:e2e:install        # Install Playwright browsers
```

E2E tests start a real Vite dev server on a dynamic port and run against all 5 example packages:

| Test file                   | Coverage                                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| `package-execution.spec.ts` | Content rendering, navigation, quiz submission, reflection input, conditional branching (14 tests) |
| `accessibility.spec.ts`     | Keyboard Tab/Enter navigation, landmark regions, A11y inspector audit (6 tests)                    |
| `telemetry.spec.ts`         | Telemetry event capture via developer inspector panel (2 tests)                                    |

## Project Structure

```
open-edu/
├── apps/
│   ├── dev-server/          # Vite dev server (Epic 10)
│   └── docs/                # Docusaurus docs (future)
├── packages/
│   ├── schemas/             # Zod schemas + type generation
│   ├── core/                # Package loader + validation
│   ├── workflow/            # XState workflow engine
│   ├── runtime/             # React runtime renderer
│   ├── accessibility/       # A11y engine
│   ├── telemetry/           # RxJS telemetry + JSONL
│   ├── rewards/             # Reward broker
│   ├── cli/                 # edu CLI
│   └── widgets/             # Widget SDK (future)
├── examples/                # Example educational packages
│   ├── hello-world/
│   ├── intro-javascript/
│   ├── fractions/
│   ├── autism-reading/
│   └── adaptive-study/
├── tests/e2e/               # Playwright tests
└── docs/                    # Architecture docs
```

## Release Process

See [RELEASE.md](./docs/RELEASE.md) for the full release checklist, including changeset management, build and test verification, dry-run publish, and rollback guidance.

## License

MIT
