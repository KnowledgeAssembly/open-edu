# Open-Edu Framework

An open runtime for educational experiences that separates content from delivery platforms. Learning packages (Markdown + JSON) are loaded, validated, and rendered through a configurable runtime with built-in accessibility, telemetry, skills tracking, and rewards.

> **Vision:** A world where educational experiences are as portable, extensible, observable, and accessible as modern software. — [Full Vision](./docs/VISION.md) — [Package Authoring Guide](./docs/PACKAGE_AUTHORING.md)

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start the learner app (course catalog with full runtime)
pnpm --filter @open-edu/learner dev
# Opens at http://localhost:4001 — browse and launch example courses

# Use a custom course directory (defaults to ../../examples)
EDU_CATALOG_DIR=/path/to/my/courses pnpm --filter @open-edu/learner dev

# Run the dev server for a specific package
pnpm --filter @open-edu/cli build
node packages/cli/dist/cli.js dev ./examples/hello-world
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
edu compile ./course-spec.md -o ./output   # Also supports course-spec.json
edu curriculum:generate --pdf ./textbook.pdf --level B --subject math  # PDF → course spec
```

## Theming System

The framework ships with **3 built-in themes** that control colors, typography, spacing, and border radii via CSS custom properties (`--oe-*`). All runtime components use Tailwind utility classes mapped to these tokens.

| Name          | ID                   | Type  | Description                       | Font Stack                              |
| ------------- | -------------------- | ----- | --------------------------------- | --------------------------------------- |
| OpenEdu Light | `lumina-scholastica` | Light | Default calm everyday learning    | Inter + Source Serif 4 + JetBrains Mono |
| OpenEdu Dark  | `nocturnal`          | Dark  | Calm dark for deep focus          | Inter + Source Serif 4 + JetBrains Mono |
| OpenEdu Zen   | `zen`                | Light | Reduced-stimulation quiet reading | Inter + Source Serif 4 + JetBrains Mono |

```tsx
import {
  RuntimeThemeProvider,
  FontLoader,
  useThemePreference,
  ThemeSelector,
} from '@open-edu/runtime';

function App() {
  const [themeId, setThemeId] = useThemePreference(); // persisted to localStorage
  return (
    <RuntimeThemeProvider themeId={themeId}>
      <FontLoader /> {/* injects Google Font <link> tags */}
      <ThemeSelector currentThemeId={themeId} onThemeChange={setThemeId} />
      {/* ... course content */}
    </RuntimeThemeProvider>
  );
}
```

- `useThemePreference()` — reads/writes `oe-theme-preference` in localStorage, defaults to `lumina-scholastica`
- `RuntimeThemeProvider` — flattens `ThemeDefinition` into 60+ `--oe-*` CSS variables and wraps content in a themed `div`
- `FontLoader` — injects Google Font `<link>` tags matching the active theme's typography
- `ThemeSelector` — popover with 3 theme preview cards (color swatches + description), keyboard-navigable

The learner app (`@open-edu/learner`) uses a **shadcn/ui component library** (10 components: Button, Card, Badge, Input, Dialog, Select, Progress, Tabs, Switch, Tooltip) built on **Radix UI** primitives with **Lucide icons**, all styled via Tailwind utility classes. The `ThemeSelector` is accessible from the `TopAppBar` on every course page. The dev-server uses a pre-generated Tailwind CSS file; the learner app processes Tailwind through PostCSS.

## What Makes a Learning Package?

A package is a directory with a manifest, optional workflow routing, and content nodes:

```
my-lesson/
├── package.json       # Manifest — id, title, version, author, entry
├── workflow.json      # Routing — how learners navigate between nodes
├── rewards.json       # Rewards — badges, webhooks, scripts (optional)
├── cards.json         # Living Knowledge Cards — unlockable achievements (optional)
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

## Multi-Module Bundles

The framework supports **multi-module bundles** — a collection of standard Open-Edu packages organized as a hierarchical curriculum (Subject → Module → Node). A bundle is defined by a `bundle.json` manifest at the root of a directory containing module subdirectories:

```
level-b-math/
├── bundle.json                  # Bundle manifest — id, title, version, modules
├── modules/
│   ├── addition_basics/         # Standard Open-Edu package
│   │   ├── package.json
│   │   ├── workflow.json
│   │   └── nodes/
│   ├── addition_carry/          # Depends on addition_basics
│   │   ├── package.json
│   │   └── ...
│   └── adding_fractions/        # Depends on addition_carry
│       ├── package.json
│       └── ...
```

