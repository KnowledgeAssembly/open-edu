# Studio Author Assistant — Phase D Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match learner Pipili companion quality: streaming responses, server-suggested next steps, durable conversation history, visual polish, and performance hardening. Default the assistant feature flag **on** in Creator mode.

**Architecture:** Upgrade `createStudioAssistantHandler` to SSE streaming (`streamText` + `pipeUIMessageStreamToResponse`, mirroring `apps/learner/src/pipili/handler.ts`). Persist threads per course via IndexedDB (or `@open-edu/ai-companion` `ConversationManager` with a Studio adapter). Optional extraction of shared chat shell into `@open-edu/design-system`.

**Tech stack:** Same as Phase C + AI SDK streaming, IndexedDB, design-system AI primitives

**Prerequisites:** Phase C merged (full assistant feature set: explain, item drafts, course drafts).  
**Spec:** [`../specs/2026-08-12-studio-author-assistant-design.md`](../specs/2026-08-12-studio-author-assistant-design.md)  
**Index:** [`./2026-08-12-studio-author-assistant-index.md`](./2026-08-12-studio-author-assistant-index.md)  
**Learner references:** `PipiliChatProvider`, `createPipiliHandler`, `CourseRightSidebar`

**Out of scope:** Hosted Studio (product Phase 5), Developer-mode AI, bundle AI, autonomous multi-file agents without confirm.

---

## Architecture & constraints (mandatory)

1. Streaming must not break draft metadata — attach `drafts` / `courseDraft` on **message finish**, not mid-stream.
2. Conversation persistence is per `courseId`; clearing conversation is explicit (“New conversation”).
3. Debounce context excerpt updates while typing (≈300ms) to avoid request spam.
4. Default feature flag **on** only after A–C behaviors are stable.
5. Optional design-system extraction is **nice-to-have**; do not block streaming/history on it.
6. Update OpenWiki / Studio design docs after ship (prefer source docs; avoid hand-editing generated OpenWiki pages unless required).

---

## File structure

| File                                                                | Status          | Responsibility                           |
| ------------------------------------------------------------------- | --------------- | ---------------------------------------- |
| `apps/dev-server/src/studio/ai/chat/handler.ts`                     | Modify          | SSE streaming path                       |
| `apps/dev-server/src/studio/ai/chat/handler.test.ts`                | Modify          | Streaming / metadata-on-finish           |
| `apps/dev-server/src/studio/ai/chat/policy.ts`                      | Modify          | `extractMetadata` + next steps           |
| `apps/dev-server/src/studio/ai/chat/metadata.ts`                    | Modify          | `suggestedNextSteps` max 4               |
| `apps/dev-server/src/studio/ai/StudioChatProvider.tsx`              | Modify          | Streaming status, stop, onFinish persist |
| `apps/dev-server/src/studio/ai/ConversationStore.ts`                | Create          | IndexedDB per-course messages            |
| `apps/dev-server/src/studio/ai/ConversationStore.test.ts`           | Create          | Round-trip + prune                       |
| `apps/dev-server/src/studio/components/StudioAssistantChat.tsx`     | Modify          | Stop button, next-step chips             |
| `apps/dev-server/src/studio/components/StudioAssistantMessage.tsx`  | Modify          | Render next steps                        |
| `apps/dev-server/src/studio/components/StudioRightSidebar.tsx`      | Modify          | New conversation menu; polish            |
| `apps/dev-server/src/studio/ai/context.ts`                          | Modify          | Debounced excerpt updates                |
| `apps/dev-server/src/studio/ai/assistantStorage.ts`                 | Modify          | Flag default on                          |
| `packages/i18n/locales/en/studio.json`                              | Modify          | Streaming / history / next-step copy     |
| `packages/design-system/src/ai/AIChatPanel.tsx`                     | Optional Create | Shared chat shell                        |
| `apps/learner/src/ai/PipiliChat.tsx`                                | Optional Modify | Thin wrapper if extraction lands         |
| `docs/superpowers/specs/2026-08-05-course-creator-studio-design.md` | Modify          | Point Phase 3 AI to Author Assistant     |
| `openwiki/domain/content-and-workflows.md`                          | Modify          | Author Assistant note (if appropriate)   |
| `AGENTS.md`                                                         | Modify          | Shortcut + env vars for Studio assistant |

