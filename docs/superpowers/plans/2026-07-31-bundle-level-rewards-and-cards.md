# Bundle-Level Rewards & Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support rewards and cards at the **bundle level** (multi-module courses) in addition to the existing module level, end-to-end: schemas → core loader → rewards engine → workflow engine → `.oep` distribution → storage → learner runtime UI → authoring skill → docs. This plan can be executed by an agent with **zero prior knowledge of this codebase** — every file path, code block, and test command is explicit.

**Architecture:** Bundle-level rewards/cards live at the bundle **root** (`bundle/rewards.json`, `bundle/cards.json`), referenced from `bundle.json` via relative `rewards`/`cards` string paths (same contract as module-level rewards/cards, which use `package.json` `rewards`/`cards` paths). The core `LoadBundle` gains `rewards`/`cards` fields. The rewards engine evaluates `bundleCompleted` against `ContextSnapshot.completedModules`. The `BundleEngine` no longer warns about missing bundle rewards (it now legitimately owns bundle completion). `.oep` bundle archives carry `bundle/rewards.json` + `bundle/cards.json`. The learner app wires a bundle-scoped `RewardBroker`/`CardBroker` in `CourseRuntime` and shows bundle cards on the collection binder and bundle overview pages. Authoring skill gains bundle + rewards/cards authoring guidance and a structural validator.

**Tech Stack:** TypeScript, Zod, fflate (ZIP), RxJS, Vitest (testing), Commander (CLI), React 18 + Tailwind

**Existing related work:** Module-level rewards/cards already work end-to-end (schemas → loader → brokers → UI). `.oep` bundle archives already work (see `docs/superpowers/plans/2026-07-30-oep-bundle-format-support.md`). This plan extends both.

---

## Design Contract (READ FIRST)

These rules govern every decision in this plan. An agent that produces code violating these rules must fix it before committing.

### 1. Two scope levels, clearly separated

| Level  | Where the file lives                           | Referenced from                               | Runtime owner                                                | Example trigger conditions                                                                                         |
| ------ | ---------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Module | `<module>/rewards.json`, `<module>/cards.json` | module `package.json` `rewards`/`cards` paths | per-module `RewardBroker`/`CardBroker` in `CourseRuntime`    | `stepCompleted`, `exerciseCompleted`, `score`, `activityCompleted`, `moduleCompleted` (see module condition rules) |
| Bundle | `<bundle>/rewards.json`, `<bundle>/cards.json` | `bundle.json` `rewards`/`cards` paths         | bundle-scoped `RewardBroker`/`CardBroker` in `CourseRuntime` | `bundleCompleted`, `moduleCompleted`, `skill`, `and`, `or`, `bundleCondition` (single-module-condition)            |

### 2. `bundleCompleted` semantics

`bundleCompleted` fires when **all modules in the bundle** report completed in the current session context. The runtime must emit `bundle_complete` telemetry **before** pushing the bundle context into the broker. An agent must **not** invent a `requiredModules` field or treat `bundleCompleted` as "one module done".

### 3. Scope safety rule

- Bundle `rewards.json`/`cards.json` must **not** reference module-local condition signals that the bundle broker cannot see: `stepCompleted`, `exerciseCompleted`, `score`, `chain`, `activityCompleted`, `moduleUnlocked`, `moduleFailed`, `attempts`, `answeredCorrectly`.
- Module `rewards.json`/`cards.json` must **not** reference bundle-level signals: `bundleCompleted`, `moduleCompleted`.
- The `validate-rewards-cards.mjs` skill script enforces this automatically. The rewards engine should return `false` for a condition the current context cannot evaluate, never throw.

### 4. Global card-ID uniqueness

Card IDs are unique across the **entire bundle** (module + bundle cards). `apps/learner/src/cardsStorage.ts` keys saved progress by bare `card.id` — duplicate IDs across modules/bundle would corrupt progress. The authoring skill enforces this. Do not change the storage key format in this plan.

### 5. Backward compatibility

- All new fields (`BundleManifest.cards`, `LoadedBundle.rewards/cards`, `StoredBundle.rewards/cards`, `OepBundleBuildInput.bundleFiles`) are **optional**. Existing modules, bundles, `.oep` files, and stored courses must keep working unchanged.
- `DistributionManifestSchema` is untouched. Only `OepBundleBuildInput` gains an optional `bundleFiles` map.

### 6. Telemetry naming

New events follow the existing `snake_case` `*_complete` convention: `module_complete` and `bundle_complete`. They are part of the `TelemetryEventSchema` discriminated union and `TelemetryEventEnum`.

### 7. No dead code

If a test fixture type (e.g. `createMockBundle`) is extended, every consumer must be updated in the **same commit** (the plan lists them). Run the package test suite after each task.

### 8. Skill scripts are dependency-free

`skills/openedu-course-authoring/scripts/*.mjs` run on plain Node.js in both repository and portable (no-repo) modes. They must not import compiled packages or third-party deps. Structural validation only.

---

## File Map

| Action | File                                                                                | Responsibility                                                                      |
| ------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Modify | `packages/schemas/src/bundle.ts`                                                    | Add optional `cards` path; path-traversal guard for `rewards`/`cards`               |
| Modify | `packages/schemas/src/bundle.test.ts`                                               | Tests for `cards` field + path guard                                                |
| Modify | `packages/schemas/src/telemetry.ts`                                                 | Add `module_complete`, `bundle_complete` to union + enum                            |
| Modify | `packages/schemas/src/telemetry.test.ts`                                            | Tests for new events                                                                |
| Modify | `packages/schemas/src/index.ts`                                                     | Export new telemetry schemas/types                                                  |
| Modify | `packages/core/src/types.ts`                                                        | Add `rewards`/`cards` to `LoadedBundle`                                             |
| Modify | `packages/core/src/bundle-loader.ts`                                                | Load bundle-root `rewards.json`/`cards.json` via `loadRewards`/`loadCards`          |
| Modify | `packages/core/src/bundle-loader.test.ts`                                           | Tests for bundle rewards/cards loading                                              |
| Modify | `packages/core/src/bundle-scanner.ts`                                               | Surface bundle rewards/cards in `BundleSummary`                                     |
| Modify | `packages/rewards/src/conditions.ts`                                                | Implement real `bundleCompleted` evaluation                                         |
| Modify | `packages/rewards/src/conditions.test.ts`                                           | Replace stub test with real evaluation tests                                        |
| Modify | `packages/workflow/src/bundle-engine.ts`                                            | Remove "no bundle rewards" constructor warning                                      |
| Modify | `packages/workflow/src/bundle-engine.test.ts`                                       | Update mock bundle; test warning removal                                            |
| Modify | `packages/oep-distribution/src/oep-writer.ts`                                       | `OepBundleBuildInput.bundleFiles`; write bundle-root rewards/cards into `.oep`      |
| Modify | `packages/oep-distribution/src/oep-reader.ts`                                       | Extract bundle-root rewards/cards in `readBundleInternal`                           |
| Modify | `packages/oep-distribution/src/oep-writer.test.ts`                                  | Round-trip tests for bundle rewards/cards                                           |
| Modify | `packages/oep-distribution/src/install-coordinator.ts`                              | Thread bundle rewards/cards into stored record                                      |
| Modify | `packages/oep-distribution/src/install-coordinator.test.ts`                         | Bundle install test with bundle rewards/cards                                       |
| Modify | `packages/cli/src/commands/oep-build-bundle.ts`                                     | Collect bundle-root `rewards.json`/`cards.json` into bundle files                   |
| Create | `packages/cli/src/commands/oep-build-bundle.test.ts`                                | CLI build test asserting bundle rewards/cards in output                             |
| Modify | `packages/storage/src/db.ts`                                                        | Add optional `rewards`/`cards` to `StoredBundle` (type-only)                        |
| Modify | `apps/learner/src/oepAdapters.ts`                                                   | Populate bundle rewards/cards in `storedBundleToLoadedBundle`                       |
| Modify | `apps/learner/src/__tests__/oepAdapters.test.ts`                                    | Tests for bundle rewards/cards adaptation                                           |
| Modify | `apps/learner/src/CourseRuntime.tsx`                                                | Bundle-scoped `RewardBroker`/`CardBroker`; emit `module_complete`/`bundle_complete` |
| Modify | `apps/learner/src/CourseRuntime.test.tsx`                                           | Mock broker factory; bundle broker tests                                            |
| Modify | `apps/learner/src/CollectionBinderPage.tsx`                                         | Render bundle cards with `bundle` scope                                             |
| Modify | `apps/learner/src/AppShell.tsx`                                                     | Pass `mergedPackageEntries` (not `allPackageEntries`) to `CollectionBinderPage`     |
| Create | `apps/learner/src/CollectionBinderPage.test.tsx`                                    | Bundle card rendering test                                                          |
| Modify | `apps/learner/src/BundleOverviewPage.tsx`                                           | Bundle card shelf                                                                   |
| Modify | `skills/openedu-course-authoring/SKILL.md`                                          | Trigger + link new references                                                       |
| Create | `skills/openedu-course-authoring/references/bundle-authoring.md`                    | Bundle authoring reference                                                          |
| Create | `skills/openedu-course-authoring/references/rewards-cards-authoring.md`             | Rewards/cards authoring reference                                                   |
| Modify | `skills/openedu-course-authoring/references/artifact-contract.md`                   | Add bundle + rewards/cards contract                                                 |
| Modify | `skills/openedu-course-authoring/references/quality-rubric.md`                      | Add QC-REW checks                                                                   |
| Create | `skills/openedu-course-authoring/scripts/validate-rewards-cards.mjs`                | Structural rewards/cards validator (no deps)                                        |
| Create | `skills/openedu-course-authoring/scripts/__tests__/validate-rewards-cards.test.mjs` | Tests for the validator                                                             |
| Modify | `skills/openedu-course-authoring/evals/evals.json`                                  | Add bundle + rewards/cards evals                                                    |
| Modify | `skills/openedu-course-authoring/evals/README.md`                                   | Index new evals                                                                     |
| Modify | `apps/docs/docs/rewards.md`                                                         | Fix trigger/condition example bug; add bundle-level section                         |
| Modify | `apps/docs/docs/package-authoring.md`                                               | Document bundle-level rewards/cards                                                 |
| Modify | `openwiki/domain/content-and-workflows.md`                                          | Note bundle-level rewards/cards                                                     |
| Modify | `examples/level-b-math/` (optional)                                                 | Add bundle rewards.json/cards.json for e2e coverage                                 |

