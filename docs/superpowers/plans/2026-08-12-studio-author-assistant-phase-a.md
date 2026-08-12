# Studio Author Assistant — Phase A Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a persistent Author Assistant right sidebar in Creator mode with page-context suggestion chips and free-text Q&A about the open course. No draft mutations — explain, guide, and answer only.

**Architecture:** Mirror learner `AppShell` + `CourseRightSidebar` + `PipiliChatProvider` patterns inside `StudioApp`. Add `StudioAssistantProvider` / `StudioChatProvider`, a `StudioContextBridge`, and `POST /api/studio/ai/chat` (non-streaming, explain-only). Existing `AiStartPanel` / `AiEditPanel` / `AiAddDialog` remain unchanged and run in parallel behind a feature flag.

**Tech stack:** React 18, Vitest, AI SDK (`@ai-sdk/react` / `ai`), `@open-edu/design-system`, `@open-edu/i18n`, `@open-edu/llm-config`, Zod

**Prerequisites:** None (first assistant phase). Existing Studio AI status + llm-config env vars.  
**Spec:** [`../specs/2026-08-12-studio-author-assistant-design.md`](../specs/2026-08-12-studio-author-assistant-design.md)  
**Index:** [`./2026-08-12-studio-author-assistant-index.md`](./2026-08-12-studio-author-assistant-index.md)  
**Learner references:** `apps/learner/src/CourseRightSidebar.tsx`, `apps/learner/src/ai/PipiliChatProvider.tsx`, `apps/learner/src/pipili/handler.ts`

**Out of scope:** Draft preview cards, structured intents, streaming, course generation from chat, deprecating existing AI UI, Developer mode, bundles.

---

## Architecture & constraints (mandatory)

1. Mount assistant **only** when `mode === 'creator'` and feature flag is on.
2. Do **not** import from `apps/learner` — copy/adapt patterns or use design-system primitives.
3. Never leak API keys; reuse `isAiAvailable()` / `GET /api/studio/ai/status`.
4. Phase A chat must **not** write package files or call item/course generate endpoints.
5. Same Studio UI / token / i18n rules as Creator Studio.
6. Persist panel open + width in `sessionStorage` / `localStorage` keys under `openedu.studio.assistant.*`.

---

## Feature flag

| Mechanism | Key / env                                         | Default (Phase A)  |
| --------- | ------------------------------------------------- | ------------------ |
| Env       | `OPEN_EDU_STUDIO_ASSISTANT=1`                     | off unless set     |
| Override  | `localStorage` `openedu.studio.assistant.enabled` | unset → follow env |

When flag off: `StudioApp` layout unchanged (no sidebar mount).

---

## File structure

