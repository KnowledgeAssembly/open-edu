# Open-Edu Framework Implementation Plan

Version: 0.1.0
Status: Active

---

## Overview

This document breaks down the Open-Edu Framework MVP into 12 epics and ~32 implementable stories. Each story is a GitHub issue with enough technical detail for an AI coding agent (deepseek-v4-flash) to implement independently.

The plan follows the architectural principle: **Schemas before implementation, Content before UI, Accessibility before features, Local-first before cloud.**

---

## Technology Stack

| Layer           | Technology                |
| --------------- | ------------------------- |
| Language        | TypeScript 5.x            |
| Package Manager | pnpm 9.x                  |
| Monorepo        | pnpm workspaces           |
| Build Tool      | Vite 5.x                  |
| Schemas         | Zod 3.x                   |
| State Machine   | XState 5.x                |
| UI Framework    | React 18.x                |
| Styling         | Tailwind CSS 3.x          |
| Markdown        | remark + rehype + unified |
| Accessibility   | React Aria + axe-core     |
| Telemetry       | RxJS 7.x                  |
| CLI             | Commander 12.x            |
| Unit Testing    | Vitest 1.x                |
| E2E Testing     | Playwright 1.x            |
| Docs            | Docusaurus 3.x            |

---

## Monorepo Structure

```
open-edu/
├── apps/
│   ├── dev-server/          # Vite dev server (Epic 10)
│   ├── docs/                # Docusaurus docs site (future)
│   └── learner/             # Standalone learner app (Epic 13)
├── packages/
│   ├── schemas/             # Zod schemas + type generation (Epic 2)
│   ├── core/                # Package loader + validation + scanner (Epic 3)
│   ├── workflow/            # XState workflow engine + topology (Epic 4)
│   ├── runtime/             # React runtime renderer + layout (Epic 5)
│   ├── accessibility/       # A11y engine (Epic 6)
│   ├── telemetry/           # RxJS telemetry + JSONL (Epic 7)
│   ├── rewards/             # Reward broker (Epic 8)
│   ├── cli/                 # edu CLI (Epic 9)
│   ├── course-compiler/     # Course spec compiler (Epic 29)
│   └── widgets/             # Widget SDK + built-in widgets (Epic 11)
├── examples/
│   ├── hello-world/
│   ├── intro-javascript/
│   ├── fractions/
│   ├── autism-reading/
│   ├── adaptive-study/
│   ├── living-vs-nonliving/
│   ├── skill-graph/
│   ├── widget-practice/
│   ├── widget-showcase/
│   └── remote-widget-demo/
├── tests/e2e/               # Playwright integration tests (Epic 12)
├── docs/
│   ├── VISION.md
│   ├── ARCHITECTURE.md
│   ├── FRAMEWORK_SPEC.md
│   └── PLAN.md              # This file
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .github/
│   └── workflows/
│       └── ci.yml
└── AGENTS.md
```

---

## Epic Summary

| #   | Epic                        | Stories | Priority | Key Dependencies           |
| --- | --------------------------- | ------- | -------- | -------------------------- |
| 1   | Foundation & Monorepo Setup | 3       | P0       | None                       |
| 2   | Schema Layer                | 4       | P0       | Epic 1                     |
| 3   | Package Loader [DONE]       | 3       | P0       | Epic 2                     |
| 4   | Workflow Engine [DONE]      | 3       | P0       | Epic 2                     |
| 5   | Runtime Renderer [DONE]     | 6       | P0       | Epics 3, 4                 |
| 6   | Accessibility Engine [DONE] | 3       | P0       | Epic 5                     |
| 7   | Telemetry Engine [DONE]     | 3       | P0       | Epic 2                     |
| 8   | Reward Broker [DONE]        | 2       | P1       | Epic 7                     |
| 9   | CLI [DONE]                  | 2       | P0       | Epic 3                     |
| 10  | Dev Server [DONE]           | 2       | P0       | Epic 5                     |
| 11  | Example Packages [DONE]     | 4       | P1       | Epic 2                     |
| 12  | Integration Testing [DONE]  | 2       | P1       | Epics 5, 6, 10, 11         |
| 13  | Learner App [DONE]          | 4       | P0       | Epics 3, 4, 5, 6, 7, 8, 11 |
| 29  | Course Compiler [DONE]      | 7       | P1       | Epics 2, 3                 |
| 30  | Step Titles                 | 8       | P1       | Epics 2, 3, 4, 5           |
| 32  | Design Token Refresh v2     | 6       | P1       | Epics 5, 13                |

