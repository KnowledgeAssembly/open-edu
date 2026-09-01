# OpenEdu AI Companion — Implementation Plan

**Source spec:** `docs/STUDIO-AI-COMPANION-SPEC.md` (sections §33–§40)
**Audience:** implementation agents (assume no prior knowledge of this codebase)
**Style:** prescriptive — file paths, exact names, and code are given verbatim wherever possible.

> Conventions that apply to **every** phase (read once, follow always):
>
> - Schemas are the source of truth: derive types from Zod with `z.infer`, never hand-write.
> - All type-only imports must use `import type { ... }` (ESLint `consistent-type-imports`).
> - No cross-package imports except through published `package.json` `exports`.
> - Every phase must add Vitest unit tests before it is "done".
> - After every phase run the full verification gate (see "Verification" below) before committing.

## Verification gate (run at the end of every phase)

```bash
pnpm install                                      # only when package.json changes
pnpm --filter @open-edu/companion build           # once companion exists
pnpm --filter @open-edu/dev-server test           # dev-server unit tests
pnpm --filter @open-edu/dev-server typecheck      # TS strict pass
pnpm --filter @open-edu/dev-server lint           # eslint
```

Full-repo gates (run before opening a PR):

```bash
pnpm build && pnpm test && pnpm lint && pnpm typecheck
```

---

## Phase 0 — Baseline

Confirm the current tests pass before touching anything, so any later failure is attributable to your change.

```bash
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/dev-server typecheck
```

Record the file list under `apps/dev-server/src/studio/ai/` (the area being migrated):

```text
chat/config.ts, chat/handler.ts, chat/intent.ts, chat/messages.ts,
chat/metadata.ts, chat/policy.ts, chat/rateLimit.ts, chat/tools.ts,
changeSet.ts, applyChangeSet.ts, workspaceTools.ts, commitCourseDraft.ts,
applyDraft.ts, context.ts, types.ts, generateCourse.ts, itemGenerate.ts,
studioLlm.ts, aiSession.ts, suggestions.ts, specFile.ts, qualityMap.ts,
StudioContextBridge.tsx, StudioChatProvider.tsx, StudioAssistantProvider.tsx,
EditorBridgeContext.tsx, ConversationStore.ts, assistantStorage.ts,
assistantFlags.ts, index.ts
```

---

## Phase 1 — Extract contracts into `@open-edu/companion`

**Goal:** create a new workspace package `@open-edu/companion` holding the Companion's type/Zod contracts, and re-export the two existing contract files (`context.ts`, `types.ts`) from it so the dev-server keeps compiling unchanged.

**DoD:** `pnpm typecheck` passes repo-wide; existing dev-server tests pass; the new package contains only types + Zod schemas (no behavior).

### 1.1 Create the package scaffolding

Create these files (paths relative to repo root):

**`packages/companion/package.json`**

```json
{
  "name": "@open-edu/companion",
  "version": "0.1.0",
  "description": "OpenEdu AI Companion contracts (types + Zod schemas)",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./context": {
      "types": "./dist/context.d.ts",
      "import": "./dist/context.js"
    },
    "./types": {
      "types": "./dist/types.d.ts",
      "import": "./dist/types.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint 'src/**/*.{ts,tsx}'",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@open-edu/storage": "workspace:*",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "vitest": "^1.0.0"
  },
  "engines": {
    "node": ">=18"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

**`packages/companion/tsconfig.json`** (mirror `packages/registry/tsconfig.json`)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "lib": ["ES2022", "DOM"],
    "types": ["vitest/globals", "node"]
  },
  "include": ["src"]
}
```

**`packages/companion/tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["src/**/*.test.ts"]
}
```

### 1.2 Move the two existing contract files verbatim

Copy the **entire** current contents of these files into the new package, then turn the originals into re-export shims.

- `apps/dev-server/src/studio/ai/context.ts` → `packages/companion/src/context.ts` (do not edit the content)
- `apps/dev-server/src/studio/ai/types.ts` → `packages/companion/src/types.ts` (do not edit the content)

These two files are pure types/Zod — no imports from other dev-server files, so they move cleanly.

### 1.3 Create the new contract files

**`packages/companion/src/events.ts`**

```ts
import type { ApprovalRequest } from './permission.js';
import type { CourseDraftResult, DraftItem } from './types.js';

export type CompanionErrorCode =
  | 'invalid-request'
  | 'context-invalid'
  | 'permission-denied'
  | 'tool-not-found'
  | 'tool-failed'
  | 'validation-failed'
  | 'cancelled'
  | 'runtime-error'
  | 'rate-limited';

export interface CompanionError {
  code: CompanionErrorCode;
  message: string;
  cause?: unknown;
}

export type CompanionEvent =
  | { type: 'message.delta'; text: string }
  | { type: 'message.complete' }
  | { type: 'tool.started'; toolCallId: string; tool: string }
  | { type: 'tool.completed'; toolCallId: string; result: unknown }
  | { type: 'draft.created'; draft: CourseDraftResult | DraftItem[] }
  | { type: 'approval.required'; approval: ApprovalRequest }
  | { type: 'task.started'; taskId: string }
  | { type: 'task.progress'; taskId: string; progress?: number; message?: string }
  | { type: 'task.completed'; taskId: string }
  | { type: 'error'; error: CompanionError };
```

**`packages/companion/src/permission.ts`**

```ts
export type PermissionKind = 'read' | 'propose' | 'commit' | 'destructive';

export interface Permission {
  id: string;
  kind: PermissionKind;
  scope?: string;
}

export interface CompanionPermissions {
  allowed: Permission[];
  requireApprovalFor: PermissionKind[];
}

export interface ApprovalRequest {
  id: string;
  changeSetId: string;
  kind: 'commit' | 'destructive';
  summary: string;
  requestedAt: number;
}

export interface PermissionPolicy {
  check(tool: { id: string; permission: Permission }, permissions: CompanionPermissions): boolean;
  requiresApproval(permission: Permission, permissions: CompanionPermissions): boolean;
}
```

**`packages/companion/src/tool.ts`**

```ts
import type { z } from 'zod';
import type { Permission } from './permission.js';

export type ToolResult = { ok: true; value: unknown } | { ok: false; error: string };

export interface ToolContext {
  requestId?: string;
  signal?: AbortSignal;
  [key: string]: unknown;
}

export interface CompanionTool<Input = unknown> {
  id: string;
  description: string;
  inputSchema: z.ZodType<Input>;
  permission: Permission;
  execute(input: Input, context: ToolContext): Promise<ToolResult>;
}

export interface ToolRegistry {
  register(tool: CompanionTool): void;
  get(id: string): CompanionTool | undefined;
  list(): CompanionTool[];
}
```