| File                                                                | Status | Responsibility                      |
| ------------------------------------------------------------------- | ------ | ----------------------------------- |
| `packages/i18n/locales/en/studio.json`                              | Modify | `assistant.*` keys                  |
| `apps/dev-server/src/studio/hooks/useResizablePanel.ts`             | Create | Port from learner                   |
| `apps/dev-server/src/studio/hooks/useAssistantShortcut.ts`          | Create | `Cmd/Ctrl+Shift+A`                  |
| `apps/dev-server/src/studio/ai/assistantStorage.ts`                 | Create | Panel + thread persistence          |
| `apps/dev-server/src/studio/ai/context.ts`                          | Create | Snapshot types + builders           |
| `apps/dev-server/src/studio/ai/context.test.ts`                     | Create | Snapshot tests                      |
| `apps/dev-server/src/studio/ai/suggestions.ts`                      | Create | `resolveSuggestions`                |
| `apps/dev-server/src/studio/ai/suggestions.test.ts`                 | Create | Suggestion matrix                   |
| `apps/dev-server/src/studio/ai/StudioAssistantProvider.tsx`         | Create | Panel + context state               |
| `apps/dev-server/src/studio/ai/StudioChatProvider.tsx`              | Create | `useChat` + transport               |
| `apps/dev-server/src/studio/ai/StudioContextBridge.tsx`             | Create | Null-render context sync            |
| `apps/dev-server/src/studio/ai/index.ts`                            | Create | Hooks barrel                        |
| `apps/dev-server/src/studio/ai/chat/config.ts`                      | Create | Request Zod + limits                |
| `apps/dev-server/src/studio/ai/chat/metadata.ts`                    | Create | `mode: 'explain'` metadata          |
| `apps/dev-server/src/studio/ai/chat/policy.ts`                      | Create | System prompt builder               |
| `apps/dev-server/src/studio/ai/chat/handler.ts`                     | Create | `createStudioAssistantHandler`      |
| `apps/dev-server/src/studio/ai/chat/handler.test.ts`                | Create | Validation + 503 tests              |
| `apps/dev-server/src/studio/components/StudioLayout.tsx`            | Create | Flex main + sidebar                 |
| `apps/dev-server/src/studio/components/StudioRightSidebar.tsx`      | Create | Rail + chat shell                   |
| `apps/dev-server/src/studio/components/StudioRightSidebar.test.tsx` | Create | Render / a11y / toggle              |
| `apps/dev-server/src/studio/components/AssistantHeaderButton.tsx`   | Create | Chrome sparkles toggle              |
| `apps/dev-server/src/studio/components/AssistantContextStrip.tsx`   | Create | Context badge row                   |
| `apps/dev-server/src/studio/components/StudioAssistantChat.tsx`     | Create | Message list + composer             |
| `apps/dev-server/src/studio/components/StudioAssistantMessage.tsx`  | Create | Markdown message                    |
| `apps/dev-server/src/studio/StudioApp.tsx`                          | Modify | Providers + layout wrap             |
| `apps/dev-server/src/studio/components/StudioChrome.tsx`            | Modify | Assistant header button             |
| `apps/dev-server/vite.config.ts`                                    | Modify | `POST /api/studio/ai/chat`          |
| `apps/dev-server/src/studio/studioApi.ts`                           | Modify | Optional thin chat helper if needed |

---

## Target layout

```tsx
<StudioAssistantProvider>
  <StudioChatProvider>
    <StudioContextBridge view={view} selectedPath={selectedPath} ... />
    <div className="flex h-screen flex-col">
      <StudioChrome ... assistantButton />
      <StudioLayout sidebar={<StudioRightSidebar />}>
        {content}
      </StudioLayout>
    </div>
  </StudioChatProvider>
</StudioAssistantProvider>
```

---

### Task 1: i18n + storage helpers

**Files:**

- Modify: `packages/i18n/locales/en/studio.json`
- Create: `apps/dev-server/src/studio/ai/assistantStorage.ts`

- [ ] **Step 1: Add keys** under `assistant` (labels, open/close, composer placeholder, unavailable, context strip formats, per-view suggestion labels)

Suggested keys (non-exhaustive):

```json
{
  "assistant": {
    "label": "Author Assistant",
    "open": "Open Author Assistant",
    "close": "Close Author Assistant",
    "placeholder": "Ask anything about your course…",
    "unavailable": "AI is unavailable. Configure an API key or use templates.",
    "context.outline": "Outline · {{count}} activities",
    "context.editing": "Editing: {{title}}",
    "context.home": "Home",
    "suggest.create_from_notes": "How do I create a course from notes?",
    "suggest.what_can_you_do": "What can you help me with?",
    "suggest.summarize_course": "Summarize this course",
    "suggest.improve_outline": "How can I improve the outline?",
    "suggest.add_lesson": "How do I add a lesson?",
    "suggest.add_quiz": "How do I add a quiz?",
    "suggest.check_flow": "Check my course flow",
    "suggest.improve_activity": "How can I improve this activity?",
    "suggest.check_quality": "Check quality of this activity",
    "suggest.simplify": "How can I simplify this?",
    "suggest.preview_feedback": "What should I improve after preview?",
    "suggest.add_followup": "Suggest a follow-up activity",
    "suggest.fix_issues": "Help me fix share readiness issues",
    "suggest.improve_description": "Improve the course description",
    "suggest.create_course": "Help me create a new course",
    "suggest.organize_library": "How should I organize my library?",
    "error.generic": "Something went wrong. Try again.",
    "shortcut.hint": "Toggle with {{shortcut}}"
  }
}
```

