# Studio AI Companion — Consolidation Plan

**Status:** ✅ Approved + implemented (2026-09-01). The single Node backend,
one-endpoint Studio AI consolidation described below is live via the PR on
`feat/studio-ai-consolidation-single-backend`. `docs/STUDIO-AI-IMPLEMENTATION-DETAIL.md`
carries the execution log.
**Author:** Open-Edu agents
**Scope:** Simplify the Studio AI companion to a **single Node backend** with **one AI pipeline** and **no hosted gateway**. Two user products are supported on the same backend via a storage switch — local file-system editing and hosted multi-user (OPFS per-user storage).

> This plan is about **maintainability**, not new features. It removes the parallel AI pipelines that
> accumulated across Studio AI Phases 1–8 and the standalone hosted gateway. Execute story-by-story,
> each with Vitest tests / typecheck / lint / prettier, per `AGENTS.md` (one story per PR).

---

## 1. Why the companion is hard to maintain (the problem)

The Studio Assistant currently has **four parallel AI pipelines**, each with its **own message
schema, own intent router, and own error contract**. The same conceptual "chat message" is
serialized/validated/routed up to four times under different rules, causing recurring bugs (e.g.
`content`-null on multi-turn, and the "Add this quiz to course" → "An error occurred" failure).

The root cause is an earlier design decision: **browser mode was a pure-static SPA** that reached AI
through a remote hosted gateway (`/api/ai/chat`), while normal mode used a local Node handler
(`/api/studio/ai/chat`). That static-vs-node split and the standalone gateway are the source of the
duplication.

### The four pipelines

| #   | System                                | Files                                                                 | Origin                                                  | Fate                                       |
| --- | ------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------ |
| 1   | **Gateway (static-function surface)** | `gateway/`, `api/ai/[...route].ts`, `vercel.json`                     | Hosted SaaS / spec §26 / local browser-mode convenience | **Dropped** static-function surface        |
| 2   | **Deterministic Studio handler**      | `studio/ai/chat/handler.ts`, `tools.ts`, `studioLlm.ts`               | Phase 2 (v1)                                            | **SLIM** → thin adapter over the loop      |
| 3   | **Agent loop**                        | `agentLoop.ts`, `runtime/AiSdkAgentRuntime.ts`, `@open-edu/companion` | Phase 6–8 (new core)                                    | **KEEP** — single owner                    |
| 4   | **Client transport**                  | `StudioChatProvider.tsx` → `createHostedChatTransport`                | React `useChat`/`ChatTransport`                         | **SLIM** → remove routing + endpoint split |

### Confirmed root causes

- **Message schemas differ:** `chat/config.ts` `StudioChatRequestSchema` allows empty assistant
  `content`; `gateway/requestSchema.ts` `chatMessageSchema` requires `content.min(1)`. Same
  "messages" array, two incompatible rules.
- **Intent routers in 3 places:** `parseIntentFromMessage`/`routeIntent` run in `handler.ts`,
  `agentLoop.ts`, and client-side `createHostedChatTransport` — they can disagree.
- **Message converters duplicated:** `toAiSdkMessages` exists only in `AiSdkAgentRuntime.ts`; the
  client `buildChatBody`→`extractText` and the gateway flatten independently, losing tool-call
  structure (→ empty content → provider `content: null`).
- **"An error occurred" bug:** in browser mode `chatApiUrl='/api/ai/chat'` (gateway), which is only
  mounted when `OPEN_EDU_LOCAL_AI=1` (`vite.config.ts:1644`). Default → 404-into-SPA →
  `fallbackToChat()` throws → AI SDK default "An error occurred" with no browser-console error.

### Verified: learner app is unaffected by gateway removal

Confirmed that `apps/learner` does **not** use the dev-server `/api/ai/*` gateway. The learner uses
its **own** endpoints (`/api/llm/chat`, `/api/pipili/chat`, `/api/oep-proxy`, `/api/dictionary/*`)
and course distribution via `@open-edu/oep-distribution` + `@open-edu/registry`. Therefore deleting
the dev-server gateway/Server Functions does **not** break the learner.

---

## 2. Final target architecture (single Node backend, one AI pipeline)

