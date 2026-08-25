# Phase 0 — Harden Current Remote Loading

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make same-realm remote loading an explicitly configured trusted-remote path with integrity, origin, API version, timeout, and size checks, and bridge widget interactions plus fallback provenance into host schemas — without changing built-in widget behavior.

**Architecture:** Add a Zod `WidgetPolicy` (default: trusted-remote **disabled**). `RemoteWidgetLoader.load` refuses work unless policy enables `trusted-remote`, then verifies origin, `apiVersion === '1.0.0'`, mandatory integrity, response size, and timeout. Runtime gains `emitTelemetry`. Fallback and remote completions write `WidgetAnswer` provenance.

**Tech Stack:** TypeScript, Zod, Vitest, React Testing Library

**Index:** [`2026-08-15-runtime-community-widget-ecosystem-index.md`](./2026-08-15-runtime-community-widget-ecosystem-index.md)

**Do not** add iframes, `@open-edu/widget-sdk`, or `WidgetResolver` in this phase.

---

## File Map

### New files

| File                                                         | Purpose                                     |
| ------------------------------------------------------------ | ------------------------------------------- |
| `packages/schemas/src/widget-policy.ts`                      | Trust-tier + deployment policy schema       |
| `packages/schemas/src/widget-policy.test.ts`                 | Policy validation tests                     |
| `packages/widgets/src/integrity.ts`                          | Canonical SHA-256 integrity helpers         |
| `packages/widgets/src/integrity.test.ts`                     | Digest + parse tests                        |
| `packages/widgets/src/policy.ts`                             | `DEFAULT_WIDGET_POLICY`, origin checks      |
| `packages/widgets/src/policy.test.ts`                        | Origin / private-network rejection          |
| `packages/runtime/src/widgets/normalize-interaction.ts`      | Safe telemetry payload from emitInteraction |
| `packages/runtime/src/widgets/normalize-interaction.test.ts` | Action + data stripping                     |
| `packages/runtime/src/widgets/answer-provenance.ts`          | Build `WidgetAnswer` with provenance        |
| `packages/runtime/src/widgets/answer-provenance.test.ts`     | Fallback vs intended identity               |

### Files to modify

| File                                                     | Change                                            |
| -------------------------------------------------------- | ------------------------------------------------- |
| `packages/schemas/src/progress.ts`                       | Provenance fields on `WidgetAnswerSchema`         |
| `packages/schemas/src/progress.test.ts`                  | Provenance parse tests                            |
| `packages/schemas/src/telemetry.ts`                      | Optional `renderedViaFallback` on `node_complete` |
| `packages/schemas/src/telemetry.test.ts`                 | Optional field accepted                           |
| `packages/schemas/src/index.ts`                          | Export policy + new types                         |
| `packages/widgets/src/types.ts`                          | Re-export `RemoteWidgetManifest` from schemas     |
| `packages/widgets/src/remote-loader.ts`                  | Policy-gated trusted-remote load                  |
| `packages/widgets/src/remote-loader.test.ts`             | Rejection + integrity format tests                |
| `packages/widgets/src/index.ts`                          | Export policy + integrity                         |
| `packages/runtime/src/context/RuntimeContext.tsx`        | Optional `emitTelemetry`                          |
| `packages/runtime/src/renderers/WidgetRenderer.tsx`      | Telemetry + provenance                            |
| `packages/runtime/src/renderers/WidgetRenderer.test.tsx` | Interaction emit + fallback provenance            |
| `apps/learner/src/CourseRuntime.tsx`                     | Pass session.emit as emitTelemetry                |
| `apps/dev-server/src/DevApp.tsx`                         | Same                                              |

---

### Task 1: Integrity helpers

**Files:**

