# Phase 1 — SDK and Sandboxed Protocol

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a React-free `@open-edu/widget-sdk`, canonical `WidgetManifest` + protocol schemas, a feature-flagged iframe `SandboxWidgetAdapter`, one vanilla example widget, and a local development registry.

**Architecture:** Schemas own Zod types. The SDK validates envelopes and exposes a widget-side `createWidgetHostClient`. Runtime hosts an iframe with `sandbox="allow-scripts"` `referrerpolicy="no-referrer"` and never grants `allow-same-origin`. Feature flag `sandboxWidgets` (default false until Phase 2 resolver ships) must be passed explicitly in tests.

**Tech Stack:** TypeScript, Zod, Vitest, React Testing Library, jsdom (postMessage)

**Depends on:** Phase 0 complete.

**Index:** [`2026-08-15-runtime-community-widget-ecosystem-index.md`](./2026-08-15-runtime-community-widget-ecosystem-index.md)

---

## File Map

### New files

| File                                                    | Purpose                                  |
| ------------------------------------------------------- | ---------------------------------------- |
| `packages/schemas/src/widget-reference.ts`              | `WidgetReference` union                  |
| `packages/schemas/src/widget-protocol.ts`               | Envelope + payload Zod schemas           |
| `packages/schemas/src/community-widget-manifest.ts`     | Canonical `WidgetManifestSchema`         |
| `packages/widget-sdk/package.json`                      | New package, **no React dependency**     |
| `packages/widget-sdk/tsconfig.json`                     | Extends `tsconfig.base.json`, DOM lib    |
| `packages/widget-sdk/src/index.ts`                      | Public exports                           |
| `packages/widget-sdk/src/constants.ts`                  | `PROTOCOL_API_VERSION`                   |
| `packages/widget-sdk/src/validate-message.ts`           | Envelope + origin checks                 |
| `packages/widget-sdk/src/host-client.ts`                | Widget-side postMessage helper           |
| `packages/widget-sdk/src/theme.ts`                      | Apply theme tokens as CSS variables      |
| `packages/widget-sdk/src/fixtures/protocol-fixtures.ts` | Conformance fixtures                     |
| `packages/widget-sdk/src/harness/iframe-harness.ts`     | Test host for widgets                    |
| `packages/runtime/src/widgets/SandboxWidgetAdapter.tsx` | Host iframe + broker                     |
| `packages/runtime/src/widgets/sandbox-limits.ts`        | Rate / size / resize clamp               |
| `examples/community-widget-counter/`                    | Vanilla self-contained example           |
| `packages/widget-sdk/src/dev-registry.ts`               | Local fixture registry + relaxed origins |

### Files to modify

| File                                                | Change                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `packages/schemas/src/widget-manifest.ts`           | Keep legacy `RemoteWidgetManifestSchema`                                                    |
| `packages/schemas/src/index.ts`                     | Export new schemas                                                                          |
| `packages/schemas/src/nodes.ts`                     | Additive optional `widgetRef`                                                               |
| `packages/runtime/src/renderers/WidgetRenderer.tsx` | If `widgetRef.source === 'registry'` and flag on, render sandbox adapter                    |
| `examples/remote-widget-demo/remote-widget.js`      | Document + stub SDK bootstrap (do not require React)                                        |
| `packages/widgets/package.json`                     | Depend on `@open-edu/widget-sdk`                                                            |
| `AGENTS.md`                                         | Add widget-sdk to package list (only if this phase lands docs in-repo; skip OpenWiki pages) |

---

### Task 1: Canonical WidgetManifest schema

**Files:**

- Create: `packages/schemas/src/community-widget-manifest.ts`
- Create: `packages/schemas/src/community-widget-manifest.test.ts`
- Modify: `packages/schemas/src/index.ts`

