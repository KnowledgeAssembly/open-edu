# Open-Edu Framework

An open runtime for educational experiences that separates content from delivery platforms. Learning packages (Markdown + JSON) are loaded, validated, and rendered through a configurable runtime with built-in accessibility, telemetry, internationalization, skills tracking, rewards, course distribution (`.oep` format), and an AI companion (Pipili).

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

# Serve community widgets from a local directory (no dev-server needed)
EDU_WIDGET_DIR=./examples/community-widget-counter pnpm --filter @open-edu/learner dev

# Start the Course Creator Studio for a specific package (port 4000)
# A single unified authoring shell — Home/Library, Outline | Files tabs,
# form editors, Preview with a DevTools drawer, and Share.
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
edu i18n:extract ./my-lesson ./locales   # Extract translatable strings
edu i18n:validate ./my-lesson ./locales  # Validate translation completeness
edu i18n:missing ./locales ./target-lang # Find missing translations
edu curriculum:generate --pdf ./textbook.pdf --level B --subject math  # PDF → course spec
edu oep:build ./my-course -o ./dist          # Build .oep distribution artifact
```

### Agentic Course Authoring

Generate complete course specifications using the `openedu-course-authoring` agent skill — no manual JSON authoring required:

```bash
# Load the skill in your agent and run:
# "Create a fractions course for 8-10 year olds with 3 lessons"
```

The skill auto-detects whether it's running inside an Open-Edu monorepo:

- **Portable mode** (anywhere): produces `course-spec.json` + `quality-report.json` with structural validation
- **Repository mode** (inside monorepo): adds full compilation + package validation + content linting

See the [Agentic Course Authoring Guide](apps/docs/docs/agentic-authoring.md) for the full workflow, quality rubric, and widget catalog integration. Skill code lives at `skills/openedu-course-authoring/`. For single-shot spec generation without validation/quality checks, the CLI prints a thin reference skill (`packages/cli/skills/course-spec-generator.skill.md`) via `edu generate --prompt`.

## Run with Docker

Run both apps without installing Node or pnpm — only Docker is required:

```bash
docker compose up --build
```

- **Learner:** http://localhost:4001
- **Course Creator Studio:** http://localhost:4000

Courses live in a shared named volume mounted at `/data/courses` that is seeded with the example courses on first start. A course created in the Studio appears in the Learner app, and courses persist across restarts (`docker compose down -v` resets to the pristine examples).

Optional AI keys (Pipili companion, Studio drafting) are read from a `.env` file in the repo root — copy `.env.example` and fill in what you need. Everything works without keys; AI features degrade gracefully.

### Try the Studio → Learner loop

1. Open <http://localhost:4000> and create a course from a template (or edit an existing one).
2. Open <http://localhost:4001> — your course appears in the catalog alongside the examples.
3. Restart with `docker compose down && docker compose up -d` — your courses persist. `docker compose down -v` resets to the pristine examples.

To verify the setup end-to-end:

```bash
./docker/smoke-test.sh
```

## Course Creator Studio

**OpenEdu Course Creator Studio** is the authoring companion to the learner app, so teachers can author shareable courses without CLI, file paths, or schema jargon. It evolved from the original dev-server (a local Vite preview + inspector + file editor) into **one unified authoring shell** — there is no mode toggle:

| Area                             | What it is                                                                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Home / Library**               | Start from a template, an **AI draft**, or a recent course; manage a local **course library** (open, duplicate, rename, archive, import folder); compose **units** (bundles of 2–5 courses)            |
| **Outline \| Files**             | The course spine (add lessons, quizzes, practice, reorder → linear `workflow.json`) plus a package **Files** tab with Markdown/JSON editors, manifest/workflow/rewards/cards editors, and asset upload |
| **Activity editors**             | Form-based editing — lessons (Markdown), quizzes (MCQ with correct-answer coaching), practice widgets (curated picker + live preview + schema forms)                                                   |
| **Guided flow, rewards & cards** | Simple score-based branching writes `workflow.json`; completion badges, quiz-pass badges, and knowledge cards via plain forms                                                                          |
| **Preview + DevTools**           | The full learner runtime plus a collapsed **DevTools drawer** (Telemetry / Logs / Rewards / A11y / Bundle) on the Preview page                                                                         |
| **Share**                        | Ready check → export `.oep` → copyable "open in the learner app" instructions (plus a classroom note and optional unit export)                                                                         |

Multi-module bundle authoring is **not supported** in the Studio today.

**AI-assisted authoring** — paste notes and Studio drafts a full course (LLM → `course-spec.json` → course-compiler) with a plain-language quality checklist and accept/reject review. Templates remain the offline fallback when AI is unavailable. API keys stay server-side (`OPEN_EDU_STUDIO_LLM_*` / existing llm-config env vars). The Author Assistant is a persistent right-rail AI surface across Outline and Files.

**Architecture** — Studio is a façade over the package model. The UI talks to a thin `StudioAPI` (`apps/dev-server/src/studio/studioApi.ts`) implemented by a local adapter (Vite `/api/package/*` + `/api/studio/*` middleware) and a browser adapter (`BrowserStudioApi` over OPFS) so a hosted cloud Studio (Phase 5) can reuse the same UX. Chat contracts live in `@open-edu/companion/chat`; profiles/rubric render from `@open-edu/domain-guidance`. See the [design spec](docs/superpowers/specs/2026-09-01-studio-unified-view-design.md).

```bash
edu dev ./examples/hello-world          # opens the Course Creator Studio
OPEN_EDU_STUDIO_WORKSPACE=~/courses edu dev ./examples/hello-world  # with course library
```

## Theming System

The framework ships with **3 built-in themes** that control colors, typography, spacing, and border radii via CSS custom properties (`--oe-*`). All runtime components use Tailwind utility classes mapped to these tokens.

| Name          | ID                   | Type  | Description                       | Font Stack                              |
| ------------- | -------------------- | ----- | --------------------------------- | --------------------------------------- |
| OpenEdu Light | `lumina-scholastica` | Light | Default calm everyday learning    | Inter + Source Serif 4 + JetBrains Mono |
| OpenEdu Dark  | `nocturnal`          | Dark  | Calm dark for deep focus          | Inter + Source Serif 4 + JetBrains Mono |
| OpenEdu Zen   | `zen`                | Light | Reduced-stimulation quiet reading | Inter + Source Serif 4 + JetBrains Mono |

```tsx
import { RuntimeThemeProvider, useThemePreference, ThemeSelector } from '@open-edu/runtime';

function App() {
  const [themeId, setThemeId] = useThemePreference(); // persisted to localStorage
  return (
    <RuntimeThemeProvider themeId={themeId}>
      <ThemeSelector currentThemeId={themeId} onThemeChange={setThemeId} />
      {/* ... course content */}
    </RuntimeThemeProvider>
  );
}
```

- `useThemePreference()` — reads/writes `oe-theme-preference` in localStorage, defaults to `lumina-scholastica`
- `RuntimeThemeProvider` — flattens `ThemeDefinition` into 60+ `--oe-*` CSS variables and wraps content in a themed `div`
- `ThemeSelector` — popover with 3 theme preview cards (color swatches + description), keyboard-navigable

The learner app (`@open-edu/learner`) uses a **shadcn/ui component library** (10 components: Button, Card, Badge, Input, Dialog, Select, Progress, Tabs, Switch, Tooltip) built on **Radix UI** primitives with **Lucide icons**, all styled via Tailwind utility classes. The `ThemeSelector` is accessible from the `TopAppBar` on every course page. The dev-server uses a pre-generated Tailwind CSS file; the learner app processes Tailwind through PostCSS.

## Progressive Web App

The learner app is a full **Progressive Web App** with offline-first support:

- **Service Worker** — generated by `vite-plugin-pwa` with Workbox (CacheFirst for assets, NetworkFirst for API, StaleWhileRevalidate for metadata)
- **IndexedDB Storage** — `@open-edu/storage` provides 6 typed object stores (courses, progress, badges, cards, search-indexes, preferences) via the `idb` library
- **Install Prompt** — `@open-edu/pwa-core` detects installability and triggers the browser's native install prompt
- **Update Detection** — new service worker versions are detected and prompted to the user without forced reloads
- **Offline Mode** — `OfflineBanner` indicates cached content is available when the device goes offline
- **Storage Management** — `StorageSettingsPage` shows downloaded courses, storage usage, and delete controls

```bash
# Build and preview the PWA (required for service worker)
pnpm --filter @open-edu/learner build
pnpm --filter @open-edu/learner preview
```

See [PWA Architecture](docs/pwa.md) for the full specification.

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

The learner app renders bundle cards in the catalog and provides a `BundleOverviewPage` with module status badges and progress bars. The Course Creator Studio does **not** support bundle authoring today (bundles show an unsupported empty state); the Studio's Library can compose 2–5 courses into a light **unit** bundle, and the Preview DevTools show a Bundle inspector tab only when bundle data is present.

### Importing Learn-Easy Content

```bash
pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js import learn-easy ./source-dir ./output-dir
```

Converts Learn-Easy curriculum directories into Open-Edu bundles with auto-generated `bundle.json`, per-module packages, workflows, and validation tests.

## Packages

| Package                      | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Status |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `@open-edu/schemas`          | Zod schemas + type generation for manifests, workflows, nodes, rewards, telemetry, skills, progress, **bundle manifests**, **bundle progress**                                                                                                                                                                                                                                                                                                                                                            | Done   |
| `@open-edu/core`             | Package directory loader, manifest parsing, node file loading, validation, patcher, lint, generation, scanner, **bundle loader**, **bundle scanner (scanAll)**, **Learn-Easy importer**, bundle error classes, **widget catalog generation** (reads auto-generated `widget-catalog-data.json`)                                                                                                                                                                                                            | Done   |
| `@open-edu/workflow`         | XState workflow engine — state machines, skill-tracking, mastery-based routing, topology ordering, **BundleEngine** (orchestrates per-module WorkflowEngine instances with prerequisite unlock)                                                                                                                                                                                                                                                                                                           | Done   |
| `@open-edu/runtime`          | React runtime renderer — context providers, markdown pipeline, quiz/reflection/widget renderers, **3 built-in themes**, **Tailwind-styled layout components** (SideNav, TopAppBar, AITutorPanel, CourseTree), **BundleOverview component**                                                                                                                                                                                                                                                                | Done   |
| `@open-edu/accessibility`    | Focus traps, live regions, ARIA generation, axe-core validator                                                                                                                                                                                                                                                                                                                                                                                                                                            | Done   |
| `@open-edu/i18n`             | Internationalization — locale types, translation engine, React I18nProvider, formatters, namespace dictionaries (en/hi/or), LanguageSwitcher component, and CLI extract/validate/missing commands                                                                                                                                                                                                                                                                                                         | Done   |
| `@open-edu/telemetry`        | RxJS event emitter, JSONL append-only persistence, session management, JSONL reader + summary, **optional bundleId/moduleId correlation**                                                                                                                                                                                                                                                                                                                                                                 | Done   |
| `@open-edu/rewards`          | Reward broker — badge award, webhook, script actions, conditional rules, verification, replay, **CardBroker** (Living Knowledge Cards unlock/level-up), **moduleCompleted/bundleCompleted reward conditions**                                                                                                                                                                                                                                                                                             | Done   |
| `@open-edu/cli`              | Commander-based CLI — `validate`, `dev`, `build`, `package`, `create`, `report`, `lint-content`, `patch`, `generate`, **`import learn-easy`**, **`compile`**                                                                                                                                                                                                                                                                                                                                              | Done   |
| `@open-edu/dev-server`       | **OpenEdu Course Creator Studio** (single unified authoring shell) — Home/Library, Outline \| Files tabs (form editors + package file tree), guided flow/rewards, AI drafts + Author Assistant, Preview with DevTools drawer (telemetry/logs/rewards/a11y/bundle), `.oep` share/export, browser (OPFS) mode; StudioAPI façade over local + browser adapters                                                                                                                                               | Done   |
| `@open-edu/widget-sdk`       | Framework-agnostic community widget protocol SDK — message validators, host client, theme token applicator, protocol conformance fixtures, iframe test harness, build helpers (CSP hash), local dev registry. No React dependency.                                                                                                                                                                                                                                                                        | Done   |
| `@open-edu/widgets`          | Widget SDK — registry, **28 built-in widgets** (27 stable + 1 deprecated), **enriched metadata** (AI, capabilities, accessibility, analytics, reward), **metadata validation**, **catalog generation** (source-of-truth in `widget-catalog-source.ts` → auto-generated JSON → `@open-edu/core`), remote widget loader, NPM scaffold template, **WidgetResolver**, **artifact cache**, **fallback transforms**                                                                                             | Done   |
| `@open-edu/course-compiler`  | Remark/Unified-based compiler that converts `course-spec.md` or `course-spec.json` into validated OpenEdu packages — auto-detects format by extension                                                                                                                                                                                                                                                                                                                                                     | Done   |
| `@open-edu/llm-config`       | LLM provider abstraction — `generateStructured<T>()` with Zod validation, supports OpenAI + OpenRouter providers, **ModelFactory** with two-tier routing (fast/escalation), provider capability reporting, AI SDK v4 integration                                                                                                                                                                                                                                                                          | Done   |
| `@open-edu/design-system`    | Design system — UI primitives, tokens, patterns, learning/AI components, shadcn/ui-style component library                                                                                                                                                                                                                                                                                                                                                                                                | Done   |
| `@open-edu/ai-companion`     | AI Learning Companion — search, dictionary, conversation, and provider interfaces; **Pipili subsystem** (context normalization, hint progression, bounded context, V2 extension seams)                                                                                                                                                                                                                                                                                                                    | Done   |
| `@open-edu/oep-distribution` | Course distribution — `.oep` ZIP archive writer/reader with SHA-256 integrity, install coordinator (stage-then-activate), catalog loader, source adapters (file/URL/catalog), version comparison, ZIP security (path traversal, decompression bomb protection)                                                                                                                                                                                                                                            | Done   |
| `@open-edu/registry`         | GitHub-native course registry tooling — GitHub Releases API client, catalog builder (metadata + releases → `catalog.json`), release-asset validation (reuses `OepReader`), JSON Schema generation, `open-edu-registry` CLI. Powers the [`openedu-library`](https://github.com/<owner>/openedu-library) course registry.                                                                                                                                                                                   | Done   |
| `@open-edu/storage`          | IndexedDB persistence layer — 6 typed object stores (courses, progress, badges, cards, search-indexes, preferences) with Promise-based API via `idb`                                                                                                                                                                                                                                                                                                                                                      | Done   |
| `@open-edu/pwa-core`         | Framework-agnostic PWA primitives — install prompt, update detection, connectivity monitoring, storage quota queries                                                                                                                                                                                                                                                                                                                                                                                      | Done   |
| `@open-edu/companion`        | AI companion contracts shared by the Studio assistant and learner — chat message schema + `toAiSdkMessages`/`fromUIMessage` converters (`@open-edu/companion/chat`), tool/skill/task/event/permission/runtime/changeset types                                                                                                                                                                                                                                                                             | Done   |
| `@open-edu/domain-guidance`  | Authoring domain knowledge — learner profiles + quality rubric; **generates** the `openedu-course-authoring` skill reference files; browser-safe `./profiles` subpath consumed by dev-server                                                                                                                                                                                                                                                                                                              | Done   |
| `@open-edu/logger`           | Structured isomorphic logging engine — `createLogger`, sinks (console/memory/jsonl/telemetry-bridge), React `LoggerProvider`                                                                                                                                                                                                                                                                                                                                                                              | Done   |
| `@open-edu/learner`          | Standalone learner app — course catalog, **8-page router** (home, catalog, progress, settings, course, bundleOverview, collection, break), **PWA with offline-first support** (service worker, IndexedDB storage, install prompt, update detection, offline banner), **bundle catalog + overview**, **Collection Binder** (card museum with category shelves), **shadcn/ui component library** (10 components), **theme switching**, progress persistence, reward + card integration, E2E-tested workflow | Done   |

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
| [widget-showcase](./examples/widget-showcase)         | Demonstrates all 27 built-in widgets across multiple node types                                            | Linear chain of widget demos                                  |
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
  ├──► telemetry ──► rewards ──► dev-server (Course Creator Studio)
  │                            ───► learner
  ├──► runtime ──► accessibility
  │             ──► dev-server (Course Creator Studio) ──► cli
  │             ──► learner
  │             ──► e2e (Playwright)
  ├──► i18n ──► runtime
  │             ───► learner
  ├──► widget-sdk ──► widgets (shared protocol types)
  │              ──► runtime (sandbox adapter)
  ├──► widgets ──► runtime
  │             ───► learner
  ├──► storage ──► learner (IndexedDB persistence)
  ├──► pwa-core ──► learner (PWA infrastructure)
  ├──► course-compiler ──► cli (compile command)
  ├──► llm-config ──► pipeline ──► course-compiler
  │            ──► ai-companion (Pipili model factory)
  ├──► oep-distribution ──► learner (install/catalog/update UI)
  │                   ──► cli (oep:build command)
  │                   ──► registry (course registry tooling, published to npm)
  ├──► ai-companion ──► learner (Pipili chat, companion panel)
  ├──► companion ──► dev-server (Studio AI chat schema + agent loop)
  ├──► domain-guidance ──► dev-server (learner profiles, quality rubric)
  │                     ──► skills/openedu-course-authoring (generated references)
  ├──► logger ──► dev-server (isomorphic structured logging)
  └──► examples ───► learner (via virtual module at dev time)
```