- Create: `packages/widgets/src/integrity.ts`
- Create: `packages/widgets/src/integrity.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { canonicalIntegrity, parseIntegrity, verifyIntegrity, IntegrityError } from '../integrity';

describe('integrity', () => {
  it('canonicalIntegrity is sha256- plus 64 lowercase hex', async () => {
    const digest = await canonicalIntegrity(new TextEncoder().encode('hello'));
    expect(digest).toMatch(/^sha256-[a-f0-9]{64}$/);
  });

  it('verifyIntegrity accepts a matching digest', async () => {
    const bytes = new TextEncoder().encode('hello');
    const digest = await canonicalIntegrity(bytes);
    await expect(verifyIntegrity(bytes, digest)).resolves.toBe(true);
  });

  it('parseIntegrity rejects missing prefix, uppercase hex, and wrong length', () => {
    expect(() => parseIntegrity('abc')).toThrow(IntegrityError);
    expect(() => parseIntegrity('sha256-' + 'A'.repeat(64).toLowerCase().toUpperCase())).toThrow(
      IntegrityError,
    );
    expect(() => parseIntegrity('sha256-deadbeef')).toThrow(IntegrityError);
  });

  it('verifyIntegrity throws IntegrityError on mismatch', async () => {
    const bytes = new TextEncoder().encode('hello');
    await expect(verifyIntegrity(bytes, 'sha256-' + '0'.repeat(64))).rejects.toThrow(
      IntegrityError,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @open-edu/widgets test src/integrity.test.ts`

Expected: FAIL with `Cannot find module '../integrity'`

- [ ] **Step 3: Write minimal implementation**

```ts
export class IntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IntegrityError';
  }
}

const INTEGRITY_RE = /^sha256-[a-f0-9]{64}$/;

export function parseIntegrity(value: string): string {
  const normalized = value.trim();
  if (!INTEGRITY_RE.test(normalized)) {
    throw new IntegrityError(
      `Invalid integrity "${value}". Expected sha256- followed by 64 lowercase hex chars.`,
    );
  }
  return normalized;
}

export async function canonicalIntegrity(bytes: BufferSource): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `sha256-${hex}`;
}

export async function verifyIntegrity(bytes: BufferSource, expected: string): Promise<true> {
  const parsed = parseIntegrity(expected);
  const actual = await canonicalIntegrity(bytes);
  if (actual !== parsed) {
    throw new IntegrityError(`Integrity mismatch: expected ${parsed}, got ${actual}`);
  }
  return true;
}
```

- [ ] **Step 4: Run tests and make sure they pass**

Run: `pnpm --filter @open-edu/widgets test src/integrity.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/widgets/src/integrity.ts packages/widgets/src/integrity.test.ts
git commit -m "$(cat <<'EOF'
feat(widgets): add canonical sha256 integrity helpers

EOF
)"
```

---

### Task 2: Widget policy schema

**Files:**

- Create: `packages/schemas/src/widget-policy.ts`
- Create: `packages/schemas/src/widget-policy.test.ts`
- Modify: `packages/schemas/src/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { WidgetPolicySchema, DEFAULT_WIDGET_POLICY } from './widget-policy';

describe('WidgetPolicySchema', () => {
  it('parses the default policy with trusted-remote disabled', () => {
    const policy = WidgetPolicySchema.parse(DEFAULT_WIDGET_POLICY);
    expect(policy.enabledTrustTiers).toEqual(['native', 'sandboxed']);
    expect(policy.requireIntegrityForTrustedRemote).toBe(true);
    expect(policy.maxArtifactBytes).toBe(2 * 1024 * 1024);
    expect(policy.readyTimeoutMs).toBe(10_000);
  });

  it('rejects unknown trust tiers', () => {
    expect(() =>
      WidgetPolicySchema.parse({ ...DEFAULT_WIDGET_POLICY, enabledTrustTiers: ['host'] }),
    ).toThrow();
  });

  it('rejects loopback origins in allowedOrigins', () => {
    expect(() =>
      WidgetPolicySchema.parse({
        ...DEFAULT_WIDGET_POLICY,
        allowedOrigins: ['https://127.0.0.1'],
      }),
    ).toThrow();
  });

  it('defaults registryCatalogOrigins to empty array', () => {
    const policy = WidgetPolicySchema.parse(DEFAULT_WIDGET_POLICY);
    expect(policy.registryCatalogOrigins).toEqual([]);
  });

  it('rejects loopback origins in registryCatalogOrigins', () => {
    expect(() =>
      WidgetPolicySchema.parse({
        ...DEFAULT_WIDGET_POLICY,
        registryCatalogOrigins: ['https://127.0.0.1'],
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @open-edu/schemas test src/widget-policy.test.ts`

Expected: FAIL with `Cannot find module './widget-policy'`

- [ ] **Step 3: Write minimal implementation**

