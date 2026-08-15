# Phase 2 — Resolver, Cache, and Common Lifecycle

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve widget references through a policy-aware `WidgetResolver`, verify manifests and documents, cache verified artifacts, and route native vs sandboxed widgets through one host lifecycle.

**Architecture:** `WidgetRenderer` stops branching on `node.remoteWidget` first. It calls `normalizeWidgetReference` then `WidgetResolver.resolve`. Native hits `NativeWidgetAdapter` (current React render). Registry hits `SandboxWidgetAdapter` with a verified document. Cache key is `{widgetId, version, integrity}`. Revoked cached artifacts may run offline for 7 days then hard-block.

**Tech Stack:** TypeScript, Zod, Vitest, IndexedDB (fake-indexeddb in tests), React

**Depends on:** Phase 1.

**Index:** [`2026-08-15-runtime-community-widget-ecosystem-index.md`](./2026-08-15-runtime-community-widget-ecosystem-index.md)

---

## File Map

| File                                                   | Responsibility                         |
| ------------------------------------------------------ | -------------------------------------- |
| `packages/widgets/src/resolver/normalize-reference.ts` | `remoteWidget` → `WidgetReference`     |
| `packages/widgets/src/resolver/fetch-manifest.ts`      | HTTPS fetch + course-pinned integrity  |
| `packages/widgets/src/resolver/widget-resolver.ts`     | Orchestration; no progress mutation    |
| `packages/widgets/src/artifact-cache.ts`               | Memory + IDB; verify on read           |
| `packages/widgets/src/fallback-transform.ts`           | Config adapter in/out schemas          |
| `packages/widgets/src/state-migration.ts`              | Host validates migrated state          |
| `packages/runtime/src/widgets/NativeWidgetAdapter.tsx` | Wrap `WidgetDefinition.render`         |
| `packages/runtime/src/renderers/WidgetRenderer.tsx`    | Resolver-driven render                 |
| `apps/learner/src/widget-policy.ts`                    | Deployment policy + `frame-src` helper |
| `packages/i18n/locales/en/runtime.json`                | `widget.unavailable`                   |

Do **not** unzip archives or serve zip-relative URLs.

---

### Task 1: Normalize legacy remoteWidget

**Files:**

- Create: `packages/widgets/src/resolver/normalize-reference.ts`
- Create: `packages/widgets/src/resolver/normalize-reference.test.ts`

```ts
import type { RemoteWidgetManifest, WidgetReference } from '@open-edu/schemas';

export interface NormalizeWarning {
  code: 'legacy-url-source' | 'missing-integrity';
  message: string;
}

export function normalizeWidgetReference(input: {
  widget?: string;
  version?: string;
  remoteWidget?: RemoteWidgetManifest;
  widgetRef?: WidgetReference;
}): { ref: WidgetReference; warnings: NormalizeWarning[] } {
  if (input.widgetRef) return { ref: input.widgetRef, warnings: [] };
  if (input.remoteWidget) {
    return {
      ref: {
        id: input.remoteWidget.id,
        version: input.remoteWidget.version,
        source: 'url',
        fallback: input.remoteWidget.fallback,
        integrity: input.remoteWidget.integrity,
      },
      warnings: [
        { code: 'legacy-url-source', message: 'remoteWidget normalized to source=url' },
        ...(!input.remoteWidget.integrity
          ? [
              {
                code: 'missing-integrity' as const,
                message: 'legacy remoteWidget has no integrity',
              },
            ]
          : []),
      ],
    };
  }
  return {
    ref: {
      id: input.widget ?? 'exercise',
      version: input.version ?? '0.0.0',
      source: 'builtin',
    },
    warnings: [],
  };
}
```

Fix the integrity typing: `integrity` is optional string on url refs. Tests: custom node with `remoteWidget` and no integrity → `source: 'url'` + `missing-integrity` warning; `widgetRef` registry with integrity passes through; builtin `widget: 'core.matching'` → `source: 'builtin'`.

- [ ] Commit `feat(widgets): normalize remoteWidget into WidgetReference`

---

### Task 2: Artifact cache

**Files:**

- Create: `packages/widgets/src/artifact-cache.ts`
- Create: `packages/widgets/src/artifact-cache.test.ts`

Use `fake-indexeddb` as a **devDependency** of `@open-edu/widgets` if `indexedDB` is missing in the Vitest environment; otherwise use in-memory fallback automatically.

```ts
export interface CacheEntry {
  widgetId: string;
  version: string;
  integrity: string;
  bytes: ArrayBuffer;
  cachedAt: number;
  revokedAt?: number;
}

export interface WidgetArtifactCache {
  get(widgetId: string, version: string, integrity: string): Promise<ArrayBuffer | undefined>;
  put(entry: CacheEntry): Promise<void>;
  invalidate(widgetId: string, version: string): Promise<void>;
  clear(): Promise<void>;
}
```

