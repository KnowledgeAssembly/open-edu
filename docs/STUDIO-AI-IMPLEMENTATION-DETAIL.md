# Studio AI Companion — Detailed Implementation Plan

**Status:** ✅ Implemented (executed 2026-09-01 in a single review PR on
`feat/studio-ai-consolidation-single-backend`). Stories A–G shipped as sequential
conventional commits on one branch; Story G's doc sync confirms the state below.
**Executor:** A single coding agent (deepseek-4-flash), working across a known codebase
**Predecessor:** `docs/STUDIO-AI-CONSOLIDATION-PLAN.md` (approved direction). This file is the
executable down-to-the-line version. It does **not** restate rationale — it tells you exactly what
to change, where, and how to prove each step lands.

> **Read `docs/STUDIO-AI-CONSOLIDATION-PLAN.md` first** for the "why". This document is the "what /
> where / how".

---

## 0. Operating constraints (non-negotiable, from AGENTS.md)

1. **One story per PR.** Each file-context below is one branch + one conventional-commit PR
   (`feat(dev-server): ...`).
2. **Every story ships Vitest tests**, plus `typecheck`, `lint`, `prettier`.
   ```bash
   pnpm --filter @open-edu/dev-server typecheck
   pnpm --filter @open-edu/dev-server lint
   pnpm --filter @open-edu/dev-server test
   pnpm precommit  # or the repo lint/format:check entrypoints
   ```
3. **Zod schemas are the source of truth** for new/changed contract types (soft deviation already
   present in this subsystem is tolerated, but new shared wire types should be Zod).
4. **ESM extensionless-import rule (AGENTS.md "Known Issues"):** when importing from a workspace
   package at the **Vite config / Node runtime** boundary, use a **subpath export**, never an
   extensionless relative path into a package's internal file tree.
5. **User-facing strings** use `t()` client-side and `studioChatMessage()` server-side — never
   hardcoded. The lint step (`pnpm lint:hardcoded-strings`) enforces this.
6. **Do not commit** unless the user explicitly asks. Work on a branch; the user will drive the PR.

---

## 1. Canonical decision table (already locked in — do NOT revisit)

| Decision                                                  | Value                                                                                    |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Hosted gateway tree (`api/ai`, `vercel.json`, `gateway/`) | **Delete entirely**                                                                      |
| `/api/ai/chat` path                                       | **Delete** — sole caller re-pointed to `/api/studio/ai/chat`                             |
| Single official request surface                           | `/api/studio/ai/chat` (Node backend, already mounted in normal mode)                     |
| Single chat message schema                                | `StudioChatRequestSchema`, **moved into `@open-edu/companion`**                          |
| Schema exposure                                           | New subpath export `@open-edu/companion/chat`                                            |
| Single converter                                          | `toAiSdkMessages` + `fromUIMessage`, exported from `@open-edu/companion/chat`            |
| Routing owner                                             | Server-only (agent loop). Client never re-parses intents                                 |
| Client client                                             | **One** client class → `/api/studio/ai/chat` in both modes (drop the hosted/local split) |
| `chatApiUrl`                                              | Single constant `/api/studio/ai/chat`, always mounted in browser mode too                |
| `OPEN_EDU_LOCAL_AI` / `localAiGatewayPlugin`              | Delete                                                                                   |
| Assistant `content` rule                                  | Allow `''`; normalize to non-empty in `toAiSdkMessages` (already done)                   |

---

## 2. Story A — Move `StudioChatRequestSchema` into `@open-edu/companion` + add `@open-edu/companion/chat`

### A.1 New file: `packages/companion/src/chat.ts`

Create a new source module exporting:

- `StudioChatRequestSchema` (moved from `apps/dev-server/src/studio/ai/chat/config.ts`, **verbatim**
  Zod object).
- `StudioChatRequest` type (inferred).
- `MAX_CONTEXT_CHARS`, `MAX_MESSAGES`, `MAX_REQUEST_SIZE_BYTES` constants (verbatim).
- `toAiSdkMessages(messages: AgentRuntimeMessage[]): Array<Record<string, unknown>>` — move the
  function **verbatim** from `AiSdkAgentRuntime.ts` (includes the empty-content normalization).
- `fromUIMessage(msg)` — see Story B; stub it here (or define fully per Story B) and export it.

Imports it needs (all resolvable from within the package / via existing companion subpaths):