- [ ] **Step 1: Write failing tests** covering: valid multi-file HTTPS manifest; reject `file:` / `data:` / `blob:` documentUrl; reject missing `documentIntegrity`; reject `offline: true` with `format: 'multi-file'`; reject invalid id (must match `/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/` e.g. `community.example.counter`); reject non-semver version; reject `status: 'verified'` without treating it as unsigned experimental at schema level — schema **allows** all four statuses; registry attribution is a resolver concern in Phase 2. Include one test that `distribution.offline === true` requires `artifact.format === 'self-contained-html'` via `.superRefine`.

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter @open-edu/schemas test src/community-widget-manifest.test.ts`

Expected: FAIL missing module

- [ ] **Step 3: Implement schema** matching spec §5.3:

```ts
import { z } from 'zod';

export const PROTOCOL_API_VERSION = 'open-edu.widget/1' as const;

export const WidgetCapabilitySchema = z.enum([
  'resize',
  'telemetry-interaction',
  'state-persistence',
  'locale',
  'theme',
  'hints',
  'observe-mode',
]);

const integritySchema = z.string().regex(/^sha256-[a-f0-9]{64}$/);

const httpsUrlSchema = z
  .string()
  .url()
  .refine(
    (val) => {
      const url = new URL(val);
      if (url.protocol !== 'https:') return false;
      const host = url.hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host.endsWith('.local') ||
        host === '127.0.0.1' ||
        host === '::1'
      ) {
        return false;
      }
      return true;
    },
    { message: 'documentUrl must be https and non-loopback' },
  );

export const WidgetManifestSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/),
    version: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/),
    apiVersion: z.literal(PROTOCOL_API_VERSION),
    artifact: z.object({
      documentUrl: httpsUrlSchema,
      documentIntegrity: integritySchema,
      archiveUrl: httpsUrlSchema.optional(),
      archiveIntegrity: integritySchema.optional(),
      sizeBytes: z.number().int().positive(),
      format: z.enum(['multi-file', 'self-contained-html']),
    }),
    publisher: z.object({
      id: z.string().min(1).max(128),
      name: z.string().min(1).max(256),
      website: z.string().url().optional(),
    }),
    metadata: z.record(z.unknown()),
    schemas: z
      .object({
        configUrl: httpsUrlSchema.optional(),
        stateUrl: httpsUrlSchema.optional(),
      })
      .default({}),
    capabilities: z.array(WidgetCapabilitySchema),
    accessibility: z.record(z.unknown()),
    supportedThemes: z.array(z.enum(['light', 'dark', 'zen'])).min(1),
    reducedMotion: z.enum(['supported', 'not-supported', 'not-applicable']),
    compatibility: z.object({
      runtime: z.string().min(1),
      browsers: z.array(z.string()).optional(),
    }),
    distribution: z.object({
      offline: z.boolean(),
      cachePolicy: z.literal('immutable'),
    }),
    status: z.enum(['experimental', 'verified', 'deprecated', 'revoked']),
    fallback: z.string().min(1).max(256).optional(),
    signature: z.unknown().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.artifact.archiveUrl && !val.artifact.archiveIntegrity) {
      ctx.addIssue({
        code: 'custom',
        message: 'archiveIntegrity required when archiveUrl is set',
        path: ['artifact', 'archiveIntegrity'],
      });
    }
    if (val.distribution.offline && val.artifact.format !== 'self-contained-html') {
      ctx.addIssue({
        code: 'custom',
        message: 'offline widgets must use self-contained-html',
        path: ['distribution', 'offline'],
      });
    }
  });

export type WidgetManifest = z.infer<typeof WidgetManifestSchema>;
```

Also export JSON Schema via existing `toJsonSchemaDraft7(WidgetManifestSchema)` in a small test that snapshots keys `id`, `artifact`, `apiVersion`.

Keep `RemoteWidgetManifestSchema` in `widget-manifest.ts` unchanged.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @open-edu/schemas test src/community-widget-manifest.test.ts src/widget-manifest.test.ts`

Expected: PASS; legacy remote tests still pass

- [ ] **Step 5: Commit**

