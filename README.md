# Open-Edu Framework

An open runtime for educational experiences that separates content from delivery platforms. Learning packages (Markdown + JSON) are loaded, validated, and rendered through a configurable runtime with built-in accessibility, telemetry, skills tracking, and rewards.

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
edu create ./my-lesson --id my-lesson --title "My Lesson" --author "Me"
edu report ./telemetry.jsonl
edu lint-content ./my-lesson
edu patch ./my-lesson ./patch.json
edu generate --prompt
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

| Package                   | Description                                                                                                          | Status |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------ |
| `@open-edu/schemas`       | Zod schemas + type generation for manifests, workflows, nodes, rewards, telemetry, skills, progress                  | Done   |
| `@open-edu/core`          | Package directory loader, manifest parsing, node file loading, validation, patcher, lint, generation                 | Done   |
| `@open-edu/workflow`      | XState workflow engine — state machines, skill-tracking, mastery-based routing                                       | Done   |
| `@open-edu/runtime`       | React runtime renderer — context providers, markdown pipeline, quiz/reflection/widget renderers                      | Done   |
| `@open-edu/accessibility` | Focus traps, live regions, ARIA generation, axe-core validator                                                       | Done   |
| `@open-edu/telemetry`     | RxJS event emitter, JSONL append-only persistence, session management, JSONL reader + summary                        | Done   |
| `@open-edu/rewards`       | Reward broker — badge award, webhook, script actions, conditional rules, verification, replay                        | Done   |
| `@open-edu/cli`           | Commander-based CLI — `validate`, `dev`, `build`, `package`, `create`, `report`, `lint-content`, `patch`, `generate` | Done   |
| `@open-edu/dev-server`    | Vite dev server with hot reload, runtime mounting, telemetry + rewards + accessibility inspector                     | Done   |
| `@open-edu/widgets`       | Widget SDK — registry, built-in practice widget, remote widget loader, NPM scaffold template                         | Done   |

## Examples

| Example                                             | Description                                                                                | Workflow Pattern                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| [hello-world](./examples/hello-world)               | Minimal single-lesson package                                                              | Linear → COMPLETED                                            |
| [intro-javascript](./examples/intro-javascript)     | Multi-node JavaScript lesson with quiz                                                     | Linear chain of 4 nodes                                       |
| [fractions](./examples/fractions)                   | Fractions quiz with score-based remediation and feedback                                   | Conditional branching                                         |
| [autism-reading](./examples/autism-reading)         | Accessibility-first reading lesson with reflection                                         | Linear + reflection node                                      |
| [adaptive-study](./examples/adaptive-study)         | Advanced adaptive learning with checkpoint, remediation loop, reflection, and badge reward | Conditional branching + remediation loop + reflection + badge |
| [skill-graph](./examples/skill-graph)               | Mastery-based routing — pass `algebra.basics` to unlock `algebra.advanced`                 | Skill-graph conditional branching + remediation loop          |
| [widget-practice](./examples/widget-practice)       | Widget-based exercise rendering using the built-in multiple-choice widget                  | Linear → COMPLETED                                            |
| [remote-widget-demo](./examples/remote-widget-demo) | Remote widget loading from a URL at runtime via module federation                          | Linear → COMPLETED                                            |

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
  ├──► core ──► cli
  ├──► workflow ──► runtime
  ├──► telemetry ──► rewards ──► dev-server
  ├──► runtime ──► accessibility
  │             ──► dev-server ──► cli
  │             ──► e2e (Playwright)
  ├──► widgets ──► runtime
  └──► examples
```

### Architecture

```
Educational Package (Markdown + JSON)
        │
        ▼
  ┌────────────┐
  │   Core     │  Package loader, patcher, lint, generator
  └─────┬──────┘
        │
        ▼
  ┌────────────┐
  │  Workflow  │  XState state machine + skill tracking
  └─────┬──────┘
        │
        ▼
  ┌────────────┐
  │  Runtime   │  React renderer — lessons, quizzes, widgets
  └──┬───┬───┬┘
     ▼   ▼   ▼
  ┌────┐┌────┐┌────────┐
  │A11y││Widgets││Telemetry│
  └────┘└────┘└───┬────┘
                  ▼
           ┌─────────┐
           │ Rewards │  Badges, conditions, verification
           └─────────┘
```

## Testing

The framework uses **Vitest** for unit tests (~750+ tests across 106 files) and **Playwright** for E2E integration tests (20+ tests).

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

E2E tests start a real Vite dev server on a dynamic port and run against all example packages:

| Test file                     | Coverage                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `package-execution.spec.ts`   | Content rendering, navigation, quiz submission, reflection input, conditional branching (14 tests) |
| `accessibility.spec.ts`       | Keyboard Tab/Enter navigation, landmark regions, A11y inspector audit (6 tests)                    |
| `telemetry.spec.ts`           | Telemetry event capture via developer inspector panel (2 tests)                                    |
| `keyboard-navigation.spec.ts` | Full keyboard-only navigation through all example packages                                         |
| `hot-reload.spec.ts`          | HMR preserves node, progress, and telemetry session on Markdown/JSON edits                         |
| `skill-graph.spec.ts`         | Skill-tracking events, mastery-based branching, remediation path                                   |

## Project Structure

```
open-edu/
├── apps/
│   ├── dev-server/          # Vite dev server with inspector panels
│   └── docs/                # Docusaurus documentation site
├── packages/
│   ├── schemas/             # Zod schemas + type generation
│   ├── core/                # Package loader, patcher, validator, lint, generator
│   ├── workflow/            # XState workflow engine + skill tracking
│   ├── runtime/             # React runtime renderer + embed adapter
│   ├── accessibility/       # Focus traps, live regions, ARIA, axe-core
│   ├── telemetry/           # RxJS telemetry, JSONL reader + summary
│   ├── rewards/             # Reward broker, conditions, verification
│   ├── cli/                 # edu CLI (10+ commands)
│   └── widgets/             # Widget SDK, registry, builtins, remote loader
├── examples/                # Example educational packages
│   ├── hello-world/
│   ├── intro-javascript/
│   ├── fractions/
│   ├── autism-reading/
│   ├── adaptive-study/
│   ├── skill-graph/
│   ├── widget-practice/
│   └── remote-widget-demo/
├── tests/e2e/               # Playwright tests (6 spec files)
└── docs/                    # Architecture and release docs
```

## Release Process

See [RELEASE.md](./docs/RELEASE.md) for the full release checklist, including changeset management, build and test verification, dry-run publish, and rollback guidance.

## License

MIT