- `z` from `zod`.
- `studioContextSnapshotSchema` from `./context.js` (same package — allowed).
- `AgentRuntimeMessage` type from `./types.js` (same package — allowed).
- No `ai` / `@open-edu/llm-config` dependency in this module. `toAiSdkMessages` must stay **pure**
  (its current `AiSdkAgentRuntime.ts` version is pure — keep it that way).

Update `packages/companion/src/index.ts` to `export * from './chat.js';`.

### A.2 `packages/companion/package.json` — add the subpath export

```json
"./chat": {
  "types": "./dist/chat.d.ts",
  "import": "./dist/chat.js"
}
```

Keep the existing `.`, `./context`, `./types` entries. `dist/chat.js` is produced automatically by
the existing `tsc -p tsconfig.build.json` (it compiles `src/*.ts`).

### A.3 Delete the old schema from the dev-server

In `apps/dev-server/src/studio/ai/chat/config.ts`:

- Remove the `StudioChatRequestSchema` + `StudioChatRequest` definitions.
- Re-export from the companion subpath so existing internal importers keep working during the
  transition:
  ```ts
  export { StudioChatRequestSchema, type StudioChatRequest } from '@open-edu/companion/chat';
  ```
- Keep `MAX_CONTEXT_CHARS`, `MAX_MESSAGES`, `MAX_REQUEST_SIZE_BYTES` re-exported too (they now come
  from the companion). Actually — prefer deleting the constants here and importing them at call
  sites from `@open-edu/companion/chat` to avoid a pointless facade. During Story A you may keep the
  facade; **remove it in Story G**.

Update the (now-removed) `import { studioContextSnapshotSchema } from '../context'` in
`config.ts` — it is no longer needed there in the facade-only version.

> Keep `apps/dev-server/src/studio/ai/chat/messages.ts` (`studioChatMessage`) as-is — unrelated.

### A.4 Rewire the handler import

In `apps/dev-server/src/studio/ai/chat/handler.ts`, replace:

```ts
import {
  StudioChatRequestSchema,
  MAX_MESSAGES,
  MAX_CONTEXT_CHARS,
  MAX_REQUEST_SIZE_BYTES,
} from './config';
```

with

```ts
import {
  StudioChatRequestSchema,
  MAX_MESSAGES,
  MAX_CONTEXT_CHARS,
  MAX_REQUEST_SIZE_BYTES,
} from '@open-edu/companion/chat';
```

### A.5 Tests (Story A)

- `packages/companion/src/chat.test.ts` (new):
  - Schema accepts the same arrays it accepted in the dev-server (`user/assistant/system`, empty
    `content` allowed; context required; message cap not enforced by the schema).
  - `toAiSdkMessages` output has **no** `content: null` for: plain assistant with empty text, and
    assistant tool-call turns with empty text.
  - `toAiSdkMessages` maps `tool` role → `{role:'tool', content:[{type:'tool-result',...}]}` with
    correct `toolName` resolution from prior assistant tool-calls.
- `apps/dev-server/src/studio/ai/chat/config.test.ts` — update to assert the re-export resolves.

### A.6 Story A gate

```bash
pnpm --filter @open-edu/companion typecheck && pnpm --filter @open-edu/companion test
pnpm --filter @open-edu/dev-server typecheck && pnpm --filter @open-edu/dev-server test
```

Commit: `feat(companion): host Studio chat schema + converter in @open-edu/companion/chat`.

> **Blocking dependency note for the executor:** `@open-edu/dev-server` resolves workspace packages
> through their **`dist/`** outputs. After editing `packages/companion/src`, you **must** rebuild it
> for the dev-server to see the new `chat.js`:
>
> ```bash
> pnpm --filter @open-edu/companion build
> ```
>
> Same note applies after every change to `packages/companion/src` in later stories.

---

## 3. Story B — Single message converter lives in `@open-edu/companion/chat`

Story A already moved `toAiSdkMessages`. Story B completes the contract and makes the client use the
shared converter instead of its own flattening.

### B.1 Complete `fromUIMessage` in `packages/companion/src/chat.ts`

Export a pure function that maps an AI-SDK **v7 `UIMessage`-shaped** object to the companion
`AgentRuntimeMessage` shape (or to the studio wire shape `{role, content}`), including a stable rule
for extracting text from `parts[]` with a `content` fallback (mirror the current
`StudioChatProvider.extractText` logic):

```ts
export function fromUIMessage(msg: {
  role?: string;
  parts?: Array<{ type: string; text?: string }>;
  content?: string;
}): { role: 'user' | 'assistant' | 'system' | 'tool'; content: string };
```