```ts
import { z } from 'zod';

export const TrustTierSchema = z.enum(['native', 'trusted-remote', 'sandboxed']);
export type TrustTier = z.infer<typeof TrustTierSchema>;

const httpsPublicOrigin = z
  .string()
  .url()
  .refine(
    (val) => {
      try {
        const url = new URL(val);
        if (url.protocol !== 'https:') return false;
        const host = url.hostname.toLowerCase();
        if (host === 'localhost' || host.endsWith('.localhost')) return false;
        if (host === '127.0.0.1' || host === '::1' || host === '[::1]') return false;
        if (host.endsWith('.local')) return false;
        return true;
      } catch {
        return false;
      }
    },
    { message: 'allowedOrigins must be https public hosts' },
  );

export const WidgetPolicySchema = z.object({
  enabledTrustTiers: z.array(TrustTierSchema).min(1),
  allowedOrigins: z.array(httpsPublicOrigin).default([]),
  requireIntegrityForTrustedRemote: z.boolean().default(true),
  maxArtifactBytes: z
    .number()
    .int()
    .positive()
    .max(32 * 1024 * 1024),
  readyTimeoutMs: z.number().int().positive().max(60_000),
  experimentalWidgets: z.enum(['allow', 'deny']).default('deny'),
  maxHostBoundMessagesPerMinute: z.number().int().positive().default(120),
  registryCatalogOrigins: z.array(httpsPublicOrigin).default([]),
});

export type WidgetPolicy = z.infer<typeof WidgetPolicySchema>;

export const DEFAULT_WIDGET_POLICY: WidgetPolicy = WidgetPolicySchema.parse({
  enabledTrustTiers: ['native', 'sandboxed'],
  allowedOrigins: [],
  requireIntegrityForTrustedRemote: true,
  maxArtifactBytes: 2 * 1024 * 1024,
  readyTimeoutMs: 10_000,
  experimentalWidgets: 'deny',
  maxHostBoundMessagesPerMinute: 120,
  registryCatalogOrigins: [],
});

export function isTrustTierEnabled(policy: WidgetPolicy, tier: TrustTier): boolean {
  return policy.enabledTrustTiers.includes(tier);
}
```

Export `WidgetPolicySchema`, `DEFAULT_WIDGET_POLICY`, `TrustTierSchema`, `isTrustTierEnabled`, `registryCatalogOrigins`, and types from `packages/schemas/src/index.ts`.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @open-edu/schemas test src/widget-policy.test.ts src/index.test.ts`

Expected: PASS (update `index.test.ts` only if it asserts a closed export list)

- [ ] **Step 5: Commit**

```bash
git add packages/schemas/src/widget-policy.ts packages/schemas/src/widget-policy.test.ts packages/schemas/src/index.ts
git commit -m "$(cat <<'EOF'
feat(schemas): add widget trust-tier deployment policy

EOF
)"
```

---

### Task 3: Origin allowlist helpers

**Files:**

- Create: `packages/widgets/src/policy.ts`
- Create: `packages/widgets/src/policy.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_WIDGET_POLICY } from '@open-edu/schemas';
import { assertTrustedRemoteAllowed, originOf } from './policy';

describe('assertTrustedRemoteAllowed', () => {
  const policy = {
    ...DEFAULT_WIDGET_POLICY,
    enabledTrustTiers: ['native', 'sandboxed', 'trusted-remote'] as const,
    allowedOrigins: ['https://cdn.example.com'],
  };

  it('allows an https origin on the allowlist', () => {
    expect(() =>
      assertTrustedRemoteAllowed('https://cdn.example.com/widgets/a.js', policy),
    ).not.toThrow();
  });

  it('rejects file, data, blob, http, and off-allowlist hosts', () => {
    expect(() => assertTrustedRemoteAllowed('file:///tmp/w.js', policy)).toThrow();
    expect(() => assertTrustedRemoteAllowed('https://evil.example/w.js', policy)).toThrow();
    expect(() => assertTrustedRemoteAllowed('http://cdn.example.com/w.js', policy)).toThrow();
  });

  it('rejects trusted-remote when the tier is disabled', () => {
    expect(() =>
      assertTrustedRemoteAllowed('https://cdn.example.com/w.js', DEFAULT_WIDGET_POLICY),
    ).toThrow(/trusted-remote/);
  });
});