---

## Dependency Graph

```
Epic 1 (Foundation)
  └─► Epic 2 (Schemas)
        ├─► Epic 3 (Package Loader) [DONE]
        │     └─► Epic 5 (Runtime Renderer) [DONE]
        │           ├─► Epic 6 (Accessibility) [DONE]
        │           ├─► Epic 10 (Dev Server) [DONE]
        │           │     └─► Epic 9 (CLI) [DONE]
        │           └─► Epic 12 (Testing) [DONE]
        ├─► Epic 4 (Workflow Engine) [DONE]
        │     └─► Epic 5 (Runtime Renderer) [DONE]
        ├─► Epic 7 (Telemetry) [DONE]
        │     └─► Epic 8 (Rewards) [DONE]
        └─► Epic 11 (Examples) [DONE]

Epic 13 (Learner App) [DONE]
  └─► Epics 3, 4, 5, 6, 7, 8, 11 (consumes all packages)

Epic 30 (Step Titles)
  └─► Epics 2, 3, 4, 5 (schema, loader, topology, runtime)
        ├─► Story 1: Schema — adds `title` to ContentNode
        │     └─► Stories 2, 6, 7, 8 (consumers of schema change)
        ├─► Story 2: Core — extracts titles from .md + preserves .json titles
        │     └─► Story 4: UI — typed title in runtime components
        ├─► Story 3: Workflow — excludes COMPLETED sentinel from BFS
        ├─► Story 5: Examples — adds `title` to 28 JSON node files
        └─► Story 6: Course-Compiler — emits `title` in generated quiz JSON

Epic 32 (Design Token Refresh v2)
  └─► Epics 5, 13 (runtime theme definitions, learner app consumer)
        ├─► Story 1: Color palette — warm greige neutrals + muted purple + gold accent
        │     └─► Stories 2, 5, 6 (consumers of palette tokens)
        ├─► Story 2: Typography — weight/letter-spacing refinement, same sizes
        │     └─► Story 6: test fixture updates
        ├─► Story 3: Radii + spacing — subtle radius bump, tighter page margins
        ├─► Story 4: Elevation — warm-tinted shadow colors
        ├─► Story 5: HomePage — stat cards → inline stats
        └─► Story 6: Test fixtures + design doc update
```

---

## Story Breakdown

### Epic 1: Foundation & Monorepo Setup

- Story 1.1: Initialize pnpm monorepo with all package directories
- Story 1.2: Set up shared TypeScript, ESLint, Prettier, Vitest configs
- Story 1.3: Create AGENTS.md, CI workflow, and PR template

### Epic 2: Schema Layer

- Story 2.1: Package manifest + node type schemas (Zod → TS types + JSON Schema export)
- Story 2.2: Workflow schema (routing rules + conditional expressions)
- Story 2.3: Rewards schema (triggers + badge/webhook/script actions)
- Story 2.4: Telemetry event schema (event types + JSONL format)

### Epic 3: Package Loader [DONE]

- Story 3.1: Package directory loader + manifest parsing + schema validation
- Story 3.2: Node file loading + type detection + asset resolution
- Story 3.3: `scanPackages` — directory scanner returning `PackageSummary[]` for catalog discovery

### Epic 4: Workflow Engine [DONE]

- Story 4.1: XState machine builder from workflow.json + conditional routing
- Story 4.2: Workflow state events + telemetry integration hooks
- Story 4.3: `getOrderedNodes` — topological sort of workflow routing for course outline ordering

### Epic 5: Runtime Renderer [DONE]