`registry ──► openedu-library (external registry repo consumes the published package)`.

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
   │  Provider,               │
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
   ├─────────────────────────────────────┐
   │           PWA Layer                  │
   │  vite-plugin-pwa · Workbox           │
   │  Service Worker · Runtime Caching    │
   ├──────────────┬──────────────────────┤
   │ pwa-core     │ storage               │
   │ Install · SW │ IndexedDB (7 stores)  │
   │ Connectivity │ Courses · Progress    │
   │ Update       │ Badges · Cards        │
   └──────┬───────┴──────────┬───────────┘
          ▼                  ▼
   ┌────────────────────────────────┐
   │      Distribution System       │
   │  .oep archives · Install UI    │
   │  Catalog · Version Updates     │
   ├────────────────────────────────┤
   │  Pipili AI Companion           │
   │  Streaming chat · Hints        │
   │  Context-aware tutoring        │
   └────────────┬───────────────────┘
                ▼
   ┌────────────────────┐
   │   Learner App      │  Standalone app
   │   Catalog · Course  │  · Progress · Themes
   └────────────────────┘
```

**Internationalization:** `@open-edu/i18n` provides locale detection, translation engine, React context provider, and formatters — consumed by `@open-edu/runtime`, `@open-edu/learner` (including Pipili chat and distribution install flows).

## Testing

The framework uses **Vitest** for unit tests (~3,200+ tests across 350+ files) and **Playwright** for E2E integration tests (40+ tests).

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
│   ├── dev-server/          # OpenEdu Course Creator Studio (unified shell + single Node AI backend)
│   ├── docs/                # Docusaurus documentation site
│   └── learner/             # Standalone learner app — catalog + course view + progress
├── packages/
│   ├── schemas/             # Zod schemas + type generation
│   ├── core/                # Package loader, scanner, patcher, validator, lint, generator
│   ├── workflow/            # XState workflow engine + skill tracking + topology
│   ├── runtime/             # React runtime + layout components + 3 themes + theme selector
│   ├── i18n/                # Internationalization — locales, translation engine, React provider, formatters
│   ├── accessibility/       # Focus traps, live regions, ARIA, axe-core
│   ├── telemetry/           # RxJS telemetry, JSONL reader + summary
│   ├── rewards/             # Reward broker, CardBroker, conditions, verification
│   ├── cli/                 # edu CLI (10+ commands)
│   ├── course-compiler/     # Course spec compiler (course-spec.md/.json → OpenEdu package)
│   ├── pipeline/            # AI-driven PDF → course spec generation pipeline
│   ├── llm-config/          # LLM provider abstraction (OpenAI + OpenRouter)
│   ├── storage/             # IndexedDB persistence (6 typed stores)
│   ├── pwa-core/            # PWA primitives (install, update, connectivity, storage info)
│   ├── oep-distribution/    # .oep archive format, install coordinator, catalog loader
│   ├── registry/            # GitHub-native course registry tooling (catalog builder, release validation)
│   ├── widget-sdk/          # Framework-agnostic community widget protocol SDK
│   └── widgets/             # Widget SDK, registry, builtins, remote loader, resolver
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

`@open-edu/schemas`, `@open-edu/oep-distribution`, and `@open-edu/registry` are published to npm by the changesets Release workflow (needs the `NPM_TOKEN` secret). The `openedu-library` registry repo consumes `@open-edu/registry` and points learners at its catalog via `VITE_CATALOG_URL`.

## License

MIT