- [ ] **Step 2: Implement storage helpers** for `panelOpen`, `panelWidth`, conversation id keyed by `courseId`

- [ ] **Step 3: Run i18n key validation / format** as needed for the package

---

### Task 2: Resize hook + layout shell

**Files:**

- Create: `useResizablePanel.ts`, `StudioLayout.tsx`
- Modify: `StudioApp.tsx` (minimal wrap behind flag — can stub sidebar)

- [ ] **Step 1: Port `useResizablePanel`** from learner; keys `openedu.studio.assistant.width`; default 360; min 280; max 480

- [ ] **Step 2: Create `StudioLayout`** — `flex flex-1 min-h-0`; main `flex-1 min-w-0 overflow-auto`; optional resize handle; sidebar slot

- [ ] **Step 3: Wire into `StudioApp`** when flag on; preserve existing chrome + content

- [ ] **Step 4: Unit/render smoke test** that layout mounts

---

### Task 3: Context snapshot

**Files:**

- Create: `context.ts`, `context.test.ts`, `StudioContextBridge.tsx`

- [ ] **Step 1: Define Zod `studioContextSnapshotSchema`**

Phase A fields:

```typescript
{
  view: StudioView;
  locale: string;
  aiAvailable: boolean;
  course?: {
    id: string;
    title: string;
    activityCount: number;
    outline: Array<{ title: string; kind: string; path: string }>;
  };
  activity?: {
    path: string;
    kind: ActivityKind;
    title?: string;
    contentExcerpt?: string; // max ~4k chars
  };
}
```

- [ ] **Step 2: Builders** — `buildOutlineSummary`, `truncateExcerpt`

- [ ] **Step 3: `StudioContextBridge`** — null-render; sync from props (`view`, `selectedPath`, `loadedPackage`, `api`); load activity excerpt async on edit view

- [ ] **Step 4: Tests** — truncation, outline summary caps (e.g. max 30 activities)

---

### Task 4: Suggestions resolver

**Files:**

- Create: `suggestions.ts`, `suggestions.test.ts`

- [ ] **Step 1: Define `SuggestionChip`** — `{ id, label, action: { type: 'send_message'; message: string } }`

- [ ] **Step 2: Implement `resolveSuggestions(ctx, t)`** matrix:

| View                         | Chips                                     |
| ---------------------------- | ----------------------------------------- |
| `home` (no course)           | create_from_notes, what_can_you_do        |
| `home` (has course)          | summarize_course, improve_outline         |
| `outline`                    | add_lesson, add_quiz, check_flow          |
| `edit-activity`              | improve_activity, check_quality, simplify |
| `preview`                    | preview_feedback, add_followup            |
| `share`                      | fix_issues, improve_description           |
| `library`                    | create_course, organize_library           |
| `unit-builder` / `ai-review` | minimal: what_can_you_do                  |

- [ ] **Step 3: Hide all chips when `!aiAvailable`**

- [ ] **Step 4: Vitest matrix** covering each view × course presence

---

### Task 5: Providers

**Files:**

- Create: `StudioAssistantProvider.tsx`, `StudioChatProvider.tsx`, `index.ts`

- [ ] **Step 1: `StudioAssistantProvider`** — `panelOpen`, `setPanelOpen`, `context`, setters; read/write storage

- [ ] **Step 2: `StudioChatProvider`** — mirror `PipiliChatProvider`:

  - `useChat` + `DefaultChatTransport` → `/api/studio/ai/chat`
  - `prepareSendMessagesRequest` injects `conversationId` + latest context via refs
  - Expose `messages`, `sendMessage`, `status`, `stop`, `regenerate`, `clearError`, `clearMessages`