### Bundle Manifest (`bundle.json`)

| Field     | Description                        |
| --------- | ---------------------------------- |
| `id`      | kebab-case bundle identifier       |
| `title`   | Human-readable name                |
| `version` | Semver string (e.g. `1.0.0`)       |
| `author`  | Creator name                       |
| `modules` | Ordered array of module references |

Each module reference supports `dependsOn` for prerequisite chaining. The `BundleEngine` (from `@open-edu/workflow`) orchestrates per-module `WorkflowEngine` instances, manages module-level status (`locked` / `unlocked` / `in_progress` / `completed`), and emits `module.changed`, `module.completed`, `module.unlocked`, and `bundle.completed` events.

The learner app renders bundle cards in the catalog and provides a `BundleOverviewPage` with module status badges and progress bars. The dev-server includes a **Bundle Inspector** tab with a module selector dropdown.

### Importing Learn-Easy Content

```bash
pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js import learn-easy ./source-dir ./output-dir
```

Converts Learn-Easy curriculum directories into Open-Edu bundles with auto-generated `bundle.json`, per-module packages, workflows, and validation tests.

## Packages

| Package                     | Description                                                                                                                                                                                                                                                                                                                                                 | Status |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `@open-edu/schemas`         | Zod schemas + type generation for manifests, workflows, nodes, rewards, telemetry, skills, progress, **bundle manifests**, **bundle progress**                                                                                                                                                                                                              | Done   |
| `@open-edu/core`            | Package directory loader, manifest parsing, node file loading, validation, patcher, lint, generation, scanner, **bundle loader**, **bundle scanner (scanAll)**, **Learn-Easy importer**, bundle error classes                                                                                                                                               | Done   |
| `@open-edu/workflow`        | XState workflow engine — state machines, skill-tracking, mastery-based routing, topology ordering, **BundleEngine** (orchestrates per-module WorkflowEngine instances with prerequisite unlock)                                                                                                                                                             | Done   |
| `@open-edu/runtime`         | React runtime renderer — context providers, markdown pipeline, quiz/reflection/widget renderers, **3 built-in themes**, **Tailwind-styled layout components** (SideNav, TopAppBar, AITutorPanel, CourseTree), **BundleOverview component**                                                                                                                  | Done   |
| `@open-edu/accessibility`   | Focus traps, live regions, ARIA generation, axe-core validator                                                                                                                                                                                                                                                                                              | Done   |
| `@open-edu/telemetry`       | RxJS event emitter, JSONL append-only persistence, session management, JSONL reader + summary, **optional bundleId/moduleId correlation**                                                                                                                                                                                                                   | Done   |
| `@open-edu/rewards`         | Reward broker — badge award, webhook, script actions, conditional rules, verification, replay, **CardBroker** (Living Knowledge Cards unlock/level-up), **moduleCompleted/bundleCompleted reward conditions**                                                                                                                                               | Done   |
| `@open-edu/cli`             | Commander-based CLI — `validate`, `dev`, `build`, `package`, `create`, `report`, `lint-content`, `patch`, `generate`, **`import learn-easy`**, **`compile`**                                                                                                                                                                                                | Done   |
| `@open-edu/dev-server`      | Vite dev server with hot reload, runtime mounting, telemetry + rewards + accessibility inspector, **bundle inspector tab**, **multi-module bundle mode**                                                                                                                                                                                                    | Done   |
| `@open-edu/widgets`         | Widget SDK — registry, built-in practice widget, remote widget loader, NPM scaffold template                                                                                                                                                                                                                                                                | Done   |
| `@open-edu/course-compiler` | Remark/Unified-based compiler that converts `course-spec.md` or `course-spec.json` into validated OpenEdu packages — auto-detects format by extension                                                                                                                                                                                                       | Done   |
| `@open-edu/pipeline`        | AI-driven PDF → course spec generation pipeline — 6 stages (extract, chunk, concepts, activities, validate, output), LLM-driven widget selection, supports `--format md/json/both`                                                                                                                                                                          | Done   |
| `@open-edu/llm-config`      | LLM provider abstraction — `generateStructured<T>()` with Zod validation, supports OpenAI + OpenRouter providers                                                                                                                                                                                                                                            | Done   |
| `@open-edu/learner`         | Standalone learner app — course catalog, **6-page router** (catalog, course home, lesson, assessment, code, progress), **bundle catalog + overview**, **Collection Binder** (card museum with category shelves), **shadcn/ui component library** (10 components), **theme switching**, progress persistence, reward + card integration, E2E-tested workflow | Done   |