- If `parts` exists, join `type==='text'` part texts.
- Else `content ?? ''`.
- Tool-call turns → empty content (consistent with the current `extractText`; the server normalizes
  on the way back out via `toAiSdkMessages`).

### B.2 Use it in `StudioChatProvider.tsx`

In `apps/dev-server/src/studio/ai/StudioChatProvider.tsx`:

- Import `fromUIMessage` from `@open-edu/companion/chat`.
- Replace the private `buildChatBody` mapping `messages.map((m) => ({role: m.role, content: extractText(m)}))`
  with `messages.map((m) => fromUIMessage(m))` (cast as needed; keep the `context` field the same).
- Delete the local `extractText` helper **only if** no remaining caller uses it. `fromUIMessage`,
  `toStoredMessage`, and `fromUIMessage` (the local component function at line 788 — rename/alias to
  avoid clashing with the imported one) still use `extractText`. **Do not delete `extractText` yet**
  if other local callers depend on it; defer removal to Story G. Aim here for: the **chat-body**
  flattening path uses the shared converter; UI rendering still uses local helpers.
- One sole-owner rule: the client must not rebuild message text for the wire body differently than
  `fromUIMessage`.

### B.3 Tests (Story B)

- `packages/companion/src/chat.test.ts` — add `fromUIMessage` cases: parts-only, content-only,
  mixed, empty tool-turn.
- `apps/dev-server/src/studio/ai/StudioChatProvider.transport.test.tsx` — extend/adjust so the
  `buildBody` snapshot reflects `fromUIMessage` output (same shape as before, minus any
  `parts`-flattening drift).

### B.4 Story B gate — same commands as A.6. Commit:

`feat(companion): single fromUIMessage converter used by the studio client`.

---

## 4. Story C — Client stops routing intents (one routing owner: the loop)

### C.1 Remove client-side intent routing from `createHostedChatTransport`

In `apps/dev-server/src/studio/ai/StudioChatProvider.tsx`, the `createHostedChatTransport` function
currently does client-side `parseIntentFromMessage` → `routeIntent` → short-circuits to browser AI
paths (`generateDraft`, `generateItemAdd`, `generateItemEdit`).

Per the locked decision, the **loop is the only routing owner**. The hosted client must **not**
short-circuit. Concretely:

- Make `createHostedChatTransport` a **thin transport** whose `sendMessages` simply POSTs
  `buildBody(messages, chatId)` to `api` (the `/api/studio/ai/chat` endpoint via a
  `DefaultChatTransport`, exactly like `LocalCompanionClient` does today) and re-expresses the UI
  stream.
- Delete the `parseIntentFromMessage` / `routeIntent` imports and the tool-callback branches
  (`generateDraft`, `generateItemAdd`, `generateItemEdit`, `getCurrentActivity`,
  `getSuggestedNextSteps`, `messages` fallbacks) from `HostedChatTransportOptions`.
- If `createHostedChatTransport` then becomes essentially identical to `LocalCompanionClient`,
  **collapse the two** into one client (see C.2) rather than keeping two near-identical classes.

**Design decision:** rather than patch `createHostedChatTransport`, the cleanest path is to
**delete** `HostedCompanionClient` + `createHostedChatTransport` and make `LocalCompanionClient`
the single client used in both modes. Suggested actions already call `sendMessage(preset)` → the
same loop (`StudioChatProvider.tsx:638` `void chatSend({ text: content })`), so no UX regression.

### C.2 Unify the client

- Rename/keep `LocalCompanionClient` as the single `CompanionClient` (optionally rename to
  `HttpCompanionClient`); it targets `api = '/api/studio/ai/chat'` in both modes.
- In `ChatRuntime` (`StudioChatProvider.tsx:481-517`), remove the `chatApiUrl ? Hosted : Local`
  ternary and always construct the single client with `api: '/api/studio/ai/chat'`.
- Delete `HostedCompanionClient.ts` and the `createHostedChatTransport` export (and its
  now-orphaned `buildToolResponse` / `fallbackToChat` helpers). Remove `chatApiUrl` prop from
  `StudioChatProvider` and `StudioApp`.

### C.3 Tests (Story C)

- `StudioChatProvider.transport.test.tsx` — update to assert the client POSTs to
  `/api/studio/ai/chat` and does **not** branch on intent.
