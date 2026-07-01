---
sidebar_position: 6
---

# Testing & QA

Open-Edu uses **Vitest** for unit/integration tests and **Playwright** for end-to-end browser tests. Coverage thresholds are enforced at 75% statements/functions/lines across every package.

## Running Tests

```bash
# Run all unit tests (every package, every example)
pnpm test

# Run a single package's tests
pnpm --filter @open-edu/core test

# Run tests with coverage
pnpm test:coverage

# Run E2E tests (starts learner app on port 4001)
pnpm test:e2e

# Install Playwright browser (first time)
pnpm test:e2e:install
```

## Test Stack

| Layer            | Tool                           | Environment                                 |
| ---------------- | ------------------------------ | ------------------------------------------- |
| Unit/Integration | Vitest + React Testing Library | `node` or `jsdom`                           |
| Assertions       | `@testing-library/jest-dom`    | Custom matchers (`toBeInTheDocument`, etc.) |
| E2E              | Playwright                     | Chromium headless                           |
| Coverage         | v8 via Vitest                  | Per-package thresholds                      |

## Package-Level Config

Every package has its own `vitest.config.ts`. Two patterns:

**Node packages** (core, schemas, workflow, telemetry, rewards, cli):

```ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      thresholds: { statements: 75, branches: 65, functions: 75, lines: 75 },
    },
  },
});
```

**jsdom packages** (runtime, widgets, accessibility, learner, dev-server):

```ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
    // same coverage thresholds
  },
});
```

The `test-setup.ts` file in each jsdom package imports `@testing-library/jest-dom/vitest`.

## Workspace Structure

```ts
// vitest.workspace.ts
export default defineWorkspace(['packages/*', 'apps/*', 'examples/*']);
```

All packages, apps, and examples are auto-discovered. Each example package includes a `validate.test.ts` that calls `loadPackage()` on itself.

## Unit Test Patterns

### Smoke Tests

Every package has an `index.test.ts` that verifies the version constant and all public exports:

```typescript
import { CORE_VERSION, loadPackage, scanPackages } from './index.js';

it('exports version', () => {
  expect(CORE_VERSION).toBe('0.1.0');
});

it('exports public API', () => {
  expect(loadPackage).toBeDefined();
  expect(scanPackages).toBeDefined();
});
```

### Schema Validation Tests

Schemas are tested with valid and invalid fixtures:

```typescript
import { PackageManifestSchema } from './manifest.js';

it('accepts a valid manifest', () => {
  const result = PackageManifestSchema.safeParse({
    id: 'test',
    title: 'Test',
    version: '0.1.0',
    author: 'Me',
    entry: 'nodes/start.md',
  });
  expect(result.success).toBe(true);
});

it('rejects missing required fields', () => {
  const result = PackageManifestSchema.safeParse({ id: 'test' });
  expect(result.success).toBe(false);
});
```

### React Component Tests

Components are rendered inside their required providers with mock dependencies:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { RuntimeProvider } from '../context/RuntimeContext.js';
import { WidgetRenderer } from './WidgetRenderer.js';

it('renders widget with config', () => {
  render(
    <RuntimeProvider loadedPackage={mockPackage} engine={mockEngine}>
      <WidgetRenderer nodeId="test" widget="open-edu.multiple-choice" config={...} />
    </RuntimeProvider>,
  );
  expect(screen.getByRole('radio')).toBeInTheDocument();
});
```

### Mocking

- `vi.mock()` with `vi.hoisted()` for external module stubs (CLI commands)
- `vi.fn()` for callback spies (`onProgressChange`, `onTelemetryEvent`)
- `vi.useFakeTimers()` for timer-dependent widget behavior

## E2E Tests

E2E tests live in `tests/e2e/` and use Playwright with Chromium (single worker, non-parallel).

### Test Files

| File                          | What it covers                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| `learner-experience.spec.ts`  | Full catalog → course navigation → progress persistence → completion                |
| `package-execution.spec.ts`   | Runs 7 different example packages end-to-end                                        |
| `accessibility.spec.ts`       | Landmark regions, keyboard Tab/Enter navigation, a11y inspector                     |
| `keyboard-navigation.spec.ts` | Tab/Enter/Space/Escape through lessons and quizzes                                  |
| `rewards.spec.ts`             | DevTools rewards inspector panel                                                    |
| `telemetry.spec.ts`           | Telemetry event capture after lesson completion                                     |
| `hot-reload.spec.ts`          | HMR state preservation after markdown/JSON edits                                    |
| `theme-switching.spec.ts`     | Theme switching across all 6 themes, popover behavior, persistence                  |
| `bundle-navigation.spec.ts`   | Bundle catalog cards, bundle overview, module cards, module launch, backward compat |

### Web Server Config

The Playwright config starts the learner app automatically:

```ts
webServer: {
  command: 'pnpm --filter @open-edu/learner dev',
  url: 'http://localhost:4001',
  reuseExistingServer: !process.env.CI,
  timeout: 30000,
},
```

## CI Pipeline

```yaml
# .github/workflows/ci.yml - runs on push/PR to main
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm typecheck
pnpm test              # unit tests
pnpm test:e2e          # E2E tests
```

### Accessibility Theme Audits

Each learner app page is tested with axe-core in all 6 themes to catch theme-specific accessibility regressions:

```typescript
import { render } from '@testing-library/react';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import axe from 'axe-core';

const THEMES = ['forest', 'lumina-scholastica', 'high-focus', 'nocturnal', 'sylvan-workspace', 'zen'];

it.each(THEMES)('passes axe audit in %s theme', async (themeId) => {
  const { container } = render(
    <RuntimeThemeProvider themeId={themeId}>
      <LessonPage pkg={mockPackage} nodeId="..." onNavigate={vi.fn()} />
    </RuntimeThemeProvider>,
  );
  const result = await axe.run(container);
  expect(result.violations).toHaveLength(0);
});
```

This ensures that color contrast, heading hierarchy, landmark structure, and ARIA attributes remain valid regardless of the active theme.

## Writing Tests

Follow these conventions when adding tests:

1. **Test file location** — `src/**/*.test.ts` (or `.test.tsx` for React)
2. **Exports smoke test** — verify the version constant and every public export in `index.test.ts`
3. **Real fixtures** — use `__fixtures__/` directories for static test data; use `mkdtempSync` for temp files
4. **Provider wrapping** — React components that depend on runtime/accessibility context must be rendered inside the corresponding provider
5. **Coverage** — don't let new code drop below the 75/65 threshold