```bash
git add packages/schemas/src/community-widget-manifest.ts packages/schemas/src/community-widget-manifest.test.ts packages/schemas/src/index.ts
git commit -m "$(cat <<'EOF'
feat(schemas): add canonical community WidgetManifest

EOF
)"
```

---

### Task 2: WidgetReference schema

**Files:**

- Create: `packages/schemas/src/widget-reference.ts`
- Create: `packages/schemas/src/widget-reference.test.ts`
- Modify: `packages/schemas/src/nodes.ts` — add optional `widgetRef: WidgetReferenceSchema.optional()` on `WidgetNodeSchema` **in addition to** `remoteWidget`

- [ ] **Step 1: Tests**

```ts
import { describe, it, expect } from 'vitest';
import { WidgetReferenceSchema } from './widget-reference';

describe('WidgetReferenceSchema', () => {
  it('accepts builtin without integrity', () => {
    expect(
      WidgetReferenceSchema.parse({ id: 'core.matching', version: '1.0.0', source: 'builtin' }),
    ).toMatchObject({ source: 'builtin' });
  });

  it('requires integrity for source registry', () => {
    expect(() =>
      WidgetReferenceSchema.parse({
        id: 'community.example.counter',
        version: '1.0.0',
        source: 'registry',
      }),
    ).toThrow();
  });

  it('allows source url without integrity (legacy normalization)', () => {
    expect(
      WidgetReferenceSchema.parse({
        id: 'open-edu.remote-practice',
        version: '1.0.0',
        source: 'url',
      }),
    ).toMatchObject({ source: 'url' });
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `pnpm --filter @open-edu/schemas test src/widget-reference.test.ts`

- [ ] **Step 3: Implement**

```ts
import { z } from 'zod';

const integrity = z.string().regex(/^sha256-[a-f0-9]{64}$/);

const BuiltinRef = z.object({
  id: z.string().min(1).max(256),
  version: z.string().min(1).max(64),
  source: z.literal('builtin'),
  fallback: z.string().min(1).max(256).optional(),
});

const ExternalRef = z
  .object({
    id: z.string().min(1).max(256),
    version: z.string().min(1).max(64),
    source: z.enum(['registry', 'url']),
    registryId: z.string().min(1).max(128).optional(),
    integrity: integrity.optional(),
    fallback: z.string().min(1).max(256).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.source === 'registry' && !val.integrity) {
      ctx.addIssue({
        code: 'custom',
        message: 'registry references require integrity',
        path: ['integrity'],
      });
    }
  });

export const WidgetReferenceSchema = z.union([BuiltinRef, ExternalRef]);
export type WidgetReference = z.infer<typeof WidgetReferenceSchema>;
```

Add `widgetRef` to `WidgetNodeSchema` in `nodes.ts`. Add a nodes test that a node with both `remoteWidget` and `widgetRef` still parses (additive).

- [ ] **Step 4: Run** `pnpm --filter @open-edu/schemas test src/widget-reference.test.ts src/nodes.test.ts`

Expected: PASS

- [ ] **Step 5: Commit** `feat(schemas): add WidgetReference with mandatory registry integrity`

---

### Task 3: Protocol message schemas

**Files:**

- Create: `packages/schemas/src/widget-protocol.ts`
- Create: `packages/schemas/src/widget-protocol.test.ts`

Lock these constants and types (copy into the schema file; SDK re-exports them):

```ts
export const PROTOCOL_API_VERSION = 'open-edu.widget/1' as const;

export const HostToWidgetTypeSchema = z.enum([
  'init',
  'state:update',
  'locale:update',
  'theme:update',
  'lifecycle:pause',
  'lifecycle:destroy',
  'capability:result',
]);

export const WidgetToHostTypeSchema = z.enum([
  'ready',
  'resize',
  'interaction',
  'complete',
  'state:save',
  'capability:request',
  'error',
]);

export const InteractionActionSchema = z.enum([
  'select',
  'submit',
  'retry',
  'hint-request',
  'reveal',
  'drag',
  'drop',
  'navigate',
  'custom',
]);