- Story 5.1: Runtime context provider + workflow state integration
- Story 5.2: Markdown rendering pipeline (remark → rehype → accessible React)
- Story 5.3: Quiz node renderer with scoring + answer validation
- Story 5.4: Reflection node renderer with text input
- Story 5.5: Navigation UI + Tailwind design system + layout shell
- Story 5.6: Layout components — `Sidebar`, `CourseOutline`, `CourseCard`, `CompletionScreen`, `ProgressBadge`

### Epic 6: Accessibility Engine [DONE]

- Story 6.1: Focus management + keyboard navigation system
- Story 6.2: ARIA generation (landmarks, labels, roles, descriptions)
- Story 6.3: axe-core dev-mode accessibility validator

### Epic 7: Telemetry Engine [DONE]

- Story 7.1: Telemetry event emitter (RxJS Subject/Observable pipeline)
- Story 7.2: JSONL append-only persistence layer
- Story 7.3: Telemetry session management (start/stop/restore)

### Epic 8: Reward Broker [DONE]

- Story 8.1: Reward broker core + badge + webhook action handlers
- Story 8.2: Script reward action (opt-in via --allow-shell-hooks flag)

### Epic 9: CLI [DONE]

- Story 9.1: CLI framework (Commander) + `edu validate` command
- Story 9.2: `edu dev` + `edu build` + `edu package` commands

### Epic 10: Dev Server [DONE]

- Story 10.1: Vite dev server + runtime mounting + hot reload
- Story 10.2: Telemetry inspector + accessibility inspector panels

### Epic 11: Example Packages [DONE]

- Story 11.1: hello-world + intro-javascript example packages
- Story 11.2: fractions + autism-reading example packages
- Story 11.3: adaptive-study + skill-graph + living-vs-nonliving example packages
- Story 11.4: widget-practice + widget-showcase + remote-widget-demo example packages

### Epic 12: Integration Testing [DONE]

- Story 12.1: Playwright setup + package execution end-to-end tests
- Story 12.2: Keyboard navigation + accessibility + telemetry e2e tests

### Epic 13: Learner App [DONE]

- Story 13.1: Scaffold learner app with screen state machine (catalog → course → completion)
- Story 13.2: Catalog page — course grid from `scanPackages`, progress badges, click-to-launch
- Story 13.3: Course page — sidebar, runtime provider, reward broker wiring, toast notifications, completion screen
- Story 13.4: Progress persistence (localStorage roundtrip), Vite virtual module for package data, E2E tests

### Epic 30: Step Titles

- Story 30.1: Add `title` field to ContentNode schema (all 5 node types)
- Story 30.2: Extract title from markdown `# Heading` at load time + preserve title from JSON through Zod validation
- Story 30.3: Fix `getOrderedNodes` to exclude COMPLETED sentinel from BFS traversal
- Story 30.4: Update runtime UI components (`Sidebar`, `NodeRenderer`, `RuntimeContext`, `embed.tsx`, `AppShell`, `ProgressDashboard`) to use typed `node.node.title`
- Story 30.5: Add `title` to all 28 example JSON node files
- Story 30.6: Emit `title` in course-compiler generated quiz JSON
- Story 30.7: Update docs (`package-format.md`, `package-authoring.md`) and agent prompt with `title` field documentation
- Story 30.8: Update test fixtures to include `title` in fake node data

### Epic 32: Design Token Refresh v2

**Goal:** Modernize the default theme (Lumina Scholastica) from cool lavender/Material 3 palette to warm greige neutrals with muted purple primary + gold tertiary accent. All changes are purely token/hex value swaps — no structural or API changes. Typography sizes stay the same (accessibility requirement); weights and letter-spacing refined.

**Design spec:** See `docs/design/token-refresh-v2.md` for full rationale and color tables.

**Reference file for all hex values:** `packages/runtime/src/themes/lumina-scholastica.ts`