---

## Task 1: Add `cards` field and path guard to `BundleManifestSchema`

**Files:**

- Modify: `packages/schemas/src/bundle.ts`
- Test: `packages/schemas/src/bundle.test.ts`

- [ ] **Step 1: Add `cards` to `BundleManifestSchema`**

In `BundleManifestSchema`, the object currently has `rewards: z.string().optional(),`. Add `cards` next to it:

```typescript
rewards: z.string().optional(),
cards: z.string().optional(),
```

- [ ] **Step 2: Extend the existing `superRefine` with a path guard**

`BundleManifestSchema` already has a `.superRefine()` that checks duplicate module IDs. Add this inside the same refine, after the duplicate-id loop:

```typescript
for (const key of ['rewards', 'cards'] as const) {
  const p = data[key];
  if (p && (p.startsWith('/') || p.startsWith('..') || p.includes('\\'))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${key} must be a relative path inside the bundle directory`,
      path: [key],
    });
  }
}
```

This mirrors the path-traversal guard that already exists for module `rewards`/`cards` paths in the package schema. **Note:** the module-level `package.json` schema already has an identical guard — reuse its exact message style if it differs (check `packages/schemas/src/package.ts` first and match it).

- [ ] **Step 3: Write failing tests**

In `packages/schemas/src/bundle.test.ts`, add:

```typescript
it('accepts an optional cards path', () => {
  const result = BundleManifestSchema.parse({ ...validBundle, cards: './cards.json' });
  expect(result.cards).toBe('./cards.json');
});

it('rejects rewards/cards paths that escape the bundle directory', () => {
  expect(() => BundleManifestSchema.parse({ ...validBundle, rewards: '../rewards.json' })).toThrow(
    'must be a relative path',
  );
  expect(() => BundleManifestSchema.parse({ ...validBundle, cards: '/etc/cards.json' })).toThrow(
    'must be a relative path',
  );
  expect(() => BundleManifestSchema.parse({ ...validBundle, cards: '..\\cards.json' })).toThrow(
    'must be a relative path',
  );
});
```

Use the file's existing `validBundle` fixture object.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @open-edu/schemas test -- bundle.test`
Expected: All pass (including pre-existing bundle tests).

- [ ] **Step 5: Commit**

```bash
git add packages/schemas/src/bundle.ts packages/schemas/src/bundle.test.ts
git commit -m "feat(schemas): add bundle-level cards path to BundleManifestSchema"
```

---

## Task 2: Add `module_complete` and `bundle_complete` telemetry events

**Files:**

- Modify: `packages/schemas/src/telemetry.ts`
- Modify: `packages/schemas/src/index.ts`
- Test: `packages/schemas/src/telemetry.test.ts`

- [ ] **Step 1: Add the event schemas**

In `packages/schemas/src/telemetry.ts`, `TelemetryEventSchema` is a discriminated union on `event`. Add these two variants next to `WorkflowCompleteEventSchema`:

```typescript
export const ModuleCompleteEventSchema = BaseTelemetrySchema.extend({
  event: z.literal('module_complete'),
  moduleId: z.string().min(1).max(128),
});

export const BundleCompleteEventSchema = BaseTelemetrySchema.extend({
  event: z.literal('bundle_complete'),
  bundleId: z.string().min(1).max(128),
});
```

- [ ] **Step 2: Add to the union and enum**

Add both schemas to the `TelemetryEventSchema` union array. Add `'module_complete'` and `'bundle_complete'` to `TelemetryEventEnum`. Derive `ModuleCompleteEvent` and `BundleCompleteEvent` types (`z.infer`) in the same file.

- [ ] **Step 3: Export from `index.ts`**

Add `ModuleCompleteEventSchema` and `BundleCompleteEventSchema` to the value exports, and `ModuleCompleteEvent` and `BundleCompleteEvent` to the type exports in `packages/schemas/src/index.ts` (match the existing export block style).

- [ ] **Step 4: Write failing tests**

In `packages/schemas/src/telemetry.test.ts`, add:

```typescript
it('accepts a module_complete event', () => {
  const result = TelemetryEventSchema.safeParse({
    event: 'module_complete',
    moduleId: 'mod-a',
    sessionId: 's1',
    timestamp: '2026-07-31T00:00:00.000Z',
  });
  expect(result.success).toBe(true);
});

it('accepts a bundle_complete event', () => {
  const result = TelemetryEventSchema.safeParse({
    event: 'bundle_complete',
    bundleId: 'bundle-1',
    sessionId: 's1',
    timestamp: '2026-07-31T00:00:00.000Z',
  });
  expect(result.success).toBe(true);
});
```

Match the file's existing `sessionId`/`timestamp` field names and required base fields (`BaseTelemetrySchema` may require more — mirror an existing passing test's payload).

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @open-edu/schemas test -- telemetry.test`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add packages/schemas/src/telemetry.ts packages/schemas/src/index.ts packages/schemas/src/telemetry.test.ts
git commit -m "feat(schemas): add module_complete and bundle_complete telemetry events"
```

---

## Task 3: Load bundle-root rewards/cards in the core loader

**Files:**

- Modify: `packages/core/src/types.ts`
- Modify: `packages/core/src/bundle-loader.ts`
- Test: `packages/core/src/bundle-loader.test.ts`

- [ ] **Step 1: Extend `LoadedBundle`**