export const WidgetMessageEnvelopeSchema = z.object({
  apiVersion: z.literal(PROTOCOL_API_VERSION),
  type: z.string(),
  instanceId: z.string().min(1).max(128),
  nonce: z.string().min(1).max(128),
  sequence: z.number().int().nonnegative(),
  requestId: z.string().min(1).max(128).optional(),
  payload: z.unknown(),
});
```

Payload schemas (each a named export):

```ts
export const InitPayloadSchema = z.object({
  apiVersion: z.literal(PROTOCOL_API_VERSION),
  widgetId: z.string(),
  widgetVersion: z.string(),
  instanceId: z.string(),
  nodeId: z.string(),
  config: z.record(z.unknown()),
  storedState: z.unknown().optional(),
  locale: z.string(),
  theme: z.enum(['light', 'dark', 'zen']),
  themeTokens: z.record(z.string()),
  prefersReducedMotion: z.boolean(),
  capabilities: z.array(WidgetCapabilitySchema),
});

export const CompletePayloadSchema = z.object({
  score: z.number().min(0).max(100).optional(),
  state: z.unknown().optional(),
  reason: z.enum(['finished', 'submitted', 'continued']).optional(),
});

export const StateSavePayloadSchema = z.object({
  requestId: z.string(),
  schemaVersion: z.string().min(1),
  state: z.unknown(),
});

export const StateSaveResultSchema = z.object({
  requestId: z.string(),
  accepted: z.boolean(),
  normalizedState: z.unknown().optional(),
  rejectionReason: z
    .enum(['schema-invalid', 'too-large', 'lifecycle-closed', 'policy-denied'])
    .optional(),
});

export const InteractionPayloadSchema = z.object({
  action: InteractionActionSchema,
  data: z.record(z.unknown()).optional(),
});

export const ResizePayloadSchema = z.object({
  height: z.number().positive(),
});
```

Tests: valid init envelope; reject wrong `apiVersion`; reject unknown interaction action; complete score > 100 fails.

- [ ] Commit `feat(schemas): add open-edu.widget/1 protocol payloads`

---

### Task 4: Scaffold `@open-edu/widget-sdk`

**Files:**

- Create: `packages/widget-sdk/package.json`
- Create: `packages/widget-sdk/tsconfig.json`
- Create: `packages/widget-sdk/src/index.ts`
- Create: `packages/widget-sdk/src/constants.ts`
- Create: `packages/widget-sdk/src/index.test.ts`

`package.json`:

```json
{
  "name": "@open-edu/widget-sdk",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Framework-agnostic community widget protocol SDK for Open-Edu",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
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
    "@open-edu/schemas": "workspace:*",
    "zod": "^3.22.0"
  }
}
```

`tsconfig.json` — same as `packages/llm-config/tsconfig.json` plus `"lib": ["ES2022", "DOM"]`.

`src/constants.ts`:

```ts
export { PROTOCOL_API_VERSION } from '@open-edu/schemas';
```

`src/index.ts` re-exports protocol types from schemas plus SDK helpers as they are added.

`src/index.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PROTOCOL_API_VERSION } from './index';