describe('originOf', () => {
  it('returns scheme + host + port', () => {
    expect(originOf('https://cdn.example.com:8443/a.js')).toBe('https://cdn.example.com:8443');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @open-edu/widgets test src/policy.test.ts`

Expected: FAIL with missing module

- [ ] **Step 3: Write minimal implementation**

```ts
import { DEFAULT_WIDGET_POLICY, isTrustTierEnabled, type WidgetPolicy } from '@open-edu/schemas';

export { DEFAULT_WIDGET_POLICY };

export function originOf(urlString: string): string {
  const url = new URL(urlString);
  return url.origin;
}

export function assertTrustedRemoteAllowed(urlString: string, policy: WidgetPolicy): void {
  if (!isTrustTierEnabled(policy, 'trusted-remote')) {
    throw new Error('trusted-remote widgets are disabled by deployment policy');
  }
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error(`Invalid widget URL: ${urlString}`);
  }
  if (url.protocol !== 'https:') {
    throw new Error(`Widget URL must use https: (${urlString})`);
  }
  const allowed = new Set(policy.allowedOrigins.map((o) => new URL(o).origin));
  if (!allowed.has(url.origin)) {
    throw new Error(`Widget origin ${url.origin} is not in the deployment allowlist`);
  }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @open-edu/widgets test src/policy.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/widgets/src/policy.ts packages/widgets/src/policy.test.ts
git commit -m "$(cat <<'EOF'
feat(widgets): enforce trusted-remote origin allowlist

EOF
)"
```

---

### Task 4: Gate RemoteWidgetLoader

**Files:**

- Modify: `packages/widgets/src/remote-loader.ts`
- Modify: `packages/widgets/src/remote-loader.test.ts`
- Modify: `packages/widgets/src/types.ts` (re-export `RemoteWidgetManifest` from `@open-edu/schemas`)
- Modify: `packages/widgets/src/index.ts`

Replace the local `digestMessage` hex helper with `verifyIntegrity`. `load` takes an optional `policy` argument defaulting to `DEFAULT_WIDGET_POLICY`.

- [ ] **Step 1: Extend tests** — add these cases to `remote-loader.test.ts` (keep existing success tests, but pass an enabling policy):

```ts
import { DEFAULT_WIDGET_POLICY } from '@open-edu/schemas';
import { canonicalIntegrity } from './integrity';

const TRUSTED_POLICY = {
  ...DEFAULT_WIDGET_POLICY,
  enabledTrustTiers: ['native', 'sandboxed', 'trusted-remote'] as const,
  allowedOrigins: ['https://cdn.example.com'],
};

function makeManifest(overrides: Partial<RemoteWidgetManifest> = {}): RemoteWidgetManifest {
  return {
    id: 'test-remote',
    version: '1.0.0',
    url: 'https://cdn.example.com/widget.js',
    apiVersion: '1.0.0',
    integrity: 'sha256-' + '0'.repeat(64),
    ...overrides,
  };
}

it('rejects load when trusted-remote is disabled', async () => {
  await expect(loader.load(makeManifest(), registry)).rejects.toThrow('trusted-remote');
});

it('rejects missing integrity even when trusted-remote is enabled', async () => {
  const { integrity: _i, ...rest } = makeManifest();
  await expect(
    loader.load(rest as RemoteWidgetManifest, registry, undefined, TRUSTED_POLICY),
  ).rejects.toThrow('integrity');
});

it('rejects apiVersion other than 1.0.0', async () => {
  await expect(
    loader.load(
      makeManifest({ apiVersion: 'open-edu.widget/1' }),
      registry,
      undefined,
      TRUSTED_POLICY,
    ),
  ).rejects.toThrow('apiVersion');
});

it('rejects responses larger than maxArtifactBytes', async () => {
  const policy = { ...TRUSTED_POLICY, maxArtifactBytes: 8 };
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response('this is more than eight bytes', { status: 200 }),
  );
  await expect(loader.load(makeManifest(), registry, undefined, policy)).rejects.toThrow('size');
});

it('accepts a valid artifact when policy, integrity, and apiVersion match', async () => {
  const code = 'export default { id: "test-remote", render() {} }';
  const integrity = await canonicalIntegrity(new TextEncoder().encode(code));
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(code, { status: 200 }));
  const def = await loader.load(
    makeManifest({ integrity }),
    registry,
    makeEvaluate({ id: 'test-remote', version: '1.0.0', render: () => null }),
    TRUSTED_POLICY,
  );
  expect(def.id).toBe('test-remote');
});
```

Update **every existing** `loader.load(...)` call in this file to pass `TRUSTED_POLICY` except the new default-deny test. Existing integrity mismatch test must use `sha256-` + 64 zeros (already does).

- [ ] **Step 2: Run tests to verify new ones fail**

Run: `pnpm --filter @open-edu/widgets test src/remote-loader.test.ts`

Expected: FAIL on default-deny / integrity required

- [ ] **Step 3: Implement loader changes**

Signature:

```ts
async load(
  manifest: RemoteWidgetManifest,
  registry: WidgetRegistry,
  evaluate?: EvaluateModule,
  policy: WidgetPolicy = DEFAULT_WIDGET_POLICY,
): Promise<WidgetDefinition>
```

In `fetchAndRegister`, in order:

1. `assertTrustedRemoteAllowed(manifest.url, policy)`
2. If `manifest.apiVersion !== '1.0.0'` throw
3. If `policy.requireIntegrityForTrustedRemote` and !manifest.integrity throw
4. `parseIntegrity(manifest.integrity)` when present
5. `AbortSignal.timeout(policy.readyTimeoutMs)` on `fetch`
6. Read `arrayBuffer()`; if `byteLength > policy.maxArtifactBytes` throw
7. `verifyIntegrity(bytes, manifest.integrity)` when integrity present
8. Decode UTF-8 and evaluate as today

Export `TRUSTED_REMOTE_API_VERSION = '1.0.0'` from `remote-loader.ts`.

In `types.ts` replace the hand-written `RemoteWidgetManifest` interface with:

```ts
export type { RemoteWidgetManifest } from '@open-edu/schemas';
```

Keep `RemoteWidgetRegistration` locally.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @open-edu/widgets test src/remote-loader.test.ts src/registry.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/widgets/src/remote-loader.ts packages/widgets/src/remote-loader.test.ts packages/widgets/src/types.ts packages/widgets/src/index.ts
git commit -m "$(cat <<'EOF'
feat(widgets): disable trusted-remote by default and require integrity

EOF
)"
```

---

### Task 5: WidgetAnswer provenance

**Files:**

- Modify: `packages/schemas/src/progress.ts`
- Modify: `packages/schemas/src/progress.test.ts`

- [ ] **Step 1: Write failing tests** (append to `progress.test.ts`)

```ts
it('accepts provenance fields', () => {
  const result = WidgetAnswerSchema.parse({
    type: 'widget',
    widgetId: 'core.multiple-choice',
    widgetVersion: '1.0.0',
    data: {},
    intendedWidgetId: 'community.example.quiz',
    intendedWidgetVersion: '2.0.0',
    renderedWidgetId: 'core.multiple-choice',
    renderedWidgetVersion: '1.0.0',
    renderedViaFallback: true,
  });
  expect(result.renderedViaFallback).toBe(true);
  expect(result.intendedWidgetId).toBe('community.example.quiz');
});

it('still accepts answers without provenance (existing packages)', () => {
  const result = WidgetAnswerSchema.parse({
    type: 'widget',
    widgetId: 'open-edu.matching',
    data: {},
  });
  expect(result.renderedViaFallback).toBeUndefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @open-edu/schemas test src/progress.test.ts`

Expected: FAIL on unknown keys stripped / field undefined (Zod default strips unknown; assertion on `intendedWidgetId` fails)

- [ ] **Step 3: Extend schema** (additive, all new fields optional)

```ts
export const WidgetAnswerSchema = z.object({
  type: z.literal('widget'),
  widgetId: z.string(),
  widgetVersion: z.string().optional(),
  data: z.unknown(),
  score: z.number().optional(),
  intendedWidgetId: z.string().min(1).max(256).optional(),
  intendedWidgetVersion: z.string().min(1).max(64).optional(),
  renderedWidgetId: z.string().min(1).max(256).optional(),
  renderedWidgetVersion: z.string().min(1).max(64).optional(),
  renderedViaFallback: z.boolean().optional(),
});
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @open-edu/schemas test src/progress.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/schemas/src/progress.ts packages/schemas/src/progress.test.ts
git commit -m "$(cat <<'EOF'
feat(schemas): add widget answer fallback provenance

EOF
)"
```

> **Analytics note:** `widgetVersion` is optional on `WidgetAnswerSchema` for backward compatibility with answers saved before this phase. Analytics queries that group or filter by `widgetVersion` must handle `null`/`undefined` for pre-provenance records. Add a comment in the schema file noting this so future consumers are aware.

---

### Task 6: node_complete renderedViaFallback

**Files:**

- Modify: `packages/schemas/src/telemetry.ts` (`NodeCompleteEventSchema`)
- Modify: `packages/schemas/src/telemetry.test.ts`

- [ ] **Step 1: Write failing test**

```ts
it('should accept node_complete with renderedViaFallback', () => {
  expect(
    TelemetryEventSchema.parse({
      timestamp: ts,
      event: 'node_complete',
      nodeId: 'n1',
      score: 80,
      renderedViaFallback: true,
    }),
  ).toMatchObject({ renderedViaFallback: true });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter @open-edu/schemas test src/telemetry.test.ts`

Expected: FAIL (`renderedViaFallback` stripped)

- [ ] **Step 3: Add optional field**

```ts
export const NodeCompleteEventSchema = BaseTelemetrySchema.extend({
  event: z.literal('node_complete'),
  nodeId: z.string().min(1).max(256),
  score: z.number().min(0).max(100).optional(),
  renderedViaFallback: z.boolean().optional(),
});
```

Do **not** enum-restrict `widget_interaction.action` in this phase. Native widgets still emit free-form actions (existing `slide` test must keep passing). Sandbox vocabulary lands in Phase 1 protocol schemas.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @open-edu/schemas test src/telemetry.test.ts`

Expected: PASS including existing `slide` action test

- [ ] **Step 5: Commit**

```bash
git add packages/schemas/src/telemetry.ts packages/schemas/src/telemetry.test.ts
git commit -m "$(cat <<'EOF'
feat(schemas): expose renderedViaFallback on node_complete

EOF
)"
```

---

### Task 7: Answer builder + interaction normalizer

**Files:**

- Create: `packages/runtime/src/widgets/answer-provenance.ts`
- Create: `packages/runtime/src/widgets/answer-provenance.test.ts`
- Create: `packages/runtime/src/widgets/normalize-interaction.ts`
- Create: `packages/runtime/src/widgets/normalize-interaction.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// answer-provenance.test.ts
import { describe, it, expect } from 'vitest';
import { buildWidgetAnswer } from './answer-provenance';