- `StudioChatProvider.test.tsx` — keep passing; add a case where a tool-intent message ("Add this
  quiz to course") is sent to the single endpoint.
- grep-guard: no `parseIntentFromMessage`/`routeIntent` import remains in `StudioChatProvider.tsx`.

### C.4 Story C gate — same commands. Commit:

`feat(dev-server): studio assistant uses one client + server-owned routing`.

---

## 5. Story D — Delete the Vercel static-function surface + the `/api/ai/chat` path

### D.1 Delete files

From `apps/dev-server`:

- `api/ai/[...route].ts`
- `api/ai/` directory (now empty)
- `vercel.json`
- `src/gateway/` and `src/gateway/__tests__/` **entirely** (router, chat, requestSchema,
  generateDraft, itemGeneration, gatewayOrigins, localViteGateway, safeguards, errors + all tests).

### D.2 Update `vite.config.ts`

- Remove imports:
  ```ts
  import { createLocalAiMiddleware } from './src/gateway/localViteGateway.js';
  import gatewayHandler from './api/ai/[...route].js';
  ```
- Remove `'OPEN_EDU_LOCAL_AI'` from the `SERVER_ENV_KEYS` set (line ~70).
- Delete the `localAiGatewayPlugin(enabled)` function (lines ~1620-1625).
- Delete the `localAiEnabled` line (`const localAiEnabled = isBrowserMode && process.env.OPEN_EDU_LOCAL_AI === '1';`, ~1644).
- In the `plugins` array (browser-mode branch, ~1650-1656), remove `localAiGatewayPlugin(localAiEnabled),`.
- **This fixes the core bug:** now that the gateway plugin is gone, browser mode no longer references
  an unmounted `/api/ai/chat`. The `/api/studio/ai/chat` mount (line ~675, normal-mode AI handler) is
  the single surface.

> **Important:** the `/api/studio/ai/chat` handler + mount are in the **normal-mode AI middleware**
> block (the `configureServer` with `isAiAvailable()`). Story E ensures browser mode is also backed
> by a Node server that mounts the same middleware, so the endpoint is reachable there.

### D.3 Delete `browserAiClient.ts`

`apps/dev-server/src/studio/browserAiClient.ts` uses only `/api/ai/*` (status, generate-draft, item,
chat). Delete the file and **all its importers** (find them via grep). Any call site that genuinely
needs a capability must be re-pointed at the corresponding local function:

- `getStatus()` → the local `isAiAvailable()` / equivalent.
- `generateDraft` / `generateItem` → the local `generateCourseDraft` / `generateItemAdd` /
  `generateItemEdit` (already available via the Studio `api`/`StudioApi` object).
- `chat()` → `/api/studio/ai/chat` via the single client (done in Story C).

### D.4 Tests (Story D)

- `pnpm --filter @open-edu/dev-server typecheck` and `test` — all remaining Studio tests pass;
  gateway tests are gone (deleted), no dangling imports.
- `pnpm --filter @open-edu/learner typecheck && test` — learner still builds/tests (it never used
  `/api/ai/*`).
- grep-guard: `grep -rn "api/ai" apps/dev-server/src` returns nothing; `grep -rn "gateway/"` returns
  nothing.

### D.5 Story D gate

```bash
pnpm --filter @open-edu/dev-server typecheck && pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/learner typecheck && pnpm --filter @open-edu/learner test
pnpm lint && pnpm prettier  # repo-wide guards
```

Commit: `feat(dev-server): delete the Vercel static-function gateway + /api/ai/*`.

---

## 6. Story E — Unify the client endpoint (single URL, mounted everywhere)

Requires Story D (gateway gone), so `/api/studio/ai/chat` is the only surface.

### E.1 One `chatApiUrl`

- `apps/dev-server/src/studio/StudioApp.tsx:227`: replace

  ```ts
  chatApiUrl={browserMode ? '/api/ai/chat' : undefined}
  ```

  with a **single** constant. Since Story C removed `chatApiUrl` from `StudioChatProvider`
  entirely, this line is **deleted** — the endpoint is baked into the single client
  (`/api/studio/ai/chat`). If a `chatApiUrl` prop remains, set it unconditionally to
  `/api/studio/ai/chat` (never `undefined`).

- `apps/dev-server/src/DevApp.tsx`: the `BrowserStudioApp` (line ~474-509) passes `browserMode` to
  `StudioApp`. After this story, `browserMode` may become vestigial for the chat surface (it still
  controls library/storage wiring). Keep `browserMode` if other features use it; remove only the
  chat-endpoint split.

### E.2 Mount `/api/studio/ai/chat` in browser mode (confirmed missing — the root of the bug)

**Verified fact (vite.config.ts:1649-1656):** browser mode's plugin list is
`[react(), widgetRegistryPlugin(), virtualPackagePlugin(), localAiGatewayPlugin(...)]` — it does
**not** include `eduPackageLoader()`, which is where `/api/studio/ai/chat` is mounted (line 675 in
`eduPackageLoader()`'s `configureServer`). Therefore `/api/studio/ai/chat` is **not reachable in
browser mode today**. This is exactly why browser mode fell back to the (also not-mounted) gateway.

**Fix:** expose the single `/api/studio/ai/chat` endpoint on the browser-mode Vite server too.
Browser mode does run under a Node Vite dev server (`vite.config.ts` `server.port: 4000`, `open:
false`), so it can mount server middleware. Two valid approaches:

1. **Reuse `eduPackageLoader()`'s chat handler in a small standalone middleware** mounted in browser
   mode — call `createStudioAssistantHandler(req, res, { packageDir: '' })` for
   `/api/studio/ai/chat` POST, gated by `isAiAvailable()`. Put it into a browser-mode plugin
   (e.g. add a `localStudioAiPlugin()` alongside the removed `localAiGatewayPlugin`).
2. Or include `eduPackageLoader()` in browser mode — **but do not**; it pulls Node-only package
   loading (the whole reason browser mode excluded it). Prefer approach 1: a browser-specific plugin
   that mounts only the chat route.

Team + reviewer should confirm **approach 1** (minimal, standalone chat route, no filesystem rules).

> **Browser-mode LLM availability note:** in browser mode the previous AI path was the remote
> gateway. Now that chat runs through the same Node `AiSdkAgentRuntime`, the browser-mode Vite server
> must have LLM config available (`LLM_*` / `OPEN_EDU_STUDIO_LLM_*` env, per
> `createModelFactoryFromEnv`). Confirm `isAiAvailable()` returns true in the browser dev server, or
> gate with an explicit error like normal mode's `503 ai-unavailable`. This is a behavioral change —
> flag it in the PR description.

### E.3 Tests (Story E)

- Unit: transport test asserts the single client always targets `/api/studio/ai/chat` in both modes.
- E2E (optional, if env allows): `pnpm --filter @open-edu/dev-server dev` (normal) + run a chat turn
  and assert a response with no "An error occurred". This story resolves the original repro.

### E.4 Story E gate — same commands. Commit:

`feat(dev-server): single studio AI endpoint in both modes`.

---

## 7. Story F — Storage adapter seam (local FS vs hosted OPFS)

This story is **verification + light seam work**; the two storage implementations already exist
(`@open-edu/storage` browser stores for OPFS/IndexedDB; Node FS for local editing). The goal is to
confirm AI calls are storage-independent (they are — both → `/api/studio/ai/chat`).

### F.1 Verify & tighten the seam

- Confirm the Studio's storage selection (local FS workspace vs `OPFSWorkspace`/`browserCourseStore`)
  is driven by a single switch that has **zero** coupling to the AI path.
- If the investigation (grep for storage↔AI coupling, e.g. passing a workspace handle into AI tool
  execution) finds coupling, extract a minimal `StorageAdapter` interface used by the loop's tool
  execution (read/write course files), with a Node-FS impl and an OPFS/IndexedDB impl.

### F.2 Tests (Story F)

- Two storage impls both round-trip a small course through the **same** assistant endpoint
  (contract-level test using the handler with a stub storage).
- Multi-user isolation: two OPFS workspaces keyed by different user/session ids do not collide
  (unit test against the browser store if such a test isn't already present).

### F.3 Story F gate — `pnpm --filter @open-edu/dev-server test` + storage package tests. Commit:

`feat(dev-server): storage↔AI seam verified decoupled (local FS vs OPFS)`.

---

## 8. Story G — Deferred cleanup + doc sync

Only after A–F pass.

### G.1 Code cleanup

- Delete the `config.ts` facade re-exports (import directly from `@open-edu/companion/chat`).
- Delete any now-unused local `extractText` helper if it has no remaining callers after Story B/C.
- `grep -rn "createHostedChatTransport\|HostedCompanionClient\|browserAiClient\|LOCAL_AI\|/api/ai"` → empty.
- Run `pnpm lint:hardcoded-strings`; fix any user-facing string not already using `t()` / `studioChatMessage()`.

### G.2 Doc sync (required by AGENTS.md)

- `AGENTS.md`: update the `apps/dev-server` package description + monorepo map to drop the gateway;
  note the single `/api/studio/ai/chat` endpoint.
- OpenWiki: refresh quickstart / monorepo / operations for the gateway removal and single-endpoint
  Studio AI (add a note about `@open-edu/companion/chat`).
- `docs/STUDIO-AI-CONSOLIDATION-PLAN.md` + this file: mark stories complete.

### G.3 Gate

```bash
pnpm test && pnpm lint && pnpm typecheck && pnpm format:check
```

Commit: `chore(dev-server): cleanup + doc sync after AI consolidation`.

---

## 9. Commit order & branch map

> **Execution log (2026-09-01):** implemented in the recommended order
> A → B → D → C → E → F → G on branch `feat/studio-ai-consolidation-single-backend`,
> shipped as one review PR. Notes on the executed deviations:
>
> - Story B/C were co-edited in `StudioChatProvider.tsx` (the converter + single client
>   landed together, then the routing was deleted).
> - D and E are two commits but one code change: `createStudioAiMiddleware` extraction
>   both removed the gateway and mounted `/api/studio/ai/*` in browser mode.
> - Story F is verification + `browserAiGateway`/`middleware` contract tests (no new
>   StorageAdapter was needed — the seam was already decoupled).
> - Story G deleted the `chat/config.ts` facade (direct imports from
>   `@open-edu/companion/chat`), synced `AGENTS.md` + OpenWiki, and marked this run
>   complete.

| Story | Branch                          | Commit (conventional)                                                              | Depends on                                                    |
| ----- | ------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| A     | `feat/ai-schema-in-companion`   | `feat(companion): host Studio chat schema + converter in @open-edu/companion/chat` | —                                                             |
| B     | `feat/ai-single-converter`      | `feat(companion): single fromUIMessage converter used by the studio client`        | A                                                             |
| C     | `feat/ai-single-client-routing` | `feat(dev-server): studio assistant uses one client + server-owned routing`        | A, B                                                          |
| D     | `feat/remove-ai-gateway`        | `feat(dev-server): delete the Vercel static-function gateway + /api/ai/*`          | — (independent; gateway schema deletion touches what A moved) |
| E     | `feat/ai-single-endpoint`       | `feat(dev-server): single studio AI endpoint in both modes`                        | D, C                                                          |
| F     | `feat/ai-storage-seam`          | `feat(dev-server): storage↔AI seam verified decoupled (local FS vs OPFS)`          | C, E                                                          |
| G     | `chore/ai-cleanup-docs`         | `chore(dev-server): cleanup + doc sync after AI consolidation`                     | A–F                                                           |

**Suggested order for the executor:** A → B → D (delete gateway; D's schema deletion is safe because
A already made the schema canonical) → C → E → F → G. D and C are independent of each other but both
gate E; doing D before C keeps the codebase free of dead references during C.

> **Story D ordering caution:** D deletes `gateway/requestSchema.ts` (the `z.string().min(1)` schema)
> and `api/ai/[...route].ts`. Because A moved the canonical schema into `@open-edu/companion`, the
> dev-server then has exactly one schema. Verify no importer of the gateway's request schema remains
> after A before running D.

---

## 10. Verification cheat-sheet (run at the end of each story)

```bash
# Type-check + unit tests for each touched package
pnpm --filter @open-edu/companion typecheck && pnpm --filter @open-edu/companion test
pnpm --filter @open-edu/dev-server typecheck && pnpm --filter @open-edu/dev-server test
# Learner unaffected (D/E only)
pnpm --filter @open-edu/learner typecheck && pnpm --filter @open-edu/learner test
# Repo-wide guards (every story)
pnpm lint
pnpm prettier --check
# Rebuild workspace packages so dev-server picks up companion dist changes
pnpm --filter @open-edu/companion build
```

---

## 11. Definition of done (mirrors consolidation plan §7)

- One chat message schema, one converter, one routing owner, one client, single endpoint
  `/api/studio/ai/chat` in both modes.
- The Vercel static-function tree (`api/ai`, `vercel.json`) and `gateway/` are deleted;
  `/api/ai/chat` removed (sole caller re-pointed).
- Local FS + hosted OPFS run the same Studio behind one Node backend with one AI pipeline.
- No duplicated intent parsing, message flattening, or static-vs-node split in `apps/dev-server`.
- `pnpm test / lint / typecheck / format:check` green; new Vitest regression tests for:
  multi-turn history, empty-assistant-content, and the "Add this quiz to course" repro (no
  "An error occurred").
- AGENTS.md + OpenWiki updated.