describe('@open-edu/widget-sdk', () => {
  it('exposes protocol version open-edu.widget/1', () => {
    expect(PROTOCOL_API_VERSION).toBe('open-edu.widget/1');
  });
});
```

Workspace already includes `packages/*`. Add `"@open-edu/widget-sdk": "workspace:*"` to `packages/widgets/package.json` and `packages/runtime/package.json`.

- [ ] Run `pnpm install` then `pnpm --filter @open-edu/widget-sdk test`
- [ ] Commit `feat(widget-sdk): scaffold framework-agnostic protocol package`

---

### Task 5: Message validators

**Files:**

- Create: `packages/widget-sdk/src/validate-message.ts`
- Create: `packages/widget-sdk/src/validate-message.test.ts`

```ts
import {
  WidgetMessageEnvelopeSchema,
  PROTOCOL_API_VERSION,
  WidgetToHostTypeSchema,
  HostToWidgetTypeSchema,
} from '@open-edu/schemas';

export type MessageRejection =
  | 'api-version'
  | 'origin'
  | 'instance'
  | 'nonce'
  | 'sequence'
  | 'type'
  | 'malformed'
  | 'rate-limit';

export interface HostSession {
  instanceId: string;
  nonce: string;
  expectedOrigin: string | 'opaque';
  lastSequence: number;
}

export function validateHostBoundMessage(
  data: unknown,
  eventOrigin: string,
  session: HostSession,
):
  | { ok: true; message: z.infer<typeof WidgetMessageEnvelopeSchema> }
  | { ok: false; reason: MessageRejection } {
  if (session.expectedOrigin !== 'opaque' && eventOrigin !== session.expectedOrigin) {
    return { ok: false, reason: 'origin' };
  }
  const parsed = WidgetMessageEnvelopeSchema.safeParse(data);
  if (!parsed.success) return { ok: false, reason: 'malformed' };
  const msg = parsed.data;
  if (msg.apiVersion !== PROTOCOL_API_VERSION) return { ok: false, reason: 'api-version' };
  if (msg.instanceId !== session.instanceId) return { ok: false, reason: 'instance' };
  if (msg.nonce !== session.nonce) return { ok: false, reason: 'nonce' };
  if (msg.sequence !== session.lastSequence + 1) return { ok: false, reason: 'sequence' };
  if (!WidgetToHostTypeSchema.safeParse(msg.type).success) return { ok: false, reason: 'type' };
  return { ok: true, message: msg };
}
```

Tests: wrong origin, wrong nonce, wrong instance, sequence skip, bad apiVersion, valid ready message (`sequence: 1` when `lastSequence: 0`).

Host→widget validator is the same with `HostToWidgetTypeSchema`.

- [ ] Commit `feat(widget-sdk): validate protocol envelopes against session nonce`

---

### Task 6: Widget-side host client + theme tokens

**Files:**

- Create: `packages/widget-sdk/src/host-client.ts`
- Create: `packages/widget-sdk/src/host-client.test.ts`
- Create: `packages/widget-sdk/src/theme.ts`
- Create: `packages/widget-sdk/src/theme.test.ts`

`createWidgetHostClient({ target, instanceId, nonce })` returns:

```ts
{
  post(type: string, payload: unknown, requestId?: string): void;
  ready(): void;
  complete(payload: CompletePayload): void;
  saveState(payload: StateSavePayload): void;
  interaction(action: InteractionAction, data?: Record<string, unknown>): void;
  resize(height: number): void;
  error(message: string): void;
  onInit(handler: (payload: InitPayload) => void): void;
}
```

Sequence counter starts at 0; first widget→host message uses `sequence: 1`. `post` uses `target.parent.postMessage(envelope, target.parentOrigin || '*')` — for opaque srcdoc, targetOrigin is `'*'` only after the host created the iframe (document already verified). Production multi-file widgets must pass the host origin from `init` and subsequent posts use that origin.

`applyThemeTokens(root: HTMLElement, tokens: Record<string, string>)` sets `root.style.setProperty('--oe-widget-' + key, value)` for each token. Never read host CSS.

Tests use a mock `parent.postMessage`.

- [ ] Commit `feat(widget-sdk): add widget host client and theme token applicator`

---

### Task 6b: Shared interaction data normalizer

**Files:**

- Create: `packages/widget-sdk/src/normalize-interaction-data.ts`
- Create: `packages/widget-sdk/src/normalize-interaction-data.test.ts`

Define a per-action allow schema and a canonical normalizer used by **both** native and sandboxed paths. Depends on Task 3 (`InteractionActionSchema` in `@open-edu/schemas`):

```ts
import { InteractionActionSchema } from '@open-edu/schemas';

const ACTION_DATA_SCHEMAS: Record<string, readonly string[]> = {
  select: ['optionId', 'index'],
  submit: ['optionId', 'index', 'step'],
  retry: ['step'],
  'hint-request': ['step'],
  reveal: ['step'],
  drag: ['from', 'to', 'index'],
  drop: ['from', 'to', 'index'],
  navigate: ['step', 'index'],
  custom: ['step', 'optionId', 'from', 'to', 'index', 'key'],
};

export function normalizeInteractionData(
  action: string,
  data: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!data) return undefined;
  const allowed = ACTION_DATA_SCHEMAS[action];
  if (!allowed) return undefined;
  const filtered: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in data && typeof data[key] !== 'object') {
      filtered[key] = data[key];
    }
  }
  return Object.keys(filtered).length > 0 ? filtered : undefined;
}
```

`@open-edu/runtime` and `@open-edu/widgets` must import `normalizeInteractionData` from `@open-edu/widget-sdk`. The Phase 0 `normalize-interaction.ts` in `packages/runtime/src/widgets/` must be updated in Phase 2 to delegate to this shared utility.

Tests:

- `drag` action: `{ from: 'A', to: 'B', secret: 'nope' }` → `{ from: 'A', to: 'B' }`
- `navigate` action: `{ step: 2, widgetId: 'x' }` → `{ step: 2 }`
- `custom` action: passes `key` field; strips nested objects
- unknown action returns `undefined`

- [ ] Run: `pnpm --filter @open-edu/widget-sdk test src/normalize-interaction-data.test.ts`
- [ ] Commit `feat(widget-sdk): add canonical per-action interaction data normalizer`

---

### Task 7: Conformance fixtures + iframe harness

**Files:**

- Create: `packages/widget-sdk/src/fixtures/protocol-fixtures.ts`
- Create: `packages/widget-sdk/src/fixtures/protocol-fixtures.test.ts`
- Create: `packages/widget-sdk/src/harness/iframe-harness.ts`
- Create: `packages/widget-sdk/src/harness/iframe-harness.test.ts`

Fixtures export `VALID_INIT_MESSAGE`, `WRONG_NONCE_MESSAGE`, `EXPIRED_SEQUENCE_MESSAGE` as plain objects. Tests parse valid with Zod and reject invalid.

Harness `createIframeHarness({ documentHtml, origin })` used only in tests: creates an iframe element, wires `message` listener with `validateHostBoundMessage`, exposes `messages[]`. jsdom may not fully support iframe postMessage — if the harness test cannot observe iframe messages in jsdom, test the harness’s listener function with synthetic `MessageEvent` objects instead of a real iframe. Do not skip the origin/nonce assertions.

CSP fixture strings (must appear in fixtures file):

```ts
export const MULTI_FILE_CSP =
  "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' data:; font-src 'self' data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none';";

export const SELF_CONTAINED_CSP_PREFIX = "default-src 'none'; script-src 'sha256-";

export const CAPABILITY_REQUEST_V1_REJECTION_FIXTURE = {
  apiVersion: 'open-edu.widget/1' as const,
  type: 'capability:request',
  instanceId: 'test-instance',
  nonce: 'test-nonce',
  sequence: 1,
  payload: { capability: 'resize' },
} as const;
```

A test asserts `MULTI_FILE_CSP` contains `connect-src 'none'` and `frame-src 'none'`.

> A test must assert that `validateHostBoundMessage` with `type: 'capability:request'` returns `{ ok: false, reason: 'type' }` — because `capability:request` is a widget→host message type but the host drops it in v1 since no v1 capability uses the request/response channel. This makes the extension-point behavior deterministic and prevents widgets from depending on an unimplemented path.

- [ ] Commit `feat(widget-sdk): add protocol fixtures and host harness`

---

### Task 8: Sandbox limits + SandboxWidgetAdapter

**Files:**

- Create: `packages/runtime/src/widgets/sandbox-limits.ts`
- Create: `packages/runtime/src/widgets/sandbox-limits.test.ts`
- Create: `packages/runtime/src/widgets/SandboxWidgetAdapter.tsx`
- Create: `packages/runtime/src/widgets/SandboxWidgetAdapter.test.tsx`

Limits:

```ts
export const READY_TIMEOUT_MS = 10_000;
export const MAX_MESSAGES_PER_MINUTE = 120;
export const MIN_IFRAME_HEIGHT = 120;
export const MAX_IFRAME_HEIGHT = 1200;
export const MAX_STATE_BYTES = 64 * 1024;

export function clampResizeHeight(height: number): number {
  return Math.min(MAX_IFRAME_HEIGHT, Math.max(MIN_IFRAME_HEIGHT, Math.round(height)));
}

export function createRateLimiter(limit = MAX_MESSAGES_PER_MINUTE) {
  const stamps: number[] = [];
  return {
    allow(now = Date.now()): boolean {
      const windowStart = now - 60_000;
      while (stamps.length && stamps[0]! < windowStart) stamps.shift();
      if (stamps.length >= limit) return false;
      stamps.push(now);
      return true;
    },
  };
}
```

`SandboxWidgetAdapter` props:

```ts
export interface SandboxWidgetAdapterProps {
  nodeId: string;
  documentUrl?: string;
  srcDoc?: string;
  expectedOrigin: string | 'opaque';
  title: string;
  initPayload: InitPayload;
  onReady: () => void;
  onComplete: (payload: CompletePayload) => void;
  onStateSave: (payload: StateSavePayload) => void;
  onInteraction: (payload: InteractionPayload) => void;
  onError: (message: string) => void;
  onDiagnostic?: (reason: string) => void;
}
```

Implementation requirements:

- Render `<iframe sandbox="allow-scripts" referrerPolicy="no-referrer" loading="lazy" title={title} />`
- Generate `instanceId` and `nonce` with `crypto.randomUUID()`
- Do not set `allow-same-origin`
- Ignore host-bound messages before `ready` except `ready` itself; `state:save` before ready is never accepted; record diagnostic
- Ready timeout 10s → `onError('timeout')` and unmount iframe
- Destroy-before-ready: `cancelled`, must not call `onComplete`
- Rate-limit host-bound messages; overflow → drop + diagnostic `rate-limit`
- Debounce resize 100ms then clamp
- Network retry: **not in this component**; resolver (Phase 2) retries fetch once. Adapter treats documentUrl as already verified.
- `observe-mode` enforcement: if `initPayload.capabilities` contains `'observe-mode'` and does **not** contain `'telemetry-interaction'`, the adapter must reject any inbound `complete` message — call `onDiagnostic?.('observe-mode-complete-rejected')` and do not call `onComplete`.
- Diagnostics channel: all system-level diagnostic signals (wrong nonce, rate-limit, pre-ready messages, observe-mode complete rejection) must be emitted through `onDiagnostic(reason: string)` and must **never** be routed through `onInteraction` or any `emitTelemetry`/`widget_interaction` path.

Tests (RTL + fake postMessage):

1. Posts `init` after iframe `load`
2. `ready` calls `onReady`
3. Wrong nonce does not call `onComplete`
4. Unmount before ready does not complete
5. Iframe has `sandbox="allow-scripts"` and no `allow-same-origin`
6. Host shell (loading/error region wrapping the iframe) passes axe-core with a localized `title`
7. `observe-mode` with `complete` message does not call `onComplete`; calls `onDiagnostic('observe-mode-complete-rejected')`

Feature flag: export `isSandboxWidgetsEnabled()` reading `globalThis.__OPEN_EDU_SANDBOX_WIDGETS__ === true` or prop `enabled` default false. WidgetRenderer only mounts adapter when enabled **and** `node.widgetRef?.source === 'registry'`. Until Phase 2, tests mount `SandboxWidgetAdapter` directly.

- [ ] Commit `feat(runtime): add sandboxed iframe widget adapter behind flag`

---

### Task 9: Example community widget + local dev registry

**Files:**

- Create: `examples/community-widget-counter/widget.manifest.json`
- Create: `examples/community-widget-counter/dist/index.html` (self-contained, inline script)
- Create: `examples/community-widget-counter/schema/config.schema.json`
- Create: `examples/community-widget-counter/schema/state.schema.json`
- Create: `packages/widget-sdk/src/dev-registry.ts`
- Create: `packages/widget-sdk/src/dev-registry.test.ts`

Counter widget: vanilla JS, listens for `init`, renders a button, `postMessage` `ready` then `interaction` `select` and `complete` `{ score: 100, reason: 'submitted' }`. No React.

The build step for `dist/index.html` must use `computeSelfContainedCspHash` from `@open-edu/widget-sdk/build-helpers` to produce the correct `script-src 'sha256-...'` value for the inline script. Add this as a new file:

- Create: `packages/widget-sdk/src/build-helpers.ts` (Node.js only — uses `crypto` from Node, not Web Crypto)

```ts
import { createHash } from 'node:crypto';

/**
 * Compute the sha256 CSP hash for an inline script element.
 * Pass the exact string content of the inline <script> tag
 * (not the outer HTML — only the text between <script> and </script>).
 * Returns the canonical `sha256-<base64>` format required by CSP.
 */