describe('buildWidgetAnswer', () => {
  it('sets renderedViaFallback when intended and rendered ids differ', () => {
    const answer = buildWidgetAnswer({
      intendedWidgetId: 'community.example.quiz',
      intendedWidgetVersion: '2.0.0',
      renderedWidgetId: 'core.multiple-choice',
      renderedWidgetVersion: '1.0.0',
      data: { choice: 'a' },
      score: 100,
    });
    expect(answer.widgetId).toBe('core.multiple-choice');
    expect(answer.renderedViaFallback).toBe(true);
    expect(answer.intendedWidgetId).toBe('community.example.quiz');
  });

  it('sets renderedViaFallback false when identities match', () => {
    const answer = buildWidgetAnswer({
      intendedWidgetId: 'core.matching',
      renderedWidgetId: 'core.matching',
      data: {},
    });
    expect(answer.renderedViaFallback).toBe(false);
    expect(answer.widgetId).toBe('core.matching');
  });
});
```

```ts
// normalize-interaction.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeWidgetInteraction } from './normalize-interaction';

describe('normalizeWidgetInteraction', () => {
  it('keeps allowlisted keys and drops nested huge payloads', () => {
    const event = normalizeWidgetInteraction('core.matching', {
      action: 'reveal',
      step: 2,
      secret: { nested: 'nope' },
    });
    expect(event).toEqual({
      event: 'widget_interaction',
      widgetId: 'core.matching',
      action: 'reveal',
      data: { step: 2 },
    });
  });

  it('returns null when action is missing or not a string', () => {
    expect(normalizeWidgetInteraction('core.matching', { step: 1 })).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter @open-edu/runtime test src/widgets/answer-provenance.test.ts src/widgets/normalize-interaction.test.ts`

Expected: FAIL missing modules

- [ ] **Step 3: Implement**

```ts
import type { WidgetAnswer } from '@open-edu/schemas';

export interface WidgetAnswerInput {
  intendedWidgetId: string;
  intendedWidgetVersion?: string;
  renderedWidgetId: string;
  renderedWidgetVersion?: string;
  data: unknown;
  score?: number;
}

export function buildWidgetAnswer(input: WidgetAnswerInput): WidgetAnswer {
  const renderedViaFallback = input.intendedWidgetId !== input.renderedWidgetId;
  return {
    type: 'widget',
    widgetId: input.renderedWidgetId,
    widgetVersion: input.renderedWidgetVersion,
    data: input.data,
    score: input.score,
    intendedWidgetId: input.intendedWidgetId,
    intendedWidgetVersion: input.intendedWidgetVersion,
    renderedWidgetId: input.renderedWidgetId,
    renderedWidgetVersion: input.renderedWidgetVersion,
    renderedViaFallback,
  };
}
```

```ts
const DATA_KEYS = new Set(['step', 'optionId', 'from', 'to', 'index']);

export function normalizeWidgetInteraction(
  widgetId: string,
  data: Record<string, unknown>,
): {
  event: 'widget_interaction';
  widgetId: string;
  action: string;
  data?: Record<string, unknown>;
} | null {
  if (typeof data.action !== 'string' || data.action.length === 0 || data.action.length > 128) {
    return null;
  }
  const filtered: Record<string, unknown> = {};
  for (const key of DATA_KEYS) {
    if (key in data && typeof data[key] !== 'object') {
      filtered[key] = data[key];
    }
  }
  return {
    event: 'widget_interaction',
    widgetId,
    action: data.action,
    data: Object.keys(filtered).length > 0 ? filtered : undefined,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @open-edu/runtime test src/widgets/`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/runtime/src/widgets
git commit -m "$(cat <<'EOF'
feat(runtime): add widget answer provenance and safe interaction normalization

EOF
)"
```

---

### Task 8: emitTelemetry on RuntimeContext

**Files:**

- Modify: `packages/runtime/src/context/RuntimeContext.tsx`
- Modify: `packages/runtime/src/context/RuntimeContext.test.tsx` (only if provider tests construct the full value type)

Add to `RuntimeContextValue`:

```ts
emitTelemetry?: (event: Omit<TelemetryEvent, 'timestamp'>) => void;
```

Add optional prop `onTelemetryEvent` on `RuntimeProviderProps` with the same type as embed (`(event: TelemetryEvent) => void` is also fine). Implement:

```ts
const emitTelemetry = useCallback(
  (event: Omit<TelemetryEvent, 'timestamp'>) => {
    onTelemetryEvent?.({ ...event, timestamp: Date.now() } as TelemetryEvent);
  },
  [onTelemetryEvent],
);
```

Include `emitTelemetry` in the context `value` memo. Import `TelemetryEvent` from `@open-edu/schemas`.

Wire callers:

- `apps/learner/src/CourseRuntime.tsx` — `onTelemetryEvent={(e) => session.emit(e)}` (session already validates)
- `apps/dev-server/src/DevApp.tsx` — same pattern as existing `session.emit` for workflow events

- [ ] **Step 1: Add a focused test** in `RuntimeContext.test.tsx`

```ts
it('emitTelemetry forwards to onTelemetryEvent with a timestamp', () => {
  const onTelemetryEvent = vi.fn();
  const { result } = renderHook(() => useRuntime(), {
    wrapper: ({ children }) => (
      <RuntimeProvider
        loadedPackage={pkg}
        engine={engine}
        onTelemetryEvent={onTelemetryEvent}
      >
        {children}
      </RuntimeProvider>
    ),
  });
  result.current.emitTelemetry?.({ event: 'widget_interaction', widgetId: 'core.matching', action: 'reveal' });
  expect(onTelemetryEvent).toHaveBeenCalledWith(
    expect.objectContaining({ event: 'widget_interaction', widgetId: 'core.matching', action: 'reveal', timestamp: expect.any(Number) }),
  );
});
```

Reuse existing `pkg` / `engine` fixtures already in that file.

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter @open-edu/runtime test src/context/RuntimeContext.test.tsx`

Expected: FAIL (`onTelemetryEvent` not a prop / `emitTelemetry` undefined)

- [ ] **Step 3: Implement as above**

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @open-edu/runtime test src/context/RuntimeContext.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/runtime/src/context/RuntimeContext.tsx packages/runtime/src/context/RuntimeContext.test.tsx apps/learner/src/CourseRuntime.tsx apps/dev-server/src/DevApp.tsx
git commit -m "$(cat <<'EOF'
feat(runtime): plumb emitTelemetry through RuntimeProvider

EOF
)"
```

---

### Task 9: WidgetRenderer uses provenance + telemetry

**Files:**

- Modify: `packages/runtime/src/renderers/WidgetRenderer.tsx`
- Modify: `packages/runtime/src/renderers/WidgetRenderer.test.tsx`

Replace every `saveAnswer` widget object with `buildWidgetAnswer`. Replace `console.debug('[widget:interaction]'...)` with:

```ts
const { emitTelemetry } = useRuntime();
const emitInteraction = (data: Record<string, unknown>) => {
  const normalized = normalizeWidgetInteraction(widgetId, data);
  if (normalized) emitTelemetry?.(normalized);
  // keep existing reveal → animation controller behavior
};
```

For remote success path: intended = `manifest.id` / `manifest.version`, rendered = same.

For remote fallback path: intended = `manifest.id` / `manifest.version`, rendered = `manifest.fallback` and its definition.version.

For builtin path: intended = rendered = resolved widget id.

`completeNode` in embed maps to `node_complete` **without** fallback today. Change `complete` wrappers to:

```ts
complete: (score?: number, state?: unknown) => {
  if (state !== undefined) {
    saveAnswer(nodeId, buildWidgetAnswer(...));
  }
  completeNode(score);
}
```

Then in `RuntimeContext.completeNode` (or the WidgetRenderer complete wrapper), if you can read the just-saved answer’s `renderedViaFallback`, pass it through `onTelemetryEvent` for `node_complete`. Cleanest Phase 0 approach: extend `completeNode` to `completeNode(score?: number, meta?: { renderedViaFallback?: boolean })` and thread `renderedViaFallback` into `workflowEventToTelemetry` in `embed.tsx` **only if** `WorkflowEngine` already forwards extra fields.

If `WorkflowEngine.completeNode` cannot carry metadata without a workflow change, emit the extra `node_complete` field from WidgetRenderer via `emitTelemetry` **in addition to** the engine event, using the same nodeId/score. Deduping is not required in Phase 0; rewards already key on `node_complete`. Prefer a single engine event if a one-line optional field on the workflow complete call is available — inspect `packages/workflow` before adding a duplicate emit.

- [ ] **Step 1: Add renderer tests**

Cover: (1) builtin `emitInteraction({ action: 'reveal', step: 1 })` calls `onTelemetryEvent` with `widget_interaction`; (2) remote fallback `complete` saves `renderedViaFallback: true` and `intendedWidgetId` = remote id. Follow existing `WidgetRenderer.test.tsx` registry/runtime wrapper patterns.

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter @open-edu/runtime test src/renderers/WidgetRenderer.test.tsx`

Expected: FAIL (no telemetry / provenance)

- [ ] **Step 3: Implement renderer wiring**

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @open-edu/runtime test src/renderers/WidgetRenderer.test.tsx`

Expected: PASS. Existing builtin rendering tests still pass.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime/src/renderers/WidgetRenderer.tsx packages/runtime/src/renderers/WidgetRenderer.test.tsx packages/runtime/src/embed.tsx packages/workflow
git commit -m "$(cat <<'EOF'
feat(runtime): bridge widget interactions and fallback provenance

EOF
)"
```

---

### Task 10: Phase 0 verification

- [ ] **Step 1: Run package tests**

```bash
pnpm --filter @open-edu/schemas test
pnpm --filter @open-edu/widgets test
pnpm --filter @open-edu/runtime test
```

Expected: PASS

- [ ] **Step 2: Confirm default deny**

`RemoteWidgetLoader.load` without policy throws `trusted-remote widgets are disabled by deployment policy`. `examples/remote-widget-demo` continues to **validate** as a package (schema still allows `remoteWidget` without integrity) but will not execute in the learner unless policy is opted in.

- [ ] **Step 3: Commit any leftover export/docs-only fixes** (no OpenWiki hand-edits)

---

## Phase 0 done when

- Built-in widgets: no render/prop changes besides optional telemetry
- Existing `WidgetAnswer` without provenance still parses
- Trusted-remote is off in `DEFAULT_WIDGET_POLICY`
- Integrity is mandatory when the tier is enabled
- Fallback answers record intended vs rendered identity