- **Story 32.1: Color palette — warm greige neutrals + muted purple primary + gold tertiary**
  - **Files to modify:**
    - `packages/runtime/src/themes/lumina-scholastica.ts` — Replace all 56 hex values in the `colors:` block per the table below. Keep the same token keys (e.g. `surface`, `on-surface`, `primary`...). Only the hex values change.
  - **New color values (replace every hex in the colors block):**

    | Token                        | Old       | New                   |
    | ---------------------------- | --------- | --------------------- |
    | `surface`                    | `#fdf7ff` | `#fcfaf8`             |
    | `surface-dim`                | `#ded8e0` | `#e3dfda`             |
    | `surface-bright`             | `#fdf7ff` | `#fefcf9`             |
    | `surface-container-lowest`   | `#ffffff` | `#ffffff` (unchanged) |
    | `surface-container-low`      | `#f8f2fa` | `#f7f4f0`             |
    | `surface-container`          | `#f2ecf4` | `#f2eee9`             |
    | `surface-container-high`     | `#ece6ee` | `#ebe7e2`             |
    | `surface-container-highest`  | `#e6e0e9` | `#e4dfda`             |
    | `on-surface`                 | `#1d1b20` | `#1f1c18`             |
    | `on-surface-variant`         | `#494551` | `#48443f`             |
    | `inverse-surface`            | `#322f35` | `#322f2c`             |
    | `inverse-on-surface`         | `#f5eff7` | `#f5f2ef`             |
    | `outline`                    | `#7a7582` | `#76706b`             |
    | `outline-variant`            | `#cbc4d2` | `#ccc6c0`             |
    | `surface-tint`               | `#6750a4` | `#7c6bb0`             |
    | `primary`                    | `#4f378a` | `#5d4a8a`             |
    | `on-primary`                 | `#ffffff` | `#ffffff` (unchanged) |
    | `primary-container`          | `#6750a4` | `#7c6bb0`             |
    | `on-primary-container`       | `#e0d2ff` | `#ede2ff`             |
    | `inverse-primary`            | `#cfbcff` | `#d4c4ff`             |
    | `secondary`                  | `#63597c` | `#665e77`             |
    | `on-secondary`               | `#ffffff` | `#ffffff` (unchanged) |
    | `secondary-container`        | `#e1d4fd` | `#e8dff7`             |
    | `on-secondary-container`     | `#645a7d` | `#655d77`             |
    | `tertiary`                   | `#765b00` | `#b8862d`             |
    | `on-tertiary`                | `#ffffff` | `#ffffff` (unchanged) |
    | `tertiary-container`         | `#c9a74d` | `#f0d68a`             |
    | `on-tertiary-container`      | `#503d00` | `#4a3800`             |
    | `error`                      | `#ba1a1a` | `#ba1a1a` (unchanged) |
    | `on-error`                   | `#ffffff` | `#ffffff` (unchanged) |
    | `error-container`            | `#ffdad6` | `#ffdad6` (unchanged) |
    | `on-error-container`         | `#93000a` | `#93000a` (unchanged) |
    | `primary-fixed`              | `#e9ddff` | `#ede2ff`             |
    | `primary-fixed-dim`          | `#cfbcff` | `#d4c4ff`             |
    | `on-primary-fixed`           | `#22005d` | `#2a104d`             |
    | `on-primary-fixed-variant`   | `#4f378a` | `#5d4a8a`             |
    | `secondary-fixed`            | `#e9ddff` | `#ede2ff`             |
    | `secondary-fixed-dim`        | `#cdc0e9` | `#d4c8e8`             |
    | `on-secondary-fixed`         | `#1f1635` | `#1f1830`             |
    | `on-secondary-fixed-variant` | `#4b4263` | `#4c435e`             |
    | `tertiary-fixed`             | `#ffdf93` | `#fce8b0`             |
    | `tertiary-fixed-dim`         | `#e7c365` | `#e8c860`             |
    | `on-tertiary-fixed`          | `#241a00` | `#2a1f00`             |
    | `on-tertiary-fixed-variant`  | `#594400` | `#594400` (unchanged) |
    | `background`                 | `#fdf7ff` | `#fcfaf8`             |
    | `on-background`              | `#1d1b20` | `#1f1c18`             |
    | `surface-variant`            | `#e6e0e9` | `#e4dfda`             |

  - **Tests to update:**
    - `packages/design-system/src/theme/__tests__/flatten.test.ts` — Update the `testTheme` fixture's color values (lines 9-13) to match new v2 palette. Specifically: `background: '#fcfaf8'`, `on-background: '#1f1c18'`, `outline: '#ccc6c0'`, `secondary: '#665e77'`.
    - `packages/runtime/src/themes/__tests__/theme-definitions.test.ts` — Add a new test block for `lumina-scholastica` that verifies key v2 hex values are set correctly (e.g. `expect(theme.colors['surface']).toBe('#fcfaf8')`, `expect(theme.colors['primary']).toBe('#5d4a8a')`, `expect(theme.colors['tertiary']).toBe('#b8862d')`).
    - `packages/design-system/src/tokens/__tests__/colors.test.ts` — Update line 7: `expect(palette.purple30)` expectation changes to... wait, no. The `palette` object in colors.ts doesn't change — it's the base palette. The theme _uses_ palette values. I should keep palette as-is and only change theme definitions. Actually, looking more carefully, `lumina-scholastica.ts` imports palette directly. But the new v2 colors don't necessarily need to be in the palette — they can be literal hex strings in the theme definition. The palette object is used by Forest, Zen, and other themes too. So: **do not change `packages/design-system/src/tokens/colors.ts`**. The new hex values are inlined directly in the theme definition. Update the test accordingly.
  - **Verification:** Run `pnpm --filter @open-edu/runtime test` and `pnpm --filter @open-edu/design-system test`. All must pass.
  - **Compliance:** All color pairs maintain WCAG AA contrast (verified in design spec).