```
                    ┌─────────────────────────────────────────────┐
        Browser     │            @open-edu/companion              │
   useChat/UIMessage│  AgentRuntimeMessage • Tool • Skill • Task  │
        │           └─────────────────────────────────────────────┘
        │ thin adapter (StudioChatTransport)                          ▲
        ▼ one endpoint                                                 │ one converter
   /api/studio/ai/chat ──▶  Agent Loop (single owner                  │ (toAiSdkMessages)
        │                    of routing + tool exec)                  │
   storage adapter         └──────────────────────────────┐           │
   ┌───────────────────┐                                  │           │
   │ Local: Node FS     │  ◀──────── LLM via streamText ──┘           │
   │ Hosted: OPFS/user  │            (AiSdkAgentRuntime)              │
   └───────────────────┘                                              │
```

**Principles**

1. `@open-edu/companion` types are the single source of truth for messages, tools, skills, tasks.
2. **One** `toAiSdkMessages` converter, used by the single AI path.
3. **The agent loop owns routing.** The client ships the raw message + history and never re-parses
   intents.
4. **One endpoint** `/api/studio/ai/chat` in all modes; no `chatApiUrl` split, no gateway.
5. **No pure-static deployment.** The Studio always runs behind a Node backend (normal Vite dev
   server or a Node prod server). No Server Functions, no static export.

**Two user products = one backend + one storage switch**

| User product              | Storage                                    | Multi-user | Distribution                    |
| ------------------------- | ------------------------------------------ | ---------- | ------------------------------- |
| Local file-system editing | Node FS (course folder on disk)            | No         | —                               |
| Hosted multi-user         | OPFS per user (isolated browser workspace) | Yes        | via `oep-distribution`/registry |

AI transport is identical for both (→ `/api/studio/ai/chat`); only storage differs.

---

## 3. Consolidated inventory (what exists → what it becomes)

| System                                                                                     | Keep/Slim/Delete       | Become                                                                                                |
| ------------------------------------------------------------------------------------------ | ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `@open-edu/companion` contracts                                                            | **Keep**               | The one domain model (unchanged)                                                                      |
| `agentLoop.ts` + `AiSdkAgentRuntime.ts`                                                    | **Keep**               | The single routing + execution owner                                                                  |
| `studio/ai/chat/handler.ts`                                                                | **Slim**               | Pure HTTP adapter over the loop (request→loop→SSE)                                                    |
| `studio/ai/chat/{intent,route}.ts`                                                         | **Keep (server-only)** | Remove client call sites (no gateway call sites exist after deletion)                                 |
| `studio/ai/chat/config.ts` schema                                                          | **Keep**               | THE shared chat message schema (only one left)                                                        |
| `StudioChatProvider.tsx` client routing                                                    | **Delete (routing)**   | Thin transport; one endpoint, never re-parses intents                                                 |
| `createHostedChatTransport`                                                                | **Slim**               | Remove browser short-circuit + `fallbackToChat`; still a `ChatTransport` but to `/api/studio/ai/chat` |
| `chatApiUrl` browser/local split                                                           | **Delete**             | One endpoint `/api/studio/ai/chat` always mounted; no `OPEN_EDU_LOCAL_AI`                             |
| `gateway/` (router, chat, requestSchema, itemGeneration, gatewayOrigins, localViteGateway) | **Delete**             | Static-function surface dropped; `/api/ai/chat` becomes the Node backend route                        |
| `api/ai/[...route].ts` + Server Functions config                                           | **Delete**             | Gone entirely                                                                                         |
| `browserAiClient` `/api/ai/*` calls                                                        | **Delete**             | Remap to the agent-loop endpoint or remove                                                            |

---

## 4. Execution plan (stories, in dependency order)

Each story is a separate branch/PR with Vitest tests + typecheck + lint + prettier + i18n checks,
per `AGENTS.md`.

### Story A — Unify the chat message schema (foundation)

**Problem:** two schemas for the same "messages" array (`chat/config.ts` allows empty content;
gateway requires `min(1)`).

**Work**

- **Placement decision (do this first, one option only):** move `StudioChatRequestSchema` into
  `@open-edu/companion` (add a subpath export `@open-edu/companion/chat`). Dropping Vercel/static
  server-function support removes the `vite.config.ts` ESM/extensionless-import constraint (the
  serverless route is deleted in Story D). The schema becomes the single canonical wire format.