---

### Task 1: Streaming handler

**Files:** `chat/handler.ts`, tests, `StudioChatProvider.tsx`, `StudioAssistantChat.tsx`

- [ ] **Step 1: Switch explain/tool path to `streamText`** using `@open-edu/llm-config` ModelFactory (mirror Pipili)

- [ ] **Step 2: Pipe UI message stream** to Node `ServerResponse` (Vite middleware compatible)

- [ ] **Step 3: Attach metadata on finish** — `messageMetadata` / `onFinish` includes `mode`, `drafts`, `courseDraft`, `suggestedNextSteps`

- [ ] **Step 4: Client** — ensure `useChat` status drives ThinkingIndicator + Stop

- [ ] **Step 5: Wire Stop** — `stop()` aborts in-flight stream

- [ ] **Step 6: Course-gen progress (stretch)** — tool progress events (“Compiling…”, “Validating…”) as transient assistant status

- [ ] **Step 7: Tests** — mock stream produces chunks; metadata present after finish

---

### Task 2: Server suggested next steps

**Files:** `policy.ts`, `metadata.ts`, message UI

- [ ] **Step 1: `extractMetadata(response, context)`** — derive up to 4 short next steps from mode + view

Examples:

| After              | Next steps                                                   |
| ------------------ | ------------------------------------------------------------ |
| Item draft         | “Apply this draft”, “Make it easier”, “Add a quiz”           |
| Course draft       | “Review quality checklist”, “Accept draft”, “Add more notes” |
| Explain on outline | “Add a lesson”, “Add a quiz”, “Preview course”               |
| After apply        | “Preview as learner”, “Check share readiness”                |

- [ ] **Step 2: Schema** — `suggestedNextSteps: z.array(z.string()).max(4)`

- [ ] **Step 3: UI** — chips under assistant message; click → `sendMessage(step)` (or run apply if action chip — prefer send_message for simplicity)

- [ ] **Step 4: i18n** — prefer server returning English keys **or** localized strings using request `context.locale`; document choice (recommend server returns plain localized strings using locale from context)

---

### Task 3: IndexedDB conversation store

**Files:** `ConversationStore.ts`, provider, sidebar menu, tests

- [ ] **Step 1: Store API**

```typescript
loadMessages(courseId: string): Promise<UIMessage[]>
saveMessages(courseId: string, messages: UIMessage[]): Promise<void>
clearMessages(courseId: string): Promise<void>
```

- [ ] **Step 2: Cap** — max 100 messages; prune oldest pairs

- [ ] **Step 3: Hydrate** on course open / package load in `StudioChatProvider`

- [ ] **Step 4: Persist onFinish** (and after local intent-chip exchanges)

- [ ] **Step 5: “New conversation”** — clear IDB + in-memory messages; new `conversationId`

- [ ] **Step 6: Evaluate reuse** of `@open-edu/ai-companion` `ConversationManager` — use if adapter cost is low; otherwise keep Studio-local store

- [ ] **Step 7: Tests** — round-trip, prune, clear

---

### Task 4: Performance & rate limits

**Files:** `context.ts`, `StudioContextBridge.tsx`, handler config

- [ ] **Step 1: Debounce** activity excerpt rebuild (~300ms) while editing

- [ ] **Step 2: Ignore stale** responses if `conversationId` or generation id mismatches (AI SDK usually handles; verify)

- [ ] **Step 3: Server rate limit** — soft cap N chat requests / minute / session (in-memory Map in Vite process)

- [ ] **Step 4: Structured logs** for tool calls (no content/PII)

---

### Task 5: Visual polish

**Files:** sidebar components, tokens, optional Tailwind regen