`get` recomputes `canonicalIntegrity(bytes)` and returns undefined on mismatch (never execute). LRU: max 32 entries memory, 50 MiB IDB (evict oldest `cachedAt`). Tests: hit, miss, mismatch returns undefined, invalidate, clear.

- [ ] Commit `feat(widgets): add verified widget artifact cache`

---

### Task 3: Fallback config transform

**Files:**

- Create: `packages/widgets/src/fallback-transform.ts`
- Create: `packages/widgets/src/fallback-transform.test.ts`

```ts
export interface FallbackAdapter {
  inputSchema: z.ZodType;
  outputSchema: z.ZodType;
  transform: (config: unknown) => unknown;
}

export function applyFallbackConfig(adapter: FallbackAdapter, config: unknown): unknown {
  const input = adapter.inputSchema.safeParse(config);
  if (!input.success) throw new Error('fallback-input-invalid');
  const out = adapter.transform(input.data);
  const output = adapter.outputSchema.safeParse(out);
  if (!output.success) throw new Error('fallback-output-invalid');
  return output.data;
}
```

Ship one adapter `communityCounterToMultipleChoice` for the Phase 1 example: input `{ prompt: string }` → `{ question, options: [{id:'a',text:'OK',correct:true},{id:'b',text:'Skip',correct:false}] }` using `core.multiple-choice` shape. Test invalid input throws and does not guess.

- [ ] Commit `feat(widgets): add deterministic fallback config adapters`

---

### Task 4: WidgetResolver

**Files:**

- Create: `packages/widgets/src/resolver/widget-resolver.ts`
- Create: `packages/widgets/src/resolver/widget-resolver.test.ts`
- Create: `packages/widgets/src/resolver/fetch-manifest.ts`

```ts
export type ResolveFailure =
  | 'policy'
  | 'integrity'
  | 'incompatible'
  | 'revoked'
  | 'unavailable'
  | 'schema'
  | 'timeout';

export type ResolvedWidget =
  | { ok: true; tier: 'native'; widgetId: string; version: string; definition: WidgetDefinition }
  | {
      ok: true;
      tier: 'sandboxed';
      widgetId: string;
      version: string;
      manifest: WidgetManifest;
      documentBytes: ArrayBuffer;
      documentUrl?: string;
      srcDoc?: string;
    }
  | { ok: false; failure: ResolveFailure; message: string };
```

`createWidgetResolver({ policy, cache, catalogs, fetchImpl, now })`.

Algorithm (must match spec §10.1):

1. `normalizeWidgetReference`
2. If `source === 'builtin'` → registry.get; missing → `{ failure: 'unavailable' }`
3. If `source === 'url'` → require `trusted-remote` enabled; else `{ failure: 'policy' }` with warning already recorded
4. If `source === 'registry'`:
   - require `ref.integrity`
   - load manifest bytes from `catalogs[ref.registryId]` or fetch `manifestUrl` constructed as `{base}/{publisher}/{widget}/{version}/manifest.json` where `base` comes from **deployment catalog config**, never from the course
   - `verifyIntegrity(manifestBytes, ref.integrity)` **before** parsing JSON
   - `WidgetManifestSchema.parse`
   - if `status === 'revoked'`: if online → fail `revoked`; if offline and `cachedAt` within 7 days of `revokedAt` → allow cached document; else fail
   - unsigned publisher `status: 'verified'` is rewritten to `experimental` (resolver, not schema)
   - if experimental and policy `experimentalWidgets === 'deny'` → `policy`
   - grant = intersection(manifest.capabilities, policy grants). Phase 2 policy adds `grantedCapabilities: WidgetCapability[]` defaulting to all v1 capabilities except none extra
   - fetch document bytes (or cache.get); `verifyIntegrity(bytes, manifest.artifact.documentIntegrity)`
   - if `format === 'self-contained-html'` → `srcDoc = decode(bytes)`
   - else → `documentUrl = manifest.artifact.documentUrl` (must be allowlisted origin)
   - validate `node.config` against fetched `schemas.configUrl` JSON Schema if present; on failure → `schema` (do not execute)
5. Never call `completeNode` / `saveAnswer`

Tests with mocked fetch:

- builtin matching
- registry integrity mismatch never returns document
- revoked online fails
- revoked offline within 7d returns cached
- revoked offline after 7d fails
- legacy url without trusted-remote fails policy
- config schema reject

Network retry: fetchImpl wrapper retries **once** on `TypeError` (network) with 200ms delay; no retry on 4xx, integrity, or parse errors.

- [ ] Commit `feat(widgets): add WidgetResolver with integrity-first registry loading`

---

### Task 5: Static catalog loader

**Files:**

- Create: `packages/widgets/src/resolver/catalog.ts`
- Create: `packages/widgets/src/resolver/catalog.test.ts`