- Decide a single rule for assistant `content`: allow `''` but normalize to a non-empty value in
  `toAiSdkMessages` (already done). Do **not** rely on `min(1)`, because tool-call turns
  legitimately have empty text.
- Delete the gateway's `chatMessageSchema` (gateway is removed in Story D).

**Tests**

- Schema accepts/rejects the same arrays as the (pre-deletion) local handler behavior.
- Empty-assistant message serializes to non-null content in the single converter.

### Story B — Single message converter

**Problem:** Companion→AI SDK mapping only exists in `AiSdkAgentRuntime.ts`; the client flattens
independently.

**Work**

- Export `toAiSdkMessages` (and a companion `fromUIMessage` reverse) from `@open-edu/companion`
  (with the subpath export `@open-edu/companion/chat` from Story A). The Vercel/static-fn
  constraint is gone, so the converter lives in the canonical package.
- Ensure only the agent-loop path converts messages; remove any separate flattening in the client.

**Tests**

- Round-trip `UIMessage` → schema → `toAiSdkMessages` → provider shape has no `content: null`.
- Coverage of assistant tool-call turns with empty text in history (single + multi-turn).

### Story C — One routing owner (client)

**Problem:** `parseIntentFromMessage`/`routeIntent` run on the client too (in
`createHostedChatTransport`).

**Work**

- Remove client-side intent parsing from `StudioChatProvider.tsx`/`createHostedChatTransport`. The
  client ships the raw last-user message + history to `/api/studio/ai/chat`; the loop decides.

**Tests**

- Client transport does not branch on intent; a typed message always reaches the loop.
- Server returns an ordinary explain/draft stream for the prior "An error occurred" repro.

### Story D — Delete the Vercel static-function surface (gateway) + the `/api/ai/chat` path

**Problem:** the standalone gateway is the source of the second/third schemas and the not-mounted
endpoint bug; it is no longer needed now that browser mode requires Node.

**Work**

- Remove the Vercel-specific static-function files: `api/ai/[...route].ts` and `vercel.json`.
- Delete `apps/dev-server/src/gateway/` (router, chat, requestSchema, itemGeneration, gatewayOrigins,
  localViteGateway) and their tests.
- Delete `apps/dev-server/src/studio/browserAiClient.ts` `/api/ai/*` calls (status, generate-draft,
  item, chat); remap Studio AI calls to the agent-loop endpoint.
- Remove `OPEN_EDU_LOCAL_AI` gating and `localAiGatewayPlugin` from `vite.config.ts`.
- Strip Vercel-only branches from `gatewayOrigins.ts` (`env.VERCEL`) if the file is retained for
  non-Vercel use; otherwise delete it with the rest of `gateway/`.
- **Keep** the Node backend registry-integrated `@open-edu/companion` route (`/api/studio/ai/chat`)
  as the single official request surface. **Delete** the `/api/ai/chat` path entirely — its only
  caller (Studio browser mode) is re-pointed to the Node route in Story E, and no external consumer
  uses it (verified via search before deletion, per the risk-table mitigation).

**Tests**

- `apps/dev-server` builds and all remaining Studio tests pass.
- Confirm `apps/learner` still builds/tests (verified unaffected by gateway removal).
- Delete/adjust gateway tests; ensure no dangling imports.

### Story E — Unify the client endpoint

**Problem:** `chatApiUrl` splits browser (`/api/ai/chat`) vs local.

**Work**

- Point `chatApiUrl` at `/api/studio/ai/chat` in both modes (mount it in browser mode too).
- Ensure `/api/studio/ai/chat` is mounted in both local and hosted Node servers (it already is on
  the local path, `vite.config.ts:675`); expose the same handler in the hosted Node server.
- Remove the browser-mode `createHostedChatTransport` short-circuit and `fallbackToChat` indirection.
  Suggested actions already route through `sendMessage(preset)` → the same loop.

**Scope guard:** the gateway tree (`api/ai`, `vercel.json`) is removed in Story D. `/api/ai/chat`
does not need to keep working — its sole caller (Studio browser mode) is re-pointed to the Node
backend route in this story. There is no longer a "preserve the hosted spec §26" requirement.

**Tests**

- Typed "Add this quiz to course" returns an explain/draft response (no "An error occurred").
- Suggested and typed actions hit the same endpoint and route consistently.
- `/api/ai/chat` no longer referenced anywhere in `apps/dev-server`.