- [ ] **Step 3: Conversation id** — `openedu.studio.ai.thread.{courseId}` in sessionStorage; regenerate when course changes

- [ ] **Step 4: Export hooks** — `useStudioAssistant`, `useStudioChat`

---

### Task 6: Chat handler (server)

**Files:**

- Create: `chat/config.ts`, `chat/metadata.ts`, `chat/policy.ts`, `chat/handler.ts`, `chat/handler.test.ts`
- Modify: `vite.config.ts`

- [ ] **Step 1: Zod request schema** — `conversationId`, `messages`, `context` (reuse snapshot schema)

- [ ] **Step 2: Limits** — `MAX_CONTEXT_CHARS`, `MAX_MESSAGES`, payload size guard

- [ ] **Step 3: System prompt** — author persona; teacher language; inject outline + excerpt; state Phase A cannot modify files; short quality rubric from authoring skill

- [ ] **Step 4: Handler** — validate → `isAiAvailable` → `generateText` (non-streaming) via `@open-edu/llm-config` / existing studio LLM helpers → JSON response with `mode: 'explain'`

- [ ] **Step 5: Wire route** — `POST /api/studio/ai/chat` in Vite middleware; 503 `{ error: 'ai-unavailable' }` when no key

- [ ] **Step 6: Tests** — invalid body 400; unavailable 503; happy path with mocked LLM

---

### Task 7: Sidebar UI

**Files:**

- Create: `StudioRightSidebar.tsx`, `AssistantHeaderButton.tsx`, `AssistantContextStrip.tsx`, `StudioAssistantChat.tsx`, `StudioAssistantMessage.tsx`, `useAssistantShortcut.ts`
- Modify: `StudioChrome.tsx`, `StudioApp.tsx`

- [ ] **Step 1: Collapsed / open rail** — closed `w-12`; open inline width; transition; disable transition while resizing

- [ ] **Step 2: Context strip + `SuggestedQuestions` compact** — chips call `sendMessage`

- [ ] **Step 3: Chat UI** — message list, composer (Enter send / Shift+Enter newline), stop/retry, `ThinkingIndicator`

- [ ] **Step 4: Unavailable empty state** when status unavailable

- [ ] **Step 5: Header button + keyboard shortcut**

- [ ] **Step 6: a11y** — `role="complementary"`, `aria-label`, `aria-pressed` on toggle

- [ ] **Step 7: Component tests** — toggle, chip → sendMessage (mock provider), axe

---

### Task 8: Integration + PR checklist

- [ ] **Step 1: Manual QA** — flag on → navigate Home → Outline → Editor; suggestions change; ask free-text question about outline

- [ ] **Step 2: Confirm no package writes** from chat

- [ ] **Step 3: Confirm Developer mode** has no sidebar

- [ ] **Step 4: Run**

```bash
pnpm --filter @open-edu/dev-server test
pnpm lint
pnpm typecheck
```

- [ ] **Step 5: Commit** `feat(dev-server): add studio author assistant shell (phase A)`

---

## Acceptance criteria

- [ ] Sidebar visible in Creator when flag on; hidden in Developer and when flag off
- [ ] Panel open/closed and width persist across view navigation
- [ ] Suggestions change across Home → Outline → Editor (and other views)
- [ ] Free-text Q&A works when LLM configured
- [ ] Chat never writes files in Phase A
- [ ] Existing AI panels still work unchanged
- [ ] Tests / lint / typecheck pass for touched packages

---

## Risks

| Risk                               | Mitigation                                                         |
| ---------------------------------- | ------------------------------------------------------------------ |
| AI SDK version mismatch vs learner | Match learner’s `ai` / `@ai-sdk/react` versions in dev-server deps |
| Vite HMR clears React state        | sessionStorage for panel + conversation id                         |
| Context too large                  | Truncate excerpt; cap outline list                                 |

---

## Exit → Phase B

Phase B may start when Phase A is merged and the sidebar can send/receive explain messages with live context.