- [ ] **Step 1: Align** spacing, borders, `bg-surface`, shadow with `CourseRightSidebar`

- [ ] **Step 2: Context strip** — subtle badge row under header

- [ ] **Step 3: Intent chips** — match `SuggestedQuestions` compact styling

- [ ] **Step 4: Draft / course cards** — clear primary/secondary actions; no decorative clutter

- [ ] **Step 5: `prefers-reduced-motion`** — disable width transition when set

- [ ] **Step 6: If new Tailwind classes need prebuild for Studio** — regenerate `apps/dev-server` CSS when required

---

### Task 6 (optional): Design-system extraction

**Files:** `packages/design-system/src/ai/AIChatPanel.tsx`, learner + studio wrappers

- [ ] **Step 1: Extract** message list + composer shell used by both Pipili and Studio

- [ ] **Step 2: Refactor** `PipiliChat` and `StudioAssistantChat` as thin wrappers

- [ ] **Step 3: Storybook** stories for compact sidebar variant

- [ ] **Step 4: Skip** if schedule risk — document as follow-up

---

### Task 7: Feature flag default on + docs

- [ ] **Step 1: Default assistant enabled** in Creator when env unset (still allow `localStorage` override off)

- [ ] **Step 2: Remove remaining legacy AI UI** if any CTAs remain beyond slim Home card

- [ ] **Step 3: Update docs**

  - Studio design spec Phase 3 AI section → Author Assistant
  - `AGENTS.md` Cloud notes: shortcut `Cmd/Ctrl+Shift+A`, `OPEN_EDU_STUDIO_ASSISTANT`, LLM env
  - OpenWiki domain note if authoring docs should mention in-Studio assistant

- [ ] **Step 4: PR description** lists migration for teachers (where AI lives now)

---

### Task 8: Integration + PR checklist

- [ ] **Manual QA**

  1. Responses stream token-by-token
  2. Stop cancels mid-stream
  3. Next-step chips appear and continue the conversation
  4. Refresh browser → same course restores thread
  5. New conversation clears history
  6. Typing in editor does not spam network (debounce)
  7. Sidebar visually consistent with learner Pipili panel

- [ ] **E2E (recommended)** — Playwright: open Studio → toggle assistant → suggestion → multi-view continuity

- [ ] **Run**

```bash
pnpm --filter @open-edu/dev-server test
pnpm lint
pnpm typecheck
# optional:
pnpm test:e2e  # if Studio e2e coverage exists / added
```

- [ ] **Commit** `feat(dev-server): polish studio author assistant streaming and history (phase D)`

---

## Acceptance criteria

- [ ] Assistant responses stream
- [ ] Follow-up suggestion chips appear on assistant messages
- [ ] Conversation survives browser refresh for the same course
- [ ] “New conversation” clears history
- [ ] Feature flag on by default in Creator; legacy AI surfaces fully removed or CTA-only
- [ ] Sidebar visually consistent with learner Pipili panel
- [ ] No perceptible lag / request spam while typing in editor
- [ ] Docs updated
- [ ] Tests / lint / typecheck pass

---

## Risks

| Risk                               | Mitigation                                         |
| ---------------------------------- | -------------------------------------------------- |
| Streaming + Vite middleware quirks | Copy Pipili Vite wiring patterns; integration test |
| IDB quota / private mode           | Fall back to sessionStorage; catch errors          |
| Design-system extraction churn     | Keep optional; ship streaming/history first        |
| Default-on surprises               | Release notes; localStorage off escape hatch       |

---

## Success metrics (post-ship)

- ≥80% of Studio AI interactions start from the sidebar
- Conversation retained across ≥3 view changes in user testing
- “Add quiz from outline” ≤3 clicks (open → chip → Use)
- Zero standalone `ai-review` navigations
- axe-clean sidebar; no hardcoded strings

---

## Exit

Phase D completes the Author Assistant track. Follow-ups (separate plans): Developer-mode assist, bundle Creator AI, hosted Studio parity, deeper agentic tool loops with sandboxing.