## Examples

| Example                                               | Description                                                                                                | Workflow Pattern                                              |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [hello-world](./examples/hello-world)                 | Minimal single-lesson package                                                                              | Linear → COMPLETED                                            |
| [intro-javascript](./examples/intro-javascript)       | Multi-node JavaScript lesson with quiz                                                                     | Linear chain of 4 nodes                                       |
| [fractions](./examples/fractions)                     | Fractions quiz with score-based remediation and feedback                                                   | Conditional branching                                         |
| [autism-reading](./examples/autism-reading)           | Accessibility-first reading lesson with reflection                                                         | Linear + reflection node                                      |
| [adaptive-study](./examples/adaptive-study)           | Advanced adaptive learning with checkpoint, remediation loop, reflection, and badge reward                 | Conditional branching + remediation loop + reflection + badge |
| [living-vs-nonliving](./examples/living-vs-nonliving) | Multi-activity science lesson with observation, quizzes, mastery check, badge rewards, and Knowledge Cards | Linear chain with quiz branching + rewards + cards            |
| [skill-graph](./examples/skill-graph)                 | Mastery-based routing — pass `algebra.basics` to unlock `algebra.advanced`                                 | Skill-graph conditional branching + remediation loop          |
| [level-b-math](./examples/level-b-math)               | Multi-module bundle — 3 modules (addition basics → carry → fractions) with prerequisites                   | Bundle (prerequisite chain across modules)                    |
| [widget-practice](./examples/widget-practice)         | Widget-based exercise rendering using the built-in multiple-choice widget                                  | Linear → COMPLETED                                            |
| [widget-showcase](./examples/widget-showcase)         | Demonstrates all 14 built-in widgets across multiple node types                                            | Linear chain of widget demos                                  |
| [remote-widget-demo](./examples/remote-widget-demo)   | Remote widget loading from a URL at runtime via module federation                                          | Linear → COMPLETED                                            |

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
pnpm build                    # Build all packages
pnpm test                     # Run all unit tests
pnpm test:e2e                 # Run all E2E tests (requires pnpm build first)
pnpm lint                     # Lint all packages
pnpm typecheck                # Type-check all packages
pnpm format:check             # Check formatting
pnpm format                   # Auto-format all files
pnpm --filter @open-edu/learner dev  # Start the learner app on port 4001
# Regenerate dev-server Tailwind CSS after runtime style changes
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css
```

### Package Dependency Graph

```
schemas
  ├──► core ───► cli
  │            ───► learner
  ├──► workflow ──► runtime
  │                ───► learner
  ├──► telemetry ──► rewards ──► dev-server
  │                            ───► learner
  ├──► runtime ──► accessibility
  │             ──► dev-server ──► cli
  │             ──► learner
  │             ──► e2e (Playwright)
  ├──► widgets ──► runtime
  │             ───► learner
  ├──► course-compiler ──► cli (compile command)
  ├──► llm-config ──► pipeline ──► course-compiler
  └──► examples ───► learner (via virtual module at dev time)
```

### Architecture

```
Educational Package (Markdown + JSON)
        │
        ▼
  ┌──────────────┐
  │    Core      │  Package loader, scanner, patcher, lint, generator
  ├──────────────┤
  │ scanPackages │  Discover packages → catalog
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │   Workflow   │  XState + skill tracking + mastery routing
  ├──────────────┤
  │ getOrderedNodes │  Topological sort for course outline
  └──────┬───────┘
         │
         ▼
  ┌──────────────────────────┐
  │        Runtime           │  React renderer — lessons, quizzes, widgets
  │                          │  3 themes, Tailwind-styled (--oe-* tokens)
  ├──────────────────────────┤
  │ Layout Components:       │
  │  SideNav     TopAppBar   │
  │  CourseTree  AITutorPanel│
  │  AICallout   ReadingRuler│
  ├──────────────────────────┤
  │ Renderers: Markdown, Quiz│
  │  Reflection, Widget,     │
  │  Placeholder, Node       │
  ├──────────────────────────┤
  │ Theming: RuntimeTheme-   │
  │  Provider, FontLoader,   │
  │  useThemePreference,     │
  │  ThemeSelector           │
  └──┬───┬───┬───────┬──────┘
     ▼   ▼   ▼       ▼
  ┌────┐┌────┐┌────────┐┌──────────┐
  │A11y││Widgets││Telemetry││ Theming  │
  │    ││      ││        ││(runtime) │
  └────┘└────┘└───┬────┘└──────────┘
                  ▼
           ┌─────────┐
            │ Rewards  │  Badges, webhooks, scripts, CardBroker
            └─────────┘
                  │
                  ▼
           ┌────────────────────┐
           │   Learner App      │  Standalone app
           │   Catalog · Course  │  · Progress · Themes
           └────────────────────┘