**`packages/companion/src/skill.ts`**

```ts
import type { z } from 'zod';

export interface CompanionSkill {
  id: string;
  description: string;
  instructions?: string;
  tools?: string[];
  permissions?: string[];
  inputSchema?: z.ZodType;
  outputSchema?: z.ZodType;
}

export interface SkillRegistry {
  register(skill: CompanionSkill): void;
  list(): CompanionSkill[];
}

export interface SkillResolver {
  resolve(context: unknown): CompanionSkill[];
}
```

**`packages/companion/src/runtime.ts`**

```ts
export interface AgentRuntimeRequest {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  systemPrompt?: string;
  signal?: AbortSignal;
  maxSteps?: number;
  timeoutMs?: number;
}

export type AgentRuntimeEvent =
  | { type: 'text.delta'; text: string }
  | { type: 'text.complete' }
  | { type: 'tool.call'; toolCallId: string; tool: string; input: unknown }
  | { type: 'error'; error: string };

export interface AgentRuntime {
  run(request: AgentRuntimeRequest): AsyncIterable<AgentRuntimeEvent>;
}
```

**`packages/companion/src/request.ts`**

```ts
import type { StudioContextSnapshot } from './context.js';
import type { CompanionPermissions } from './permission.js';

export type CompanionMode = 'author' | 'explain' | 'review' | 'design' | 'validate';

export interface CompanionCapabilities {
  streaming?: boolean;
  toolCalling?: boolean;
  structuredOutput?: boolean;
}

export interface CompanionRequest {
  message: string;
  context: StudioContextSnapshot;
  conversationId: string;
  mode?: CompanionMode;
  permissions: CompanionPermissions;
  capabilities?: CompanionCapabilities;
}

export interface CompanionResponse {
  conversationId: string;
  runId: string;
}
```

**`packages/companion/src/changeset.ts`**

```ts
export type {
  WorkspaceChangeSet as ChangeSet,
  WorkspaceChange as ChangeOperation,
} from '@open-edu/storage';

export interface Diagnostic {
  path: string;
  level: 'error' | 'warning' | 'info';
  message: string;
}

export type WorkspaceTarget =
  | { kind: 'course'; id: string }
  | { kind: 'lesson'; path: string }
  | { kind: 'activity'; path: string }
  | { kind: 'asset'; path: string };

export interface ChangePreview {
  changeSetId: string;
  files: Array<{
    path: string;
    operation: 'create' | 'update' | 'delete' | 'move';
    summary: string;
  }>;
  diagnostics: Diagnostic[];
}
```

**`packages/companion/src/index.ts`**

```ts
export * from './context.js';
export * from './types.js';
export * from './events.js';
export * from './permission.js';
export * from './tool.js';
export * from './skill.js';
export * from './runtime.js';
export * from './request.js';
export * from './changeset.js';
```

### 1.4 Add a contract test for the new package

**`packages/companion/src/events.test.ts`** — validates the event model compiles and the moved context schema still parses:

```ts
import { describe, it, expect } from 'vitest';
import { studioContextSnapshotSchema } from './context.js';

describe('companion context contract', () => {
  it('parses a minimal studio snapshot', () => {
    const parsed = studioContextSnapshotSchema.parse({
      view: 'outline',
      locale: 'en',
      aiAvailable: true,
    });
    expect(parsed.view).toBe('outline');
  });

  it('parses a snapshot with course and activity', () => {
    const parsed = studioContextSnapshotSchema.parse({
      view: 'edit-activity',
      locale: 'en',
      aiAvailable: true,
      course: {
        id: 'c1',
        title: 'Fractions',
        activityCount: 1,
        outline: [{ title: 'Intro', kind: 'lesson', path: 'nodes/intro.md' }],
      },
      activity: {
        path: 'nodes/intro.md',
        kind: 'lesson',
        title: 'Intro',
        contentExcerpt: '# Intro',
      },
    });
    expect(parsed.course?.activityCount).toBe(1);
  });
});
```

### 1.5 Replace the dev-server originals with shims

Replace the **entire** content of these two files:

**`apps/dev-server/src/studio/ai/context.ts`**

```ts
export * from '@open-edu/companion/context';
```

**`apps/dev-server/src/studio/ai/types.ts`**

```ts
export * from '@open-edu/companion/types';
```

All existing relative imports (`from './context'`, `from '../context.js'`, `from './types'`, `from '../types.js'`) continue to resolve to these shims.

### 1.6 Wire up and verify

```bash
pnpm install
pnpm --filter @open-edu/companion build
pnpm --filter @open-edu/companion test
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server test
```

> **Gotcha:** dev-server now resolves `StudioContextSnapshot`/`DraftItem`/etc. through `@open-edu/companion/dist`. You must `pnpm --filter @open-edu/companion build` after editing companion source, and re-run `pnpm install` after adding the package. This is the documented monorepo build-ordering behavior (see AGENTS.md "Workspace packages require a build").

---

## Phase 2 — Consolidate tool dispatch + introduce typed tools

**Goal:** make intent→tool routing live in exactly one place, and give the existing generation operations `id`/`description`/`inputSchema`/`permission` so they are typed `CompanionTool`s.

**DoD:** the routing decision (which intent → which tool, with what inputs) is expressed in a single pure function used by both the server handler and the browser transport; each tool is schema-validated and independently testable; no behavior change.

### 2.1 Extract the routing decision

Today the intent→tool decision is duplicated in two places:

- `apps/dev-server/src/studio/ai/chat/handler.ts` — function `runToolIntent` (lines ~162–303)
- `apps/dev-server/src/studio/ai/StudioChatProvider.tsx` — inside `createHostedChatTransport.sendMessages` (lines ~184–280)

Create a new pure module that both call. **`apps/dev-server/src/studio/ai/chat/route.ts`**:

```ts
import type { StudioContextSnapshot } from '@open-edu/companion/context';
import type { ItemIntent, ItemIntentParams } from '@open-edu/companion/types';
import type { ParsedIntent } from './intent.js';

export type RoutedTool =
  | { tool: 'generate_course'; description: string }
  | { tool: 'generate_item'; kind: 'lesson' | 'quiz' | 'practice'; description: string }
  | {
      tool: 'edit_item';
      kind: 'lesson' | 'quiz' | 'practice';
      intent: ItemIntent;
      currentContent: string;
      params?: ItemIntentParams;
    }
  | { tool: 'explain' };

/**
 * Map a parsed intent + current Studio context to a single tool invocation.
 * Returns the `explain` fallback when no tool applies. Pure and deterministic:
 * shared by the local Vite handler and the hosted browser transport so the two
 * never disagree about which tool an intent triggers.
 */
export function routeIntent(
  intent: ParsedIntent | null,
  context: StudioContextSnapshot,
): RoutedTool {
  if (!intent || intent.type === 'explain') return { tool: 'explain' };

  if (intent.type === 'generate_course') {
    return { tool: 'generate_course', description: intent.description ?? '' };
  }

  if (intent.type === 'draft_new' && intent.kind) {
    return {
      tool: 'generate_item',
      kind: intent.kind,
      description: intent.description || `Create a ${intent.kind}`,
    };
  }

  if (intent.type === 'edit_existing' && context.activity) {
    const kind =
      context.activity.kind === 'other'
        ? ('lesson' as const)
        : (context.activity.kind as 'lesson' | 'quiz' | 'practice');
    return {
      tool: 'edit_item',
      kind,
      intent: intent.intent || 'rewrite',
      currentContent: context.activity.contentExcerpt || '',
      params: intent.params,
    };
  }

  return { tool: 'explain' };
}
```

> Note: the `generate_course`/`generate_item`/`edit_item` "need a package" and "need an activity" guards are **not** routing concerns — they stay in each execution path (server has `packageDir`; browser has `api` callbacks that throw `no-active-course`). Routing only answers _which tool_, not _whether it can run_.

### 2.2 Add tests for the routing module

**`apps/dev-server/src/studio/ai/chat/route.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { routeIntent } from './route.js';
import type { StudioContextSnapshot } from '@open-edu/companion/context';

const ctx: StudioContextSnapshot = {
  view: 'outline',
  locale: 'en',
  aiAvailable: true,
  course: {
    id: 'c1',
    title: 'Fractions',
    activityCount: 2,
    outline: [
      { title: 'A', kind: 'lesson', path: 'nodes/a.md' },
      { title: 'B', kind: 'quiz', path: 'nodes/b.json' },
    ],
  },
};

describe('routeIntent', () => {
  it('routes course generation', () => {
    expect(routeIntent({ type: 'generate_course', description: 'math' }, ctx)).toEqual({
      tool: 'generate_course',
      description: 'math',
    });
  });

  it('routes new item drafts', () => {
    expect(routeIntent({ type: 'draft_new', kind: 'quiz', description: 'a quiz' }, ctx)).toEqual({
      tool: 'generate_item',
      kind: 'quiz',
      description: 'a quiz',
    });
  });

  it('routes edits only when an activity is open', () => {
    expect(routeIntent({ type: 'edit_existing', intent: 'rewrite' }, ctx)).toEqual({
      tool: 'explain',
    });

    const withActivity: StudioContextSnapshot = {
      ...ctx,
      activity: { path: 'nodes/a.md', kind: 'lesson', contentExcerpt: '# Hi' },
    };
    expect(routeIntent({ type: 'edit_existing', intent: 'rewrite' }, withActivity)).toEqual({
      tool: 'edit_item',
      kind: 'lesson',
      intent: 'rewrite',
      currentContent: '# Hi',
    });
  });

  it('falls back to explain for unknown messages', () => {
    expect(routeIntent(null, ctx)).toEqual({ tool: 'explain' });
  });
});
```

### 2.3 Make the tools typed

Create **`apps/dev-server/src/studio/ai/chat/toolCatalog.ts`** that registers the three generation tools as `CompanionTool`s. This does **not** change how they run — it adds the contract metadata around the existing functions `draftActivity` and `generateCourseDraftTool` (which already live in `tools.ts`):

```ts
import { z } from 'zod';
import type { CompanionTool } from '@open-edu/companion';
import { draftActivity, generateCourseDraftTool } from './tools.js';
import type { ToolCallRequest, GenerateCourseRequest } from './tools.js';

export const generateCourseInput = z.object({
  notes: z.string(),
  packageDir: z.string(),
});

export const generateItemInput = z.object({
  kind: z.enum(['lesson', 'quiz', 'practice']),
  description: z.string(),
  packageDir: z.string(),
});

export const editItemInput = z.object({
  kind: z.enum(['lesson', 'quiz', 'practice']),
  intent: z.string(),
  currentContent: z.string(),
  params: z.unknown().optional(),
  packageDir: z.string(),
});

export const companionToolCatalog: CompanionTool[] = [
  {
    id: 'generate_course',
    description: 'Generate a full course draft from author notes.',
    inputSchema: generateCourseInput,
    permission: { id: 'course.generate', kind: 'propose' },
    async execute(input, ctx) {
      const req = input as { notes: string; packageDir: string };
      const result = await generateCourseDraftTool({
        notes: req.notes,
        packageDir: req.packageDir,
        completeText: async (prompt) => {
          void prompt;
          void ctx;
          throw new Error('completeText must be injected by the caller');
        },
      } as GenerateCourseRequest);
      return result.ok
        ? { ok: true as const, value: result.courseDraft }
        : { ok: false as const, error: result.error };
    },
  },
  {
    id: 'generate_item',
    description: 'Draft a new lesson, quiz, or practice item.',
    inputSchema: generateItemInput,
    permission: { id: 'item.generate', kind: 'propose' },
    async execute(input) {
      const req = input as {
        kind: 'lesson' | 'quiz' | 'practice';
        description: string;
        packageDir: string;
      };
      const result = await draftActivity({
        type: 'draft_new',
        kind: req.kind,
        description: req.description,
        packageDir: req.packageDir,
      } satisfies ToolCallRequest);
      return result.ok
        ? { ok: true as const, value: result.items }
        : { ok: false as const, error: result.error };
    },
  },
  {
    id: 'edit_item',
    description: 'Edit an existing activity (rewrite, translate, adjust difficulty, …).',
    inputSchema: editItemInput,
    permission: { id: 'item.edit', kind: 'propose' },
    async execute(input) {
      const req = input as {
        kind: 'lesson' | 'quiz' | 'practice';
        intent: ToolCallRequest['intent'];
        currentContent: string;
        params?: ToolCallRequest['params'];
        packageDir: string;
      };
      const result = await draftActivity({
        type: 'edit_existing',
        kind: req.kind,
        intent: req.intent ?? 'rewrite',
        currentContent: req.currentContent,
        params: req.params,
        packageDir: req.packageDir,
      } satisfies ToolCallRequest);
      return result.ok
        ? { ok: true as const, value: result.items }
        : { ok: false as const, error: result.error };
    },
  },
];
```