```ts
export const WidgetCatalogFileSchema = z.object({
  registryId: z.string(),
  origin: z.string().url(),
  widgets: z.array(
    z.object({
      id: z.string(),
      version: z.string(),
      manifestUrl: z.string().url(),
      status: z.enum(['experimental', 'verified', 'deprecated', 'revoked']),
      trustTier: z.enum(['native', 'sandboxed']),
      offline: z.boolean(),
    }),
  ),
});
```

`loadStaticCatalog(json: unknown)` parses and indexes by `id@version`. Test rejects http origin. Fixture: `packages/widgets/src/resolver/fixtures/catalog.json` pointing at `https://widgets.example.edu/...`.

- [ ] Commit `feat(widgets): load static widget registry catalogs`

---

### Task 6: Native adapter + renderer cutover

**Files:**

- Create: `packages/runtime/src/widgets/NativeWidgetAdapter.tsx`
- Create: `packages/runtime/src/widgets/NativeWidgetAdapter.test.tsx`
- Modify: `packages/runtime/src/renderers/WidgetRenderer.tsx`
- Modify: `packages/i18n/locales/en/runtime.json` (+ `hi`, `or` with English fallback copies if translators absent — **must** add keys to all locale files the lint requires)

`NativeWidgetAdapter` is the current builtin branch extracted: error boundary, canvas, step-sync, `buildWidgetAnswer`, `normalizeWidgetInteraction`. Props include `definition`, `node`, `nodeId`.

`WidgetRenderer`:

```ts
const { ref, warnings } = normalizeWidgetReference(node);
warnings.forEach((w) =>
  emitTelemetry?.({
    event: 'widget_interaction',
    widgetId: ref.id,
    action: 'custom',
    data: { diagnostic: w.code },
  }),
);
```

Do **not** send diagnostics as `widget_interaction` if that pollutes analytics. Prefer `onDiagnostic` no-op in production and `console.warn` in development. Spec §18: diagnostics must not record config or answers.

On resolve failure: if `ref.fallback` and `applyFallbackConfig` succeeds, render native fallback with provenance; else show `t('runtime.widget.unavailable', { id: ref.id })`.

Enable sandbox flag by default for `source === 'registry'` in learner once resolver tests pass. Keep trusted-remote default off.

Idle unmount: if `currentNodeId !== nodeId`, sandbox adapter unmounts iframe; remount restores `storedState` from host answers. Test with two nodes.

One iframe per node: assert in adapter module-level `activeFrames` counter in tests.

- [ ] Add i18n keys:

```json
"widget.unavailable": "This activity is unavailable.",
"widget.iframe_title": "Interactive widget: {{id}}"
```

- [ ] Commit `feat(runtime): resolve widgets through native and sandbox adapters`

---

### Task 7: Learner policy + CSP helper

**Files:**

- Create: `apps/learner/src/widget-policy.ts`
- Create: `apps/learner/src/widget-policy.test.ts`

```ts
export function frameSrcCsp(allowedOrigins: string[]): string {
  const extra = allowedOrigins.join(' ');
  return `frame-src 'self' ${extra}`.trim();
}
```

Test: empty allowlist → `frame-src 'self'`. Document in comment: inject via hosting headers; Vite dev cannot fully emulate production CSP — E2E in Phase 4.

Pass `DEFAULT_WIDGET_POLICY` plus env `OPEN_EDU_WIDGET_ORIGINS` (comma-separated https origins) into resolver from `CourseRuntime`.

- [ ] Commit `feat(learner): configure widget origin allowlist for frame-src`

---

### Task 8: State schema version + migration failure

**Files:**

- Create: `packages/widgets/src/state-migration.ts`
- Create: `packages/widgets/src/state-migration.test.ts`

Host does **not** run widget migration functions (they run inside the iframe). Host validates:

```ts
export function assertPersistableState(state: unknown, maxBytes = 64 * 1024): void {
  const json = JSON.stringify(state);
  if (json.length > maxBytes) throw new Error('too-large');
}
```

If stored state's `schemaVersion` !== manifest state schema version, resolver returns `{ failure: 'schema', message: 'state-incompatible' }` unless the widget has already posted a migrated `state:save` that the host accepted. Test: oversized state rejected; incompatible version surfaces recoverable error string `state-incompatible`.

Sandbox adapter: on accepted save, post `state:update` with `normalizedState`. On reject, include `rejectionReason`.

- [ ] Commit `feat(widgets): reject oversized and incompatible widget state`

---

### Task 9: Phase 2 verification

```bash
pnpm --filter @open-edu/schemas test
pnpm --filter @open-edu/widgets test
pnpm --filter @open-edu/runtime test
pnpm --filter @open-edu/widget-sdk test
```

Expected: PASS. `examples/hello-world` and built-ins still render via native adapter.

- [ ] Confirm resolver never imports `WorkflowEngine`
