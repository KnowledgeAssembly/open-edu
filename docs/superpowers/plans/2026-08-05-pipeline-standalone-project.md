# Pipeline Standalone Project Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `@open-edu/pipeline` out of the open-edu monorepo into a standalone repo at `/Users/sarthakpatnaik/Code/open-edu-pipeline`, vendoring a renamed copy of `@open-edu/llm-config` (`@open-edu/pipeline-llm`) and replacing the external logger dependency with a minimal in-repo logger, then remove the pipeline from the open-edu monorepo and update all affected docs.

**Architecture:** Two phases. Phase A builds the standalone pnpm workspace (`open-edu-pipeline`) containing `packages/pipeline` and `packages/pipeline-llm` (a copy of `@open-edu/llm-config`, renamed). The pipeline's import sites are re-pointed at the renamed package; the `@open-edu/logger` dependency is replaced by a small local module. Phase B deletes `packages/pipeline` from the open-edu monorepo (llm-config stays — `apps/learner` still uses it), prunes the lockfile, and updates every doc/CLI reference to point at the standalone repo.

**Tech Stack:** pnpm 9 workspaces, TypeScript 5, Vitest 1, ESLint 8, Node 18+, GitHub Actions.

---

## Locked Decisions

1. **New repo location:** `/Users/sarthakpatnaik/Code/open-edu-pipeline` (sibling of the open-edu repo). Plain copy; new repo starts fresh git history.
2. **Vendored LLM package name:** `@open-edu/pipeline-llm` (renamed from `@open-edu/llm-config`) to avoid identity collision with the monorepo's package.
3. **open-edu cleanup:** `packages/pipeline` is deleted. `packages/llm-config` remains (used by `apps/learner`). The two copies now diverge intentionally.
4. **Logger:** `@open-edu/logger` is NOT vendored. It is replaced by a minimal in-repo logger (`packages/pipeline/src/lib/logger.ts`) because the pipeline only uses `createLogger({ scope })` + `.info/.warn/.error/.debug`. The open-edu logger package (React context, sinks, telemetry bridge) is overkill.
5. **CLI surface:** unchanged. Flag names (`--pdf`, `--stage-model`, `--llm-provider`, …) and env vars (`LLM_*`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`) are preserved exactly.

## Target Repo Layout

```
open-edu-pipeline/                        # NEW repo
├── package.json                          # root scripts (build/test/lint/typecheck/format/curriculum:generate)
├── pnpm-workspace.yaml
├── tsconfig.base.json                    # inlined copy of open-edu's
├── .eslintrc.json                        # inlined copy of open-edu's
├── .prettierrc                           # inlined copy, tailwind plugin dropped
├── vitest.config.ts
├── .gitignore
├── .env.example
├── README.md
├── .github/workflows/ci.yml
└── packages/
    ├── pipeline/                         # copied from open-edu/packages/pipeline (+ lib/logger.ts)
    └── pipeline-llm/                     # copied from open-edu/packages/llm-config, renamed
```

---

## Phase A — Build the standalone repo

### Task 1: Scaffold the repo root

**Files:**

- Create: `/Users/sarthakpatnaik/Code/open-edu-pipeline/package.json`
- Create: `/Users/sarthakpatnaik/Code/open-edu-pipeline/pnpm-workspace.yaml`
- Create: `/Users/sarthakpatnaik/Code/open-edu-pipeline/tsconfig.base.json`
- Create: `/Users/sarthakpatnaik/Code/open-edu-pipeline/.eslintrc.json`
- Create: `/Users/sarthakpatnaik/Code/open-edu-pipeline/.prettierrc`
- Create: `/Users/sarthakpatnaik/Code/open-edu-pipeline/vitest.config.ts`
- Create: `/Users/sarthakpatnaik/Code/open-edu-pipeline/.gitignore`
- Create: `/Users/sarthakpatnaik/Code/open-edu-pipeline/.env.example`
- Create: `/Users/sarthakpatnaik/Code/open-edu-pipeline/README.md`
- Create: `/Users/sarthakpatnaik/Code/open-edu-pipeline/.github/workflows/ci.yml`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p /Users/sarthakpatnaik/Code/open-edu-pipeline/.github/workflows
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "open-edu-pipeline",
  "version": "0.1.0",
  "private": true,
  "description": "Standalone AI-driven PDF-to-course-spec generation pipeline",
  "engines": {
    "node": ">=18",
    "pnpm": ">=9"
  },
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "lint": "pnpm -r run lint",
    "typecheck": "pnpm -r run typecheck",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md,yml,yaml}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md,yml,yaml}\"",
    "clean": "pnpm -r run clean",
    "curriculum:generate": "pnpm --filter @open-edu/pipeline curriculum:generate"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.56.0",
    "eslint-config-prettier": "^9.1.0",
    "prettier": "^3.2.0",
    "typescript": "^5.3.0",
    "vitest": "^1.2.0"
  }
}
```

- [ ] **Step 3: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - 'packages/*'
```

- [ ] **Step 4: Write `tsconfig.base.json`** — verbatim copy of `/Users/sarthakpatnaik/Code/open-edu/tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "types": ["vitest/globals"]
  }
}
```

- [ ] **Step 5: Write `.eslintrc.json`** — verbatim copy of `/Users/sarthakpatnaik/Code/open-edu/.eslintrc.json`:

```json
{
  "root": true,
  "extends": ["eslint:recommended"],
  "env": {
    "node": true,
    "es2022": true
  },
  "ignorePatterns": ["dist/", "node_modules/", "*.config.*"],
  "overrides": [
    {
      "files": ["*.ts", "*.tsx"],
      "parser": "@typescript-eslint/parser",
      "parserOptions": {
        "ecmaVersion": 2022,
        "sourceType": "module"
      },
      "plugins": ["@typescript-eslint"],
      "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
      "rules": {
        "no-console": "warn",
        "no-debugger": "error",
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": [
          "error",
          { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
        ],
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/consistent-type-imports": ["error", { "prefer": "type-imports" }],
        "@typescript-eslint/no-empty-interface": "warn"
      }
    }
  ]
}
```

- [ ] **Step 6: Write `.prettierrc`** (tailwind plugin dropped — no Tailwind in this project):

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf",
  "bracketSpacing": true
}
```

