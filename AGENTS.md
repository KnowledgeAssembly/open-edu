# AGENTS.md

Instructions for AI coding agents working on the Open-Edu Framework.

## Project Overview

Open-Edu is an open runtime for educational experiences — a monorepo framework that separates educational content from delivery platforms. Learning packages (Markdown + JSON) are loaded, validated, and rendered through a configurable runtime with built-in accessibility, telemetry, rewards, and a **4-theme system** with Tailwind CSS styling.

## Technology Stack

| Layer           | Technology                                     |
| --------------- | ---------------------------------------------- |
| Language        | TypeScript 5.x                                 |
| Package Manager | pnpm 9.x                                       |
| Monorepo        | pnpm workspaces                                |
| Build Tool      | Vite 5.x                                       |
| Schemas         | Zod 3.x                                        |
| State Machine   | XState 5.x                                     |
| UI Framework    | React 18.x                                     |
| UI Primitives   | Radix UI + shadcn/ui + Lucide Icons            |
| Styling         | Tailwind CSS 3.x + clsx + cva + tailwind-merge |
| Accessibility   | React Aria + axe-core                          |
| Telemetry       | RxJS 7.x                                       |
| CLI             | Commander 12.x                                 |
| Testing         | Vitest 1.x                                     |
| E2E             | Playwright 1.x                                 |

## Essential Commands

```bash
pnpm install                          # Install all dependencies
pnpm build                            # Build all packages
pnpm test                             # Run all tests
pnpm lint                             # Lint all packages
pnpm typecheck                        # Type-check all packages
pnpm format:check                     # Check formatting
pnpm format                           # Auto-format all files
pnpm --filter @open-edu/learner dev   # Start the learner app (port 4001)
pnpm test:e2e                         # Run Playwright E2E tests
pnpm test:e2e -- bundle-navigation    # Run bundle-specific E2E tests
pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js import learn-easy ./source-dir ./output-dir  # Import Learn-Easy content as a bundle
pnpm --filter @open-edu/course-compiler test  # Run course-compiler tests
pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js compile course-spec.md -o ./output  # Compile a course spec
# Regenerate dev-server Tailwind CSS after runtime style changes
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css
```

## Monorepo Structure

```
open-edu/
├── apps/
│   ├── dev-server/          # Vite dev server with inspector panels
│   ├── docs/                # Docusaurus documentation site
│   └── learner/             # Standalone learner app with 6-page router + theme switching
├── packages/
│   ├── schemas/             # Zod schemas + type generation
│   ├── core/                # Package loader + validator + scanner + patcher + lint + generator
│   ├── workflow/            # XState workflow engine + skill tracking + topology
│   ├── runtime/             # React runtime + 6 layout components + 4 themes + 7 renderers
│   ├── accessibility/       # Focus traps, live regions, ARIA, axe-core
│   ├── telemetry/           # RxJS telemetry + JSONL reader + summary
│   ├── rewards/             # Reward broker + conditions + verification + replay
│   ├── cli/                 # edu CLI (10+ commands)
│   ├── course-compiler/     # Course spec compiler (course-spec.md → OpenEdu package)
│   └── widgets/             # Widget SDK + registry + 14 built-in widgets + remote loader
├── examples/                # Example educational packages
│   ├── adaptive-study/
│   ├── autism-reading/
│   ├── fractions/
│   ├── hello-world/
│   ├── intro-javascript/
│   ├── level-b-math/        # Multi-module bundle example (3 modules)
│   ├── living-vs-nonliving/
│   ├── remote-widget-demo/
│   ├── skill-graph/
│   ├── widget-practice/
│   └── widget-showcase/
├── tests/e2e/               # Playwright integration tests (9 spec files)
├── docs/                    # Architecture docs (VISION, ARCHITECTURE, FRAMEWORK_SPEC)
└── PLAN.md                  # Implementation plan with epic/story breakdown
```

## Development Rules

1. **Every story must produce tests.** No story is complete without Vitest unit tests.
2. **Schemas are the source of truth.** All types derive from Zod schemas, never hand-written.
3. **Packages must be self-contained.** No cross-package imports except through published interfaces (package.json exports).
4. **Accessibility is not optional.** Every rendered component must pass axe-core.
5. **Commits should be scoped.** Use conventional commits: `feat(schemas): add workflow schema`
6. **One story per PR.** Each story gets its own branch and PR.

## Package Naming

All packages use the `@open-edu/` scope:

- `@open-edu/schemas`, `@open-edu/core`, `@open-edu/workflow`, `@open-edu/runtime`
- `@open-edu/accessibility`, `@open-edu/telemetry`, `@open-edu/rewards`, `@open-edu/cli`
- `@open-edu/widgets`, `@open-edu/dev-server`, `@open-edu/docs`, `@open-edu/course-compiler`

Examples use `@open-edu/example-` prefix.

## Dependency Graph

```
Epic 1 (Foundation)  ← CURRENT
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

Epic 13 (Learner App)
  └─► Epics 3, 4, 5, 6, 7, 8, 11 (consumes all packages)

Epic 29 (Course Compiler)
  └─► Epics 2, 3 (compiles specs into validated packages)
```

### Theme System (Epics 138–145)

A 4-theme system built as a sub-track within the runtime:

```
Epic 1: Token Foundation (#138, PR #174)
  └─► Epic 2: Tailwind Integration (#140, PR #175)
        ├─► Epic 3: Theme Provider & Runtime (#141, PR #176)
        │     └─► Epic 5: Layout Shell Components (#142, PR #178)
        │           └─► Epic 6: Pages (#143, PR #179)
        │                 └─► Epic 7: Tailwind Refactor (#144, PR #180)
        │                       └─► Epic 8: Polish & Verification (#145, PR #181)
        └─► Epic 4: Theme Selector UI (#139, PR #177)
```

## Configuration Files

- `tsconfig.base.json` — Shared TypeScript config, extended by all packages
- `.eslintrc.json` — Shared ESLint config (React packages have their own extending this)
- `.prettierrc` — Shared Prettier config
- `vitest.workspace.ts` — Vitest workspace definition
- `pnpm-workspace.yaml` — pnpm workspace packages

## Tailwind CSS & Dev-Server

Runtime components (`packages/runtime/src`) use Tailwind utility classes. The learner app processes Tailwind through PostCSS at dev/build time. The dev-server **does not** run PostCSS — it imports a pre-generated CSS file (`apps/dev-server/src/tailwind.css`).

**When you add or change Tailwind classes in runtime components, regenerate the dev-server CSS:**

```bash
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css
```

Both the learner (`apps/learner/tailwind.config.ts`) and dev-server (`apps/dev-server/tailwind.config.js`) share the same theme token mappings (colors, spacing, border radius, fonts) that reference `--oe-*` CSS variables injected by `RuntimeThemeProvider`.

## PR Checklist

Before marking a story complete, verify:

- [ ] All tests pass: `pnpm test`
- [ ] No lint errors: `pnpm lint`
- [ ] TypeScript compiles: `pnpm typecheck`
- [ ] Formatting is correct: `pnpm format:check`
- [ ] Conventional commit messages
- [ ] No dead code, debug logs, or temporary edits
- [ ] Acessibility: axe-core audits pass for all affected components