> `completeText` for `generate_course` is environment-specific (server injects `completeWithLlm` from `studioLlm.ts`; the browser uses its HTTP API). Phase 2 does **not** unify execution — the catalog above is the contract; keep using the existing `runToolIntent`/transport call paths for actual execution. The `generateCourseInput` tool's `execute` here is only for tests/contract completeness and is not yet the production code path. If wiring it fully is too risky now, mark `toolCatalog.ts` as contract-only and test only `generateItemInput`/`editItemInput` execution.

### 2.4 Re-point both dispatch sites at `routeIntent`

**In `apps/dev-server/src/studio/ai/chat/handler.ts`:** inside `runToolIntent`, replace the initial `if` guard with a `routeIntent(...)` switch. Concretely, at the top of `runToolIntent`, change:

```ts
if (!intent || intent.type === 'explain' || !context.course) {
  return null;
}
```

to compute the route once:

```ts
const route = routeIntent(intent, context);
if (route.tool === 'explain' || !context.course) {
  return null;
}
```

and switch the subsequent branches on `route` (e.g. `if (route.tool === 'generate_course')` using `route.description`; `if (route.tool === 'generate_item')` using `route.kind`/`route.description`; `if (route.tool === 'edit_item')` using `route.kind`/`route.intent`/`route.currentContent`/`route.params`). Keep all existing `packageDir` guards and message strings unchanged.

**In `apps/dev-server/src/studio/ai/StudioChatProvider.tsx`:** in `createHostedChatTransport.sendMessages`, import `routeIntent` and replace the three `if (intent?.type === ...)` blocks with a single `switch (routeIntent(intent, contextSnapshot).tool)`. Keep the existing `generateDraft`/`generateItemAdd`/`generateItemEdit` callback invocations and error handling identical.

> If the browser path does not have a full `StudioContextSnapshot` handy, obtain it from `getCurrentActivity()` + `contextRef` (already available in `ChatRuntime`). The route only needs `context.activity` for `edit_item`, which the browser already reads via `getCurrentActivity()`.

### 2.5 Verify

```bash
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server lint
```

Existing tests `chat/handler.test.ts`, `chat/tools.test.ts`, `StudioChatProvider.test.tsx`, and `StudioChatProvider.transport.test.tsx` must still pass unchanged.

---

## Phase 3 — Introduce `CompanionClient` + event adapter

**Goal:** put a `CompanionClient` between `StudioChatProvider` and the AI SDK, with the `CompanionEvent → UIMessageChunk` mapping in exactly one adapter (per spec §7).

**DoD:** `StudioChatProvider` no longer calls `useChat`/transport directly for domain logic; the only place `UIMessageChunk` is produced is the adapter; the event model from `@open-edu/companion` is the domain contract.

### 3.1 Define the client + adapter

Create **`apps/dev-server/src/studio/ai/CompanionClient.ts`**:

```ts
import type { CompanionEvent, CompanionRequest, CompanionPermissions } from '@open-edu/companion';

export interface CompanionClient {
  run(request: CompanionRequest): AsyncIterable<CompanionEvent>;
}

export const DEFAULT_PERMISSIONS: CompanionPermissions = {
  allowed: [
    { id: 'course.generate', kind: 'propose' },
    { id: 'item.generate', kind: 'propose' },
    { id: 'item.edit', kind: 'propose' },
  ],
  requireApprovalFor: ['commit', 'destructive'],
};
```

Create the adapter **`apps/dev-server/src/studio/ai/companionToUIMessage.ts`** that maps a `CompanionEvent` stream to AI SDK `UIMessageChunk[]`:

```ts
import type { CompanionEvent } from '@open-edu/companion';
import type { UIMessageChunk } from 'ai';

/**
 * The single place where the domain event model (§7) is mapped to AI SDK UI
 * message chunks. `message.delta` → text-delta; `message.complete` → finish;
 * all other events are no-ops for the current UI (retained for later phases).
 */
export function companionEventsToUIMessageChunks(
  events: AsyncIterable<CompanionEvent>,
): ReadableStream<UIMessageChunk> {
  const textId = `companion-${Date.now()}-text`;
  const messageId = `companion-${Date.now()}`;
  return new ReadableStream<UIMessageChunk>({
    async start(controller) {
      controller.enqueue({ type: 'start', messageId });
      controller.enqueue({ type: 'text-start', id: textId });
      try {
        for await (const event of events) {
          if (event.type === 'message.delta') {
            controller.enqueue({ type: 'text-delta', id: textId, delta: event.text });
          }
        }
      } catch {
        // downstream onError handles surfacing
      }
      controller.enqueue({ type: 'text-end', id: textId });
      controller.enqueue({ type: 'finish', finishReason: 'stop' });
      controller.close();
    },
  });
}
```

### 3.2 Provide an initial `LocalCompanionClient`

Create **`apps/dev-server/src/studio/ai/LocalCompanionClient.ts`** — a minimal implementation that wraps the existing `streamExplain`/tool paths and emits `CompanionEvent`s. It can start as a thin adapter over the current `handler.ts` logic (emit `message.delta` per text token, `message.complete` at end) and is the seam where Phase 4's `AgentRuntime` will slot in.

The initial implementation is intentionally allowed to delegate to the existing `streamExplain` function; the only requirement for this phase is that `StudioChatProvider` consumes `CompanionEvent`s rather than raw `UIMessageChunk`s.

### 3.3 Re-point `StudioChatProvider`

- Change `ChatRuntime`'s `transport` from `ChatTransport`-only to a `CompanionClient`-backed transport: `transport` becomes a `ChatTransport` that internally calls `companionEventsToUIMessageChunks(client.run(request))`.
- Keep the `DefaultChatTransport`/`createHostedChatTransport` as the _adapters_ behind the client (spec §24 target shape).
- Preserve `onFinish` metadata handling (drafts → `setPendingDrafts`, courseDraft → `setLastCourseQuality`) by translating the `draft.created`/`approval.required` events back into the existing `messageMetadata` shape, or by handling those events directly in the provider.

> If a full provider rewrite is too large for one pass, land this phase in two steps: (a) introduce `CompanionClient` + adapter with the event model and a thin local client used only in a new unit test; (b) re-point `ChatRuntime` to it. Both steps must be complete before the phase is "done".

---

## Phase 4 — Introduce `AgentRuntime`

**Goal:** route all model execution through the `AgentRuntime` contract so the Companion never talks to the AI SDK/model directly.

**DoD:** model execution is reachable only through `AgentRuntime`; local and hosted paths share the same contract; the initial implementation merely wraps existing AI SDK calls (no new framework).