- [ ] **Step 7: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['packages/*/src/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 8: Write `.gitignore`**

```gitignore
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
output/
*.tsbuildinfo
```

- [ ] **Step 9: Write `.env.example`**

```bash
# LLM provider configuration
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
LLM_MAX_TOKENS=4096
LLM_TEMPERATURE=0.3

# Provider API keys (set at least one)
OPENAI_API_KEY=
OPENROUTER_API_KEY=
ANTHROPIC_API_KEY=

# Per-stage overrides (optional)
# LLM_STAGE_CONCEPT_MAP_MODEL=gpt-4o
# LLM_STAGE_CONCEPT_MAP_PROVIDER=openai

# Logging
# LOG_LEVEL=debug
```

- [ ] **Step 10: Write `README.md`** (replace `<owner>` with the GitHub owner):

````markdown
# open-edu-pipeline

Standalone AI-driven content-to-course-spec generation pipeline, extracted from the
[open-edu](https://github.com/<owner>/open-edu) monorepo.

## Packages

- `packages/pipeline` — `@open-edu/pipeline`: 8-stage PDF → course-spec pipeline + CLI
- `packages/pipeline-llm` — `@open-edu/pipeline-llm`: LLM provider abstraction (vendored and
  renamed from `@open-edu/llm-config`; this copy is free to diverge for pipeline-specific needs)

## Quick start

```bash
pnpm install
pnpm build
pnpm curriculum:generate --pdf ./textbook.pdf --level B --subject math
```
````

Full CLI reference, profiles, scope options, and configuration live in
[`packages/pipeline/README.md`](packages/pipeline/README.md).

## Commands

```bash
pnpm build            # build all packages
pnpm test             # run all tests
pnpm lint             # lint all packages
pnpm typecheck        # type-check all packages
pnpm format:check     # check formatting
pnpm curriculum:generate --pdf <file> [options]   # run the pipeline
```

## Environment

Copy `.env.example` to `.env` and set at least one provider API key
(`OPENAI_API_KEY`, `OPENROUTER_API_KEY`, or `ANTHROPIC_API_KEY`). Non-markdown
extraction (PDF, DOCX, PPTX, images, …) requires the `lit` CLI from
`@llamaindex/liteparse` to be available on `PATH` — markdown extraction is in-process.

````

- [ ] **Step 11: Write `.github/workflows/ci.yml`** (includes `workflow_call` so the open-edu repo can invoke it):

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
  workflow_call:

jobs:
  ci:
    name: Lint, TypeCheck, Test & Build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Enable Corepack
        run: corepack enable

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Lint
        run: pnpm lint

      - name: TypeCheck
        run: pnpm typecheck

      - name: Test
        run: pnpm test

      - name: Format check
        run: pnpm format:check
````

- [ ] **Step 12: Verify the scaffold exists**

```bash
ls -la /Users/sarthakpatnaik/Code/open-edu-pipeline
```

Expected: all files above present.

---

### Task 2: Copy the pipeline and llm-config packages

**Files:**

- Copy: `/Users/sarthakpatnaik/Code/open-edu/packages/pipeline` → `/Users/sarthakpatnaik/Code/open-edu-pipeline/packages/pipeline`
- Copy: `/Users/sarthakpatnaik/Code/open-edu/packages/llm-config` → `/Users/sarthakpatnaik/Code/open-edu-pipeline/packages/pipeline-llm`

- [ ] **Step 1: Copy both packages (source only, excluding build artifacts)**

```bash
mkdir -p /Users/sarthakpatnaik/Code/open-edu-pipeline/packages
cp -R /Users/sarthakpatnaik/Code/open-edu/packages/pipeline /Users/sarthakpatnaik/Code/open-edu-pipeline/packages/pipeline
cp -R /Users/sarthakpatnaik/Code/open-edu/packages/llm-config /Users/sarthakpatnaik/Code/open-edu-pipeline/packages/pipeline-llm
rm -rf /Users/sarthakpatnaik/Code/open-edu-pipeline/packages/pipeline/dist \
       /Users/sarthakpatnaik/Code/open-edu-pipeline/packages/pipeline/node_modules \
       /Users/sarthakpatnaik/Code/open-edu-pipeline/packages/pipeline-llm/dist \
       /Users/sarthakpatnaik/Code/open-edu-pipeline/packages/pipeline-llm/node_modules
```

- [ ] **Step 2: Verify the copy**

```bash
find /Users/sarthakpatnaik/Code/open-edu-pipeline/packages -maxdepth 2 -type f | sort
```

Expected: `pipeline` and `pipeline-llm` package.json/tsconfig.json present; no `dist/` or `node_modules/` inside.

---

### Task 3: Rename the vendored package to `@open-edu/pipeline-llm`

**Files:**

- Modify: `/Users/sarthakpatnaik/Code/open-edu-pipeline/packages/pipeline-llm/package.json`

- [ ] **Step 1: Rewrite `packages/pipeline-llm/package.json`** (name, description; `@types/node` added to devDependencies because the package reads `process.env` and the new repo has no root-level `@types/node` shared via workspace):

```json
{
  "name": "@open-edu/pipeline-llm",
  "version": "0.1.0",
  "private": true,
  "description": "LLM provider abstraction for the Open-Edu pipeline (vendored from @open-edu/llm-config)",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "lint": "eslint 'src/**/*.{ts,tsx}'",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@ai-sdk/google": "^4.0.0",
    "@ai-sdk/openai": "^4.0.0",
    "@openrouter/ai-sdk-provider": "^3.0.0",
    "ai": "^7.0.0",
    "openai": "^4.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "vitest": "^1.0.0"
  }
}
```

- [ ] **Step 2: Verify no internal workspace references remain in the package**

```bash
rg "open-edu/(llm-config|logger|schemas|core)" /Users/sarthakpatnaik/Code/open-edu-pipeline/packages/pipeline-llm/src || echo "clean"
```

Expected: `clean` (llm-config has no internal `@open-edu` imports).

---

### Task 4: Rewire pipeline imports and package.json

**Files:**

- Modify (llm-config → pipeline-llm): `packages/pipeline/src/blueprint/index.ts:1`, `packages/pipeline/src/source/inventory.ts:1`, `packages/pipeline/src/cli/index.ts:7`, `packages/pipeline/src/config/config.ts:1-2`, `packages/pipeline/src/chunk/index.ts:5`, `packages/pipeline/src/evaluation/profile-evaluation.ts:2`, `packages/pipeline/src/graph/index.ts:2-3`, `packages/pipeline/src/generate-concept/index.ts:5`, `packages/pipeline/src/concepts/index.ts:1`, `packages/pipeline/src/generate-activities/index.ts:2`, `packages/pipeline/src/__tests__/math-level-b-lesson1.test.ts:3`, `packages/pipeline/src/config/__tests__/config.test.ts:3`, `packages/pipeline/src/generate-activities/__tests__/widget-schemas.test.ts:3`
- Modify (logger → lib): `packages/pipeline/src/cli/logger.ts:1`, `packages/pipeline/src/extraction/logger.ts:1`
- Modify: `packages/pipeline/package.json`
- Modify: `packages/pipeline/README.md:206-210`

- [ ] **Step 1: Replace all `@open-edu/llm-config` import specifiers**

```bash
cd /Users/sarthakpatnaik/Code/open-edu-pipeline/packages/pipeline
rg -l "@open-edu/llm-config" src -g '*.ts' | xargs perl -pi -e 's/\@open-edu\/llm-config/@open-edu\/pipeline-llm/g'
```

- [ ] **Step 2: Replace both `@open-edu/logger` imports with the local logger**

```bash
cd /Users/sarthakpatnaik/Code/open-edu-pipeline/packages/pipeline
perl -pi -e "s/from '@open-edu\/logger'/from '..\/lib\/logger.js'/g" src/cli/logger.ts src/extraction/logger.ts
```

> The logger module itself does not exist yet — it is created in Task 6 (test-first). This is fine: nothing is built or type-checked until Task 7.

- [ ] **Step 3: Verify no stale imports remain**

```bash
cd /Users/sarthakpatnaik/Code/open-edu-pipeline/packages/pipeline
rg "@open-edu/(logger|llm-config)" src || echo "clean"
```

Expected: `clean`.

- [ ] **Step 4: Update `packages/pipeline/package.json`** — replace the dependency block:

```json
  "dependencies": {
    "@open-edu/pipeline-llm": "workspace:*",
    "@llamaindex/liteparse": "^2.8.0",
    "zod": "^3.22.0",
    "dotenv": "^16.0.0"
  },
```

and add a `bin` entry after the `exports` block:

```json
  "bin": {
    "open-edu-pipeline": "./dist/cli/index.js"
  },
```

> The shebang `#!/usr/bin/env node` is already the first line of `src/cli/index.ts:1` and is preserved by `tsc`.

- [ ] **Step 5: Update `packages/pipeline/README.md` Dependencies section** (lines 206-210). Replace:

```markdown
## Dependencies

- `@open-edu/llm-config` — LLM provider abstraction (OpenAI + OpenRouter)
- `@llamaindex/liteparse` — Document extraction (PDF, DOCX, PPTX, images, Markdown)
- `zod` — Runtime schema validation
```

with:

```markdown
## Dependencies

- `@open-edu/pipeline-llm` — Vendored LLM provider abstraction (OpenAI + OpenRouter), renamed from `@open-edu/llm-config`
- `@llamaindex/liteparse` — Document extraction; provides the `lit` CLI binary used for PDF/DOCX/PPTX/images. Markdown extraction is in-process and needs no binary.
- `zod` — Runtime schema validation
- In-repo `src/lib/logger.ts` — Minimal leveled console logger (replaces `@open-edu/logger`)
```

---

### Task 5: Install dependencies

**Files:** none (verification only)

- [ ] **Step 1: Install**

```bash
cd /Users/sarthakpatnaik/Code/open-edu-pipeline
pnpm install
```

Expected: workspace resolves `@open-edu/pipeline-llm: workspace:*` to `packages/pipeline-llm`; a fresh `pnpm-lock.yaml` is created at the repo root. (`@open-edu/logger` is no longer referenced.)

- [ ] **Step 2: Verify the lockfile and resolution**

```bash
cd /Users/sarthakpatnaik/Code/open-edu-pipeline
rg "pipeline-llm" pnpm-lock.yaml | head
```

Expected: `packages/pipeline-llm` listed as a workspace importer.

---

### Task 6: Add the minimal in-repo logger (TDD)

**Files:**

- Create: `/Users/sarthakpatnaik/Code/open-edu-pipeline/packages/pipeline/src/lib/logger.ts`
- Test: `/Users/sarthakpatnaik/Code/open-edu-pipeline/packages/pipeline/src/lib/__tests__/logger.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { createLogger } from '../logger.js';

describe('createLogger', () => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  afterEach(() => {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
    delete process.env.LOG_LEVEL;
  });

  it('logs info messages with scope prefix', () => {
    const logs: string[] = [];
    console.log = (msg: unknown) => logs.push(String(msg));
    createLogger({ scope: 'pipeline:cli' }).info('hello');
    expect(logs[0]).toContain('INFO');
    expect(logs[0]).toContain('[pipeline:cli]');
    expect(logs[0]).toContain('hello');
  });

  it('logs debug messages', () => {
    const logs: string[] = [];
    console.log = (msg: unknown) => logs.push(String(msg));
    createLogger({ scope: 'pipeline:extraction' }).debug('verbose detail');
    expect(logs[0]).toContain('DEBUG');
  });

  it('does not emit when below the configured min level', () => {
    const logs: string[] = [];
    console.log = (msg: unknown) => logs.push(String(msg));
    const logger = createLogger({ scope: 's', minLevel: 'warn' });
    logger.info('silent');
    expect(logs).toHaveLength(0);
  });

  it('writes errors to console.error', () => {
    const errors: string[] = [];
    console.error = (msg: unknown) => errors.push(String(msg));
    createLogger({ scope: 's' }).error('boom');
    expect(errors[0]).toContain('boom');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails (red)**

Run: `cd /Users/sarthakpatnaik/Code/open-edu-pipeline && pnpm exec vitest run packages/pipeline/src/lib/__tests__/logger.test.ts`
Expected: FAIL — `Cannot find module '../logger.js'` (the module does not exist yet).

- [ ] **Step 3: Implement the minimal logger**

```ts
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void;
}

export function createLogger(options: { scope: string; minLevel?: LogLevel }): ILogger {
  const envLevel =
    typeof process !== 'undefined' ? (process.env.LOG_LEVEL as LogLevel | undefined) : undefined;
  const minLevel =
    options.minLevel ?? (envLevel && LEVEL_RANK[envLevel] !== undefined ? envLevel : 'info');

  const emit = (level: LogLevel, message: string, context?: Record<string, unknown>): void => {
    if (LEVEL_RANK[level] < LEVEL_RANK[minLevel]) return;
    const line = `[${new Date().toISOString()}] ${level.toUpperCase()} [${options.scope}] ${message}`;
    const extra = context && Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
    if (level === 'error') {
      console.error(line + extra);
    } else if (level === 'warn') {
      console.warn(line + extra);
    } else {
      console.log(line + extra);
    }
  };

  return {
    debug(message, context) {
      emit('debug', message, context);
    },
    info(message, context) {
      emit('info', message, context);
    },
    warn(message, context) {
      emit('warn', message, context);
    },
    error(message, error, context) {
      const suffix = error instanceof Error ? ` \u2014 ${error.message}` : '';
      emit('error', message + suffix, context);
    },
  };
}
```

> Behavior note: the open-edu `@open-edu/logger` default sink writes structured JSONL to console; this minimal logger writes plain lines. The CLI's observable output is unchanged because `src/cli/logger.ts` and `src/extraction/logger.ts` also do their own `console.log`/`console.error`. Level filtering (`LOG_LEVEL`) is preserved.

- [ ] **Step 4: Run the test to verify it passes (green)**

Run: `cd /Users/sarthakpatnaik/Code/open-edu-pipeline && pnpm exec vitest run packages/pipeline/src/lib/__tests__/logger.test.ts`
Expected: PASS (4 tests).

---

### Task 7: Build, test, typecheck, lint, format — and initial commit

**Files:** none (verification only; commit at the end)

- [ ] **Step 1: Build all packages**

```bash
cd /Users/sarthakpatnaik/Code/open-edu-pipeline
pnpm build
```

Expected: `packages/pipeline-llm` and `packages/pipeline` both emit `dist/`. The pipeline build copies prompt `.txt` files and prompt `.ts` files into `dist/`.

- [ ] **Step 2: Run the full test suite**

```bash
cd /Users/sarthakpatnaik/Code/open-edu-pipeline
pnpm test
```

Expected: all pipeline-llm tests (router, types, providers, model-factory) and all pipeline tests pass. Notably the golden fixture test:

```bash
pnpm --filter @open-edu/pipeline test:fixture
```

Expected: PASS (`math-level-b-lesson1` acceptance suite, fake LLM router, no network).

- [ ] **Step 3: Type-check, lint, and check formatting**

```bash
cd /Users/sarthakpatnaik/Code/open-edu-pipeline
pnpm typecheck
pnpm lint
pnpm format:check
```

Expected: all pass. If Prettier reports diffs, run `pnpm format` and re-check.

- [ ] **Step 4: Initialize git and create the initial commit**

```bash
cd /Users/sarthakpatnaik/Code/open-edu-pipeline
git init -b main
git add -A
git commit -m "chore: scaffold standalone pipeline repo with vendored pipeline-llm"
```

---

### Task 8: Smoke-test the CLI

**Files:** none (verification only)

- [ ] **Step 1: Verify `--help` works through the bin entry**

```bash
cd /Users/sarthakpatnaik/Code/open-edu-pipeline
node packages/pipeline/dist/cli/index.js --help
```

Expected: prints the help text and exits 0. Help text still shows `pnpm --filter @open-edu/pipeline curriculum:generate …` which is valid inside this repo.

- [ ] **Step 2: Verify the root passthrough script**

```bash
cd /Users/sarthakpatnaik/Code/open-edu-pipeline
pnpm curriculum:generate --help
```

Expected: same help text.

- [ ] **Step 3: Verify the missing-PDF validation path (no LLM/network required)**

```bash
cd /Users/sarthakpatnaik/Code/open-edu-pipeline
pnpm curriculum:generate --pdf ./does-not-exist.pdf
```

Expected: exits non-zero with "Input file not found" and prints help. No API key required.

---

### Task 9: Finalize Phase A docs and commit

**Files:**

- Modify: `/Users/sarthakpatnaik/Code/open-edu-pipeline/packages/pipeline/README.md` (already updated in Task 4; verify)

- [ ] **Step 1: Confirm the pipeline README CLI usage examples are still valid** (`pnpm --filter @open-edu/pipeline curriculum:generate …` works inside this repo). No change needed.

- [ ] **Step 2: Commit any remaining Phase A changes**

```bash
cd /Users/sarthakpatnaik/Code/open-edu-pipeline
git add -A
git commit -m "docs: document standalone pipeline usage and vendored llm dependency" || echo "nothing to commit"
```

- [ ] **Step 3: Verify the git state is clean**

```bash
cd /Users/sarthakpatnaik/Code/open-edu-pipeline
git status
```

Expected: working tree clean, `main` branch with commits.

---

## Phase B — Remove pipeline from the open-edu monorepo

### Task 10: Delete `packages/pipeline` and prune the lockfile

**Files:**

- Delete: `/Users/sarthakpatnaik/Code/open-edu/packages/pipeline/` (entire directory)

- [ ] **Step 1: Remove the package**

```bash
cd /Users/sarthakpatnaik/Code/open-edu
rm -rf packages/pipeline
```

- [ ] **Step 2: Prune the workspace lockfile** (removes pipeline + its unique transitive deps like `@llamaindex/liteparse`, `dotenv` if unused elsewhere)

```bash
cd /Users/sarthakpatnaik/Code/open-edu
pnpm install
```

Expected: lockfile shrinks; `pnpm-workspace.yaml` glob `packages/*` and `vitest.workspace.ts` glob `packages/*` need no edits (glob-based).

- [ ] **Step 3: Verify no remaining code references**

```bash
cd /Users/sarthakpatnaik/Code/open-edu
rg "@open-edu/pipeline" apps examples packages tests --glob '!**/node_modules/**' || echo "no code references"
```

Expected: `no code references` (docs are handled in Task 11).

- [ ] **Step 4: Run the monorepo checks**

```bash
cd /Users/sarthakpatnaik/Code/open-edu
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm check:hygiene
```

Expected: all pass. (Full `pnpm test` is slower but required — it must still pass with the pipeline gone.)

---

### Task 11: Update open-edu docs and references

**Files:**

- Modify: `/Users/sarthakpatnaik/Code/open-edu/README.md` (line 235)
- Modify: `/Users/sarthakpatnaik/Code/open-edu/AGENTS.md` (lines 56-61, 92, 146, 179-185)
- Modify: `/Users/sarthakpatnaik/Code/open-edu/openwiki/operations/testing-and-changes.md` (lines 30-37)
- Modify: `/Users/sarthakpatnaik/Code/open-edu/openwiki/architecture/overview.md` (lines 94-119)
- Modify: `/Users/sarthakpatnaik/Code/open-edu/openwiki/domain/content-and-workflows.md` (lines 142-144, 170-200)
- Modify: `/Users/sarthakpatnaik/Code/open-edu/openwiki/quickstart.md` (line 44)
- Modify: `/Users/sarthakpatnaik/Code/open-edu/apps/docs/docs/pipeline.md` (replace whole file)
- Modify: `/Users/sarthakpatnaik/Code/open-edu/apps/docs/docs/agentic-authoring.md` (lines 144-151)
- Modify: `/Users/sarthakpatnaik/Code/open-edu/docs/pipeline-model-routing-evaluation.md` (lines 80-102)

- [ ] **Step 1: `README.md`** — delete line 235 (the `@open-edu/pipeline` table row):

```
| `@open-edu/pipeline`         | AI-driven content → course spec generation pipeline — 8 stages (extract, source inventory, concept map, lesson blueprints, activity generation, asset plan, validation, output), pluggable extraction via `@llamaindex/liteparse` (PDF, DOCX, PPTX, images, Markdown, ZIP), LLM-driven widget selection, supports `--format md/json/both`                                                                                                                                                                 | Done   |
```

- [ ] **Step 2: `AGENTS.md`** — replace lines 56-61 (six command lines) with a pointer:

```markdown
# The curriculum pipeline lives in the standalone open-edu-pipeline repo:

# cd ../open-edu-pipeline && pnpm curriculum:generate --pdf ./textbook.pdf --level B --subject math
```

Delete the monorepo tree line 92:

```
│   ├── pipeline/            # AI-driven content → course spec pipeline (8-stage, pluggable extraction, profile-aware)
```

Change line 146 from:

```
- `@open-edu/pipeline`, `@open-edu/llm-config`, `@open-edu/i18n`
```

to:

```
- `@open-edu/llm-config`, `@open-edu/i18n`
```

Replace the Epic 31/32 dependency-graph block (lines 179-185):

```
Epic 31 (Pipeline)
  └─► Epics 2, 3, 29, widgets (AI-generated PDF → course-spec via LLM pipeline — 8 stages, 4 profiles)
        └─► @open-edu/llm-config (LLM provider abstraction)
              └─► @open-edu/pipeline (8-stage PDF → course-spec.md)

Epic 32 (LLM Config)
  └─► Epic 31 (LLM provider abstraction — OpenAI + OpenRouter)
```

with:

```
Epic 31 (Pipeline) — moved to the standalone open-edu-pipeline repo
  └─► @open-edu/pipeline-llm (vendored LLM provider abstraction, forked from @open-edu/llm-config)

Epic 32 (LLM Config)
  └─► @open-edu/llm-config (LLM provider abstraction — OpenAI + OpenRouter, used by apps/learner)
```

- [ ] **Step 3: `openwiki/operations/testing-and-changes.md`** — replace lines 30-37 (eight `@open-edu/pipeline` bullets) with:

```markdown
- Curriculum pipeline (`@open-edu/pipeline`) moved to the standalone `open-edu-pipeline` repo — see its `packages/pipeline/README.md` for `curriculum:generate` usage
```

- [ ] **Step 4: `openwiki/architecture/overview.md`** — replace the `### \`@open-edu/pipeline\` and \`@open-edu/llm-config\``section (lines 94-119, ending before`### \`@open-edu/ai-companion\``) with:

```markdown
### `@open-edu/llm-config`

LLM provider abstraction (OpenAI + OpenRouter) with per-stage model routing, environment-variable and CLI overrides, and a **ModelFactory** with two-tier routing (fast/escalation) for AI SDK v4 streaming. Consumed by the learner app's Pipili/LLM proxies.

> The curriculum pipeline (`@open-edu/pipeline`) moved to the standalone [`open-edu-pipeline`](https://github.com/<owner>/open-edu-pipeline) repository, which vendors a renamed copy of this package as `@open-edu/pipeline-llm`.
```

- [ ] **Step 5: `openwiki/domain/content-and-workflows.md`** — update the `### Source materials (PDF pipeline)` section (lines 142-144):

Old:

```markdown
When users supply PDF textbooks, the skill routes through `@open-edu/pipeline` with profile-aware generation (generic/math/science/nios). Pipeline artifacts (source inventory, concept map, blueprint, coverage report) are preserved in output.
```

New:

```markdown
When users supply PDF textbooks, the skill routes through the standalone `open-edu-pipeline` repo with profile-aware generation (generic/math/science/nios). Pipeline artifacts (source inventory, concept map, blueprint, coverage report) are preserved in output.
```

Then replace the `## Pipeline: content-to-course-spec generation` section — the final section of the file, lines 170-200 (heading through the "3. Optionally add validators" line) — with:

```markdown
## Pipeline: content-to-course-spec generation

The curriculum pipeline moved to the standalone [`open-edu-pipeline`](https://github.com/<owner>/open-edu-pipeline) repository. It generates course specifications from educational source files (PDF, DOCX, PPTX, Markdown, Images, ZIP) through an 8-stage AI-driven pipeline with profile-aware generation (generic/math/science/nios). See that repo's `packages/pipeline/README.md` for CLI usage, profiles, scope options, and resume behavior.
```

- [ ] **Step 6: `openwiki/quickstart.md`** — change line 44 from:

```markdown
- `packages/pipeline` and `packages/llm-config` — AI-assisted PDF-to-course-spec pipeline and model-provider abstraction (including ModelFactory for AI SDK v4 streaming).
```

to:

```markdown
- `@open-edu/llm-config` — model-provider abstraction (including ModelFactory for AI SDK v4 streaming). The curriculum pipeline moved to the standalone `open-edu-pipeline` repo.
```

- [ ] **Step 7: `apps/docs/docs/pipeline.md`** — replace the whole file with a redirect:

```markdown
---
sidebar_position: 1
---

# Curriculum Pipeline

The AI-driven PDF-to-course-spec generation pipeline (`@open-edu/pipeline`) moved out of this monorepo into the standalone **open-edu-pipeline** repository.

See the [open-edu-pipeline README](https://github.com/<owner>/open-edu-pipeline/blob/main/packages/pipeline/README.md) for the full CLI reference, curriculum profiles, scope options, and configuration.
```

> Keep the existing front-matter style of this docs site; if `pipeline.md` has no front-matter, match the neighboring files.

- [ ] **Step 8: `apps/docs/docs/agentic-authoring.md`** — update lines 144-151. Replace:

```markdown
When you supply a PDF textbook, the skill integrates with `@open-edu/pipeline`:
```

with:

```markdown
When you supply a PDF textbook, the skill integrates with the standalone `open-edu-pipeline` project:
```

and replace each of the two command lines:

```bash
pnpm --filter @open-edu/pipeline curriculum:generate --pdf ./textbook.pdf --subject math
pnpm --filter @open-edu/pipeline curriculum:generate --pdf ./textbook.pdf --profile science --scope chapter-index:1
```

with:

```bash
pnpm curriculum:generate --pdf ./textbook.pdf --subject math
pnpm curriculum:generate --pdf ./textbook.pdf --profile science --scope chapter-index:1
```

- [ ] **Step 9: `docs/pipeline-model-routing-evaluation.md`** — apply mechanical command rewrites:

```bash
cd /Users/sarthakpatnaik/Code/open-edu
perl -pi -e 's/pnpm --filter \@open-edu\/pipeline build/pnpm build/g' docs/pipeline-model-routing-evaluation.md
perl -pi -e 's/pnpm --filter \@open-edu\/pipeline curriculum:generate/pnpm curriculum:generate/g' docs/pipeline-model-routing-evaluation.md
```

- [ ] **Step 10: Verify no stale doc references remain (excluding archives)**

```bash
cd /Users/sarthakpatnaik/Code/open-edu
rg "open-edu/pipeline" README.md AGENTS.md openwiki apps/docs docs --glob '!**/_archive/**' --glob '!**/superpowers/plans/**' || echo "clean"
```

Expected: `clean`. (`docs/_archive/EPIC_VISUAL_PIPELINE.md` and `docs/superpowers/plans/*` are historical records — left untouched.)

---

### Task 12: (Optional) Wire upstream CI so open-edu llm-config changes check the pipeline repo

**Files:**

- Create: `/Users/sarthakpatnaik/Code/open-edu/.github/workflows/pipeline-upstream.yml`

- [ ] **Step 1: Add a reusable-workflow trigger** (fire the standalone repo's CI whenever `@open-edu/llm-config` changes in the monorepo, since it is the upstream source of the vendored copy):

```yaml
name: Pipeline Upstream CI

on:
  pull_request:
    paths:
      - 'packages/llm-config/**'

jobs:
  pipeline-ci:
    uses: <owner>/open-edu-pipeline/.github/workflows/ci.yml@main
```

> The `on: workflow_call` trigger added to the new repo's `ci.yml` (Task 1) makes this callable. Replace `<owner>` with the GitHub owner of both repos. If the repos are not yet hosted on GitHub, skip this task.

- [ ] **Step 2: Verify the YAML is well-formed** (manual review — no parser dependency):

```bash
cd /Users/sarthakpatnaik/Code/open-edu
cat .github/workflows/pipeline-upstream.yml
```

---

### Task 13: Commit the open-edu changes

**Files:** all changes from Tasks 10-12

- [ ] **Step 1: Review what will be committed**

```bash
cd /Users/sarthakpatnaik/Code/open-edu
git status
git diff --stat
```

- [ ] **Step 2: Commit (two scoped commits)**

```bash
cd /Users/sarthakpatnaik/Code/open-edu
git add -A
git commit -m "refactor(pipeline): remove pipeline package (moved to standalone open-edu-pipeline repo)"
```

If Task 12 was done:

```bash
git add .github/workflows/pipeline-upstream.yml
git commit -m "ci: run standalone pipeline CI on llm-config changes"
```

---

## Phase C — Final validation

### Task 14: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Standalone repo green**

```bash
cd /Users/sarthakpatnaik/Code/open-edu-pipeline
pnpm install --frozen-lockfile && pnpm build && pnpm test && pnpm typecheck && pnpm lint && pnpm format:check
```

- [ ] **Step 2: Monorepo green**

```bash
cd /Users/sarthakpatnaik/Code/open-edu
pnpm install --frozen-lockfile && pnpm build && pnpm typecheck && pnpm lint && pnpm test && pnpm format:check && pnpm check:hygiene
```

- [ ] **Step 3: Confirm `pnpm-lock.yaml` no longer references the pipeline package**

```bash
cd /Users/sarthakpatnaik/Code/open-edu
rg "packages/pipeline|llamaindex/liteparse" pnpm-lock.yaml || echo "pruned"
```

Expected: `pruned` (or at minimum no `packages/pipeline` entry).

- [ ] **Step 4: Summary of outcomes**

- [ ] New repo `/Users/sarthakpatnaik/Code/open-edu-pipeline` builds, tests, lints, type-checks, formats, and runs `curriculum:generate --help`.
- [ ] open-edu monorepo builds/tests without the pipeline; `packages/llm-config` untouched.
- [ ] All live doc references updated; archive docs left as historical records.
- [ ] CLI flags and env vars unchanged (impact limited to import specifiers and invocation path).

---

## Self-Review Notes

- **Spec coverage:** Every locked decision maps to a task: location (T1-2), rename to `@open-edu/pipeline-llm` (T3, T4), remove pipeline but keep llm-config (T10), plain copy + fresh git (T2, T7), logger replacement (T4, T6), CLI/doc impact (T4, T8, T11).
- **Placeholder check:** All new files contain full content; doc edits give exact old/new text. The only intentional placeholders are `<owner>` in GitHub URLs (Task 1 Step 10, Task 11 Steps 4/5/7, Task 12), which must be filled with the actual GitHub owner at execution time.
- **Type consistency:** `createLogger({ scope })` and `ILogger` signatures used in `src/cli/logger.ts`/`src/extraction/logger.ts` match the minimal logger in Task 6 (`.info/.warn/.error/.debug(message, context?)`); the pipeline-llm imports use the same named exports the original package exported (`LlmRouter`, `legacyAdapter`, `LlmStage`, `LlmProvider`, `LLM_STAGES`, `DEFAULT_STAGE_CONFIGS`).
- **Task ordering:** install (T5) precedes the logger TDD (T6) so `pnpm exec vitest` is available; nothing builds or type-checks until the logger exists (T7). Import rewire (T4) happens before install so the workspace dependency graph resolves.