```

## Testing

The framework uses **Vitest** for unit tests (~1,200+ tests across 150+ files) and **Playwright** for E2E integration tests (40+ tests).

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

E2E tests start the learner dev server on port 4001 and run against all example packages:

| Test file                     | Coverage                                                                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `learner-experience.spec.ts`  | Full learner flow — catalog, course navigation, quiz/reflection interaction, progress persistence, completion screen, back-to-catalog (8 tests) |
| `package-execution.spec.ts`   | Content rendering, navigation, quiz submission, reflection input, conditional branching (14 tests)                                              |
| `accessibility.spec.ts`       | Keyboard Tab/Enter navigation, landmark regions, A11y inspector audit (6 tests)                                                                 |
| `telemetry.spec.ts`           | Telemetry event capture via developer inspector panel (2 tests)                                                                                 |
| `keyboard-navigation.spec.ts` | Full keyboard-only navigation through all example packages                                                                                      |
| `hot-reload.spec.ts`          | HMR preserves node, progress, and telemetry session on Markdown/JSON edits                                                                      |
| `skill-graph.spec.ts`         | Skill-tracking events, mastery-based branching, remediation path                                                                                |
| `rewards.spec.ts`             | Reward receipt tracking in dev-server inspector panel (2 tests)                                                                                 |
| `theme-switching.spec.ts`     | Theme switching between all 3 themes, popover behavior, persistence after reload                                                                |
| `bundle-navigation.spec.ts`   | Bundle catalog cards, bundle overview, module cards, module launch, prerequisite status, backward compat (6 tests)                              |

## Project Structure

```
open-edu/
├── apps/
│   ├── dev-server/          # Vite dev server with inspector panels
│   ├── docs/                # Docusaurus documentation site
│   └── learner/             # Standalone learner app — catalog + course view + progress
├── packages/
│   ├── schemas/             # Zod schemas + type generation
│   ├── core/                # Package loader, scanner, patcher, validator, lint, generator
│   ├── workflow/            # XState workflow engine + skill tracking + topology
│   ├── runtime/             # React runtime + layout components + 3 themes + theme selector
│   ├── accessibility/       # Focus traps, live regions, ARIA, axe-core
│   ├── telemetry/           # RxJS telemetry, JSONL reader + summary
│   ├── rewards/             # Reward broker, CardBroker, conditions, verification
│   ├── cli/                 # edu CLI (10+ commands)
│   ├── course-compiler/     # Course spec compiler (course-spec.md/.json → OpenEdu package)
│   ├── pipeline/            # AI-driven PDF → course spec generation pipeline
│   ├── llm-config/          # LLM provider abstraction (OpenAI + OpenRouter)
│   └── widgets/             # Widget SDK, registry, builtins, remote loader
├── examples/                # Example educational packages
│   ├── course-compiler/     # Course specification examples (3 sample specs)
│   ├── hello-world/
│   ├── intro-javascript/
│   ├── fractions/
│   ├── autism-reading/
│   ├── adaptive-study/
│   ├── living-vs-nonliving/
│   ├── skill-graph/
│   ├── widget-practice/
│   ├── widget-showcase/
│   ├── remote-widget-demo/
│   └── level-b-math/        # Multi-module bundle (3 modules)
├── tests/e2e/               # Playwright tests (9 spec files)
└── docs/                    # Architecture and release docs
```

## Release Process

See [RELEASE.md](./docs/RELEASE.md) for the full release checklist, including changeset management, build and test verification, dry-run publish, and rollback guidance.

## License

MIT