- **Story 32.2: Typography refinement — weight, letter-spacing, line-height**
  - **Files to modify:**
    - `packages/runtime/src/themes/lumina-scholastica.ts` — Update the `typography:` block (both `productive` and `expressive` sets) per the table below.
    - `packages/design-system/src/tokens/typography.ts` — Update the `defaultTypography` object to match the same values.
  - **Typography changes (productive set):**

    | Role       | Old                 | New                     | Notes                            |
    | ---------- | ------------------- | ----------------------- | -------------------------------- |
    | Display    | 48px/700/-0.02em    | **40px/700/-0.02em**    | Smaller for hero moments         |
    | Heading    | 30px/600/-0.01em    | **28px/650/-0.01em**    | Heavier weight, slightly smaller |
    | Subheading | 24px/600/—          | 24px/600/—              | Unchanged                        |
    | heading3   | 20px/600/—          | 20px/600/—              | Unchanged                        |
    | heading4   | 18px/600/—          | 18px/600/—              | Unchanged                        |
    | heading5   | 16px/500/—          | **16px/600/—**          | Bump weight                      |
    | heading6   | 14px/500/—          | **14px/600/—**          | Bump weight                      |
    | body       | 14px/400/1.5        | **14px/420/1.6**        | Weight 420, line-height 1.6      |
    | label      | 12px/600/0.05em/1.0 | **11px/600/0.08em/1.0** | Smaller, more tracking           |
    | caption    | 14px/400/1.5        | **13px/420/1.5**        | Slightly smaller                 |
    | code       | 13px/400/1.6        | 13px/400/1.6            | Unchanged                        |

  - **Typography changes (expressive set):**

    | Role       | Old                 | New                                     | Notes                                       |
    | ---------- | ------------------- | --------------------------------------- | ------------------------------------------- |
    | Display    | 48px/700/-0.02em    | **40px/700/-0.02em**                    | Match productive display size               |
    | Heading    | 24px/600/—          | **28px/600/—**                          | Increase to match productive heading        |
    | Subheading | 24px/600/—          | 24px/600/—                              | Unchanged                                   |
    | heading3   | 20px/600/—          | 20px/600/—                              | Unchanged                                   |
    | heading4   | 18px/600/—          | 18px/600/—                              | Unchanged                                   |
    | heading5   | 16px/500/—          | **16px/600/—**                          | Bump weight                                 |
    | heading6   | 14px/500/—          | **14px/600/—**                          | Bump weight                                 |
    | body       | 18px/400/1.7        | **18px/420/1.7 + letterSpacing 0.01em** | Add letter-spacing for dyslexia readability |
    | label      | 12px/600/0.05em/1.0 | **11px/600/0.08em/1.0**                 | Match productive label                      |
    | caption    | 14px/400/1.5        | **13px/420/1.5**                        | Match productive caption                    |
    | code       | 13px/400/1.6        | 13px/400/1.6                            | Unchanged                                   |

  - **Important:** The `typography.ts` `defaultTypography` object at the bottom of the file must match the values in `lumina-scholastica.ts`. Update both.
  - **Tests to update:**
    - `packages/design-system/src/theme/__tests__/flatten.test.ts` — Update `testTheme` typography fixture values (lines 16-100) to match the new v2 values. Specifically:
      - Productive display: fontSize `'40px'`, fontWeight `'700'`, letterSpacing `'-0.02em'`
      - Productive heading: fontSize `'28px'`, fontWeight `'650'`
      - Productive body: fontWeight `'420'`, lineHeight `'1.6'`
      - Productive label: fontSize `'11px'`, letterSpacing `'0.08em'`
      - Expressive body: fontWeight `'420'`, add `letterSpacing: '0.01em'`
      - Expressive label: fontSize `'11px'`, letterSpacing `'0.08em'`
    - `packages/design-system/src/tokens/__tests__/typography.test.ts` — Update any assertions that check default values.
  - **Verification:** `pnpm --filter @open-edu/runtime test && pnpm --filter @open-edu/design-system test`. All pass.
  - **Note on fontWeight `'650'`:** This is valid in modern browsers. If TypeScript complains, use the numeric value `650` instead of the string `'650'`.

