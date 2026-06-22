# AGENTS.md

Instructions for AI coding agents working on the Open-Edu Framework.

## Project Overview

Open-Edu is an open runtime for educational experiences — a monorepo framework that separates educational content from delivery platforms. Learning packages (Markdown + JSON) are loaded, validated, and rendered through a configurable runtime with built-in accessibility, telemetry, and rewards.

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

## Essential Commands

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm lint             # Lint all packages
pnpm typecheck        # Type-check all packages
pnpm format:check     # Check formatting
pnpm format           # Auto-format all files
```

## Monorepo Structure

```
open-edu/
├── apps/
│   ├── dev-server/          # Vite dev server (Epic 10)
│   └── docs/                # Docusaurus docs (future)
├── packages/
│   ├── schemas/             # Zod schemas + type generation (Epic 2)
│   ├── core/                # Package loader + validation (Epic 3)
│   ├── workflow/            # XState workflow engine (Epic 4)
│   ├── runtime/             # React runtime renderer (Epic 5)
│   ├── accessibility/       # A11y engine (Epic 6)
│   ├── telemetry/           # RxJS telemetry + JSONL (Epic 7)
│   ├── rewards/             # Reward broker (Epic 8)
│   ├── cli/                 # edu CLI (Epic 9)
│   └── widgets/             # Widget SDK + built-in widgets (future)
├── examples/                # Example educational packages
├── tests/e2e/               # Playwright integration tests
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
- `@open-edu/widgets`, `@open-edu/dev-server`, `@open-edu/docs`

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
```

## Configuration Files

- `tsconfig.base.json` — Shared TypeScript config, extended by all packages
- `.eslintrc.json` — Shared ESLint config (React packages have their own extending this)
- `.prettierrc` — Shared Prettier config
- `vitest.workspace.ts` — Vitest workspace definition
- `pnpm-workspace.yaml` — pnpm workspace packages

## PR Checklist

Before marking a story complete, verify:

- [ ] All tests pass: `pnpm test`
- [ ] No lint errors: `pnpm lint`
- [ ] TypeScript compiles: `pnpm typecheck`
- [ ] Formatting is correct: `pnpm format:check`
- [ ] Conventional commit messages
- [ ] No dead code, debug logs, or temporary edits