In `packages/core/src/types.ts`, add two nullable fields to `LoadedBundle`:

```typescript
rewards: Rewards | null;
cards: CardDefinitions | null;
```

(`Rewards` and `CardDefinitions` are already imported in this file — verify.)

- [ ] **Step 2: Load bundle-root rewards/cards**

In `packages/core/src/bundle-loader.ts`, import `loadRewards` and `loadCards` from `./rewards.js` and `./cards.js` respectively. Inside `loadBundle`, right before the `return`, add:

```typescript
const [rewards, cards] = await Promise.all([loadRewards(bundleDir), loadCards(bundleDir)]);
```

Then add both to the returned object. `loadRewards`/`loadCards` already resolve the path from the manifest `rewards`/`cards` string fields, read the JSON file, validate it, and return `null` when the field is absent (verify their signatures and `bundleDir` usage — if they take the manifest object instead, pass what they expect).

- [ ] **Step 3: Write failing tests**

In `packages/core/src/bundle-loader.test.ts`, add:

```typescript
it('returns null rewards/cards for a bundle without them', async () => {
  const loaded = await loadBundle(validBundleDir);
  expect(loaded.rewards).toBeNull();
  expect(loaded.cards).toBeNull();
});

it('loads bundle-root rewards and cards', async () => {
  const loaded = await loadBundle(bundleWithRewardsAndCardsDir);
  expect(loaded.rewards).not.toBeNull();
  expect(loaded.rewards!.triggers.length).toBeGreaterThan(0);
  expect(loaded.cards).not.toBeNull();
  expect(loaded.cards!.cards.length).toBeGreaterThan(0);
});
```

Create a fixture bundle directory `packages/core/src/__fixtures__/bundles/bundle-with-rewards/` containing `bundle.json` (with `rewards`/`cards` paths), `rewards.json`, `cards.json`, and one valid module. Reuse the existing fixture layout under `packages/core/src/__fixtures__/bundles/`. Copy `rewards.json`/`cards.json` shape from an existing module fixture.

- [ ] **Step 4: Update `bundle-scanner.ts`**

`BundleSummary` in `packages/core/src/bundle-scanner.ts` should surface the same info. Add `rewardsPath?: string; cardsPath?: string;` (and populate them from `manifest.rewards`/`manifest.cards`) to keep the scanner consistent with the loader.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @open-edu/core test -- bundle-loader`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/bundle-loader.ts packages/core/src/bundle-loader.test.ts packages/core/src/bundle-scanner.ts packages/core/src/__fixtures__
git commit -m "feat(core): load bundle-level rewards and cards"
```

---

## Task 4: Implement real `bundleCompleted` evaluation

**Files:**

- Modify: `packages/rewards/src/conditions.ts`
- Test: `packages/rewards/src/conditions.test.ts`

- [ ] **Step 1: Replace the stub**

In `packages/rewards/src/conditions.ts`, the `bundleCompleted` case is currently a stub:

```typescript
case 'bundleCompleted': {
  console.warn('[rewards] bundleCompleted condition is not yet implemented');
  return false;
}
```

Replace it with:

```typescript
case 'bundleCompleted': {
  return context.completedModules.length > 0;
}
```

Remove the `console.warn`. `ContextSnapshot.completedModules` already exists (`packages/rewards/src/types.ts`) — do **not** add fields to `ContextSnapshot`.

- [ ] **Step 2: Rewrite the test**

Replace the existing stub test in `packages/rewards/src/conditions.test.ts` with:

```typescript
describe('bundleCompleted', () => {
  it('is true when completedModules is non-empty', () => {
    const result = shouldFireAction(
      { condition: { type: 'bundleCompleted' } },
      { ...baseContext, completedModules: ['mod-a'] },
    );
    expect(result).toBe(true);
  });

  it('is false when no modules are completed', () => {
    const result = shouldFireAction(
      { condition: { type: 'bundleCompleted' } },
      { ...baseContext, completedModules: [] },
    );
    expect(result).toBe(false);
  });

  it('never throws for conditions the context cannot evaluate', () => {
    const result = shouldFireAction(
      { condition: { type: 'stepCompleted', stepId: 'step-1' } },
      { ...baseContext },
    );
    expect(result).toBe(false);
  });
});
```

Use the test file's existing `baseContext` fixture. **Important:** if `stepCompleted` currently returns `undefined` (rather than `false`) when the context lacks `completedSteps`, change the evaluator so every condition returns a boolean — the design contract requires `false`, never `undefined`/`throw`. Check the other condition implementations and the `shouldFireAction` signature before writing.

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @open-edu/rewards test -- conditions`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add packages/rewards/src/conditions.ts packages/rewards/src/conditions.test.ts
git commit -m "feat(rewards): implement bundleCompleted condition evaluation"
```

---

## Task 5: Remove the BundleEngine "no bundle rewards" warning

**Files:**

- Modify: `packages/workflow/src/bundle-engine.ts`
- Test: `packages/workflow/src/bundle-engine.test.ts`

- [ ] **Step 1: Remove the warning block**

In `packages/workflow/src/bundle-engine.ts`, the constructor currently warns when the bundle manifest has no `rewards` (around line 79):

```typescript
if (!bundle.manifest.rewards) {
  console.warn(
    '[workflow] bundle has no rewards configured; bundle completion will not trigger rewards',
  );
}
```

Delete this block. Bundle rewards are now legitimate and owned by the runtime broker — the engine's job is only to emit `bundle.completed`. There is no replacement warning.

- [ ] **Step 2: Update the mock bundle fixture**

If `packages/workflow/src/bundle-engine.test.ts` uses a `createMockBundle` helper (or a hand-built object), ensure its `manifest` type satisfies `BundleManifest` (which now has an optional `cards`). Only update the fixture if tests fail to typecheck — do not add a `rewards` value to mocks that don't test it.

- [ ] **Step 3: Add a regression test**

