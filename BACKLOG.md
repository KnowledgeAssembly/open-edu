# Open-Edu Next-Level Backlog

Version: 0.3.0
Status: Draft
Last updated: 2026-06-24

## Purpose

This backlog extends the completed 0.1.0 MVP described in `README.md`, `PLAN.md`, and `docs/ARCHITECTURE.md`. The next level of work should turn Open-Edu from a functioning local runtime into an authorable, extensible, packageable framework that agents and humans can use safely.

The backlog is written for coding agents with limited repo context. Each story includes scope, files to inspect or modify, implementation notes, acceptance criteria, and verification commands.

## Current Baseline

- The core MVP packages exist: `@open-edu/schemas`, `@open-edu/core`, `@open-edu/workflow`, `@open-edu/runtime`, `@open-edu/accessibility`, `@open-edu/telemetry`, `@open-edu/rewards`, `@open-edu/cli`, and `@open-edu/dev-server`.
- Example packages exist under `examples/` and are covered by Vitest validation tests plus Playwright E2E tests.
- `@open-edu/widgets` is currently a placeholder that exports only `WIDGETS_VERSION`.
- Exercise and custom nodes are schema-supported, but `packages/runtime/src/renderers/NodeRenderer.tsx` renders placeholders for both.
- `apps/docs` exists as a package shell but no docs application is implemented.
- CLI commands exist for `validate`, `dev`, `build`, and `package`, but authoring workflows and distributable manifest metadata are still minimal.

## Agent Rules

Every story must follow these rules:

1. Add or update Vitest tests for changed package behavior.
2. Add Playwright tests when learner-visible runtime or dev-server behavior changes.
3. Keep package boundaries clean. Cross-package imports must use package exports, not source-relative paths.
4. Keep schemas as the source of truth for package data shapes.
5. Run the most specific test first, then broaden to `pnpm test`, `pnpm typecheck`, and `pnpm lint` before marking complete.
6. Do not edit generated `dist/` files by hand. Run package builds when generated output is needed.
7. Use conventional commit scopes when committing, such as `feat(widgets): add registry`.

## Epic Summary

| Epic | Name                                   | Priority | Depends On                   | Outcome                                                                                  |
| ---- | -------------------------------------- | -------- | ---------------------------- | ---------------------------------------------------------------------------------------- |
| 13   | Widget SDK and Built-In Widgets        | P0       | MVP runtime and schemas      | Exercise/custom nodes render through a typed widget contract                             |
| 14   | Agentic Package Authoring              | P0       | Schemas, core, CLI           | Agents can scaffold and lint educational packages safely                                 |
| 15   | Package Distribution Hardening         | P0       | CLI, core                    | Build/package output is deterministic, safe, and inspectable                             |
| 16   | Runtime Persistence and Resume         | P1       | Runtime, workflow, telemetry | Learners can resume sessions and preserve progress locally                               |
| 17   | Analytics and Curriculum Observability | P1       | Telemetry                    | JSONL telemetry can be summarized into useful learner/package reports                    |
| 18   | Documentation Site and Examples        | P1       | All MVP packages             | Users get a runnable docs site and richer canonical examples                             |
| 19   | Quality Gates and Release Readiness    | P0       | All packages                 | CI, coverage, accessibility, and release workflows become reliable                       |
| 20   | Skill Graph and Adaptive Routing       | P1       | Workflow, schemas, runtime   | Learners experience mastery-based progression through skill-tracking and dynamic routing |
| 21   | Accessibility Hardening                | P0       | Runtime, dev-server          | Focus management, live regions, and automated audit tooling prevent a11y regressions     |
| 22   | Rewards Evolution                      | P2       | Telemetry, rewards           | Reward rules support conditional logic, verification, and inspector visibility           |
| 23   | Remote Widget Loading                  | P2       | Widgets SDK, runtime         | Widgets can load from remote URLs through module federation without runtime changes      |
| 24   | AI-Native Agent Interfaces             | P0       | CLI, core                    | CLI exposes structured output and deterministic patch contracts for agent consumption    |

---

# Epic 13: Widget SDK and Built-In Widgets

## Goal

Implement the widget architecture described in `docs/ARCHITECTURE.md` so `exercise` and `custom` nodes can render real interactive experiences without changing runtime internals for every new interaction.

## Story 13.1: Define the widget SDK contract

**Scope:** Create stable types and helpers in `@open-edu/widgets` for widget registration, widget props, interaction events, completion callbacks, and validation results.

**Files to inspect:**

- `packages/widgets/src/index.ts`
- `packages/widgets/src/index.test.ts`
- `packages/schemas/src/nodes.ts`
- `packages/runtime/src/renderers/NodeRenderer.tsx`

**Files to modify or create:**

- Modify `packages/widgets/src/index.ts`
- Create `packages/widgets/src/types.ts`
- Create `packages/widgets/src/registry.ts`
- Create `packages/widgets/src/registry.test.ts`
- Update `packages/widgets/src/index.test.ts`

**Implementation notes:**

- Export `WidgetDefinition`, `WidgetRenderProps`, `WidgetRegistry`, `WidgetRegistrationError`, and `createWidgetRegistry`.
- `WidgetDefinition` should include `id`, optional `version`, and `render(props)` returning `ReactNode`.
- `WidgetRenderProps` should include `nodeId`, `config`, `emitInteraction`, and `complete`.
- `WidgetRegistry.register()` should reject duplicate widget IDs.
- `WidgetRegistry.get()` should return `undefined` when a widget is not registered.
- Keep React as a peer dependency in `packages/widgets/package.json` if React types are needed.

**Acceptance criteria:**

- Agents can import widget types from `@open-edu/widgets`.
- Duplicate registrations fail with a typed error.
- Registry lookup is deterministic and side-effect free.
- Tests cover register, duplicate rejection, missing lookup, and index exports.

**Verification:**

- `pnpm --filter @open-edu/widgets test`
- `pnpm --filter @open-edu/widgets typecheck`

## Story 13.2: Add runtime widget rendering

**Scope:** Replace placeholders for `exercise` and `custom` nodes with a widget-aware renderer while preserving accessible fallback behavior.

**Files to inspect:**

- `packages/runtime/src/renderers/NodeRenderer.tsx`
- `packages/runtime/src/renderers/PlaceholderRenderer.tsx`
- `packages/runtime/src/context/RuntimeContext.tsx`
- `packages/runtime/src/renderers/NodeRenderer.test.tsx`

**Files to modify or create:**

- Modify `packages/runtime/src/context/RuntimeContext.tsx`
- Modify `packages/runtime/src/renderers/NodeRenderer.tsx`
- Create `packages/runtime/src/renderers/WidgetRenderer.tsx`
- Create `packages/runtime/src/renderers/WidgetRenderer.test.tsx`
- Update `packages/runtime/src/index.ts`

**Implementation notes:**

- Add an optional `widgetRegistry` prop to `RuntimeProviderProps`:

```typescript
// In RuntimeContext.tsx, add to RuntimeProviderProps:
widgetRegistry?: WidgetRegistry;
```

- Expose `widgetRegistry` through `RuntimeContextValue`:

```typescript
// In RuntimeContext.tsx, add to RuntimeContextValue:
widgetRegistry: WidgetRegistry | undefined;
```

- `WidgetRenderer` should read the node's `widget` field for `custom` nodes and use `"exercise"` as the default widget ID for exercise nodes when `node.widget` is absent.

- `WidgetRenderer.tsx` implementation pattern:

```typescript
import { useRuntimeContext } from "../context/RuntimeContext";
import type { WidgetRegistry } from "@open-edu/widgets";

function resolveWidgetId(node: WorkflowNode): string {
  if (node.type === "custom" && node.widget) return node.widget;
  if (node.type === "exercise") return node.widget ?? "exercise";
  return "exercise"; // fallback
}

export function WidgetRenderer({ node }: { node: WorkflowNode }) {
  const { widgetRegistry, completeNode } = useRuntimeContext();
  const widgetId = resolveWidgetId(node);
  const definition = widgetRegistry?.get(widgetId);

  if (!definition) {
    return (
      <PlaceholderRenderer
        reason={`No widget registered for ID "${widgetId}"`}
        role="status"
      />
    );
  }

  const emitInteraction = (data: Record<string, unknown>) => {
    // In-memory callback: stores locally for Story 13.2;
    // Epic 17 connects this to the telemetry pipeline.
    console.debug("[widget:interaction]", widgetId, data);
  };

  return definition.render({
    nodeId: node.id,
    config: node.config ?? {},
    emitInteraction,
    complete: (score?: number) => completeNode(node.id, score),
  });
}
```

- `NodeRenderer.tsx` change: in the switch/case for `exercise` and `custom` node types, replace the `PlaceholderRenderer` calls with `<WidgetRenderer node={node} />`.
- When no widget is found, render `PlaceholderRenderer` with a clear reason string (include the missing widget ID) and `role="status"` for screen reader visibility.
- `emitInteraction` should initially be an in-memory callback that logs to console. Do NOT wire it to telemetry in this story (that comes in Epic 17).
- `complete` must call `completeNode()` from `RuntimeContext`, which advances the XState workflow. The `score` parameter (0–100) is passed through to the workflow engine's node completion event.

**Edge cases to handle:**