export function computeSelfContainedCspHash(inlineScriptContent: string): string {
  const hash = createHash('sha256').update(inlineScriptContent, 'utf8').digest('base64');
  return `sha256-${hash}`;
}
```

Expose as `"./build-helpers"` in the `exports` map (no `development` condition — it is a build-time utility for any environment). Add a test:

```ts
import { computeSelfContainedCspHash } from './build-helpers';
it('produces sha256-<base64> for known input', () => {
  expect(computeSelfContainedCspHash('console.log(1)')).toMatch(/^sha256-[A-Za-z0-9+/=]{44}$/);
});
```

The counter widget's self-contained HTML must embed the computed hash in its CSP meta element and the `widget.manifest.json` must set `artifact.documentIntegrity` to the sha256 of the complete served document bytes (using `canonicalIntegrity` from `@open-edu/widgets`).

`dev-registry.ts`:

```ts
export interface DevRegistryOptions {
  relaxedOrigins: string[]; // default ['http://localhost:4177']
}

export function createDevRegistry(options?: DevRegistryOptions) {
  return {
    relaxedOrigins: options?.relaxedOrigins ?? ['http://localhost:4177'],
    fixtures: [] as WidgetManifest[],
  };
}
```

Test: default relaxed origin is localhost HTTP (dev only). Production `WidgetPolicy.allowedOrigins` still rejects this — that is intentional. Structure `dev-registry.ts` as a dedicated subpath export. In `packages/widget-sdk/package.json`, add under `exports`:

```json
"./dev": {
  "development": { "types": "./dist/dev/index.d.ts", "import": "./dist/dev/index.js" }
}
```

This makes `import ... from '@open-edu/widget-sdk/dev'` fail in production builds (bundlers that do not set `NODE_ENV=development`). Add an ESLint `no-restricted-imports` rule to `apps/learner` and `packages/runtime` that rejects `@open-edu/widget-sdk/dev` with the message `"dev-registry must not be imported in production packages"`.

Migrate `examples/remote-widget-demo/remote-widget.js`: add a file header comment that `window.React` is deprecated; add `examples/remote-widget-demo/MIGRATION.md` **only if** the user asked for docs — skip extra markdown. Instead add a 15-line comment in `remote-widget.js` pointing to `@open-edu/widget-sdk` `createWidgetHostClient`. Leave the React demo functioning for trusted-remote opt-in tests.

- [ ] Commit `feat(examples): add vanilla community counter widget and dev registry`

---

### Task 10: Phase 1 verification

```bash
pnpm --filter @open-edu/schemas test
pnpm --filter @open-edu/widget-sdk test
pnpm --filter @open-edu/runtime test
pnpm --filter @open-edu/widgets test
```

Expected: PASS. Learner still does not load community iframes unless the sandbox flag is on.

- [ ] Commit leftover export wiring only if needed