```typescript
it('should not warn when the bundle has no rewards configured', () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    new BundleEngine(createMockBundle([{ id: 'mod-a', title: 'Module A' }]));
    expect(warnSpy).not.toHaveBeenCalled();
  } finally {
    warnSpy.mockRestore();
  }
});
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @open-edu/workflow test -- bundle-engine`
Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add packages/workflow/src/bundle-engine.ts packages/workflow/src/bundle-engine.test.ts
git commit -m "refactor(workflow): drop obsolete bundle rewards warning from BundleEngine"
```

---

## Task 6: `.oep` writer + reader support for bundle-root rewards/cards

**Files:**

- Modify: `packages/oep-distribution/src/oep-writer.ts`
- Modify: `packages/oep-distribution/src/oep-reader.ts`
- Test: `packages/oep-distribution/src/oep-writer.test.ts`

- [ ] **Step 1: Extend `OepBundleBuildInput`**

In `packages/oep-distribution/src/oep-writer.ts`, `OepBundleBuildInput` currently has `manifest`, `bundleManifest`, and `moduleFiles`. Add:

```typescript
bundleFiles?: Map<string, Uint8Array>;
```

- [ ] **Step 2: Write bundle-root files into the archive**

In `buildBundle`, after the module loop that populates the `allFiles` map, add:

```typescript
if (input.bundleFiles) {
  for (const [relativePath, content] of input.bundleFiles) {
    allFiles.set(relativePath.replace(/\\/g, '/').replace(/^\/+/, ''), content);
  }
}
```

The caller is responsible for keys like `bundle/rewards.json` and `bundle/cards.json`. The `bundle.json` file itself is already written by `buildBundle`.

- [ ] **Step 3: Extract bundle rewards/cards in the reader**

In `packages/oep-distribution/src/oep-reader.ts`, `readBundleInternal` parses `bundle/bundle.json` and each module. After parsing the manifest, load the optional bundle-root files:

```typescript
const bundleRewardsPath = `bundle/${manifest.rewards ?? ''}`.replace(/\/+$/, '');
const bundleCardsPath = `bundle/${manifest.cards ?? ''}`.replace(/\/+$/, '');
const rewardsJson = manifest.rewards ? parseJsonEntry(entries, bundleRewardsPath) : undefined;
const cardsJson = manifest.cards ? parseJsonEntry(entries, bundleCardsPath) : undefined;
```

`OepExtraction` (in `packages/oep-distribution/src/types.ts`) already has optional `rewards?: unknown` and `cards?: unknown` fields — populate them in the returned extraction object only when present. If the file is missing but the manifest references it, throw `OepValidationError` with a message like `bundle references rewards.json but the archive does not contain it`. If no helper like `parseJsonEntry` exists, read the entry bytes and `JSON.parse` manually (match the file's existing style).

- [ ] **Step 4: Write round-trip tests**

In `packages/oep-distribution/src/oep-writer.test.ts`, add to the bundle describe block:

```typescript
it('round-trips bundle-level rewards and cards', () => {
  const bundleRewards = {
    triggers: [
      {
        onEvent: 'bundle_complete',
        rewards: [{ action: 'badge.award', spec: { badgeId: 'bundle-finisher' } }],
      },
    ],
  };
  const bundleCards = {
    cards: [
      {
        id: 'bundle-card',
        unlock: { type: 'bundleCompleted' },
        category: 'badge',
        summary: 'Finished the bundle',
        levels: [
          {
            id: 'l1',
            title: 'Done',
            description: 'All modules complete',
            icon: 'trophy',
            completed: false,
          },
        ],
      },
    ],
  };
  const bundleManifest = {
    ...validBundleManifest,
    rewards: './rewards.json',
    cards: './cards.json',
  };
  const bundleFiles = new Map([
    ['bundle/rewards.json', new TextEncoder().encode(JSON.stringify(bundleRewards))],
    ['bundle/cards.json', new TextEncoder().encode(JSON.stringify(bundleCards))],
  ]);

  const archive = OepWriter.buildBundle({
    manifest: validManifest,
    bundleManifest,
    moduleFiles,
    bundleFiles,
  });
  const extraction = OepReader.read(archive);

  expect(extraction.bundleManifest?.rewards).toBe('./rewards.json');
  expect(extraction.bundleManifest?.cards).toBe('./cards.json');
  expect(extraction.rewards).toEqual(bundleRewards);
  expect(extraction.cards).toEqual(bundleCards);
});