- Widget `render()` throws synchronously — catch with an `ErrorBoundary` around the `<WidgetRenderer>` component, render `<PlaceholderRenderer reason="Widget crashed: ${error.message}" role="alert" />`.
- Widget registry is `undefined` (not provided in `RuntimeProvider` props) — same behavior as missing widget: render placeholder.
- Widget `render()` returns `null` or `undefined` — treat as valid (widget intentionally renders nothing) and do NOT fall back to placeholder.
- Node config is `undefined` in the JSON node file — pass empty object `{}` to `definition.render({ config: {} })`.
- `completeNode()` called multiple times by the same widget before workflow transitions — ignore duplicate calls (the workflow engine should handle this, but test that it doesn't crash the runtime).

**Acceptance criteria:**

- Registered custom widgets render in runtime tests.
- Registered exercise widgets render in runtime tests.
- Missing widgets render an accessible fallback instead of throwing.
- Completing a widget advances the workflow through the existing runtime completion path.

**Verification:**

- `pnpm --filter @open-edu/runtime test -- NodeRenderer WidgetRenderer`
- `pnpm --filter @open-edu/runtime typecheck`

## Story 13.3: Ship a built-in multiple-choice practice widget

**Scope:** Add one built-in widget that proves the SDK can support interactive exercises beyond the dedicated quiz renderer.

**Files to inspect:**

- `packages/widgets/src/index.ts`
- `packages/runtime/src/renderers/QuizRenderer.tsx`
- `packages/runtime/src/renderers/QuizRenderer.test.tsx`

**Files to modify or create:**

- Create `packages/widgets/src/builtins/multipleChoicePractice.tsx`
- Create `packages/widgets/src/builtins/multipleChoicePractice.test.tsx`
- Create `packages/widgets/src/builtins/index.ts`
- Update `packages/widgets/src/index.ts`

**Implementation notes:**

- Widget ID: `open-edu.multiple-choice-practice`.
- Config shape should be validated locally with Zod: `prompt`, `options`, and optional `explanation`.
- Use accessible radio inputs or buttons with keyboard support.
- On submit, call `complete(score)` where score is `100` for correct and `0` for incorrect.
- Emit a `widget.interaction` event for selection and submit through the provided `emitInteraction` prop.

**Acceptance criteria:**

- Widget renders prompt and options.
- Selecting and submitting correct answer completes with score `100`.
- Selecting and submitting incorrect answer completes with score `0`.
- Invalid config renders an accessible error message instead of throwing.

**Verification:**

- `pnpm --filter @open-edu/widgets test`
- `pnpm --filter @open-edu/widgets typecheck`

## Story 13.4: Add widget example package and E2E coverage

**Scope:** Add a canonical example package that exercises widget rendering through the dev server.

**Files to inspect:**

- `examples/hello-world/`
- `examples/fractions/`
- `tests/e2e/package-execution.spec.ts`
- `tests/e2e/helpers.ts`

**Files to modify or create:**

- Create `examples/widget-practice/package.json`
- Create `examples/widget-practice/workflow.json`
- Create `examples/widget-practice/nodes/intro.md`
- Create `examples/widget-practice/nodes/practice.json`
- Create `examples/widget-practice/validate.test.ts`
- Update `README.md` examples table
- Update `tests/e2e/package-execution.spec.ts`

**Implementation notes:**

- The package should start with `nodes/intro.md`, then navigate to `nodes/practice.json`, then complete.
- `practice.json` should use `type: "exercise"` and `widget: "open-edu.multiple-choice-practice"`.
- Register built-in widgets in the dev-server runtime mounting path.

**Acceptance criteria:**

- Example package validates with `@open-edu/core`.
- Dev server renders the widget without placeholder text.
- E2E test selects an answer, submits, and reaches completion.

**Verification:**

- `pnpm exec vitest run examples/widget-practice/validate.test.ts`
- `pnpm test:e2e`

## Story 13.5: Add NPM widget packaging template and tooling

**Scope:** Create a standard template, build config, and CLI command so community developers can author, test, and publish widgets as standalone NPM packages that integrate with the runtime via the SDK contract.

**Files to inspect:**

- `packages/widgets/src/types.ts`
- `packages/widgets/src/registry.ts`
- `packages/widgets/src/index.ts`
- `packages/widgets/package.json`
- `packages/cli/src/cli.ts`
- `packages/cli/src/commands/create.ts`

**Files to modify or create:**

- Create `packages/widgets/templates/widget-scaffold/package.json`
- Create `packages/widgets/templates/widget-scaffold/tsconfig.json`
- Create `packages/widgets/templates/widget-scaffold/src/index.tsx`
- Create `packages/widgets/templates/widget-scaffold/src/index.test.tsx`
- Create `packages/widgets/templates/widget-scaffold/vitest.config.ts`
- Create `packages/widgets/src/cli-utils.ts` (functions: `scaffoldWidgetDir`, `validateWidgetPackage`)
- Create `packages/widgets/src/cli-utils.test.ts`
- Modify `packages/widgets/src/index.ts`
- Modify `packages/widgets/package.json` to add `scaffold-widget` bin or export the `edu widget create` command registration
- Create `packages/cli/src/commands/widget-create.ts`
- Create `packages/cli/src/commands/widget-create.test.ts`
- Modify `packages/cli/src/cli.ts`

**Implementation notes:**

The scaffold template must produce a self-contained widget package with the following structure:

```
my-widget/
├── package.json          # name, version, peerDependencies on react + @open-edu/widgets
├── tsconfig.json
├── src/
│   ├── index.tsx         # default export: WidgetDefinition
│   └── index.test.tsx
└── vitest.config.ts
```

Template `src/index.tsx` skeleton:

```typescript
import type { WidgetDefinition } from '@open-edu/widgets';

const myWidget: WidgetDefinition = {
  id: 'my-widget-id',
  version: '0.1.0',
  render(props) {
    // props: { nodeId, config, emitInteraction, complete }
    const { config, complete } = props;
    return null; // replace with implementation
  },
};

export default myWidget;
```

CLI command: `edu widget create <dir> --id <widget-id> --title <title>`

- Writes the scaffold to `<dir>`, refusing if the directory is non-empty (unless `--force`).
- Generates a valid `package.json` with `@open-edu/widgets` as a peer dependency, `react` as a peer dependency (version `^18.0.0`), and a `"main": "./src/index.tsx"` entry.
- The `WidgetDefinition` type import must use the package export path, not a source-relative import.
- Generated test file should import the widget and verify: (a) `id` is a non-empty string, (b) `render` is a function, (c) calling `render()` with mock props does not throw.
- `edu widget create` internally calls `validateWidgetPackage()` from `@open-edu/widgets` to confirm the scaffold passes structural checks.

`validateWidgetPackage(dir)` utility in `@open-edu/widgets`:

```typescript
export function validateWidgetPackage(dir: string): {
  valid: boolean;
  errors: Array<{ file: string; message: string }>;
  widgetDef?: { id: string; version?: string };
};
```

- Checks `package.json` exists and has required `peerDependencies`.
- Dynamically imports `<dir>/src/index.tsx` and checks the default export conforms to `WidgetDefinition` shape at runtime.
- Returns `widgetDef.id` so registries or authors can verify the widget identity.

**Edge cases to handle:**

- Directory with spaces, Unicode characters, or special path segments in the name.
- `--id` containing characters invalid for NPM package names (test with dots, slashes, spaces).
- Existing `node_modules` or lockfiles in the target directory (warn but proceed with `--force`).
- Widget template already has a vitest config; ensure `pnpm --filter` or direct `vitest` commands work.
- `@open-edu/widgets` not being a published package on NPM during local development; the import must resolve via workspace protocol in the monorepo.

**Acceptance criteria:**

- `edu widget create <dir>` produces a compilable, testable widget package.
- Generated widget can be imported by the runtime after `register()` is called with the widget definition.
- Validation rejects widgets with missing `id`, non-function `render`, or missing peer dependencies.
- Tests cover scaffold creation, validation pass/fail, and `--force` behavior.
- Generated test file passes `vitest run` without modification.

**Verification:**

- `pnpm --filter @open-edu/widgets test -- cli-utils`
- `pnpm --filter @open-edu/cli test -- widget-create`
- `pnpm --filter @open-edu/widgets typecheck`

---

# Epic 14: Agentic Package Authoring

## Goal

Make Open-Edu easy for AI agents to generate by adding package scaffolding, authoring checks, and schema-backed repair guidance.

## Story 14.1: Add `edu create` package scaffold command

**Scope:** Add a CLI command that creates a minimal valid package with manifest, workflow, first lesson, and validation test.

**Files to inspect:**

- `packages/cli/src/cli.ts`
- `packages/cli/src/commands/validate.ts`
- `packages/cli/src/utils/format.ts`
- `examples/hello-world/`

**Files to modify or create:**

- Modify `packages/cli/src/cli.ts`
- Create `packages/cli/src/commands/create.ts`
- Create `packages/cli/src/commands/create.test.ts`
- Update `packages/cli/src/index.test.ts` if command exports change

**Implementation notes:**

- Command signature: `edu create <package-dir> --id <id> --title <title> --author <author>`.
- Default version should be `0.1.0`.
- Write `package.json`, `workflow.json`, `nodes/intro.md`, and `validate.test.ts`.
- Refuse to write into a non-empty directory unless `--force` is passed.
- Generated package must pass `loadPackage()`.

**Acceptance criteria:**

- Command creates a valid package in an empty target directory.
- Missing required flags returns exit code `1` and a clear message.
- Existing non-empty directory is protected by default.
- `--force` overwrites only files generated by the command and does not delete unrelated files.

**Verification:**

- `pnpm --filter @open-edu/cli test -- create`
- `pnpm --filter @open-edu/cli typecheck`

## Story 14.2: Add schema-aware authoring diagnostics

**Scope:** Improve validation output so agents get actionable file paths, JSON paths, and examples for common package mistakes.

**Files to inspect:**

- `packages/core/src/errors.ts`
- `packages/core/src/loader.ts`
- `packages/cli/src/commands/validate.ts`
- `packages/cli/src/utils/format.ts`
- `packages/schemas/src/*.ts`

**Files to modify or create:**

- Modify `packages/core/src/errors.ts`
- Modify `packages/cli/src/utils/format.ts`
- Add or update tests in `packages/core/src/errors.test.ts`
- Add or update tests in `packages/cli/src/commands/validate.test.ts`

**Implementation notes:**

- Preserve current machine-readable error objects.
- Add formatted output sections: `File`, `Path`, `Problem`, and `Suggested fix`.
- For missing manifest fields, show a complete minimal field example.
- For workflow routes to missing nodes, show the missing route target.
- For invalid quiz options, show the option index and field.

**Acceptance criteria:**

- `edu validate` output gives enough detail for an agent to fix errors without inspecting stack traces.
- Existing validation failures still return exit code `1`.
- Tests cover at least three distinct error categories.

**Verification:**

- `pnpm --filter @open-edu/core test -- errors loader`
- `pnpm --filter @open-edu/cli test -- validate format`

## Story 14.3: Add `edu lint-content` command

**Scope:** Add non-schema quality checks for educational content that schema validation cannot catch.

**Files to inspect:**

- `packages/core/src/loader.ts`
- `packages/core/src/nodes.ts`
- `packages/cli/src/commands/validate.ts`
- `examples/autism-reading/`

**Files to modify or create:**

- Create `packages/core/src/content-lint.ts`
- Create `packages/core/src/content-lint.test.ts`
- Modify `packages/core/src/index.ts`
- Create `packages/cli/src/commands/lint-content.ts`
- Create `packages/cli/src/commands/lint-content.test.ts`
- Modify `packages/cli/src/cli.ts`

**Implementation notes:**

- Checks should be deterministic and local-only.
- Start with these warnings: empty heading structure in Markdown, quiz with all answers correct, quiz with no explanation-like feedback field if supported later, reflection prompt shorter than 20 characters, workflow node unreachable from entry.
- Return warnings separately from errors.
- CLI should support `--max-warnings <number>` and fail when warnings exceed it.

**Acceptance criteria:**

- Valid examples can run with zero blocking errors.
- A fixture with unreachable workflow nodes reports the unreachable node ID.
- `--max-warnings 0` fails when warnings exist.
- Output remains agent-readable.

**Verification:**

- `pnpm --filter @open-edu/core test -- content-lint`
- `pnpm --filter @open-edu/cli test -- lint-content`

---

# Epic 15: Package Distribution Hardening

## Goal

Make package build and archive workflows deterministic, safe, and inspectable enough for local use and future registries.

## Story 15.1: Replace shell-based archive creation

**Scope:** Remove string-built `tar` execution from `edu package` and use a safe Node implementation.

**Files to inspect:**

- `packages/cli/src/commands/package.ts`
- `packages/cli/src/commands/package.test.ts`
- `packages/cli/package.json`

**Files to modify or create:**

- Modify `packages/cli/src/commands/package.ts`
- Modify `packages/cli/src/commands/package.test.ts`
- Update `packages/cli/package.json` if adding a tar library dependency

**Implementation notes:**

- Avoid `execSync()` with string interpolation.
- Prefer a maintained tar package or a safe archive writer that accepts argument arrays or structured options.
- Preserve archive naming: `<id>-<version>.tar.gz`.
- Continue excluding `dist`, `node_modules`, and `.git`.

**Acceptance criteria:**

- Package directories with spaces in their path archive successfully.
- Malicious-looking package IDs cannot inject shell commands.
- Archive contains expected files and excludes blocked directories.
- Tests do not depend on system `tar` availability.

**Verification:**

- `pnpm --filter @open-edu/cli test -- package`
- `pnpm --filter @open-edu/cli typecheck`

## Story 15.2: Emit build manifest metadata

**Scope:** Add a generated `open-edu-build.json` file to build output and archives.

**Files to inspect:**

- `packages/cli/src/commands/build.ts`
- `packages/cli/src/commands/package.ts`
- `packages/core/src/types.ts`

**Files to modify or create:**

- Create `packages/cli/src/utils/build-manifest.ts`
- Create `packages/cli/src/utils/build-manifest.test.ts`
- Modify `packages/cli/src/commands/build.ts`
- Modify `packages/cli/src/commands/package.ts`

**Implementation notes:**

- Manifest fields: `packageId`, `packageVersion`, `builtAt`, `openEduVersion`, `files`, and `entry`.
- `files` should be sorted relative paths copied into the output.
- Use ISO 8601 timestamps.
- Do not include absolute local filesystem paths.

**Acceptance criteria:**

- `edu build` writes `open-edu-build.json`.
- `edu package` includes the build manifest in the archive.
- Manifest is deterministic except for `builtAt`.
- Tests verify path sorting and absence of absolute paths.

**Verification:**

- `pnpm --filter @open-edu/cli test -- build build-manifest package`

## Story 15.3: Add package integrity checks

**Scope:** Compute and verify file hashes for package builds.

**Files to inspect:**

- `packages/cli/src/utils/build-manifest.ts`
- `packages/core/src/assets.ts`
- `packages/core/src/loader.ts`

**Files to modify or create:**

- Modify `packages/cli/src/utils/build-manifest.ts`
- Create `packages/core/src/integrity.ts`
- Create `packages/core/src/integrity.test.ts`
- Modify `packages/core/src/index.ts`
- Modify `packages/cli/src/commands/validate.ts`

**Implementation notes:**

- Use SHA-256 hashes.
- Add optional validation when `open-edu-build.json` exists.
- `edu validate --verify-integrity <package-dir>` should fail if a listed file hash differs.
- Ignore telemetry files and local `.edu/` state.

**Acceptance criteria:**

- Build manifest includes hashes for copied package files.
- Integrity verification passes for unchanged builds.
- Integrity verification fails with a clear message after file tampering.

**Verification:**

- `pnpm --filter @open-edu/core test -- integrity`
- `pnpm --filter @open-edu/cli test -- validate build-manifest`

---

# Epic 16: Runtime Persistence and Resume

## Goal

Allow learners to resume local sessions without weakening the stateless runtime architecture.

## Story 16.1: Define runtime progress snapshot schema

**Scope:** Add schema and types for serializing learner progress.

**Files to inspect:**

- `packages/schemas/src/telemetry.ts`
- `packages/schemas/src/workflow.ts`
- `packages/runtime/src/context/RuntimeContext.tsx`

**Files to modify or create:**

- Create `packages/schemas/src/progress.ts`
- Create `packages/schemas/src/progress.test.ts`
- Modify `packages/schemas/src/index.ts`

**Implementation notes:**

- Snapshot fields: `packageId`, `packageVersion`, `currentNodeId`, `visitedNodes`, `scores`, `isCompleted`, `updatedAt`.
- Validate that `visitedNodes` are non-empty strings.
- Keep the schema independent from browser storage or Node filesystem concerns.

**Acceptance criteria:**

- Progress schema exports TypeScript types derived from Zod.
- Invalid snapshots fail with useful Zod issues.
- JSON Schema export includes the progress schema.

**Verification:**

- `pnpm --filter @open-edu/schemas test -- progress json-schema`

## Story 16.2: Add runtime snapshot read/write API

**Scope:** Allow runtime consumers to receive progress updates and provide an initial snapshot.

**Files to inspect:**

- `packages/runtime/src/context/RuntimeContext.tsx`
- `packages/workflow/src/engine.ts`
- `packages/workflow/src/engine.test.ts`

**Files to modify or create:**

- Modify `packages/runtime/src/context/RuntimeContext.tsx`
- Create `packages/runtime/src/context/progress.ts`
- Create `packages/runtime/src/context/progress.test.ts`
- Update runtime context tests

**Implementation notes:**

- In `packages/runtime/src/context/progress.ts`, export a helper to build a snapshot from the current workflow state:

```typescript
import type { ProgressSnapshot } from '@open-edu/schemas';
import type { WorkflowSnapshot } from '@open-edu/workflow';

export function buildProgressSnapshot(
  packageId: string,
  packageVersion: string,
  workflowSnapshot: WorkflowSnapshot,
): ProgressSnapshot {
  return {
    packageId,
    packageVersion,
    currentNodeId: workflowSnapshot.currentNodeId,
    visitedNodes: workflowSnapshot.visitedNodes,
    scores: workflowSnapshot.scores ?? {},
    isCompleted: workflowSnapshot.isCompleted,
    updatedAt: new Date().toISOString(),
  };
}

export function isValidSnapshot(snapshot: ProgressSnapshot, validNodeIds: Set<string>): boolean {
  if (snapshot.isCompleted) return true; // always allow completed state
  return validNodeIds.has(snapshot.currentNodeId);
}
```

- Add optional `initialProgress` and `onProgressChange` props to `RuntimeProviderProps`:

```typescript
initialProgress?: ProgressSnapshot;
onProgressChange?: (snapshot: ProgressSnapshot) => void;
```

- Inside `RuntimeProvider`, subscribe to the workflow actor's state changes via the XState `actor.subscribe()` or `actor.onTransition()` listener. On each transition, call `buildProgressSnapshot()` from `packageId`, `packageVersion`, and the workflow's current snapshot. Pass the result through `onProgressChange`.

- Important: `onProgressChange` must only fire when the snapshot actually changes (deep-compare the `currentNodeId` and `scores`). Do NOT emit on every XState internal transition (guard evaluation, no-op transitions).

- If `initialProgress` is provided:
  - If `initialProgress.isCompleted` is `true`, render the runtime's "completed" state immediately (no node rendering, just the completion screen if one exists).
  - If `initialProgress.currentNodeId` is not in the package's node set (invalid due to package changes), log a warning via `console.warn` and start from the package `entry` node.
  - If `initialProgress.currentNodeId` is valid, restore the workflow to that node. This requires the workflow engine to support an `initialNode` parameter or a `restore()` transition (check `packages/workflow/src/engine.ts` for the current interface; if `initialNode` is not supported, add it to the workflow engine's `createWorkflow()` options in this story).

- Expose `ProgressSnapshot` type through `RuntimeContextValue` so consumers don't need to import from `@open-edu/schemas` directly.

- Test edge cases:
  - `onProgressChange` fires once per node transition, not on every render.
  - Duplicate `initialProgress.currentNodeId === entry` is treated as normal (start from entry).
  - `initialProgress` with `visitedNodes: []` and `currentNodeId: ""` is treated as invalid → starts from entry.
  - Rapid node transitions (e.g., auto-advance) produce the correct sequence of snapshots.

**Acceptance criteria:**

- Runtime emits snapshots when entering and completing nodes.
- Runtime can initialize with a previous current node.
- Invalid snapshots are ignored safely with no crash.

**Verification:**

- `pnpm --filter @open-edu/runtime test -- RuntimeContext progress`

## Story 16.3: Persist dev-server progress in local storage

**Scope:** Use the runtime snapshot API in the dev server to resume learner state per package.

**Files to inspect:**

- `apps/dev-server/src/DevApp.tsx`
- `apps/dev-server/src/DevApp.test.tsx`
- `packages/runtime/src/context/RuntimeContext.tsx`

**Files to modify or create:**

- Create `apps/dev-server/src/progressStorage.ts`
- Create `apps/dev-server/src/progressStorage.test.ts`
- Modify `apps/dev-server/src/DevApp.tsx`
- Update `apps/dev-server/src/DevApp.test.tsx`

**Implementation notes:**

- Use localStorage key `open-edu:progress:<packageId>:<packageVersion>`.
- Add a small reset progress button in the inspector area.
- Do not persist if localStorage is unavailable.

**Acceptance criteria:**

- Reloading the dev server resumes current node.
- Reset progress clears storage and starts from the package entry.
- Tests cover storage unavailable behavior.

**Verification:**

- `pnpm --filter @open-edu/dev-server test -- progress DevApp`
- `pnpm test:e2e`

---

# Epic 17: Analytics and Curriculum Observability

## Goal

Turn telemetry JSONL into useful local summaries for package authors and curriculum reviewers.

## Story 17.1: Add telemetry JSONL reader and summary functions

**Scope:** Add read-side utilities for telemetry files without changing the append-only writer.

**Files to inspect:**

- `packages/telemetry/src/persister.ts`
- `packages/telemetry/src/types.ts`
- `packages/schemas/src/telemetry.ts`

**Files to modify or create:**

- Create `packages/telemetry/src/reader.ts`
- Create `packages/telemetry/src/reader.test.ts`
- Create `packages/telemetry/src/summary.ts`
- Create `packages/telemetry/src/summary.test.ts`
- Modify `packages/telemetry/src/index.ts`

**Implementation notes:**

- Reader should skip blank lines.
- Reader should return typed parse errors with line numbers for invalid JSON.
- Summary should calculate events by type, node opens, node completions, quiz score average, and session count.

**Acceptance criteria:**

- Valid JSONL files parse into telemetry events.
- Invalid JSONL reports line number and reason.
- Summary works with empty files and multi-session files.

**Verification:**

- `pnpm --filter @open-edu/telemetry test -- reader summary`

## Story 17.2: Add `edu report` command

**Scope:** Add CLI reporting for local telemetry files.

**Files to inspect:**

- `packages/cli/src/cli.ts`
- `packages/cli/src/utils/format.ts`
- `packages/telemetry/src/summary.ts`

**Files to modify or create:**

- Create `packages/cli/src/commands/report.ts`
- Create `packages/cli/src/commands/report.test.ts`
- Modify `packages/cli/src/cli.ts`

**Implementation notes:**

- Command signature: `edu report <telemetry-jsonl>`.
- Support `--json` for machine-readable output.
- Text output should include total events, sessions, node completions, and average quiz score when present.

**Acceptance criteria:**

- Text report is readable in terminal.
- JSON report is valid JSON with stable keys.
- Invalid telemetry files return exit code `1` with line diagnostics.

**Verification:**

- `pnpm --filter @open-edu/cli test -- report`

## Story 17.3: Add telemetry inspector summary panel

**Scope:** Improve the dev-server inspector so authors can see summary metrics, not only raw events.

**Files to inspect:**

- `apps/dev-server/src/inspectors/TelemetryInspector.tsx`
- `apps/dev-server/src/inspectors/TelemetryInspector.test.tsx`
- `apps/dev-server/src/inspectors/InspectorPanel.tsx`

**Files to modify or create:**

- Modify `apps/dev-server/src/inspectors/TelemetryInspector.tsx`
- Modify `apps/dev-server/src/inspectors/TelemetryInspector.test.tsx`

**Implementation notes:**

- Reuse telemetry summary functions from `@open-edu/telemetry`.
- Display event count, completed nodes, current session ID if available, and average quiz score.
- Preserve raw event list.

**Acceptance criteria:**

- Inspector shows summary metrics for emitted events.
- Empty event list renders zero-state metrics.
- Tests cover summary and raw event rendering.

**Verification:**

- `pnpm --filter @open-edu/dev-server test -- TelemetryInspector`

---

# Epic 18: Documentation Site and Examples

## Goal

Make the framework easier to learn by creating runnable docs and examples that match current behavior.

## Story 18.1: Implement Docusaurus docs app

**Scope:** Turn `apps/docs` from a package shell into a working documentation site.

**Files to inspect:**

- `apps/docs/package.json`
- `apps/docs/tsconfig.json`
- `docs/VISION.md`
- `docs/ARCHITECTURE.md`
- `docs/FRAMEWORK_SPEC.md`

**Files to modify or create:**

- Modify `apps/docs/package.json`
- Create `apps/docs/docusaurus.config.ts`
- Create `apps/docs/sidebars.ts`
- Create `apps/docs/src/css/custom.css`
- Create `apps/docs/docs/intro.md`
- Create `apps/docs/docs/architecture.md`
- Create `apps/docs/docs/package-format.md`

**Implementation notes:**

- Use Docusaurus 3.x as listed in `PLAN.md`.
- Import or copy concise versions of existing docs; do not make docs depend on files outside `apps/docs/docs`.
- Add scripts: `dev`, `build`, `typecheck`.

**Acceptance criteria:**

- `pnpm --filter @open-edu/docs build` succeeds.
- Docs navigation includes intro, architecture, package format, CLI, widgets, and examples sections.
- Styling uses Open-Edu terminology and avoids marketing-only content.

**Verification:**

- `pnpm --filter @open-edu/docs build`
- `pnpm --filter @open-edu/docs typecheck`

## Story 18.2: Add package authoring guide

**Scope:** Write a practical guide for humans and agents creating packages.

**Files to inspect:**

- `README.md`
- `docs/FRAMEWORK_SPEC.md`
- `examples/*`

**Files to modify or create:**

- Create `docs/PACKAGE_AUTHORING.md`
- Add link from `README.md`
- Add corresponding docs page under `apps/docs/docs/package-authoring.md` if Story 18.1 is complete

**Implementation notes:**

- Include minimal package structure, manifest fields, workflow examples, node type examples, validation commands, and common mistakes.
- Include one section titled `Instructions for AI Agents` with deterministic generation rules.

**Acceptance criteria:**

- A reader can create a minimal valid package from the guide alone.
- All examples in the guide match current schemas.
- Links from README are relative and valid.

**Verification:**

- `pnpm format:check`
- `pnpm exec vitest run examples/hello-world/validate.test.ts`

## Story 18.3: Add advanced adaptive learning example

**Scope:** Add a richer example that combines branching, remediation, reflection, telemetry, and optional rewards.

**Files to inspect:**

- `examples/fractions/`
- `examples/autism-reading/`
- `packages/rewards/src/types.ts`
- `packages/schemas/src/rewards.ts`

**Files to modify or create:**

- Create `examples/adaptive-study/package.json`
- Create `examples/adaptive-study/workflow.json`
- Create `examples/adaptive-study/rewards.json`
- Create `examples/adaptive-study/nodes/intro.md`
- Create `examples/adaptive-study/nodes/checkpoint.json`
- Create `examples/adaptive-study/nodes/remediation.md`
- Create `examples/adaptive-study/nodes/reflection.json`
- Create `examples/adaptive-study/validate.test.ts`
- Update `README.md` examples table
- Update `tests/e2e/package-execution.spec.ts`

**Implementation notes:**

- Use score-based branching after `checkpoint.json`.
- Reward should use badge action only; do not require webhook or scripts.
- Keep content short and deterministic.

**Acceptance criteria:**

- Example validates.
- E2E covers both pass and remediation paths.
- README explains what behavior the example demonstrates.

**Verification:**

- `pnpm exec vitest run examples/adaptive-study/validate.test.ts`
- `pnpm test:e2e`

---

# Epic 19: Quality Gates and Release Readiness

## Goal

Make the repo safer for repeated agent work, pull requests, and package releases.

## Story 19.1: Add CI workflow for core checks

**Scope:** Ensure every PR runs install, build, lint, typecheck, unit tests, and Playwright tests.

**Files to inspect:**

- `package.json`
- `pnpm-workspace.yaml`
- `vitest.workspace.ts`

**Files to modify or create:**

- Create `.github/workflows/ci.yml`

**Implementation notes:**

- Use Node 20.
- Use pnpm 9 through Corepack.
- Cache pnpm store.
- Run `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e:install`, and `pnpm test:e2e`.

**Acceptance criteria:**

- CI workflow is valid YAML.
- Workflow commands match root scripts.
- Playwright browser install is explicit.

**Verification:**

- `pnpm format:check`

## Story 19.2: Add coverage thresholds for critical packages

**Scope:** Add coverage reporting and minimum thresholds for schema, core, workflow, runtime, and CLI behavior.

**Files to inspect:**

- `vitest.workspace.ts`
- `packages/*/vitest.config.ts`
- `package.json`

**Files to modify or create:**

- Modify `package.json`
- Modify package Vitest configs as needed

**Implementation notes:**

- Add root script `test:coverage`.
- Start thresholds conservatively: statements 75, branches 65, functions 75, lines 75.
- Exclude `dist`, fixtures, and test setup files.

**Acceptance criteria:**

- `pnpm test:coverage` runs across the workspace.
- Coverage excludes generated files.
- Threshold failures are clear.

**Verification:**

- `pnpm test:coverage`

## Story 19.3: Add repository hygiene checks

**Scope:** Prevent generated output and accidental large files from becoming hidden maintenance costs.

**Files to inspect:**

- `.gitignore`
- `package.json`
- Current committed `dist/` directories

**Files to modify or create:**

- Modify `.gitignore`
- Create `scripts/check-repo-hygiene.mjs`
- Add root script `check:hygiene` in `package.json`

**Implementation notes:**

- Check for generated `dist/` files under packages unless the project intentionally keeps them committed.
- Check for files larger than 2 MB outside `examples/assets` or documented asset folders.
- Check for `.DS_Store`, log files, and local telemetry `.edu/` directories.
- Print exact offending paths.

**Acceptance criteria:**

- Hygiene command exits `0` on clean repo.
- Test fixture or script mode demonstrates failure output for blocked files.
- README or `AGENTS.md` notes whether `dist/` is committed or ignored.

**Verification:**

- `pnpm check:hygiene`
- `pnpm format:check`

## Story 19.4: Add release checklist and changeset guidance

**Scope:** Document how maintainers cut releases from the monorepo.

**Files to inspect:**

- `package.json`
- `.changeset/` if present
- `README.md`

**Files to modify or create:**

- Create `docs/RELEASE.md`
- Add link from `README.md`

**Implementation notes:**

- Cover changesets, versioning, build verification, test verification, package publish dry run, and rollback notes.
- Include command snippets that use current root scripts.

**Acceptance criteria:**

- Release process is understandable without prior maintainer context.
- Commands match current package manager and workspace scripts.
- No publishing token or secret values are documented.

**Verification:**

- `pnpm format:check`

---

# Epic 20: Skill Graph and Adaptive Routing

## Goal

Add skill-tracking and mastery-based progression to the framework so learning pathways can adapt to learner performance beyond simple pass/fail branching.

## Story 20.1: Define skill graph schema

**Scope:** Add Zod schemas and TypeScript types for skills, skill dependencies, and mastery thresholds in `@open-edu/schemas`.

**Files to inspect:**

- `packages/schemas/src/workflow.ts`
- `packages/schemas/src/index.ts`
- `packages/schemas/src/json-schema.test.ts`

**Files to modify or create:**

- Create `packages/schemas/src/skills.ts`
- Create `packages/schemas/src/skills.test.ts`
- Modify `packages/schemas/src/index.ts`

**Implementation notes:**

- Define `SkillDefinition` with fields: `id`, `name`, optional `description`, optional `dependencies` (array of skill IDs), optional `maxScore` (default 100).
- Define `MasteryThreshold` as `z.enum(["not_attempted", "in_progress", "achieved", "mastered"])` or a numeric 0–100 scale with labels.
- Define `SkillAssessment` linking a node ID to a skill ID and `weight` (0–1 contribution).
- Define `SkillGraph` as a collection of skills and their assessments.
- Add optional `skills` field to `PackageManifestSchema` (array of `SkillDefinition`).
- Add optional `assessments` field to exercise/custom node schemas.

**Acceptance criteria:**

- Skill schemas export derived TypeScript types.
- Circular skill dependencies are rejected by validation.
- Skill definitions with missing dependency IDs are rejected.
- JSON Schema export includes the skill schemas.

**Verification:**

- `pnpm --filter @open-edu/schemas test -- skills json-schema`
- `pnpm --filter @open-edu/schemas typecheck`

## Story 20.2: Implement skill-tracking in workflow engine

**Scope:** Extend the XState workflow engine to track skill scores and emit skill-related events without changing the existing machine public API.

**Files to inspect:**

- `packages/workflow/src/engine.ts`
- `packages/workflow/src/engine.test.ts`
- `packages/workflow/src/types.ts`
- `packages/schemas/src/workflow.ts`

**Files to modify or create:**

- Modify `packages/workflow/src/engine.ts`
- Modify `packages/workflow/src/types.ts`
- Create `packages/workflow/src/skills.ts`
- Create `packages/workflow/src/skills.test.ts`
- Modify `packages/workflow/src/index.ts`

**Implementation notes:**

- Add optional `skillGraph` parameter to workflow creation. When absent, skill-tracking is a no-op.

- In `packages/workflow/src/skills.ts`, implement a pure score accumulator:

```typescript
import type { SkillGraph, SkillDefinition, MasteryLevel } from "@open-edu/schemas";

export interface SkillState {
  scores: Record<string, number>;        // skillId → accumulated weighted score
  achieved: Set<string>;                  // skillIds that crossed their threshold
  maxScores: Record<string, number>;      // skillId → maxScore
}

export function createSkillState(graph: SkillGraph): SkillState {
  const scores: Record<string, number> = {};
  const maxScores: Record<string, number> = {};
  for (const skill of graph.skills) {
    scores[skill.id] = 0;
    maxScores[skill.id] = skill.maxScore ?? 100;
  }
  return { scores, achieved: new Set(), maxScores };
}

export function applyAssessment(
  state: SkillState,
  skillId: string,
  score: number,      // 0–100 from node completion
  weight: number      // 0–1 from assessment config
): { newState: SkillState; events: Array<{ type: "SKILL_UPDATED" | "SKILL_ACHIEVED"; skillId: string; accumulatedScore: number; maxScore: number; masteryLevel: MasteryLevel }> } {
  if (!(skillId in state.scores)) return { newState: state, events: [] };

  const current = state.scores[skillId];
  const maxScore = state.maxScores[skillId];
  const increment = (score / 100) * weight * maxScore;
  const newAccumulated = Math.min(current + increment, maxScore);

  const newScores = { ...state.scores, [skillId]: newAccumulated };
  const events: Array<...> = [];

  // Determine mastery level
  const ratio = newAccumulated / maxScore;
  let masteryLevel: MasteryLevel;
  if (ratio >= 0.9) masteryLevel = "mastered";
  else if (ratio >= 0.7) masteryLevel = "achieved";
  else if (ratio > 0) masteryLevel = "in_progress";
  else masteryLevel = "not_attempted";

  events.push({ type: "SKILL_UPDATED", skillId, accumulatedScore: newAccumulated, maxScore, masteryLevel });

  const wasAchieved = state.achieved.has(skillId);
  const isNowAchieved = masteryLevel === "achieved" || masteryLevel === "mastered";
  if (!wasAchieved && isNowAchieved) {
    const newAchieved = new Set(state.achieved);
    newAchieved.add(skillId);
    events.push({ type: "SKILL_ACHIEVED", skillId, accumulatedScore: newAccumulated, maxScore, masteryLevel });
    return { newState: { ...state, scores: newScores, achieved: newAchieved }, events };
  }

  return { newState: { ...state, scores: newScores }, events };
}
```

- In `packages/workflow/src/engine.ts`, extend the workflow machine:
  - Add `skillState` to the XState `context` (initialized from `skillGraph` if provided, otherwise `undefined`).
  - In the `COMPLETE_NODE` event handler, after computing the score, look up the completed node in `skillGraph.assessments`. For each assessment matching this node, call `applyAssessment()`.
  - Emit returned skill events as XState events so subscribers (runtime, telemetry) can listen.
  - Add `skillGraph` to the machine's input type alongside existing options — do NOT change the machine's existing event names or transition logic.

- Maintain a `skillScores: Record<string, number>` accumulator in the workflow context, updated when nodes with `assessments` are completed with a score.
- Weight each node's score by its assessment `weight`, accumulate toward the skill's `maxScore`.
- Emit `SKILL_UPDATED` event with `skillId`, `accumulatedScore`, `maxScore`, and `masteryLevel`.
- Emit `SKILL_ACHIEVED` when a skill crosses its "achieved" or "mastered" threshold for the first time. Use a `Set<string>` to track which skills have already fired `SKILL_ACHIEVED` so it only fires once per skill per session.
- Preserve all existing event types — skill events are additive (new `type` values, no changes to existing transitions).

**Edge cases to handle:**

- Node completes with `score: undefined` — treat as score 0.
- Assessment references a `skillId` that does not exist in `skillGraph.skills` — skip silently, do not crash.
- Multiple assessments for the same skill on the same node — apply each in order, accumulate correctly.
- Skill with `maxScore: 0` or negative — treat as 0 (skill is disabled), skip score accumulation.
- `SkillGraph` is provided but has zero skills — skill state exists but all lookups return "not_attempted".

**Acceptance criteria:**

- Workflow without skill graph runs identically to before.
- Workflow with skill graph emits `SKILL_UPDATED` events on node completion.
- Skill score accumulates correctly across multiple assessments for the same skill.
- `SKILL_ACHIEVED` fires once per skill crossing threshold.

**Verification:**

- `pnpm --filter @open-edu/workflow test -- engine skills`
- `pnpm --filter @open-edu/workflow typecheck`

## Story 20.3: Add mastery-based routing in runtime

**Scope:** Surface skill state through runtime context and allow workflow transitions based on skill mastery levels.

**Files to inspect:**

- `packages/runtime/src/context/RuntimeContext.tsx`
- `packages/runtime/src/renderers/NodeRenderer.tsx`
- `packages/runtime/src/index.ts`
- `packages/workflow/src/engine.ts`

**Files to modify or create:**

- Modify `packages/runtime/src/context/RuntimeContext.tsx`
- Create `packages/runtime/src/context/skills.ts`
- Create `packages/runtime/src/context/skills.test.ts`
- Modify `packages/runtime/src/index.ts`
- Update `packages/workflow/src/types.ts` for mastery-based guard conditions

**Implementation notes:**

- Expose `skillScores` and `getSkillMastery(skillId)` from `RuntimeContextValue`.
- When a workflow defines a guard condition referencing a skill mastery level (e.g., `skill:math.basic >= achieved`), the runtime should pass current skill scores to the workflow engine for evaluation.
- Add a `SkillSummary` component (small, non-intrusive) for dev-server inspector use.
- Keep skill data out of learner progress snapshots initially (defer to a future persistence story).

**Acceptance criteria:**

- Runtime context exposes current skill scores without breaking existing consumers.
- Workflow routes with skill-based guards evaluate correctly.
- SkillSummary renders in the inspector when skill data is present.

**Verification:**

- `pnpm --filter @open-edu/runtime test -- RuntimeContext skills`
- `pnpm --filter @open-edu/runtime typecheck`

## Story 20.4: Add skill-graph example package

**Scope:** Create an example that demonstrates mastery-based progression through skill-tracking, branching, and remediation.

**Files to inspect:**

- `examples/adaptive-study/`
- `packages/schemas/src/skills.ts`
- `tests/e2e/package-execution.spec.ts`

**Files to modify or create:**

- Create `examples/skill-graph/package.json`
- Create `examples/skill-graph/workflow.json`
- Create `examples/skill-graph/nodes/intro.md`
- Create `examples/skill-graph/nodes/quiz-basics.json`
- Create `examples/skill-graph/nodes/quiz-advanced.json`
- Create `examples/skill-graph/nodes/remediation.md`
- Create `examples/skill-graph/nodes/mastery-complete.md`
- Create `examples/skill-graph/validate.test.ts`
- Update `README.md` examples table
- Update `tests/e2e/package-execution.spec.ts`

**Implementation notes:**

- Define two skills: `algebra.basics` and `algebra.advanced`, where `algebra.advanced` depends on `algebra.basics`.
- `quiz-basics.json` assesses `algebra.basics` with weight 1.0.
- `quiz-advanced.json` assesses `algebra.advanced` with weight 1.0.
- Workflow branches: pass `quiz-basics` → `quiz-advanced`; fail → `remediation` → loop back to `quiz-basics`.
- Passing `quiz-advanced` → `mastery-complete`.

**Acceptance criteria:**

- Example validates with `@open-edu/core`.
- E2E covers pass path and remediation path.
- Telemetry output includes `SKILL_UPDATED` and `SKILL_ACHIEVED` events.

**Verification:**

- `pnpm exec vitest run examples/skill-graph/validate.test.ts`
- `pnpm test:e2e`

---

# Epic 21: Accessibility Hardening

## Goal

Move from baseline axe-core compliance to proactive accessibility guarantees: focus-trap boundaries, live-region announcements, audit tooling, and keyboard-navigation regression coverage.

## Story 21.1: Add focus-trap boundaries for modal-like nodes

**Scope:** Ensure that when a node renders content that captures focus (e.g., quizzes, custom widgets), keyboard users cannot tab out of the active region, and focus is restored on unmount.

**Files to inspect:**

- `packages/runtime/src/renderers/NodeRenderer.tsx`
- `packages/runtime/src/renderers/QuizRenderer.tsx`
- `packages/accessibility/src/focus.ts`
- `packages/accessibility/src/index.ts`

**Files to modify or create:**

- Create `packages/accessibility/src/focus-trap.ts`
- Create `packages/accessibility/src/focus-trap.test.tsx`
- Create `packages/accessibility/src/focus-trap.test.tsx` with Playwright-like Vitest tests
- Modify `packages/accessibility/src/index.ts`
- Modify `packages/runtime/src/renderers/QuizRenderer.tsx` to use focus trap
- Update `packages/runtime/src/renderers/NodeRenderer.tsx` to apply focus trap to widget-rendered nodes

**Implementation notes:**

- Implement a `FocusTrap` React component that uses `tabindex="-1"` management on sibling elements.
- Trap should handle `Tab` and `Shift+Tab` within the trap boundary.
- When no focusable element exists inside the trap (error/loading state), focus the trap container itself.
- Restore focus to the element that had focus before the trap mounted on unmount.
- Keep the trap implementation independent of any specific widget or renderer.

**Acceptance criteria:**

- Focus cycles within the trap boundary and cannot escape via Tab.
- Focus is restored to the trigger element when the trap unmounts.
- Works with zero focusable children (graceful fallback).
- Tests cover keyboard navigation inside and outside the trap.

**Verification:**

- `pnpm --filter @open-edu/accessibility test -- focus-trap`
- `pnpm --filter @open-edu/accessibility typecheck`

## Story 21.2: Add live-region announcements for workflow transitions

**Scope:** Ensure screen readers announce node transitions, completion events, and feedback messages through ARIA live regions.

**Files to inspect:**

- `packages/runtime/src/context/RuntimeContext.tsx`
- `packages/runtime/src/renderers/NodeRenderer.tsx`
- `packages/accessibility/src/index.ts`
- `packages/accessibility/src/aria.ts`

**Files to modify or create:**

- Create `packages/accessibility/src/live-region.tsx`
- Create `packages/accessibility/src/live-region.test.tsx`
- Modify `packages/accessibility/src/index.ts`
- Modify `packages/runtime/src/components/App.tsx` (or equivalent root layout) to include `LiveRegion`
- Modify `packages/runtime/src/renderers/NodeRenderer.tsx` to trigger announcements on node transitions

**Implementation notes:**

- Implement a `LiveRegion` component that renders a visually hidden `aria-live="polite"` region.
- Expose an `announce(message, priority?)` function through accessibility context.
- Priority `"assertive"` is reserved for error and alert messages.
- Default priority is `"polite"` for routine transitions (e.g., "Starting lesson 2", "Quiz complete, moving to next section").
- Allow content authors to provide custom `aria-label` or `aria-describedby` in node metadata.

**Acceptance criteria:**

- Node transitions trigger polite announcements.
- Quiz feedback triggers assertive announcements.
- Live region is present in the DOM but visually hidden.
- Announcements are queued and not interrupted by rapid transitions.

**Verification:**

- `pnpm --filter @open-edu/accessibility test -- live-region`
- `pnpm --filter @open-edu/accessibility typecheck`

## Story 21.3: Add dev-server accessibility audit panel

**Scope:** Add a dedicated inspector panel that runs axe-core checks on the current node and reports violations with element selectors, impact level, and remediation guidance.

**Files to inspect:**

- `apps/dev-server/src/inspectors/InspectorPanel.tsx`
- `apps/dev-server/src/DevApp.tsx`
- `apps/dev-server/package.json`

**Files to modify or create:**

- Create `apps/dev-server/src/inspectors/AccessibilityInspector.tsx`
- Create `apps/dev-server/src/inspectors/AccessibilityInspector.test.tsx`
- Modify `apps/dev-server/src/inspectors/InspectorPanel.tsx` to add A11y tab
- Modify `apps/dev-server/src/DevApp.tsx` if axe-core initialization is needed at the app level

**Implementation notes:**

- Import `axe-core` directly (already in dependency tree per `AGENTS.md`).
- Run `axe.run()` on the current node container element after render.
- Display violation count, impact (critical, serious, moderate, minor), and description.
- Group violations by impact level.
- Show a passing state when no violations are found.
- Do not block rendering — violations are advisory in the inspector.
- Optionally offer a "Re-check" button for manual re-audit.

**Acceptance criteria:**

- Inspector panel shows axe-core results for the visible node.
- Passing nodes show a green success message.
- Violations display impact, description, and element selector.
- Re-check button re-runs the audit.

**Verification:**

- `pnpm --filter @open-edu/dev-server test -- AccessibilityInspector`
- `pnpm --filter @open-edu/dev-server typecheck`

## Story 21.4: Add keyboard-navigation E2E smoke tests

**Scope:** Add Playwright tests that verify all major package examples can be navigated end-to-end using only the keyboard.

**Files to inspect:**

- `tests/e2e/package-execution.spec.ts`
- `tests/e2e/helpers.ts`
- `examples/hello-world/`
- `examples/fractions/`

**Files to modify or create:**

- Create `tests/e2e/keyboard-navigation.spec.ts`
- Modify `tests/e2e/helpers.ts` if new helpers are needed

**Implementation notes:**

- For each example package (hello-world, fractions, autism-reading, widget-practice), verify:
  - Tab navigates through interactive elements in logical order.
  - Enter/Space activates buttons and quiz options.
  - Focus is managed correctly on node transitions (focus moves to new content heading).
  - Escape does not trap the user (no focus lock without focus-trap context).
- Use Playwright's `page.keyboard` API.
- Use `checkA11y` from `@playwright-testing-library` or Playwright's built-in `axe` integration if available.

**Acceptance criteria:**

- All example packages pass keyboard-only navigation.
- Focus lands on the first focusable element after node transition.
- Quiz options are reachable and selectable via keyboard.
- Test failures print the exact step and element that failed.

**Verification:**

- `pnpm test:e2e -- keyboard-navigation`

## Story 21.5: Verify hot reload preserves node, progress, and telemetry session

**Scope:** Add Playwright tests that verify the dev-server hot-reload guarantees described in `docs/ARCHITECTURE.md`.

**Files to inspect:**

- `apps/dev-server/src/DevApp.tsx`
- `apps/dev-server/vite.config.ts`
- `tests/e2e/helpers.ts`

**Files to modify or create:**

- Create `tests/e2e/hot-reload.spec.ts`
- Modify `tests/e2e/helpers.ts` if needed for file-write utilities

**Implementation notes:**

- Start dev server with an example package.
- Navigate to a non-entry node and complete a quiz.
- Use Node.js `fs` to touch or modify a content file in the package without changing its meaning (e.g., add a trailing newline to a markdown file).
- Verify the current node is preserved after HMR triggers a re-render.
- Verify telemetry events from before the edit are still present.
- Verify the workflow state (visited nodes, scores) is preserved.
- Test with both Markdown and JSON file changes.

**Acceptance criteria:**

- Reloading content preserves current node and progress.
- Telemetry session survives content edits.
- Workflow state is not reset on HMR.
- Tests cover both Markdown and JSON file edits.

**Verification:**

- `pnpm test:e2e -- hot-reload`

---

# Epic 22: Rewards Evolution

## Goal

Move the reward broker from a simple event-emitter to a configurable rule engine with conditional logic, verifiable delivery, and runtime visibility.

## Story 22.1: Add reward event verification and replay

**Scope:** Add verification utilities that confirm reward actions were dispatched correctly, and support replaying reward events from telemetry.

**Files to inspect:**

- `packages/rewards/src/broker.ts`
- `packages/rewards/src/broker.test.ts`
- `packages/rewards/src/types.ts`
- `packages/telemetry/src/types.ts`

**Files to modify or create:**

- Create `packages/rewards/src/verification.ts`
- Create `packages/rewards/src/verification.test.ts`
- Modify `packages/rewards/src/index.ts`
- Modify `packages/rewards/src/broker.ts` to emit verified delivery receipts

**Implementation notes:**

- Add `RewardReceipt` type with fields: `actionId`, `actionType`, `dispatchedAt`, `status` (delivered, failed, skipped), and optional `error`.
- The broker should return a `RewardReceipt` for each dispatched action instead of void.
- Add `verifyReceipt(receipt, telemetryEvents)` that confirms a receipt matches a telemetry reward event.
- Add `replayRewards(packageDir, telemetryFile)` that re-dispatches reward actions from a telemetry file, skipping already-delivered actions by deduplicating on `actionId`.

**Acceptance criteria:**

- Broker returns typed receipts instead of void.
- Verification confirms dispatch matches telemetry.
- Replay skips already-delivered actions.
- Tests cover success, failure, and skip cases.

**Verification:**

- `pnpm --filter @open-edu/rewards test -- verification broker`
- `pnpm --filter @open-edu/rewards typecheck`

## Story 22.2: Add conditional reward rules

**Scope:** Allow reward configurations to specify conditions such as score thresholds, completion chains, or skill mastery levels.

**Files to inspect:**

- `packages/schemas/src/rewards.ts`
- `packages/rewards/src/broker.ts`
- `packages/rewards/src/types.ts`
- `packages/workflow/src/engine.ts`

**Files to modify or create:**

- Modify `packages/schemas/src/rewards.ts`
- Create `packages/rewards/src/conditions.ts`
- Create `packages/rewards/src/conditions.test.ts`
- Modify `packages/rewards/src/broker.ts`
- Modify `packages/rewards/src/index.ts`

**Implementation notes:**

- Add a `Condition` discriminated union to the rewards schema:
  - `{ type: "score", nodeId: string, minScore: number }`
  - `{ type: "skill", skillId: string, minLevel: "achieved" | "mastered" }`
  - `{ type: "chain", completedNodeIds: string[] }` — all must be completed
  - `{ type: "and", conditions: Condition[] }` and `{ type: "or", conditions: Condition[] }`
- Broker evaluates conditions before dispatching reward actions.
- Conditions reference workflow state via a `ContextSnapshot` object passed by the runtime.
- If no conditions are specified, the reward fires unconditionally (backward-compatible).

**Acceptance criteria:**

- Reward with `score` condition fires only when the learner meets the threshold.
- Reward with `skill` condition fires only at the required mastery level.
- `and`/`or` combinators evaluate correctly.
- Rewards without conditions fire as before (no breaking change).
- Invalid conditions are rejected by schema validation.

**Verification:**

- `pnpm --filter @open-edu/rewards test -- conditions broker`
- `pnpm --filter @open-edu/schemas test -- rewards`

## Story 22.3: Add reward summary to telemetry inspector

**Scope:** Show reward receipts and pending reward conditions in the dev-server inspector.

**Files to inspect:**

- `apps/dev-server/src/inspectors/TelemetryInspector.tsx`
- `apps/dev-server/src/inspectors/InspectorPanel.tsx`
- `packages/rewards/src/types.ts`

**Files to modify or create:**

- Create `apps/dev-server/src/inspectors/RewardsInspector.tsx`
- Create `apps/dev-server/src/inspectors/RewardsInspector.test.tsx`
- Modify `apps/dev-server/src/inspectors/InspectorPanel.tsx` to add Rewards tab
- Modify `apps/dev-server/src/inspectors/TelemetryInspector.tsx` to link reward events

**Implementation notes:**

- Display list of dispatched rewards with status, timestamp, and condition that triggered them.
- Show pending rewards (conditions defined in `rewards.json` but not yet met).
- Allow re-sending a failed reward action from the inspector.
- If no reward configuration exists in the loaded package, show a zero-state message.

**Acceptance criteria:**

- Inspector shows dispatched and pending rewards.
- Re-send button dispatches a single reward action and updates status.
- Zero-state renders when no rewards are configured.
- Tests cover all display states.

**Verification:**

- `pnpm --filter @open-edu/dev-server test -- RewardsInspector`
- `pnpm --filter @open-edu/dev-server typecheck`

---

# Epic 23: Remote Widget Loading

## Goal

Enable runtime widget loading from remote URLs through module federation, allowing widgets to be distributed independently of the runtime without sacrificing the typed widget contract.

## Story 23.1: Define remote widget manifest schema

**Scope:** Add Zod schemas for remote widget manifests, including URL resolution, versioning, integrity hashes, and fallback behavior.

**Files to inspect:**

- `packages/schemas/src/index.ts`
- `packages/schemas/src/nodes.ts`
- `packages/widgets/src/types.ts`

**Files to modify or create:**

- Create `packages/schemas/src/widget-manifest.ts`
- Create `packages/schemas/src/widget-manifest.test.ts`
- Modify `packages/schemas/src/index.ts`
- Modify `packages/widgets/src/types.ts` to add remote widget descriptor

**Implementation notes:**

- `RemoteWidgetManifest` schema fields: `id`, `version`, `url` (resolved widget entry point), `integrity` (optional SHA-256 hash of the widget bundle), `apiVersion` (expected widget SDK version), `fallback` (optional local widget ID to use if remote loading fails), and `permissions` (array of required capabilities like `network`, `storage`, `fullscreen`).
- `WidgetRegistry.registerRemote(manifest, loader)` should accept a manifest and an async loader function.
- Validate that `url` is a valid HTTPS URL. Reject `file://` and `http://` in production mode.
- Keep schemas independent of any specific module-federation implementation.

**Acceptance criteria:**

- Remote widget manifests validate correctly.
- Invalid URLs, missing fields, and API version mismatches are rejected.
- JSON Schema export includes widget-manifest schemas.
- Schema validation does not perform network requests.

**Verification:**

- `pnpm --filter @open-edu/schemas test -- widget-manifest`
- `pnpm --filter @open-edu/schemas typecheck`

## Story 23.2: Implement module-federation widget loader

**Scope:** Add a runtime widget loader that fetches remote widget bundles and integrates them with the existing widget registry.

**Files to inspect:**

- `packages/widgets/src/registry.ts`
- `packages/widgets/src/types.ts`
- `packages/widgets/src/index.ts`
- `packages/runtime/src/renderers/WidgetRenderer.tsx`

**Files to modify or create:**

- Create `packages/widgets/src/remote-loader.ts`
- Create `packages/widgets/src/remote-loader.test.ts`
- Modify `packages/widgets/src/registry.ts` to support remote registration
- Modify `packages/widgets/src/index.ts`
- Modify `packages/runtime/src/renderers/WidgetRenderer.tsx` to handle remote loading states

**Implementation notes:**

- `RemoteWidgetLoader` class in `packages/widgets/src/remote-loader.ts`:

```typescript
import type { RemoteWidgetManifest } from '@open-edu/schemas';
import type { WidgetDefinition, WidgetRegistry } from './types';

type RemoteLoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; definition: WidgetDefinition }
  | { status: 'error'; message: string }
  | { status: 'fallback'; fallbackId: string; reason: string };

export class RemoteWidgetLoader {
  private cache = new Map<string, RemoteLoadState>();

  async load(manifest: RemoteWidgetManifest, registry: WidgetRegistry): Promise<RemoteLoadState> {
    const cacheKey = `${manifest.id}@${manifest.version}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Set loading state
    this.cache.set(cacheKey, { status: 'loading' });

    try {
      // Fetch the bundle
      const response = await fetch(manifest.url);
      if (!response.ok) {
        return this.setAndReturn(cacheKey, {
          status: 'error',
          message: `HTTP ${response.status}: ${response.statusText}`,
        });
      }

      const bundleText = await response.text();

      // Integrity check (SHA-256)
      if (manifest.integrity) {
        const hash = await sha256(bundleText);
        if (hash !== manifest.integrity) {
          return this.setAndReturn(cacheKey, {
            status: 'error',
            message: `Integrity mismatch: expected ${manifest.integrity}, got ${hash}`,
          });
        }
      }

      // Evaluate in sandboxed scope: use a Blob URL to create an isolated module scope
      // rather than eval(), which shares the global scope.
      const blob = new Blob([bundleText], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      const module = await import(/* @vite-ignore */ blobUrl);
      URL.revokeObjectURL(blobUrl);

      const definition = module.default as WidgetDefinition;
      if (
        !definition ||
        typeof definition.id !== 'string' ||
        typeof definition.render !== 'function'
      ) {
        return this.setAndReturn(cacheKey, {
          status: 'error',
          message: 'Bundle did not export a valid WidgetDefinition as default',
        });
      }

      // Register with the local registry
      registry.register(definition);

      return this.setAndReturn(cacheKey, { status: 'loaded', definition });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown loading error';

      // Attempt fallback
      if (manifest.fallback) {
        const fallbackDef = registry.get(manifest.fallback);
        if (fallbackDef) {
          return this.setAndReturn(cacheKey, {
            status: 'fallback',
            fallbackId: manifest.fallback,
            reason: message,
          });
        }
      }

      return this.setAndReturn(cacheKey, { status: 'error', message });
    }
  }

  private setAndReturn(key: string, state: RemoteLoadState): RemoteLoadState {
    this.cache.set(key, state);
    return state;
  }
}
```

- SHA-256 helper: use the Web Crypto API (`crypto.subtle.digest("SHA-256", ...)`) or a lightweight hasher. Do NOT add a dependency on `node:crypto` (must work in browser). Transform ArrayBuffer to hex string for comparison.

- Security constraints (enforce in production, warn in dev):
  - Reject `file://` and `http://` URLs in `RemoteWidgetLoader.load()`. Throw `SecurityError` with a clear message.
  - Log `console.warn` in development mode for `http://` but still reject.
  - Permissions field in manifest: if `manifest.permissions` includes entries not in an allowlist (initially: `"network"` only), reject with `"Unsupported permissions: ..."`.
  - Sandboxed evaluation: the Blob URL `import()` approach creates a separate module scope that does NOT share closures with the runtime. This is the recommended pattern over `new Function()` or `eval()`.

- `useRemoteWidget(manifest)` React hook:

```typescript
import { useState, useEffect, useRef } from 'react';
import { useRuntimeContext } from '../../runtime/src/context/RuntimeContext';

export function useRemoteWidget(manifest: RemoteWidgetManifest): RemoteLoadState {
  const { widgetRegistry } = useRuntimeContext();
  const loaderRef = useRef(new RemoteWidgetLoader());
  const [state, setState] = useState<RemoteLoadState>({ status: 'idle' });

  useEffect(() => {
    if (!widgetRegistry) return;
    let cancelled = false;
    setState({ status: 'loading' });
    loaderRef.current.load(manifest, widgetRegistry).then((result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, [manifest.id, manifest.version, manifest.url]);

  return state;
}
```

- `WidgetRenderer.tsx` change: before attempting local registry lookup, check if the node has a `remoteWidget` field. If yes, call `useRemoteWidget(manifest)` and render a loading spinner/skeleton during `"loading"` status, an error message for `"error"`, and the widget for `"loaded"` or `"fallback"`.

- Cache: per-session `Map<string, RemoteLoadState>` prevents re-fetching the same `id@version`. Clear cache when `unmount()` is called on the widget renderer.

- Tests (`remote-loader.test.ts`): all tests MUST use `vi.mock("node:fetch")` or a custom `fetch` mock. Never make real network calls. Test scenarios:
  - Successful fetch + valid definition → status "loaded", registry.get() returns definition.
  - HTTP 404 → status "error" with message including "404".
  - Integrity mismatch → status "error", widget NOT registered.
  - Successful fetch but default export is missing `render` → status "error", widget NOT registered.
  - `fallback` specified and fallback widget exists in registry → status "fallback", fallback widget used.
  - `fallback` specified but fallback widget missing from registry → status "error".
  - `file://` URL → throws `SecurityError` before fetch.
  - Duplicate `id@version` load → second call returns cached result without a second fetch.
  - Network error (simulated via `fetch` rejection) → status "error".

**Acceptance criteria:**

- Remote widget bundles are fetched and registered.
- Integrity hash mismatches prevent execution.
- Loading failures gracefully fall back to the specified local widget.
- Cache prevents duplicate network requests within a session.
- Tests use a mock fetch to avoid real network calls.

**Verification:**

- `pnpm --filter @open-edu/widgets test -- remote-loader registry`
- `pnpm --filter @open-edu/widgets typecheck`

## Story 23.3: Add remote widget example and E2E coverage

**Scope:** Create a minimal remote widget example and verify it renders correctly through the dev server.

**Files to inspect:**

- `examples/widget-practice/`
- `tests/e2e/package-execution.spec.ts`
- `packages/widgets/src/remote-loader.ts`

**Files to modify or create:**

- Create `examples/remote-widget-demo/remote-widget.js` (a self-contained widget bundle)
- Create `examples/remote-widget-demo/package.json`
- Create `examples/remote-widget-demo/workflow.json`
- Create `examples/remote-widget-demo/nodes/intro.md`
- Create `examples/remote-widget-demo/nodes/remote-practice.json`
- Create `examples/remote-widget-demo/validate.test.ts`
- Update `apps/dev-server/src/DevApp.tsx` to serve the remote widget bundle as a static asset
- Update `README.md` examples table
- Update `tests/e2e/package-execution.spec.ts`

**Implementation notes:**

- The remote widget bundle (`remote-widget.js`) should be a simple IIFE that registers itself with a global `__OPEN_EDU_WIDGETS__` array or uses the registry API.
- The dev server should serve `examples/remote-widget-demo/remote-widget.js` as a static file.
- `remote-practice.json` uses `type: "custom"` and a `remoteWidget` manifest field pointing to the served URL.
- E2E test verifies the remote widget renders and completes.

**Acceptance criteria:**

- Remote widget loads from the dev-server-served URL.
- Widget renders interactive content (not placeholder).
- Widget completion advances the workflow.
- Integrity check passes for the served bundle.

**Verification:**

- `pnpm exec vitest run examples/remote-widget-demo/validate.test.ts`
- `pnpm test:e2e`

---

# Epic 24: AI-Native Agent Interfaces

## Goal

Expose structured contracts and deterministic code paths so AI agents can reliably inspect, generate, and modify educational packages without parsing human-targeted output.

## Story 24.1: Add structured JSON output mode for all CLI commands

**Scope:** Add `--json` flag to all CLI commands that returns machine-readable results instead of formatted text.

**Files to inspect:**

- `packages/cli/src/cli.ts`
- `packages/cli/src/commands/validate.ts`
- `packages/cli/src/commands/build.ts`
- `packages/cli/src/commands/package.ts`
- `packages/cli/src/commands/report.ts`
- `packages/cli/src/commands/create.ts`
- `packages/cli/src/utils/format.ts`

**Files to modify or create:**

- Modify `packages/cli/src/commands/validate.ts`
- Modify `packages/cli/src/commands/build.ts`
- Modify `packages/cli/src/commands/package.ts`
- Modify `packages/cli/src/commands/report.ts`
- Modify `packages/cli/src/commands/create.ts`
- Modify `packages/cli/src/cli.ts` to add global `--json` flag
- Create or update tests for each command's `--json` output
- Create `packages/cli/src/utils/json-output.ts`

**Implementation notes:**

- Add a global `--json` CLI option that all commands respect.
- Define a `CliResult` discriminated union type: `{ success: true, data: unknown } | { success: false, error: string, code: number }`.
- Each command returns `CliResult`; the CLI layer either formats it as text or serializes it as JSON.
- Validation output includes `errors` array with `file`, `path`, `message`, and `suggestion`.
- Build output includes `manifest` and `outputPath`.
- Report output uses `summary` keys matching the telemetry reader.
- Create output returns `packageDir` and `generatedFiles`.
- Ensure JSON output is valid JSON and stable across runs (consistent key order).

**Acceptance criteria:**

- All commands accept `--json` flag.
- JSON output is valid JSON with stable key ordering.
- Exit codes are identical between text and JSON modes.
- Errors in JSON mode include structured error objects, not just strings.
- Tests verify JSON output schema for each command.

**Verification:**

- `pnpm --filter @open-edu/cli test -- json-output`
- `pnpm --filter @open-edu/cli typecheck`

## Story 24.2: Add agent-ready package generation prompt

**Scope:** Create a machine-readable prompt template and validation schema that agents can use to generate valid educational packages from natural language descriptions.

**Files to inspect:**

- `packages/core/src/loader.ts`
- `packages/schemas/src/manifest.ts`
- `packages/schemas/src/workflow.ts`
- `docs/PACKAGE_AUTHORING.md` (if created in Story 18.2)

**Files to modify or create:**

- Create `packages/core/src/agent-prompt.ts`
- Create `packages/core/src/agent-prompt.test.ts`
- Create `packages/core/src/generation-context.ts`
- Create `packages/core/src/generation-context.test.ts`
- Modify `packages/core/src/index.ts`
- Create `packages/cli/src/commands/generate.ts`
- Create `packages/cli/src/commands/generate.test.ts`
- Modify `packages/cli/src/cli.ts`

**Implementation notes:**

- `generateAgentPrompt()` returns a string template with: schema descriptions, required file structure, workflow JSON examples, node type catalog, common mistakes, and a "fill-in-the-blanks" template for a minimal package.
- Include Zod schema summaries as compact JSON-like representations that don't require agents to parse TypeScript.
- `edu generate --prompt` outputs the prompt template to stdout.
- `edu generate --from-description <text>` takes a natural language description and outputs a scaffolded package directory (using the `create` command's scaffold logic plus basic content generation).
- The generation pipeline should be deterministic: same description + same seed → same output.
- Validate the generated package with `loadPackage()` and report errors back to the agent.

**Acceptance criteria:**

- `edu generate --prompt` outputs a complete agent prompt.
- `edu generate --from-description` creates a valid package from a simple description.
- Generated packages pass `loadPackage()` validation.
- Prompt template references only exported schema types (no source-relative imports).

**Verification:**

- `pnpm --filter @open-edu/core test -- agent-prompt generation-context`
- `pnpm --filter @open-edu/cli test -- generate`

## Story 24.3: Add deterministic diff-based package patching

**Scope:** Provide a utility for agents to make surgical, validated edits to existing packages without regenerating the entire package.

**Files to inspect:**

- `packages/core/src/loader.ts`
- `packages/core/src/index.ts`
- `packages/cli/src/commands/validate.ts`
- `docs/PACKAGE_AUTHORING.md`

**Files to modify or create:**

- Create `packages/core/src/patcher.ts`
- Create `packages/core/src/patcher.test.ts`
- Modify `packages/core/src/index.ts`
- Create `packages/cli/src/commands/patch.ts`
- Create `packages/cli/src/commands/patch.test.ts`
- Modify `packages/cli/src/cli.ts`

**Implementation notes:**

- `PatchOperation` discriminated union:
  - `{ op: "add", path: string, value: unknown }` — add a field to a JSON file
  - `{ op: "remove", path: string }` — remove a field
  - `{ op: "replace", path: string, value: unknown }` — replace a field
  - `{ op: "upsert-node", nodeId: string, content: string | object }` — add or replace a node file
  - `{ op: "remove-node", nodeId: string }` — remove a node file and its workflow references
- Paths use JSON Pointer (RFC 6901) syntax for JSON files and file-relative paths for Markdown.
- After applying all operations, run `loadPackage()` on the result and fail the patch if validation fails.
- `edu patch <package-dir> <patch-file.json>` applies a patch file and validates.
- `edu patch --dry-run` shows what would change without writing.
- Return a patch report: operations applied, validation result, and a diff summary.

**Acceptance criteria:**

- All patch operation types apply correctly.
- Invalid patches (validation failure after apply) are rejected without modifying files.
- `--dry-run` shows planned changes without modifying disk.
- Patching a node file updates the workflow if the node ID matches a route target.
- Tests cover each operation type and validation rejection.

**Verification:**

- `pnpm --filter @open-edu/core test -- patcher`
- `pnpm --filter @open-edu/cli test -- patch`

## Story 24.4: Add runtime embed adapter for platform-independent delivery

**Scope:** Create a thin adapter layer that wraps the runtime in a framework-agnostic, mountable API so educational packages can be embedded in non-React host applications (static HTML, web components, iframes, or future React Native wrappers) without modifying runtime internals.

**Files to inspect:**

- `packages/runtime/src/index.ts`
- `packages/runtime/src/context/RuntimeContext.tsx`
- `packages/runtime/src/components/App.tsx`
- `packages/runtime/package.json`
- `apps/dev-server/src/DevApp.tsx`

**Files to modify or create:**

- Create `packages/runtime/src/embed.ts`
- Create `packages/runtime/src/embed.test.tsx`
- Create `packages/runtime/src/embed.test.tsx` (additional test file for DOM-less environments)
- Modify `packages/runtime/src/index.ts`
- Modify `packages/runtime/package.json` to add `"browser"` field or conditional exports for embed entry

**Implementation notes:**

The embed adapter exposes a single `createRuntime()` factory function that returns a mount/unmount API:

```typescript
import type { ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

interface RuntimeEmbedOptions {
  /** Package directory path or parsed Package object */
  packageSource: string | Package;
  /** DOM element to mount into */
  container: HTMLElement;
  /** Optional widget registry for custom/custom widgets */
  widgetRegistry?: WidgetRegistry;
  /** Optional progress snapshot to restore state */
  initialProgress?: ProgressSnapshot;
  /** Callback for progress changes (for host persistence) */
  onProgressChange?: (snapshot: ProgressSnapshot) => void;
  /** Callback for telemetry events (for host analytics) */
  onTelemetryEvent?: (event: TelemetryEvent) => void;
  /** Accessibility announcement callback (for host live regions) */
  onAnnouncement?: (message: string, priority: 'polite' | 'assertive') => void;
}

interface RuntimeEmbedHandle {
  /** Unmount the runtime and clean up React tree */
  unmount(): void;
  /** Get current progress snapshot */
  getProgress(): ProgressSnapshot;
  /** Reset progress to package entry */
  reset(): void;
}

export function createRuntime(options: RuntimeEmbedOptions): RuntimeEmbedHandle;
```

Key implementation constraints:

- `createRuntime()` internally calls `loadPackage()` from `@open-edu/core`, creates the workflow engine, and renders the React runtime tree into `options.container`.
- The React root is created via `createRoot(container)` and managed internally; callers never touch the React tree.
- `onProgressChange` is called synchronously when the runtime emits a progress snapshot (ties into the Story 16.2 API).
- `onTelemetryEvent` exposes raw telemetry events to the host for custom analytics pipelines.
- `onAnnouncement` lets the host route a11y announcements to its own live region, enabling seamless embedding in non-React shells.
- `unmount()` calls `root.unmount()` and cleans up subscriptions; calling it twice is a no-op.
- `getProgress()` returns the current snapshot at call time (not a stale reference).
- `reset()` resets the workflow engine, clears progress, and re-renders from the package entry node.

Embed in a static HTML page pattern:

```html
<div id="edu-root"></div>
<script type="module">
  import { createRuntime } from '@open-edu/runtime/embed';
  const runtime = createRuntime({
    packageSource: './my-package',
    container: document.getElementById('edu-root'),
    onProgressChange: (snap) => localStorage.setItem('progress', JSON.stringify(snap)),
    onTelemetryEvent: (evt) => console.log('[telemetry]', evt),
  });
  // Later: runtime.unmount();
</script>
```

**Edge cases to handle:**

- Container element is detached from the DOM at mount time — should throw a clear error, not crash silently.
- Container is `display: none` — render should still work; do not assume visible dimensions.
- `unmount()` called before React finishes initial render — should cancel or queue cleanup.
- Multiple `createRuntime()` calls on the same container — throw a "container already mounted" error.
- `packageSource` is a relative path that does not exist — propagate the `loadPackage()` error through a thrown `PackageLoadError`.
- `onTelemetryEvent` throws — catch and log the error, do not crash the runtime.
- Memory: ensure `unmount()` releases the React root, workflow actor subscription, and any event listeners.

**Acceptance criteria:**

- Runtime mounts into any valid DOM element and renders the package entry node.
- `getProgress()` returns current snapshot matching the rendered node.
- `reset()` restarts the package from entry and re-renders.
- `unmount()` cleans up without leaking DOM nodes or subscriptions.
- Progress, telemetry, and a11y callbacks fire with correct data.
- Calling `unmount()` twice is safe.
- Embed adapter works without importing React directly in host code.

**Verification:**

- `pnpm --filter @open-edu/runtime test -- embed`
- `pnpm --filter @open-edu/runtime typecheck`

---

# Recommended Execution Order

1. **Epic 19.1** — CI workflow, so every subsequent story gets automatic verification.
2. **Epic 15.1** — Archive safety, removing the highest-risk CLI implementation detail first.
3. **Epic 24.1** — Structured JSON output for all CLI commands. This is the foundation for all agent tooling and must land before agent-facing commands (Epic 14, 24.2, 24.3).
4. **Epic 13.1, 13.2, 13.3** — Widget SDK contract, runtime rendering, and built-in multiple-choice widget.
5. **Epic 21.1, 21.2, 21.3** — Accessibility hardening: focus traps, live regions, and a11y audit panel. Must land early as a11y is the #1 architectural principle and these are P0.
6. **Epic 13.5** — NPM widget packaging template. Depends on stable widget SDK (13.1) and enables external widget contributions.
7. **Epic 14.1, 14.2, 14.3** — Package scaffolding, authoring diagnostics, and content linting. These use the `--json` foundation from step 3.
8. **Epic 16** — Runtime progress snapshots and dev-server persistence.
9. **Epic 21.4, 21.5** — Keyboard-navigation E2E and hot-reload regression tests. Depends on stable runtime behavior from Epics 13-16.
10. **Epic 13.4** — Widget example package and E2E coverage (depends on widget SDK + runtime rendering being complete).
11. **Epic 17** — Telemetry JSONL reader, CLI report, and telemetry inspector summary.
12. **Epic 18** — Documentation site, package authoring guide, and advanced adaptive example.
13. **Epic 20.1, 20.2** — Skill graph schema and workflow skill-tracking.
14. **Epic 20.3, 20.4** — Mastery-based routing in runtime and skill-graph example package.
15. **Epic 22** — Reward verification, conditional rules, and inspector visibility.
16. **Epic 24.4** — Runtime embed adapter. Depends on stable runtime + progress + telemetry callbacks (Epics 16, 17).
17. **Epic 15.2, 15.3** — Build manifest metadata and package integrity checks (remaining distribution hardening).
18. **Epic 19.2, 19.3, 19.4** — Coverage thresholds, repo hygiene, and release checklist.
19. **Epic 23** — Remote widget loading (after local widget SDK is stable from Epic 13 and the embed adapter exists from Epic 24.4).
20. **Epic 24.2, 24.3** — Agent generation prompt, generation command, and deterministic package patching. Depends on `--json` foundation (step 3), scaffolding (step 7), and patch utilities.

# Definition of Done for Each Story

- Code compiles with `pnpm typecheck`.
- Changed package tests pass.
- Root `pnpm test` passes unless the story explicitly documents a pre-existing unrelated failure.
- `pnpm lint` passes.
- `pnpm format:check` passes.
- Public APIs are exported from package `src/index.ts` files.
- README or docs are updated when user-facing behavior changes.
- No unrelated files are reformatted or refactored.