### 4.1 Implement `AiSdkAgentRuntime`

Create **`apps/dev-server/src/studio/ai/runtime/AiSdkAgentRuntime.ts`**:

```ts
import { streamText } from 'ai';
import { createModelFactoryFromEnv } from '@open-edu/llm-config';
import type { AgentRuntime, AgentRuntimeEvent, AgentRuntimeRequest } from '@open-edu/companion';

export class AiSdkAgentRuntime implements AgentRuntime {
  async *run(request: AgentRuntimeRequest): AsyncIterable<AgentRuntimeEvent> {
    const factory = createModelFactoryFromEnv();
    const model = factory.getModel('fast');
    const result = streamText({
      model,
      system: request.systemPrompt,
      messages: request.messages as never,
      abortSignal: request.signal,
    });
    for await (const part of result.stream) {
      if (part.type === 'text-delta') {
        yield { type: 'text.delta', text: part.textDelta };
      }
    }
    yield { type: 'text.complete' };
  }
}
```

### 4.2 Replace direct `streamText` calls

- In `apps/dev-server/src/studio/ai/chat/handler.ts` `streamExplain` (lines ~328–372), replace the direct `streamText` + `toUIMessageStream` with `new AiSdkAgentRuntime().run(...)` and map `AgentRuntimeEvent` → UI stream (reuse the adapter from Phase 3, or a `runtimeToUIMessage` helper).
- In `apps/dev-server/src/gateway/chat.ts` (`gatewayChat`), the hosted path keeps using `completeWithLlm` for now (the gateway is a transport/security boundary per spec §26). Note this explicitly in a code comment; full runtime parity is a Phase 6+ concern.

### 4.3 Add a runtime unit test

Create **`apps/dev-server/src/studio/ai/runtime/AiSdkAgentRuntime.test.ts`** that mocks `@open-edu/llm-config` (`vi.mock`) to return a fake `streamText` and asserts `run()` yields `text.delta` events and a final `text.complete`.

---

## Phase 5 — Generalize ChangeSet (make item drafts atomic)

**Goal:** remove the non-atomic item-draft write path so every mutation is a `ChangeSet` applied atomically with a diff preview.

**DoD:** multi-file drafts commit atomically with a diff preview; the "N of M saved" partial-failure message is gone; no code path mutates course files except through a committed `ChangeSet`.

### 5.1 Understand the current split

- `apps/dev-server/src/studio/ai/applyDraft.ts` — `applyDraftToFile`/`applyDraftBatch` call `api.writeFile` + `api.saveOutlineOrder` directly (non-atomic, partial failure).
- `apps/dev-server/src/studio/ai/applyChangeSet.ts` — already applies a `WorkspaceChangeSet` atomically via `createTransaction`.
- `apps/dev-server/src/studio/ai/changeSet.ts` — `diffChangeSet` builds a human-readable diff preview.

### 5.2 Build item drafts as a ChangeSet

Create **`apps/dev-server/src/studio/ai/buildItemChangeSet.ts`**:

```ts
import { createChangeSet, type WorkspaceChangeSet } from '@open-edu/storage';
import type { DraftItem } from '@open-edu/companion/types';

const TEXT_ENCODER = new TextEncoder();

export function buildItemChangeSet(
  drafts: DraftItem[],
  existingPaths: string[],
): WorkspaceChangeSet {
  const stamp = Date.now();
  const changes = drafts.map((item, i) => {
    const ext = item.kind === 'lesson' ? '.md' : '.json';
    const path = `nodes/${item.kind}-${stamp + i}${ext}`;
    return {
      path,
      operation: 'create' as const,
      newContent: TEXT_ENCODER.encode(item.content),
    };
  });

  return createChangeSet('ai', `Draft ${drafts.length} item(s)`, [
    ...changes,
    // optional outline append is a separate concern; keep outline update
    // as its own change once an outline ChangeSet exists, or fold it below.
  ]);
}
```

> `existingPaths` is a placeholder for future de-duplication against the current outline. If the outline append still needs to happen, express it as a second change (e.g. an update to the outline/workflow file) so it is part of the same atomic commit rather than a follow-on `saveOutlineOrder`.

### 5.3 Rewrite `applyDraft` to use the workspace transaction

Replace the body of `applyDraftToFile`/`applyDraftBatch` to:

1. Build a `WorkspaceChangeSet` from the `DraftItem[]` (using `buildItemChangeSet`).
2. Obtain the `CourseWorkspace` (via the StudioApi's workspace accessor — add `getWorkspace(): Promise<CourseWorkspace>` to `StudioApi` if not already exposed, delegating to the existing `browserStudioApi`/`localStudioApi` workspace).
3. `diffChangeSet(...)` to produce the preview, emit/return it.
4. On approval, `applyChangeSet(changeSet, workspace)`.

The `applyToBuffer` mode (write into the open editor instead of a file) is unaffected — it does not touch the filesystem.

### 5.4 Update `applyDraft` tests

Extend `apps/dev-server/src/studio/ai/applyDraft.test.ts` to assert:

- A multi-file draft produces a single atomic commit (mock `CourseWorkspace`/transaction; assert one `commit()` call, not N `writeFile` calls).
- The "N of M saved" error branch is removed.

---

## Phase 6 — Add controlled agent loop

**Goal:** introduce multi-step execution over the tool catalog from Phase 2, driven by the `AgentRuntime` contract from Phase 4. The loop is the single place that assembles context, resolves skills (empty until Phase 7), resolves permissions, determines intent, selects tools, runs the model, executes tools, validates output, and emits `CompanionEvent`s (spec §9).

**DoD:** a request can run more than one internal step while presenting a single coherent unit to the user; the loop enforces six hard bounds — `maxSteps`, `timeoutMs`, cancellation, permission checks, output validation, and approval gating — and emits observable `CompanionEvent`s; the existing deterministic tool behavior (course gen / item draft / item edit) is unchanged.

### 6.1 Extend the `AgentRuntime` contract for tool calling

Today `AgentRuntimeRequest` only carries plain `messages`. The loop needs the runtime to (a) know which tools are available and (b) report model-requested tool calls back with a correlatable id. Extend **`packages/companion/src/runtime.ts`**:

```ts
import type { z } from 'zod';

export interface AgentRuntimeToolSpec {
  name: string;
  description: string;
  inputSchema: z.ZodType;
}

export type AgentRuntimeMessage =
  | { role: 'user' | 'assistant' | 'system'; content: string }
  | {
      role: 'assistant';
      content: string;
      toolCalls: Array<{ toolCallId: string; tool: string; input: unknown }>;
    }
  | { role: 'tool'; toolCallId: string; content: string };

export interface AgentRuntimeRequest {
  messages: AgentRuntimeMessage[];
  systemPrompt?: string;
  signal?: AbortSignal;
  maxSteps?: number;
  timeoutMs?: number;
  tools?: AgentRuntimeToolSpec[];
}
```

`AgentRuntimeEvent` is unchanged — it already declares `tool.call` (Phase 1).

### 6.2 Teach `AiSdkAgentRuntime` to pass tools and surface tool calls

Update **`apps/dev-server/src/studio/ai/runtime/AiSdkAgentRuntime.ts`** to:

- map `request.tools` into `streamText({ tools })` (each `AgentRuntimeToolSpec` → `{ name, description, parameters }` derived from its Zod `inputSchema`);
- convert `AgentRuntimeMessage[]` into AI SDK messages: a `toolCalls` assistant message becomes an assistant message with `tool-call` parts; a `tool` message becomes a `tool-result` part keyed by `toolCallId`;
- when a `tool-call` part arrives in the stream, yield `{ type: 'tool.call', toolCallId, tool, input }` before the final `text.complete`.

The runtime stays a thin AI SDK wrapper — the loop owns iteration, tool execution, and message assembly.

### 6.3 Implement `InMemoryToolRegistry`

Create **`apps/dev-server/src/studio/ai/toolRegistry.ts`**:

```ts
import type { CompanionTool, ToolRegistry } from '@open-edu/companion';
import { companionToolCatalog } from './chat/toolCatalog.js';

export class InMemoryToolRegistry implements ToolRegistry {
  private readonly tools = new Map<string, CompanionTool>();

  constructor(tools: CompanionTool[] = companionToolCatalog) {
    for (const tool of tools) this.tools.set(tool.id, tool);
  }

  register(tool: CompanionTool): void {
    this.tools.set(tool.id, tool);
  }

  get(id: string): CompanionTool | undefined {
    return this.tools.get(id);
  }

  list(): CompanionTool[] {
    return [...this.tools.values()];
  }
}
```

Add **`toolRegistry.test.ts`**: `register`/`get`/`list` round-trip; registering a duplicate id overwrites; `get` of an unknown id returns `undefined`.

### 6.4 Implement `PermissionPolicy`

Create **`apps/dev-server/src/studio/ai/permissionPolicy.ts`**:

```ts
import type { CompanionPermissions, Permission, PermissionPolicy } from '@open-edu/companion';

export const defaultPermissionPolicy: PermissionPolicy = {
  check(tool, permissions) {
    return permissions.allowed.some((p) => p.id === tool.permission.id);
  },
  requiresApproval(permission, permissions) {
    return permissions.requireApprovalFor.includes(permission.kind);
  },
};
```

Add **`permissionPolicy.test.ts`**: an unlisted permission id is denied; `commit`/`destructive` require approval; `propose`/`read` do not.

### 6.5 Implement `AgentLoop`

Create **`apps/dev-server/src/studio/ai/agentLoop.ts`** — an async generator of `CompanionEvent`:

```ts
import type {
  AgentRuntime,
  AgentRuntimeMessage,
  CompanionEvent,
  CompanionRequest,
  PermissionPolicy,
  ToolRegistry,
} from '@open-edu/companion';
import type { SkillResolver } from '@open-edu/companion';
import { parseIntentFromMessage } from './chat/intent.js';
import { routeIntent } from './chat/route.js';

export interface AgentLoopOptions {
  runtime: AgentRuntime;
  tools: ToolRegistry;
  policy: PermissionPolicy;
  skills?: SkillResolver; // Phase 7
  systemPrompt?: string;
  maxSteps?: number; // default 6
  timeoutMs?: number; // default 120_000
  now?: () => number; // test seam
  signal?: AbortSignal;
}

export async function* runAgentLoop(
  request: CompanionRequest,
  options: AgentLoopOptions,
): AsyncGenerator<CompanionEvent> {
  const maxSteps = options.maxSteps ?? 6;
  const deadline = (options.now?.() ?? Date.now()) + (options.timeoutMs ?? 120_000);
  const signal = options.signal;

  // 1–2. Assemble context + resolve skills. `request.context` is already a
  // validated StudioContextSnapshot (INV-007). Context is expanded via tools
  // in later phases — never by reading the whole course into the prompt.
  const skills = options.skills?.resolve(request.context) ?? [];

  // 3–4. Resolve permissions + determine intent.
  const route = routeIntent(parseIntentFromMessage(request.message), request.context);

  // Deterministic single-step path (preserves Phase 2 behavior exactly).
  if (route.tool !== 'explain') {
    yield* runDeterministicTool(route, request, options);
    return;
  }

  // Model-driven, bounded loop.
  const messages: AgentRuntimeMessage[] = [{ role: 'system', content: options.systemPrompt ?? '' }];
  const toolSpecs = options.tools
    .list()
    .filter((t) => options.policy.check(t, request.permissions))
    .filter((t) => skills.length === 0 || skills.some((s) => !s.tools || s.tools!.includes(t.id)))
    .map((t) => ({ name: t.id, description: t.description, inputSchema: t.inputSchema }));

  for (let step = 0; step < maxSteps; step++) {
    if (signal?.aborted) {
      yield { type: 'error', error: { code: 'cancelled', message: 'Cancelled' } };
      return;
    }
    if ((options.now?.() ?? Date.now()) > deadline) {
      yield { type: 'error', error: { code: 'runtime-error', message: 'Timed out' } };
      return;
    }

    let calledTool = false;
    for await (const event of options.runtime.run({ messages, tools: toolSpecs, signal })) {
      if (event.type === 'tool.call') {
        calledTool = true;
        yield { type: 'tool.started', toolCallId: event.toolCallId, tool: event.tool };
        const tool = options.tools.get(event.tool);
        if (!tool || !options.policy.check(tool, request.permissions)) {
          yield {
            type: 'error',
            error: { code: 'permission-denied', message: `Tool ${event.tool} is not permitted` },
          };
          return;
        }
        const parsed = tool.inputSchema.safeParse(event.input);
        if (!parsed.success) {
          yield {
            type: 'error',
            error: { code: 'validation-failed', message: 'Invalid tool input' },
          };
          return;
        }
        if (options.policy.requiresApproval(tool.permission, request.permissions)) {
          yield {
            type: 'approval.required',
            approval: {
              id: event.toolCallId,
              changeSetId: '',
              kind: tool.permission.kind,
              summary: tool.id,
              requestedAt: Date.now(),
            },
          };
          return; // no commit executes without approval (INV-003, INV-010)
        }
        const result = await tool.execute(parsed.data, { signal: signal ?? undefined });
        yield { type: 'tool.completed', toolCallId: event.toolCallId, result };
        messages.push({
          role: 'assistant',
          content: '',
          toolCalls: [{ toolCallId: event.toolCallId, tool: event.tool, input: parsed.data }],
        });
        messages.push({
          role: 'tool',
          toolCallId: event.toolCallId,
          content: result.ok ? JSON.stringify(result.value) : result.error,
        });
      } else if (event.type === 'text.delta') {
        yield { type: 'message.delta', text: event.text };
      } else if (event.type === 'error') {
        yield { type: 'error', error: { code: 'runtime-error', message: event.error } };
        return;
      }
    }
    if (!calledTool) break;
  }
  yield { type: 'message.complete' };
}
```

The deterministic branch `runDeterministicTool` reuses `routeIntent` + the existing `draftActivity`/`generateCourseDraftTool` from `tools.ts` (the same code `handler.ts` calls today) so the observed output is identical. It must also re-apply the `needPackageDraft`/`needPackageEdit`/`needOpenActivity` guards — those are execution-path concerns, not routing concerns (Phase 2 note).

Hard rules for this file (enforce in review):

- **No** direct `streamText`/AI SDK import — all model access is via `options.runtime` (INV-005, INV-006).
- The loop never mutates course files itself; tool results are drafts/ChangeSets that the UI approves (INV-001, INV-002).
- Every bound (`maxSteps`, `timeoutMs`, `signal`, permission, validation, approval) short-circuits with an explicit `error`/`approval.required` event — never a silent hang or silent skip.

### 6.6 Wire the loop into the local chat handler

Update **`apps/dev-server/src/studio/ai/chat/handler.ts`** to construct one `runAgentLoop` (with `AiSdkAgentRuntime`, `InMemoryToolRegistry`, `defaultPermissionPolicy`, and `systemPrompt: buildSystemPrompt(context)`) and map its `CompanionEvent` stream to the UI stream via `companionEventsToUIMessageChunks`. Keep the `StudioChatRequestSchema`/rate-limit/`MAX_MESSAGES` guards and the request-abort signal exactly as they are. The deterministic tool branches must continue to produce the same `messageMetadata` (`draft`/`course_draft`/`explain`) so `StudioChatProvider.onFinish` still drives draft cards and course-quality chips.

> Land in two reviewable steps: (a) move the deterministic branch into the loop's single-step path and confirm `handler.test.ts` passes **unchanged**; (b) swap `streamExplain`'s direct `AiSdkAgentRuntime().run(...)` for the loop's model sub-loop.

### 6.7 Add loop unit tests

Create **`apps/dev-server/src/studio/ai/agentLoop.test.ts`** using a fake `AgentRuntime` (a generator that yields scripted `AgentRuntimeEvent`s) and a stub `ToolRegistry`:

- a single-step deterministic tool call emits `tool.started` → `tool.completed` in order;
- a model turn that requests a tool twice runs exactly two steps (multi-step) and emits both `tool.completed` events;
- `maxSteps` bound halts the loop and emits `error` (`runtime-error`) instead of running forever;
- `timeoutMs` expiry (via injected `now`) halts mid-loop;
- an aborted `signal` halts the loop with `error` (`cancelled`);
- a denied tool emits `error` (`permission-denied`) and is never executed;
- an invalid tool input emits `error` (`validation-failed`) and is never executed;
- a `commit`-kind tool emits `approval.required` and stops before executing.

### 6.8 Verification

```bash
pnpm --filter @open-edu/companion build   # contract changed (runtime.ts)
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server lint
```

---

## Phase 7 — Add skills

**Goal:** introduce dynamic, per-request skill resolution (spec §11) and ship `learner-adaptation` as the first data-driven skill (spec §12). Skills affect system instructions, tool availability, and permissions only — no plugin system.

**DoD:** skills resolve per-request (not all injected into every model call); a matched skill's `instructions`/`tools`/`permissions` take effect; `learner-adaptation` activates only when the request context carries a learner profile; the core loop (Phase 6) contains no learner-specific logic.

### 7.1 Add the learner profile to the context contract

The `StudioContextSnapshot` has no learner signal today. Extend **`packages/companion/src/context.ts`** with an optional `learner` object (`.optional()` keeps existing snapshots valid):

```ts
const learnerProfileSchema = z.object({
  id: z.string(),
  label: z.string(), // e.g. "Level B", "Adult learners", "Autism-friendly"
  kind: z.enum(['school', 'college', 'adult', 'family', 'neurotypical', 'autism']),
});

// inside studioContextSnapshotSchema:
learner: learnerProfileSchema.optional(),
```

Thread a `learner` prop through **`apps/dev-server/src/studio/ai/StudioContextBridge.tsx`** into the snapshot (default `undefined`, so existing callers are unaffected).

### 7.2 Implement `InMemorySkillRegistry`

The `CompanionSkill`/`SkillRegistry`/`SkillResolver` interfaces already exist in `packages/companion/src/skill.ts` (Phase 1) — no contract change needed.

Create **`apps/dev-server/src/studio/ai/skillRegistry.ts`**:

```ts
import type { CompanionSkill, SkillRegistry } from '@open-edu/companion';
import { learnerAdaptationSkill } from './skills/learner-adaptation.js';

export class InMemorySkillRegistry implements SkillRegistry {
  private readonly skills = new Map<string, CompanionSkill>();

  constructor(skills: CompanionSkill[] = [learnerAdaptationSkill]) {
    for (const skill of skills) this.skills.set(skill.id, skill);
  }

  register(skill: CompanionSkill): void {
    this.skills.set(skill.id, skill);
  }

  list(): CompanionSkill[] {
    return [...this.skills.values()];
  }
}
```

### 7.3 Define the `learner-adaptation` skill

Create **`apps/dev-server/src/studio/ai/skills/learner-adaptation.ts`**:

```ts
import type { CompanionSkill } from '@open-edu/companion';

export const learnerAdaptationSkill: CompanionSkill = {
  id: 'learner-adaptation',
  description: 'Adapt content, pacing, and activity design to a learner profile.',
  instructions:
    'Adapt explanations, examples, pacing, and assessment format to the active learner profile. Distinguish learner context from author context.',
  tools: ['generate_item', 'edit_item'], // only the authoring tools the skill influences
  permissions: ['item.generate', 'item.edit'],
};
```

### 7.4 Implement the `SkillResolver`

Create **`apps/dev-server/src/studio/ai/skills/resolveSkills.ts`**:

```ts
import type { CompanionSkill, SkillResolver } from '@open-edu/companion';
import type { StudioContextSnapshot } from '@open-edu/companion/context';
import { learnerAdaptationSkill } from './learner-adaptation.js';

export function createSkillResolver(registry: { list(): CompanionSkill[] }): SkillResolver {
  return {
    resolve(context: unknown): CompanionSkill[] {
      const ctx = context as StudioContextSnapshot;
      if (ctx?.learner) {
        return registry.list().filter((s) => s.id === 'learner-adaptation');
      }
      return [];
    },
  };
}
```

> The resolver is deliberately trivial now (one rule: learner profile present → `learner-adaptation`). Its `resolve(context)` contract keeps future skills additive: add a rule + a skill definition, no loop changes.

### 7.5 Wire skills into the loop and system prompt

In **`agentLoop.ts`** (Phase 6.5), make `skills` a real input:

- pass the resolver in and call `resolve(request.context)` during context assembly (the `skills` variable in the loop already exists);
- restrict the tool spec list passed to the runtime to the tools named by the matched skills' `tools` (intersected with `policy.check`), so a skill can gate tool availability;
- append matched skills' `instructions` to `options.systemPrompt` before the model call — never to the user-visible message.

Add **`skills.test.ts`**: `learner-adaptation` resolves only when `context.learner` is set; no skills resolve for a plain snapshot; the loop receives only `learner-adaptation` tools when matched.

### 7.6 Verification

```bash
pnpm --filter @open-edu/companion build   # context.ts gained the learner field
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server lint
```

`context.test.ts` must still pass — the new `learner` field is optional.

---

## Phase 8 — Add persistent tasks

**Goal:** introduce `Task`/`TaskStore` with the states from spec §20 / §33 Phase 8, distinct from conversation history and workspace state. Persist task records so a long-running agent operation can be observed and resumed. Build this only after Phase 6's loop is stable.

**DoD:** the loop creates a `Task` with a lifecycle (`started → running → waiting-for-approval → completed | failed | cancelled`); tasks persist across navigation; `task.started`/`task.progress`/`task.completed` events carry real task ids; task state is never conflated with conversation or workspace state.

### 8.1 Add the task contract

Create **`packages/companion/src/task.ts`**:

```ts
import { z } from 'zod';

export const taskStateSchema = z.enum([
  'started',
  'running',
  'waiting-for-approval',
  'completed',
  'failed',
  'cancelled',
]);
export type TaskState = z.infer<typeof taskStateSchema>;

export interface Task {
  id: string;
  conversationId: string;
  state: TaskState;
  kind: 'generate_course' | 'generate_item' | 'edit_item' | 'multi-step' | 'explain';
  changeSetId?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TaskStore {
  create(task: Task): Promise<void>;
  update(id: string, patch: Partial<Task>): Promise<void>;
  get(id: string): Promise<Task | undefined>;
  listByConversation(conversationId: string): Promise<Task[]>;
}
```

Re-export from **`packages/companion/src/index.ts`**: `export * from './task.js';`

### 8.2 Implement `IndexedDbTaskStore`

Create **`apps/dev-server/src/studio/ai/TaskStore.ts`** exporting `class IndexedDbTaskStore implements TaskStore`, mirroring the `ConversationStore` IndexedDB + sessionStorage fallback pattern (same `openDb`/`transaction`/write-generation guards; store name `open-edu-studio-tasks`; `keyPath` `id`; an index on `conversationId`). Provide `create`/`update`/`get`/`listByConversation`.

### 8.3 Emit task events from the loop

In **`agentLoop.ts`**, add a `taskStore?: TaskStore` option (default: a no-op store so existing tests don't need IndexedDB) and:

- at start, `create({ id, conversationId: request.conversationId, state: 'started', kind, createdAt: now })` and yield `task.started { taskId }`;
- before each step, `update(id, { state: 'running' })` and yield `task.progress { taskId, message }`;
- when a `commit`/`destructive` tool awaits approval, `update(id, { state: 'waiting-for-approval' })`;
- on success, `update(id, { state: 'completed' })` and yield `task.completed`;
- on error/cancel, `update(id, { state: 'failed' | 'cancelled', error })`.

### 8.4 Surface task state in the UI (minimal)

In **`StudioChatProvider.tsx`**, handle the `task.completed`/`approval.required` events (already flowing through the adapter) to attach a `taskId` to the assistant message metadata; the existing draft/approval cards can later link to that id. No new full-screen task UI is required in this phase — the persisted `Task` record is the deliverable.

### 8.5 Add tests

**`TaskStore.test.ts`** — `create`/`update`/`get`/`listByConversation` round-trip; state transitions persist; fallback path when IndexedDB is unavailable. **`agentLoop.test.ts`** additions — the loop emits `task.started`/`task.completed` with a real id and persists the terminal state.

### 8.6 Verification

```bash
pnpm --filter @open-edu/companion build   # new task.ts + index export
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server lint
```

---

## Cross-phase risks and notes

- **Build ordering:** after any edit under `packages/companion/src`, run `pnpm --filter @open-edu/companion build` before dev-server typecheck/tests.
- **Do not** add `.js` extensions project-wide to "fix" ESM imports — use subpath `exports` (already added for `./context` and `./types`) per AGENTS.md. Phases 6–8 add only re-exported contract files (`task.ts`, extended `context.ts`/`runtime.ts`), so no new subpath exports are required; import them from `@open-edu/companion`.
- **i18n:** every new user-facing string in Phases 2–8 must go through `studioChatMessage`/`t()`, never hardcoded English (enforced by `pnpm lint`).
- **No new framework:** Mastra / OpenAI Agents SDK / LangGraph are out of scope for all of these phases (spec §34). The Phase 6 loop uses the existing `ai` SDK (`streamText` with `tools`) through `AgentRuntime` — no new agent framework.
- **Deterministic-path invariants (Phase 6):** `runDeterministicTool` must reproduce `handler.ts`'s current `routeIntent` + `draftActivity`/`generateCourseDraftTool` behavior exactly, including the `needPackageDraft`/`needPackageEdit`/`needOpenActivity` guards, so `handler.test.ts` and `StudioChatProvider.test.tsx` keep passing unchanged.
- **Loop purity:** `agentLoop.ts` never imports the AI SDK, never touches `@open-edu/storage` directly (it emits drafts/ChangeSets for the UI to approve), and resolves all six bounds to an explicit `error`/`approval.required` event rather than hanging or silently skipping.