it('leaves rewards/cards undefined when the bundle omits them', () => {
  const archive = OepWriter.buildBundle({
    manifest: validManifest,
    bundleManifest: validBundleManifest,
    moduleFiles,
  });
  const extraction = OepReader.read(archive);
  expect(extraction.rewards).toBeUndefined();
  expect(extraction.cards).toBeUndefined();
});
```

Use the test file's existing fixtures for `validManifest`, `validBundleManifest`, and `moduleFiles`. If `OepReader.read` returns a discriminated union keyed by `type`, assert on the bundle branch (check the existing bundle tests in this file for the exact access pattern).

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @open-edu/oep-distribution test -- oep-writer`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add packages/oep-distribution/src/oep-writer.ts packages/oep-distribution/src/oep-reader.ts packages/oep-distribution/src/oep-writer.test.ts
git commit -m "feat(oep-distribution): support bundle-level rewards and cards in .oep archives"
```

---

## Task 7: Thread bundle rewards/cards through the install coordinator

**Files:**

- Modify: `packages/oep-distribution/src/install-coordinator.ts`
- Test: `packages/oep-distribution/src/install-coordinator.test.ts`

- [ ] **Step 1: Pass extraction rewards/cards into the stored bundle record**

In `packages/oep-distribution/src/install-coordinator.ts`, the bundle install branch builds a stored record (look for `type: 'bundle'` handling and the object it writes to storage). Add:

```typescript
rewards: extraction.rewards ?? null,
cards: extraction.cards ?? null,
```

wherever the module-level equivalents are already threaded (the coordinator already passes `extraction.rewards`/`extraction.cards` for single courses — mirror that). Confirm the stored record type accepts these fields (this is prepared in Task 8 — if the type does not yet have them, complete Task 8's type change in this same commit so the repo never typebreaks; the plan keeps them in consecutive commits).

- [ ] **Step 2: Add an install test with bundle rewards/cards**

In `packages/oep-distribution/src/install-coordinator.test.ts`, extend the existing bundle-install test (or add one): build a bundle `.oep` via `OepWriter.buildBundle` with `bundleFiles` (see Task 6 fixtures), run `InstallCoordinator.install(...)`, and assert the stored record has `rewards` and `cards` equal to the written objects. Follow the file's existing test scaffolding (`bundle-test-fixtures.ts` may already provide helpers).

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @open-edu/oep-distribution test -- install-coordinator`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add packages/oep-distribution/src/install-coordinator.ts packages/oep-distribution/src/install-coordinator.test.ts
git commit -m "feat(oep-distribution): thread bundle-level rewards and cards through install"
```

---

## Task 8: Add `rewards`/`cards` to `StoredBundle`

**Files:**

- Modify: `packages/storage/src/db.ts`

- [ ] **Step 1: Extend the interface**

In `packages/storage/src/db.ts`, `StoredBundle` currently has `manifest`, `modules`, `installedAt`, etc. Add:

```typescript
rewards?: unknown;
cards?: unknown;
```

These are optional so existing stored bundles keep loading. If `StoredBundle` derives from a Zod schema in `db.ts` (or a shared schema file), update the schema instead so `validateStoredCourse`-style helpers accept them.

- [ ] **Step 2: Verify**

This is a type-only change — run `pnpm typecheck` and confirm `packages/storage` compiles.

- [ ] **Step 3: Commit**

```bash
git add packages/storage/src/db.ts
git commit -m "feat(storage): add optional rewards and cards to StoredBundle"
```

---

## Task 9: CLI `oep:build-bundle` collects bundle-root rewards/cards

**Files:**

- Modify: `packages/cli/src/commands/oep-build-bundle.ts`
- Create: `packages/cli/src/commands/oep-build-bundle.test.ts`

- [ ] **Step 1: Collect bundle-root files**

In `packages/cli/src/commands/oep-build-bundle.ts`, `buildOepBundle` currently walks `bundle/modules/*` for module files. Before building, also collect the bundle root:

```typescript
function collectBundleRootFiles(bundleDir: string): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  for (const name of ['rewards.json', 'cards.json']) {
    const p = path.join(bundleDir, name);
    if (fs.existsSync(p)) {
      files.set(`bundle/${name}`, fs.readFileSync(p));
    }
  }
  return files;
}
```

Pass the result as `bundleFiles` to `OepWriter.buildBundle` (skip it when the map is empty, or pass an empty map — match how `moduleFiles` is handled). The manifest paths (`rewards`/`cards`) are not modified here; they already point at `./rewards.json`/`./cards.json` relative to `bundle.json`, which is what the reader expects (`bundle/rewards.json` resolves the same file).

- [ ] **Step 2: Write a CLI test**

Create `packages/cli/src/commands/oep-build-bundle.test.ts`:

```typescript
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OepReader } from '@open-edu/oep-distribution';
import { buildOepBundle } from './oep-build-bundle.js';

it('includes bundle-root rewards.json and cards.json in the output', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'oep-bundle-'));
  mkdirSync(join(dir, 'modules', 'mod-a'), { recursive: true });
  writeFileSync(
    join(dir, 'bundle.json'),
    JSON.stringify({ ...validBundleManifest, rewards: './rewards.json', cards: './cards.json' }),
  );
  writeFileSync(join(dir, 'rewards.json'), JSON.stringify({ triggers: [] }));
  writeFileSync(join(dir, 'cards.json'), JSON.stringify({ cards: [] }));
  writeFileSync(
    join(dir, 'modules', 'mod-a', 'package.json'),
    JSON.stringify(validPackageManifest),
  );

  const outputPath = join(dir, 'out.oep');
  await buildOepBundle({ bundleDir: dir, outputPath });

  const extraction = OepReader.read(readFileSync(outputPath));
  expect(extraction.rewards).toEqual({ triggers: [] });
  expect(extraction.cards).toEqual({ cards: [] });
});
```

Check the actual export name and signature of `buildOepBundle` (it may be `buildOepBundle(input)` or `(bundleDir, outputPath)`) and adjust. Reuse `validBundleManifest`/`validPackageManifest` from the package's existing test fixtures if exported, otherwise inline minimal valid manifests. Verify how `readFileSync` is imported in neighboring tests.

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @open-edu/cli test -- oep-build-bundle`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/commands/oep-build-bundle.ts packages/cli/src/commands/oep-build-bundle.test.ts
git commit -m "feat(cli): include bundle-root rewards and cards in oep:build-bundle"
```

---

## Task 10: Learner storage adapter populates bundle rewards/cards

**Files:**

- Modify: `apps/learner/src/oepAdapters.ts`
- Test: `apps/learner/src/__tests__/oepAdapters.test.ts`

- [ ] **Step 1: Populate `LoadedBundle` fields**

In `apps/learner/src/oepAdapters.ts`, `storedBundleToLoadedBundle` (around line 269) maps a `StoredBundle` to a `LoadedBundle`. Add to the returned object:

```typescript
rewards: stored.rewards ?? null,
cards: stored.cards ?? null,
```

- [ ] **Step 2: Write tests**

In `apps/learner/src/__tests__/oepAdapters.test.ts`, add:

```typescript
it('maps bundle-level rewards and cards from storage', () => {
  const stored = makeStoredBundle({ rewards: { triggers: [] }, cards: { cards: [] } });
  const loaded = storedBundleToLoadedBundle(stored);
  expect(loaded.rewards).toEqual({ triggers: [] });
  expect(loaded.cards).toEqual({ cards: [] });
});

it('defaults missing bundle rewards/cards to null', () => {
  const stored = makeStoredBundle({});
  const loaded = storedBundleToLoadedBundle(stored);
  expect(loaded.rewards).toBeNull();
  expect(loaded.cards).toBeNull();
});
```

Add a `makeStoredBundle(overrides)` helper in the test file (or extend the existing one) that returns a `StoredBundle` with the minimal required fields, so both new and existing tests share it.

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @open-edu/learner test -- oepAdapters`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add apps/learner/src/oepAdapters.ts apps/learner/src/__tests__/oepAdapters.test.ts
git commit -m "feat(learner): adapt bundle-level rewards and cards from storage"
```

---

## Task 11: Bundle-scoped RewardBroker/CardBroker in CourseRuntime

**Files:**

- Modify: `apps/learner/src/CourseRuntime.tsx`
- Test: `apps/learner/src/CourseRuntime.test.tsx`

**Context you need:** `CourseRuntime.tsx` already wires a per-module `RewardBroker`/`CardBroker` for each package (`pkg.rewards`/`pkg.cards`) in a `useEffect` (lines ~93–157), and a separate effect builds `bundleContext` (line ~481) containing `completedModules`. You will add a **second broker pair scoped to the bundle**.

- [ ] **Step 1: Add a refs + helpers**

After the existing module broker effect, add:

```typescript
const bundleCardBrokerRef = useRef<CardBroker | null>(null);
const bundleRewardBrokerRef = useRef<RewardBroker | null>(null);
const bundleCompletedRef = useRef(false);
const bundleModuleIdsRef = useRef<Set<string>>(new Set());
const bundleRewardsRef = useRef<Rewards | null>(null);
const bundleCardsRef = useRef<CardDefinitions | null>(null);
```

- [ ] **Step 2: Add the bundle broker effect**

```typescript
useEffect(() => {
  const bundle = bundleContext?.bundle;
  const session = bundleContext?.session;
  if (!bundle || !session) return;

  bundleRewardsRef.current = bundle.rewards ?? null;
  bundleCardsRef.current = bundle.cards ?? null;
  bundleModuleIdsRef.current = new Set(bundle.modules.map((m) => m.id));

  const broker = new RewardBroker({
    rewards: bundle.rewards ?? null,
    eventSource: session.events$,
    verify: (spec) => true,
    onReceipt: (receipt) => {
      setBadges((prev) => [...prev, { badge: receipt.badge, timestamp: Date.now() }]);
    },
  });

  const cardBroker = new CardBroker({
    cards: bundle.cards ?? null,
    eventSource: session.events$,
    onCardAwarded: (card) => {
      setAwardedCards((prev) => [...prev, card]);
    },
  });

  bundleRewardBrokerRef.current = broker;
  bundleCardBrokerRef.current = cardBroker;

  const sub = broker.start();
  const cardSub = cardBroker.start();

  return () => {
    sub.unsubscribe();
    cardSub.unsubscribe();
    bundleRewardBrokerRef.current = null;
    bundleCardBrokerRef.current = null;
    bundleCompletedRef.current = false;
    bundleModuleIdsRef.current = new Set();
    bundleRewardsRef.current = null;
    bundleCardsRef.current = null;
  };
}, [bundleContext?.bundle, bundleContext?.session, setBadges, setAwardedCards]);
```

Match the constructor options of the existing module brokers (`RewardBroker`/`CardBroker` in this file) exactly — reuse the existing options pattern rather than inventing new option names. If `bundleContext.session` is typed as the module's `TelemetrySession`, confirm `session.events$` exists (the existing module effect already uses this pattern).

- [ ] **Step 3: Emit `module_complete` and `bundle_complete` in `handleProgressChange`**

In `handleProgressChange`, when `progress.status === 'completed'`:

```typescript
if (bundleModuleIdsRef.current.has(pkg.id)) {
  const wasComplete = bundleCompletedRef.current;
  bundleCompletedRef.current = [...bundleModuleIdsRef.current].every(
    (id) => id === pkg.id || bundleContext?.session.getProgress(id)?.status === 'completed',
  );
  if (bundleContext?.session && bundleRewardsRef.current) {
    bundleContext.session.emit({
      event: 'module_complete',
      moduleId: pkg.id,
    } as never);
    if (bundleCompletedRef.current && !wasComplete) {
      bundleContext.session.emit({
        event: 'bundle_complete',
        bundleId: bundleContext.bundle.manifest.id,
      } as never);
      bundleRewardBrokerRef.current?.updateContext({
        completedModules: bundleContext.completedModules,
      });
      bundleCardBrokerRef.current?.updateContext({
        completedModules: bundleContext.completedModules,
      });
    }
  }
}
```

**Note:** the module-level brokers already fire `module_complete`-style events via `pkg.session.emit(...)` — this new emission targets the **bundle** session so the bundle broker sees it. Do not emit `module_complete` twice on the same session. If the existing code already emits a `module_complete` on the bundle session, emit `bundle_complete` only and skip the duplicate (verify by reading the file first).

- [ ] **Step 4: Update the test mock**

`CourseRuntime.test.tsx` mocks `@open-edu/rewards`. Add `getDefaultContext` to the mock (returning `{ completedModules: [], completedSteps: [] }`) and keep `RewardBroker`/`CardBroker` mocks supporting `updateContext` (jest `mockFn`) and `.start()` returning `{ unsubscribe }`. Also mock the bundle session's `emit` to capture events.

- [ ] **Step 5: Write tests**

Add to `CourseRuntime.test.tsx` (follow existing scaffolding — the file already renders a bundle-based course):

```typescript
it('emits bundle_complete when the last module completes', () => {
  const { result } = renderWithCourse();
  // complete all modules via handleProgressChange
  act(() => result.current.handleProgressChange(moduleA, { status: 'completed' }));
  act(() => result.current.handleProgressChange(moduleB, { status: 'completed' }));
  const events = bundleSession.emit.mock.calls.map((c) => c[0].event);
  expect(events).toContain('module_complete');
  expect(events).toContain('bundle_complete');
});

it('updates the bundle broker context with completedModules on bundle completion', () => {
  // complete all modules, then assert
  // bundleRewardBroker.updateContext / bundleCardBroker.updateContext were called
  // with an object containing completedModules
});
```

Read the existing tests first to mirror how they obtain the refs/callbacks; the mock broker instances are reachable via the mocked `@open-edu/rewards` module factory.

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @open-edu/learner test -- CourseRuntime`
Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add apps/learner/src/CourseRuntime.tsx apps/learner/src/CourseRuntime.test.tsx
git commit -m "feat(learner): wire bundle-scoped reward and card brokers in CourseRuntime"
```

---

## Task 12: CollectionBinderPage shows bundle cards; fix AppShell wiring

**Files:**

- Modify: `apps/learner/src/CollectionBinderPage.tsx`
- Modify: `apps/learner/src/AppShell.tsx`
- Create: `apps/learner/src/CollectionBinderPage.test.tsx`

- [ ] **Step 1: Read the current component**

Read `apps/learner/src/CollectionBinderPage.tsx` fully first. It renders a binder collection from cards grouped by scope; cards are keyed by bare `card.id` (line ~33).

- [ ] **Step 2: Render bundle-scoped cards**

Where the component builds the collection from its cards prop, add a bundle-scope group so bundle cards render with scope label `'bundle'`. Follow the component's existing scope-grouping pattern (it likely already renders module-scoped card groups). If the current API takes a single cards array, extend it to accept `bundleCards?: CardDefinition[]` OR pass bundle cards merged with a `scope: 'bundle'` marker — pick the option that requires the smallest change to the existing component contract.

- [ ] **Step 3: Fix the AppShell payload**

In `apps/learner/src/AppShell.tsx` at line 770, `CollectionBinderPage` receives `allPackageEntries` instead of `mergedPackageEntries`. Change it to `mergedPackageEntries` so module cards from **installed bundles** appear in the binder. `mergedPackageEntries` already merges installed + example packages for other consumers — verify the prop type still matches and adjust the page props if needed.

- [ ] **Step 4: Write tests**

Create `apps/learner/src/CollectionBinderPage.test.tsx`:

```typescript
it('renders bundle-scoped cards with a bundle label', () => {
  render(<CollectionBinderPage ... bundleCards={[sampleBundleCard]} ... />);
  expect(screen.getByText(sampleBundleCard.summary)).toBeInTheDocument();
});
```

Match the component's actual props. If the component is a fragment of a page shell, test the fragment component directly.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @open-edu/learner test -- CollectionBinderPage`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add apps/learner/src/CollectionBinderPage.tsx apps/learner/src/AppShell.tsx apps/learner/src/CollectionBinderPage.test.tsx
git commit -m "feat(learner): surface bundle cards in the collection binder"
```

---

## Task 13: Bundle card shelf on the bundle overview page

**Files:**

- Modify: `apps/learner/src/BundleOverviewPage.tsx`

- [ ] **Step 1: Read the page**

Read `apps/learner/src/BundleOverviewPage.tsx`. It receives a `LoadedBundle` (likely via props) and renders module cards.

- [ ] **Step 2: Add a bundle-level card shelf**

If the bundle has `cards`, render a "Bundle rewards" section listing the bundle's cards above (or below) the module cards, reusing the existing card chip/list component used elsewhere in the page. Follow the page's existing styling tokens and i18n rules (all labels via `t()`).

- [ ] **Step 3: Add i18n keys**

Add the section label key to `packages/i18n/locales/en/collection.yaml` (or whichever namespace `BundleOverviewPage` uses — check its `t()` calls) with English value `Bundle rewards`.

- [ ] **Step 4: Verify**

Run: `pnpm lint:hardcoded-strings` and `pnpm --filter @open-edu/learner typecheck`. If a test file exists for this page (`BundleOverviewPage.test.tsx`), extend it to assert the bundle card renders.

- [ ] **Step 5: Commit**

```bash
git add apps/learner/src/BundleOverviewPage.tsx packages/i18n/locales/en/
git commit -m "feat(learner): show bundle-level cards on the bundle overview page"
```

---

## Task 14: Authoring skill — trigger + bundle-authoring reference

**Files:**

- Modify: `skills/openedu-course-authoring/SKILL.md`
- Create: `skills/openedu-course-authoring/references/bundle-authoring.md`

- [ ] **Step 1: Add the new reference to SKILL.md**

In `skills/openedu-course-authoring/SKILL.md`, the workflow section lists references with trigger descriptions. Add to that list (alphabetical, matching the existing entries' style):

```markdown
- [bundle-authoring.md](references/bundle-authoring.md) — USE when authoring a multi-module bundle: module split rules, bundle.json manifest, dependsOn ordering, bundle-level rewards/cards placement.
- [rewards-cards-authoring.md](references/rewards-cards-authoring.md) — USE when authoring rewards.json/cards.json: triggers, conditions, scope rules (module vs bundle), global card-ID uniqueness.
```

Also add `bundle` to any frontmatter `when_to_use`/description so the skill triggers on bundle requests.

- [ ] **Step 2: Create the bundle-authoring reference**

Create `references/bundle-authoring.md` with:

```markdown
# Bundle Authoring

A **bundle** is a multi-module course. Use a bundle when content naturally splits into sequential or prerequisite-linked modules (e.g. level-based math).

## When to use a bundle vs a single package

- Single package: one lesson sequence, one workflow, no cross-module dependency.
- Bundle: 2+ modules with explicit `dependsOn` ordering, shared completion semantics, or cross-module rewards.

## Directory layout

\`\`\`
my-bundle/
├── bundle.json
├── rewards.json # optional — bundle-level rewards
├── cards.json # optional — bundle-level cards
└── modules/
├── module-a/
│ ├── package.json
│ ├── workflow.json
│ └── ...
└── module-b/
\`\`\`

## bundle.json contract

\`\`\`json
{
"id": "my-bundle",
"title": "My Bundle",
"description": "...",
"version": "1.0.0",
"modules": [
{ "id": "module-a", "title": "Module A", "dependsOn": [] },
{ "id": "module-b", "title": "Module B", "dependsOn": ["module-a"] }
],
"rewards": "./rewards.json",
"cards": "./cards.json"
}
\`\`\`

- `dependsOn` values must reference module ids present in `modules`.
- `rewards`/`cards` are optional relative paths inside the bundle directory.
- **Never** place module-level rewards/cards at the bundle root, and never place bundle-level rewards/cards inside a module. See rewards-cards-authoring.md.

## Validation

\`\`\`bash
edu validate ./my-bundle # validates bundle.json + each module
node scripts/validate-rewards-cards.mjs ./my-bundle --scope bundle
\`\`\`
```

Match the skill's existing reference-doc tone and formatting (check `references/authoring-workflow.md`).

- [ ] **Step 3: Commit**

```bash
git add skills/openedu-course-authoring/SKILL.md skills/openedu-course-authoring/references/bundle-authoring.md
git commit -m "docs(skill): add bundle authoring reference and trigger"
```

---

## Task 15: Authoring skill — rewards/cards reference

**Files:**

- Create: `skills/openedu-course-authoring/references/rewards-cards-authoring.md`

- [ ] **Step 1: Create the reference**

```markdown
# Rewards & Cards Authoring

Open-Edu rewards and cards are optional files that recognize learner progress.

## Files

- `rewards.json` — triggers that award badges (or fire webhooks/scripts).
- `cards.json` — collectible card definitions with unlock conditions.

## rewards.json structure

\`\`\`json
{
"triggers": [
{
"onEvent": "step_completed",
"rewards": [
{
"action": "badge.award",
"spec": { "badgeId": "first-step", "title": "First Step", "description": "You took your first step." },
"condition": { "type": "stepCompleted", "stepId": "intro" }
}
]
}
]
}
\`\`\`

**Important:** `condition` belongs on the **reward/action**, not on the trigger.

## Condition types and scope

| Condition           | Module scope | Bundle scope | Notes                                                           |
| ------------------- | ------------ | ------------ | --------------------------------------------------------------- |
| `stepCompleted`     | ✅           | ❌           | module-local                                                    |
| `exerciseCompleted` | ✅           | ❌           | module-local                                                    |
| `activityCompleted` | ✅           | ❌           | module-local                                                    |
| `score`             | ✅           | ❌           | module-local                                                    |
| `chain`             | ✅           | ❌           | module-local                                                    |
| `attempts`          | ✅           | ❌           | module-local                                                    |
| `answeredCorrectly` | ✅           | ❌           | module-local                                                    |
| `moduleUnlocked`    | ✅           | ❌           | module-local                                                    |
| `moduleFailed`      | ✅           | ❌           | module-local                                                    |
| `moduleCompleted`   | ❌           | ✅           | bundle broker only                                              |
| `bundleCompleted`   | ❌           | ✅           | fires when ALL modules complete                                 |
| `skill`             | ❌           | ✅           | cross-module                                                    |
| `and` / `or`        | ⚠️           | ✅           | children must stay within the same scope                        |
| `bundleCondition`   | ❌           | ✅           | single-module condition evaluated against the completing module |

## Placement decision tree

1. Reward tied to a step/exercise/score inside one module → **module-level** file in that module.
2. Reward tied to finishing a whole module → **module-level**, `condition: { "type": "moduleCompleted" }` in that module's rewards (module brokers support this today).
3. Reward tied to finishing all modules or cross-module milestones → **bundle-level**, `bundleCompleted`/`moduleCompleted`/`skill`.

## Global card-ID uniqueness

Card IDs must be unique across the **entire bundle** (all module cards + bundle cards). Saved progress is keyed by bare `card.id`. Use a `module-` or `bundle-` prefix.

## Validation

\`\`\`bash
node scripts/validate-rewards-cards.mjs ./my-package
node scripts/validate-rewards-cards.mjs ./my-bundle --scope bundle
\`\`\`
```

- [ ] **Step 2: Commit**

```bash
git add skills/openedu-course-authoring/references/rewards-cards-authoring.md
git commit -m "docs(skill): add rewards and cards authoring reference"
```

---

## Task 16: Authoring skill — artifact contract + quality rubric

**Files:**

- Modify: `skills/openedu-course-authoring/references/artifact-contract.md`
- Modify: `skills/openedu-course-authoring/references/quality-rubric.md`

- [ ] **Step 1: Extend the artifact contract**

In `references/artifact-contract.md`, add a "Bundle-level artifacts" subsection documenting `bundle.json` (`rewards`/`cards` optional relative paths), bundle-root `rewards.json`, bundle-root `cards.json`, and a "Rewards/cards artifacts" subsection documenting per-file required fields (mirror the real schemas at `packages/schemas/src/rewards.ts` and `cards.ts` — read them first).

- [ ] **Step 2: Add quality checks**

In `references/quality-rubric.md`, add a new dimension table (after Dimension 7):

```markdown
## Dimension 8: Rewards & Cards

| Check ID    | Rule                                                          | Severity  |
| ----------- | ------------------------------------------------------------- | --------- |
| `QC-REW-01` | Reward `condition` is attached to the reward, not the trigger | `error`   |
| `QC-REW-02` | Condition scope matches file placement (module vs bundle)     | `error`   |
| `QC-REW-03` | Card IDs are unique across the whole bundle                   | `error`   |
| `QC-REW-04` | Card definitions include summary, category, and levels        | `warning` |
| `QC-REW-05` | No condition uses a signal the scope cannot evaluate          | `error`   |
```

- [ ] **Step 3: Commit**

```bash
git add skills/openedu-course-authoring/references/artifact-contract.md skills/openedu-course-authoring/references/quality-rubric.md
git commit -m "docs(skill): extend artifact contract and rubric for rewards and cards"
```

---

## Task 17: Authoring skill — structural validator script

**Files:**

- Create: `skills/openedu-course-authoring/scripts/validate-rewards-cards.mjs`
- Create: `skills/openedu-course-authoring/scripts/__tests__/validate-rewards-cards.test.mjs`

- [ ] **Step 1: Write the validator**

Create `scripts/validate-rewards-cards.mjs` (plain Node, no imports of compiled packages; look at `scripts/validate-package.mjs` for style and CLI conventions). Behavior:

- Usage: `node scripts/validate-rewards-cards.mjs <target-dir> [--scope module|bundle]`
- Finds `rewards.json`/`cards.json` at the target root. If `--scope bundle`, also checks `<target-dir>/bundle.json` for `rewards`/`cards` paths and validates the referenced files.
- Structural checks on `rewards.json`: `triggers` is a non-empty array; each trigger has `onEvent` (string) and `rewards` (non-empty array); each reward has `action` (one of `badge.award`, `webhook`, `script`), `spec` (object); `condition` when present has a `type` and per-type fields; **condition must be on the reward, not the trigger** (report `QC-REW-01`).
- Scope checks: when `--scope bundle`, reject module-local condition types (`stepCompleted`, `exerciseCompleted`, `score`, `chain`, `activityCompleted`, `moduleUnlocked`, `moduleFailed`, `attempts`, `answeredCorrectly`) anywhere in the file; when `--scope module`, reject `bundleCompleted`/`moduleCompleted`/`skill`/`bundleCondition` (report `QC-REW-02`).
- Structural checks on `cards.json`: `cards` non-empty array; each card has `id`, `category`, `summary`, `levels` (non-empty); `unlock.type` present; **all card `id`s unique** (report `QC-REW-03`); when `--scope bundle`, validate the card `unlock.condition` scope rules the same way as rewards (report `QC-REW-05`).
- Exit code 0 when no `error` findings, 1 otherwise; print a JSON report matching `quality-report.json` style (`{ success, findings: [{ checkId, severity, message }] }`).
- Also expose a `validateRewardsCards(dir, { scope })` function returning the findings object (so the test can import it).

- [ ] **Step 2: Write the tests**

Create `scripts/__tests__/validate-rewards-cards.test.mjs` using `node:test` + `node:assert` (match the pattern in the existing `__tests__` directory):

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateRewardsCards } from '../validate-rewards-cards.mjs';

function writeBundle(files) {
  const dir = mkdtempSync(join(tmpdir(), 'rew-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = join(dir, rel);
    mkdirSync(join(p, '..'), { recursive: true });
    writeFileSync(p, typeof content === 'string' ? content : JSON.stringify(content));
  }
  return dir;
}

test('passes valid bundle-scope rewards', () => {
  const dir = writeBundle({
    'bundle.json': { modules: [], rewards: './rewards.json' },
    'rewards.json': {
      triggers: [
        {
          onEvent: 'bundle_complete',
          rewards: [{ action: 'badge.award', spec: {}, condition: { type: 'bundleCompleted' } }],
        },
      ],
    },
  });
  const report = validateRewardsCards(dir, { scope: 'bundle' });
  assert.equal(report.success, true);
  assert.equal(report.findings.filter((f) => f.severity === 'error').length, 0);
});

test('reports a condition on the trigger as QC-REW-01', () => {
  const dir = writeBundle({
    'rewards.json': {
      triggers: [
        {
          onEvent: 'step_completed',
          condition: { type: 'stepCompleted', stepId: 's' },
          rewards: [{ action: 'badge.award', spec: {} }],
        },
      ],
    },
  });
  const report = validateRewardsCards(dir, { scope: 'module' });
  assert.ok(report.findings.some((f) => f.checkId === 'QC-REW-01' && f.severity === 'error'));
});

test('reports a module-local condition at bundle scope as QC-REW-02', () => {
  const dir = writeBundle({
    'rewards.json': {
      triggers: [
        {
          onEvent: 'step_completed',
          rewards: [
            { action: 'badge.award', spec: {}, condition: { type: 'stepCompleted', stepId: 's' } },
          ],
        },
      ],
    },
  });
  const report = validateRewardsCards(dir, { scope: 'bundle' });
  assert.ok(report.findings.some((f) => f.checkId === 'QC-REW-02'));
});

test('reports duplicate card ids as QC-REW-03', () => {
  const dir = writeBundle({
    'cards.json': {
      cards: [
        {
          id: 'x',
          category: 'badge',
          summary: 'a',
          unlock: { type: 'bundleCompleted' },
          levels: [{}],
        },
        {
          id: 'x',
          category: 'badge',
          summary: 'b',
          unlock: { type: 'bundleCompleted' },
          levels: [{}],
        },
      ],
    },
  });
  const report = validateRewardsCards(dir, { scope: 'bundle' });
  assert.ok(report.findings.some((f) => f.checkId === 'QC-REW-03'));
});
```

- [ ] **Step 3: Run tests**

Run: `node --test skills/openedu-course-authoring/scripts/__tests__/validate-rewards-cards.test.mjs`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add skills/openedu-course-authoring/scripts/validate-rewards-cards.mjs skills/openedu-course-authoring/scripts/__tests__/validate-rewards-cards.test.mjs
git commit -m "feat(skill): add rewards/cards structural validator script"
```

---

## Task 18: Authoring skill — eval fixtures

**Files:**

- Modify: `skills/openedu-course-authoring/evals/evals.json`
- Modify: `skills/openedu-course-authoring/evals/README.md`

- [ ] **Step 1: Add a bundle eval**

Append to `evals.json` (keep numeric `id`s unique; the eval index test requires non-empty prompts):

```json
{
  "id": 10,
  "prompt": "Create an Open-Edu bundle course about basic algebra with two modules: module-a (linear equations) and module-b (word problems). Each module is a single package. Add a bundle-level rewards.json with a bundle-completion badge and a bundle-level cards.json with one card unlocked on bundle completion.",
  "expected_output": "Mode: portable. Generate a two-module bundle in portable mode.\nExpected artifacts: bundle.json, module-a/package.json, module-b/package.json, rewards.json, cards.json.\nChecks:\n- bundle.json has modules [module-a, module-b]\n- module-b dependsOn module-a\n- rewards.json has a trigger with condition bundleCompleted\n- cards.json has one card with unlock.type bundleCompleted\n- card id is prefixed (e.g. bundle-...)",
  "files": [
    "bundle.json",
    "rewards.json",
    "cards.json",
    "module-a/package.json",
    "module-b/package.json"
  ],
  "expectations": [
    "bundle.json has modules [module-a, module-b]",
    "module-b dependsOn module-a",
    "rewards.json condition uses bundleCompleted",
    "cards.json unlock uses bundleCompleted",
    "card id is globally unique"
  ]
}
```

Add a second eval for a module-scoped rewards/cards placement decision if you want broader coverage:

```json
{
  "id": 11,
  "prompt": "Create a single-module Open-Edu course about fractions with a module-level rewards.json awarding a badge after the learner completes the first step, and a module-level cards.json with one card unlocked by that step. Keep the card id namespaced.",
  "expected_output": "Mode: portable. Single package with rewards.json and cards.json at package root.\nChecks:\n- rewards.json trigger onEvent step_completed\n- reward condition type stepCompleted\n- cards.json card unlock references the same step\n- card id is namespaced",
  "files": ["package.json", "rewards.json", "cards.json"],
  "expectations": [
    "rewards.json trigger onEvent step_completed",
    "reward condition type stepCompleted",
    "cards.json unlock references the same step",
    "card id is namespaced"
  ]
}
```

- [ ] **Step 2: Update the evals index**

Add both to the list in `evals/README.md` with a one-line description each.

- [ ] **Step 3: Verify**

Run: `node packages/i18n/src/i18n-keys.test.ts` — no, that is unrelated. Instead run any existing skill-eval validation test if present; otherwise verify the JSON parses: `node -e "JSON.parse(require('fs').readFileSync('skills/openedu-course-authoring/evals/evals.json','utf8'))"`.

- [ ] **Step 4: Commit**

```bash
git add skills/openedu-course-authoring/evals/evals.json skills/openedu-course-authoring/evals/README.md
git commit -m "feat(skill): add bundle and rewards/cards eval fixtures"
```

---

## Task 19: Docs — rewards, package-authoring, OpenWiki

**Files:**

- Modify: `apps/docs/docs/rewards.md`
- Modify: `apps/docs/docs/package-authoring.md`
- Modify: `openwiki/domain/content-and-workflows.md`

- [ ] **Step 1: Fix the rewards doc example bug**

In `apps/docs/docs/rewards.md`, the example at line ~82 puts `conditions` on the trigger. Move `condition` onto the reward and fix the key name:

```json
{
  "triggers": [
    {
      "onEvent": "step_completed",
      "rewards": [
        {
          "action": "badge.award",
          "spec": {
            "badgeId": "intro",
            "title": "Intro",
            "description": "Completed the intro step"
          },
          "condition": { "type": "stepCompleted", "stepId": "intro" }
        }
      ]
    }
  ]
}
```

- [ ] **Step 2: Add a bundle-level section to rewards.md**

Add a "Bundle-level rewards and cards" section explaining: files live at the bundle root (`rewards.json`/`cards.json`), referenced from `bundle.json`; the `bundleCompleted` condition fires when all modules complete; scope table (module vs bundle); global card-ID uniqueness.

- [ ] **Step 3: Document in package-authoring.md**

Add a short "Bundle-level rewards and cards" subsection referencing the same scope table.

- [ ] **Step 4: Update OpenWiki**

In `openwiki/domain/content-and-workflows.md`, note that bundle-level rewards/cards are supported (a sentence in the rewards/cards domain section).

- [ ] **Step 5: Verify**

Run: `pnpm lint` (docs spelling/format if configured). This task is documentation-only — no test command beyond lint.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/docs/rewards.md apps/docs/docs/package-authoring.md openwiki/domain/content-and-workflows.md
git commit -m "docs: document bundle-level rewards and cards"
```

---

## Task 20: Optional — extend the level-b-math example for e2e coverage

**Files:**

- Modify: `examples/level-b-math/`

- [ ] **Step 1: Add bundle-level rewards/cards**

Add `rewards.json` and `cards.json` at the `examples/level-b-math/` root, and add `rewards`/`cards` paths to its `bundle.json`. Use a `bundleCompleted`-conditioned badge and one bundle card.

- [ ] **Step 2: Extend the e2e bundle test**

If `tests/e2e/oep-level-b-math-e2e.test.ts` (or the install flow in Task 7) asserts the extracted bundle, add assertions that `extraction.rewards`/`extraction.cards` are defined after `oep:build-bundle` and install.

- [ ] **Step 3: Verify**

Run the bundle e2e spec: `pnpm test:e2e -- oep-level-b-math`

- [ ] **Step 4: Commit**

```bash
git add examples/level-b-math/ tests/e2e/
git commit -m "test(e2e): add bundle-level rewards and cards to level-b-math example"
```

---

## Final Verification

Before declaring the work complete, run the full suite from the repo root:

```bash
pnpm test            # all unit tests
pnpm typecheck       # all packages type-check
pnpm lint            # includes i18n hardcoded-string scan
pnpm format:check    # formatting
pnpm test:e2e        # Playwright E2E (if environment allows)
```

If any test the plan did not anticipate fails because of a type/fixture ripple, fix it in a small follow-up commit rather than reverting scope.

## Suggested implementation order & commit cadence

Tasks 1–3 are independent and can be parallelized by separate agents (different packages). Task 4 depends only on the rewards types (already present). Task 5 is independent. Tasks 6–8 depend on Task 1. Tasks 10–13 depend on Task 8. Tasks 14–18 are independent. Tasks 19–20 are last.

Commit after **each** task (small, conventional commits as shown). Never batch unrelated tasks into one commit.
