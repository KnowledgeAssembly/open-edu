# Widget Answer Persistence Design

**Date:** 2026-07-07
**Status:** Approved for implementation

## Problem

Submitted answers are lost when navigating back to a completed widget-based node (`exercise`/`custom`). Quiz and reflection nodes already persist answers via `NodeAnswerSchema` discriminated union + `RuntimeContext.answers` + `saveAnswer`. Widgets have no equivalent mechanism.

## Design

### 1. Schema: Add `WidgetAnswerSchema`

**File:** `packages/schemas/src/progress.ts`

Add a generic answer type to the existing `NodeAnswerSchema` discriminated union:

```typescript
const WidgetAnswerSchema = z.object({
  type: z.literal('widget'),
  widgetId: z.string(),
  widgetVersion: z.string().optional(), // enables state migration across versions
  data: z.unknown(), // widget-specific serialized state
  score: z.number().optional(),
});

export const NodeAnswerSchema = z.discriminatedUnion('type', [
  QuizAnswerSchema,
  ReflectionAnswerSchema,
  WidgetAnswerSchema,
]);
```

`data` is intentionally `z.unknown()` — some widgets may serialize as objects, arrays, or primitives. Each widget is responsible for validating its own stored state via a local Zod schema on restore.

`widgetVersion` allows widgets to run migrations on restored state if their internal data structure changes across versions (progress snapshots can be long-lived).

### 2. Widget SDK: Extend `WidgetRenderProps`

**File:** `packages/widgets/src/types.ts`

Replace `storedAnswer`/`onAnswer` with a simpler API that hides the persistence envelope from widgets:

```typescript
export interface WidgetRenderProps<TState = unknown> {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number, state?: TState) => void; // state saved atomically with completion
  storedState?: TState; // restored from prior submission
}
```

Key design choices:

- **`complete(score?, state?)`**: The second parameter makes answer saving **atomic** with completion — no risk of developer error from calling separate `onAnswer` + `complete` in the wrong order. Backward compatible: `complete(100)` works exactly as before.
- **`storedState`**: The widget receives only its own raw `data`, not the `{ type, widgetId, widgetVersion }` envelope. The `WidgetRenderer` handles unwrapping.
- **`TState` generic**: Optional — defaults to `unknown`. Widgets that want type safety can type their render function.
- **No `saveState` for now**: Draft/auto-save is out of scope for this iteration. Widgets save state only on completion.

### 3. WidgetRenderer: Wire persistence

**File:** `packages/runtime/src/renderers/WidgetRenderer.tsx`

The `WidgetRenderer` acts as the boundary that wraps/unwraps the `WidgetAnswer` envelope:

- **Read** `runtime.answers[nodeId]`, extract `.data` as `storedState`.
- **Wrap** `complete` so that when `state` is provided, it constructs `{ type: 'widget', widgetId, widgetVersion, data: state, score }` and calls `runtime.saveAnswer(nodeId, answer)` before `runtime.completeNode(score)`.
- **No changes to `NodeRenderer`** — `WidgetRenderer` already accesses `useRuntime()` internally.

```typescript
// Pseudocode for the enhanced complete wrapper
complete: (score?: number, state?: unknown) => {
  if (state !== undefined) {
    const answer: WidgetAnswer = {
      type: 'widget',
      widgetId,
      widgetVersion: definition?.version,
      data: state,
      score,
    };
    saveAnswer(nodeId, answer);
  }
  completeNode(score);
};
```

### 4. Per-widget opt-in (15 built-in widgets)

Each widget independently:

- **Define a state schema** (Zod) for validating `props.storedState` on mount. Example:
  ```typescript
  const MatchingStateSchema = z.object({
    connections: z.array(z.object({ itemA: z.string(), itemB: z.string() })),
    submitted: z.boolean(),
  });
  ```
- **Restore:** On mount, parse `props.storedState` through the schema and initialize internal React state. If parsing fails, fall back to defaults.
- **Save:** In the submit handler, call `props.complete(score, serializedState)`.
- **Guard:** When `storedState` indicates prior submission (`storedState.submitted === true`), disable further interaction and show results.

Typical additions per widget: 5–8 lines (state schema + restore + save).

### 5. Files changed

| File                                                | Change                                                                                          |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `packages/schemas/src/progress.ts`                  | Add `WidgetAnswerSchema` with `widgetVersion` + `data: z.unknown()`, add to discriminated union |
| `packages/schemas/src/index.ts`                     | Export `WidgetAnswerSchema`, `WidgetAnswer`                                                     |
| `packages/widgets/src/types.ts`                     | Add `storedState`, modify `complete` to accept optional `state`, add `TState` generic           |
| `packages/widgets/src/index.ts`                     | Export `WidgetAnswer` type                                                                      |
| `packages/runtime/src/renderers/WidgetRenderer.tsx` | Wire envelope unwrap/wrap — `storedState` and enhanced `complete`                               |
| `packages/runtime/src/index.ts`                     | Re-export `WidgetAnswer`                                                                        |
| 15 widget `*.tsx` files                             | Opt-in: add state schema + restore + save per widget                                            |

### 6. Not in scope

- Changes to `WidgetDefinition` interface (would break remote widgets)
- `saveState` for incremental draft saving (can be added later)
- Answer encryption or compression
- Backward migration of existing progress snapshots (missing answers = undefined = no-op)

## Testing

- `WidgetAnswerSchema` validation (valid/invalid cases)
- `WidgetRenderer` stores answers via enhanced `complete` and restores `storedState` on re-mount
- Representative widget (e.g., Matching) tests for state round-trip with schema validation