- **Story 32.3: Border radius + spacing refinement**
  - **Files to modify:**
    - `packages/runtime/src/themes/lumina-scholastica.ts` — Update `radii:` and `spacing:` blocks.
    - `packages/design-system/src/tokens/radius.ts` — Update `radiusScale` default values.
  - **Radius changes:**

    | Token     | Old          | New                  |
    | --------- | ------------ | -------------------- |
    | `sm`      | 0.125rem     | 0.125rem (unchanged) |
    | `DEFAULT` | **0.25rem**  | **0.375rem**         |
    | `md`      | **0.375rem** | **0.5rem**           |
    | `lg`      | **0.5rem**   | **0.625rem**         |
    | `xl`      | 0.75rem      | 0.75rem (unchanged)  |
    | `full`    | 9999px       | 9999px (unchanged)   |

  - **Spacing changes:**

    | Token           | Old       | New       |
    | --------------- | --------- | --------- |
    | `containerMax`  | 800px     | **720px** |
    | `marginDesktop` | 64px      | **48px**  |
    | `panelNav`      | 260px     | **240px** |
    | `readingWidth`  | 65ch      | **68ch**  |
    | All others      | unchanged | unchanged |

  - **Tests to update:**
    - `packages/design-system/src/tokens/__tests__/radius.test.ts` — Update expectations for `DEFAULT`, `md`, `lg` values.
    - `packages/design-system/src/theme/__tests__/flatten.test.ts` — Update `testTheme` spacing values: `containerMax: '720px'`, `marginDesktop: '48px'`. Update radii: `DEFAULT: '0.375rem'`, `md: '0.5rem'`, `lg: '0.625rem'`.
  - **Verification:** `pnpm --filter @open-edu/runtime test && pnpm --filter @open-edu/design-system test`. All pass.

- **Story 32.4: Elevation shadow colors — warm-tinted**
  - **Files to modify:**
    - `packages/design-system/src/tokens/elevation.ts` — Update all boxShadow values to use warm-tinted rgba (using `#1f1c18` = warm on-surface as the tint base).
  - **Elevation changes:**

    | Token     | Old rgba           | New rgba              |
    | --------- | ------------------ | --------------------- |
    | `raised`  | `rgba(0,0,0,0.1)`  | `rgba(31,28,24,0.08)` |
    | `overlay` | `rgba(0,0,0,0.15)` | `rgba(31,28,24,0.10)` |
    | `modal`   | `rgba(0,0,0,0.2)`  | `rgba(31,28,24,0.14)` |
    | `sticky`  | `rgba(0,0,0,0.12)` | `rgba(31,28,24,0.08)` |
    | `flat`    | `none`             | `none` (unchanged)    |

  - **Tests to update:**
    - `packages/design-system/src/tokens/__tests__/elevation.test.ts` — Update expectations that check specific rgba values.
  - **Verification:** `pnpm --filter @open-edu/design-system test`. All pass.

