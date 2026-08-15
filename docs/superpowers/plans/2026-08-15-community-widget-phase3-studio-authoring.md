# Phase 3 — Studio and AI Authoring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Studio and AI authoring use the same catalog as the runtime: discover widgets, hide revoked, label experimental/sandboxed, validate config with JSON Schema, preview via `SandboxWidgetAdapter`, and pin exact version + manifest integrity on export.

**Architecture:** Extend `CuratedWidget` and `apps/dev-server/src/studio/widgets/curatedCatalog.ts` to merge built-in `WIDGET_CATALOG_ENTRIES` with static registry catalogs from workspace config. Export path writes `widgetRef` (never a live URL for instance registries). AI prompt tables include only catalog IDs; `catalog-guard` rejects unknown IDs.

**Tech Stack:** TypeScript, Vitest, React Testing Library, existing Studio i18n `studio` namespace

**Depends on:** Phase 2.

**Index:** [`2026-08-15-runtime-community-widget-ecosystem-index.md`](./2026-08-15-runtime-community-widget-ecosystem-index.md)

---

## File Map

| File                                                                    | Change                                    |
| ----------------------------------------------------------------------- | ----------------------------------------- |
| `apps/dev-server/src/studio/widgets/curatedCatalog.ts`                  | Merge registry entries                    |
| `apps/dev-server/src/studio/widgets/curatedCatalog.test.ts`             | Hide revoked, label experimental          |
| `apps/dev-server/src/studio/widgets/widgetRefExport.ts`                 | Pin version + integrity                   |
| `apps/dev-server/src/studio/ai/prompts/buildPrompt.ts`                  | Include source/trust/offline columns      |
| `apps/dev-server/src/studio/ai/prompts/__tests__/catalog-guard.test.ts` | Registry IDs allowed if in merged catalog |
| `apps/dev-server/src/editor/JSONNodeEditor.tsx`                         | Prefer `widgetRef` fields                 |
| `packages/i18n/locales/en/studio.json`                                  | New copy keys                             |

Do not add a marketplace UI.

---

### Task 1: Merged catalog model

**Files:**

- Modify: `apps/dev-server/src/studio/widgets/curatedCatalog.ts`
- Modify: `apps/dev-server/src/studio/widgets/curatedCatalog.test.ts`

Extend `CuratedWidget`:

```ts
export interface CuratedWidget {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  status?: string;
  deprecated?: boolean;
  source: 'builtin' | 'registry';
  registryId?: string;
  trustTier: 'native' | 'sandboxed';
  version: string;
  integrity?: string;
  offline?: boolean;
  experimental?: boolean;
  configSchema?: Record<string, unknown>;
  guide?: Partial<NonNullable<WidgetCatalogEntry['guide']>>;
  guideMarkdown?: string;
}
```

`loadCatalogWidgets()`: start with built-ins (`source: 'builtin'`, `trustTier: 'native'`, `version` from widget definition or `'0.1.0'`). Merge `loadStaticCatalog` results. Skip `status === 'revoked'`. Set `experimental` when status is experimental or unsigned.

Tests: revoked id absent; experimental flagged; builtin `core.matching` still present.

- [ ] Add studio strings:

```json
"widget.sandboxed_badge": "Sandboxed",
"widget.experimental_badge": "Experimental",
"widget.online_only_warning": "This widget requires a network connection.",
"widget.missing_registry_warning": "This course references registry \"{{id}}\" which is not configured in this deployment."
```

Use `t()` from `@open-edu/i18n`. Add keys to every locale file `studio.json` that already exists.

- [ ] Commit `feat(studio): merge registry widgets into the curated catalog`

---

### Task 2: JSON Schema config validation in Studio

**Files:**

- Create: `apps/dev-server/src/studio/widgets/validateWidgetConfig.ts`
- Create: `apps/dev-server/src/studio/widgets/validateWidgetConfig.test.ts`

Use AJV **only if already a dependency**. If not, validate with a small JSON Schema subset or `zod` conversion. Prefer: if `configSchema` is present, `import Ajv from 'ajv'` — check `apps/dev-server/package.json` first. If Ajv is absent, add `ajv` as a dependency of `@open-edu/dev-server` (not the learner).

```ts
export function validateWidgetConfig(
  schema: Record<string, unknown> | undefined,
  config: unknown,
): { ok: true } | { ok: false; errors: string[] };
```

Test: missing required field fails; extra properties allowed unless schema `additionalProperties: false`.

- [ ] Commit `feat(studio): validate community widget config against JSON Schema`

---

### Task 3: Export pins exact version and integrity

**Files:**

- Create: `apps/dev-server/src/studio/widgets/widgetRefExport.ts`
- Create: `apps/dev-server/src/studio/widgets/widgetRefExport.test.ts`

```ts
export function toExportedWidgetRef(widget: CuratedWidget, fallback?: string): WidgetReference {
  if (widget.source === 'builtin') {
    return { id: widget.id, version: widget.version, source: 'builtin', fallback };
  }
  if (!widget.integrity) {
    throw new Error('Cannot export registry widget without manifest integrity');
  }
  return {
    id: widget.id,
    version: widget.version,
    source: 'registry',
    registryId: widget.registryId,
    integrity: widget.integrity,
    fallback,
  };
}
```

Tests: builtin has no integrity field; registry without integrity throws; registry with integrity includes `registryId`.

Wire into whatever Studio export/compile path writes `custom` nodes (search `remoteWidget` in `apps/dev-server/src`). Replace writes of `remoteWidget.url` for new registry widgets. Keep reading `remoteWidget` for old courses.

Warn when `registryId` is not in the deployment’s configured catalogs (`studio.widget.missing_registry_warning`).

- [ ] Commit `feat(studio): pin widget version and integrity on course export`

---

### Task 4: Sandbox preview in Studio

**Files:**

- Create: `apps/dev-server/src/studio/widgets/CommunityWidgetPreview.tsx`
- Create: `apps/dev-server/src/studio/widgets/CommunityWidgetPreview.test.tsx`

Mount `SandboxWidgetAdapter` with the selected catalog widget’s document (dev registry origin allowed). Observe-mode: pass `capabilities` including `observe-mode` and omit complete handler side effects on the course.

Test: iframe sandbox attribute present; complete from preview does not call course `saveAnswer` (pass a spy, expect 0).

- [ ] Commit `feat(studio): preview community widgets through the sandbox adapter`

---

### Task 5: AI catalog guard and prompt table

**Files:**

- Modify: `apps/dev-server/src/studio/ai/prompts/buildPrompt.ts`
- Modify: `apps/dev-server/src/studio/ai/prompts/__tests__/catalog-guard.test.ts`
- Modify: `apps/dev-server/src/studio/ai/prompts/__tests__/coursePrompt.test.ts`

Prompt table columns: `id | name | source | trust | version | offline | status`.

Guard: generated widget id must exist in merged catalog; revoked never listed; AI must not emit `remoteWidget.url`. Add test that `community.example.counter` is accepted when present in merged catalog and `not-a-widget` is rejected.

- [ ] Commit `feat(studio): constrain AI authoring to the merged widget catalog`

---

### Task 6: Phase 3 verification

```bash
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/runtime test
```

Expected: PASS. Creator mode still defaults to built-ins; registry widgets labeled sandboxed.