### Story F — Storage adapter for the two products

**Work**

- Define a storage-interface seam already generically used by the Studio (`openStorage`/workspace
  adapter).
- **Local (file-system):** existing Node FS workspace — unchanged, single-user.
- **Hosted (multi-user, OPFS):** keep the browser OPFS/IndexedDB workspace (`browserCourseStore`,
  `OPFSWorkspace`) for per-user isolation. Validate it already keys per user/session.
- Confirm AI calls are storage-independent (they are: → `/api/studio/ai/chat`); remove any storage↔AI
  coupling found during investigation.

**Tests**

- Local FS and hosted OPFS both open the same Studio and round-trip a course successfully.
- Multi-user isolation: two OPFS workspaces do not collide.

### Story G — Remove dead/duplicated code + doc sync (cleanup)

**Work** (after A–F pass)

- Delete now-unused flatteners, `browserAiClient`, and any orphaned gateway helpers.
- Re-run hardcoded-strings lint + i18n checks; fix any user-facing strings not using `t()`.
- Regenerate dev-server Tailwind CSS only if runtime classes changed (likely none).
- **Doc sync (required by AGENTS.md):** update `AGENTS.md` package list and the monorepo map to
  reflect the gateway removal and the new single-endpoint Studio AI; regenerate/update OpenWiki
  (quickstart / monorepo structure / operations).

**Tests**

- `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm format:check` all green.
- axe-core audit of the assistant chat component still passes.

---

## 5. Land the targeted bug fix first (fast, low-risk)

The consolidation above is multi-sprint; ship a small fix first so users aren't blocked.

**Fix:** set the Studio assistant `chatApiUrl` to the always-mounted `/api/studio/ai/chat` in browser
mode (`StudioApp.tsx:227`), and ensure `/api/studio/ai/chat` is mounted there. This removes the
dependency on the not-mounted `/api/ai/chat` gateway for the Studio. (Gateway deletion itself is
Story D; this fix only redirects the Studio to the local loop endpoint.)

Plus Story A's schema rule (allow empty assistant content) so multi-turn history with tool-call
turns isn't rejected upstream.

The immediate bug ("client routed to an unmounted gateway") is resolved by removing the
Vercel/static-function surface entirely (Story D/E), not just by re-pointing the client. This
targeted fix is Story-E-lite + Story-A-lite and can ship ahead of the full consolidation.

---

## 6. Risks & mitigations

| Risk                                                                      | Mitigation                                                                                                                                                                                                          |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Removing the gateway affects an external consumer                         | Only the Studio browser used `/api/ai/*`; learner + course distribution use `oep-distribution`/registry (verified). Any other external consumer is out of scope/stop-ship and confirmed via search before deletion. |
| Removing browser short-circuit changes suggested-action UX                | Suggested actions already call `sendMessage(preset)`; verify draft/course-draft cards still populate via `messageMetadata` (loop preserves this).                                                                   |
| Hosted OPFS multi-user storage is per-browser (not shared across devices) | Document as a product constraint; per-user OPFS gives isolation, but a user's courses live in their browser. Server-side per-user storage is a future option (out of scope).                                        |
| Multi-turn history still fragile                                          | Single converter + single schema (Story A/B) make round-trips consistent; add regression tests for empty-assistant turns.                                                                                           |
| Scope creep / long consolidation                                          | Ship A–G as independent PRs; the targeted bug fix lands first.                                                                                                                                                      |

---

## 7. Definition of done

- One chat message schema (Story A), one converter (Story B), one routing owner (Story C), one
  client endpoint (Story E), no gateway (Story D).
- The Vercel static-function tree (`api/ai`, `vercel.json`) is deleted; `/api/ai/chat` is removed
  (its sole caller, Studio browser mode, is re-pointed to `/api/studio/ai/chat`).
- Both products (local FS + hosted OPFS) run the same Studio behind a Node backend with one AI
  pipeline (Story F).
- No duplicated intent parsing, message flattening, or static-vs-node split anywhere in
  `apps/dev-server`.
- All `pnpm test` / `pnpm lint` / `pnpm typecheck` / `pnpm format:check` green; new Vitest regression
  tests for multi-turn + empty-assistant-content cases.
- `AGENTS.md` package list + OpenWiki updated (Story G doc-sync).
- The "Add this quiz to course" repro no longer returns "An error occurred".