- **Story 32.5: HomePage stat section — cards to inline stats**
  - **Files to modify:**
    - `apps/learner/src/HomePage.tsx`
  - **Changes:**
    - Replace the 3 `<Card>` stat components (lines 40-62) with a single inline stat bar.
    - New layout (replace the grid of Cards):

      ```tsx
      <div className="text-on-surface-variant mb-xl flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="flex items-center gap-1.5">
          <BookOpen className="text-primary h-4 w-4" />
          <strong className="text-on-surface font-semibold">{totalUnits}</strong> learning units
        </span>
        <span className="flex items-center gap-1.5">
          <TrendingUp className="text-primary h-4 w-4" />
          <strong className="text-on-surface font-semibold">{inProgressCount}</strong> in progress
        </span>
        <span className="flex items-center gap-1.5">
          <Trophy className="text-primary h-4 w-4" />
          <strong className="text-on-surface font-semibold">{badgeCount}</strong> badges earned
        </span>
      </div>
      ```

    - Keep the Quick Links section (lines 64-83) but remove the `border-primary/20 bg-primary/5` classes — use cleaner styling: `border-outline-variant` and no tinted background. Change `<h2>` to use `text-sm font-semibold text-on-surface` instead of `text-lg font-semibold text-primary`.

  - **Tests to update:**
    - `apps/learner/src/HomePage.test.tsx` — The test checks for `screen.getByText('Welcome to OpenEdu')` which stays. No existing tests check for stat cards specifically. **Add a new test:** `it('renders inline stats with correct counts', ...)` that verifies the stat text like "12 learning units" appears.
  - **Verification:** `pnpm --filter @open-edu/learner test`. All pass. `pnpm lint` and `pnpm typecheck` pass.
  - **Note:** Do not add emoji characters. Use Lucide icons (already imported).

- **Story 32.6: Test fixture sync + design doc update**
  - **Files to modify:**
    - `packages/design-system/src/theme/__tests__/flatten.test.ts` — Ensure `testTheme` fixture is fully synced with all v2 token values (it should have been updated by stories 32.1-32.3; verify no remaining old values).
    - `packages/runtime/src/themes/__tests__/theme-definitions.test.ts` — Add explicit v2 hex value assertions for `lumina-scholastica` colors (replacing the generic hex format check with specific value checks for the default theme).
  - **New test additions in `theme-definitions.test.ts` (after line 165, inside the existing `lumina-scholastica` describe block):**

    ```typescript
    it('lumina-scholastica uses v2 warm palette', () => {
      const theme = luminaScholastica;
      expect(theme.colors['surface']).toBe('#fcfaf8');
      expect(theme.colors['primary']).toBe('#5d4a8a');
      expect(theme.colors['tertiary']).toBe('#b8862d');
      expect(theme.colors['on-surface']).toBe('#1f1c18');
      expect(theme.colors['on-surface-variant']).toBe('#48443f');
      expect(theme.colors['outline']).toBe('#76706b');
      expect(theme.colors['outline-variant']).toBe('#ccc6c0');
    });
    ```

  - **Also verify** `docs/design/token-refresh-v2.md` is accurate after implementation — update any values that deviated during implementation.
  - **Verification:** Full `pnpm test` run. All tests pass.

---

## Conventions for AI Agents

1. **Every story must produce tests.** No story is complete without Vitest unit tests.
2. **Schemas are the source of truth.** All types derive from Zod schemas, never hand-written.
3. **Packages must be self-contained.** No cross-package imports except through published interfaces (package.json exports).
4. **Accessibility is not optional.** Every rendered component must pass axe-core.
5. **Commits should be scoped.** Use conventional commits: `feat(schemas): add workflow schema`
6. **One story per PR.** Each story gets its own branch and PR.
