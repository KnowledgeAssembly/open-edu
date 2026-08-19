# Implementation Plan — AI Chat Parity in Browser Mode

## 1. Goal

Bring the browser-mode Author Assistant chat to functional parity with the non-browser (local Vite) chat by supporting the same deterministic intents:

- `generate_course` — create a full course draft from notes (already implemented, needs integration tests).
- `draft_new` — create a new lesson/quiz/practice activity.
- `edit_existing` — rewrite, expand, fix quality, translate, adjust difficulty, or add questions to the current activity.
- `explain` — general Q&A (already works via the stateless gateway chat).

Out of scope for this plan: real-time token streaming and stop/cancel support (tracked as follow-up).

## 2. Scope

### In scope

- Intent parsing and routing inside `createHostedChatTransport`.
- Reusing existing `StudioApi` methods (`generateCourseDraft`, `generateItemAdd`, `generateItemEdit`) so no logic is duplicated in the gateway.
- Returning the correct `messageMetadata` (`mode`, `drafts`, `courseDraft`, `suggestedNextSteps`) so `StudioAssistantMessage` renders draft cards and follow-up chips.
- Suggested next steps for browser-mode tool responses.
- Error handling for missing course / missing activity context.
- Unit and E2E tests.

### Out of scope

- Rewriting the gateway chat endpoint (`/api/ai/chat`) to be stateful or support tools.
- Streaming / SSE conversion.
- New AI capabilities not already present in non-browser mode.

## 3. Technical Approach

The browser-mode chat transport already intercepts `generate_course` and delegates to `api.generateCourseDraft`. Extend that pattern:

1. Add `generateItemAdd` and `generateItemEdit` callbacks to `HostedChatTransportOptions`.
2. Add a `getCurrentActivity` callback so the transport can read the active activity's `kind` and `contentExcerpt` for `edit_existing` intents.
3. Add a `getSuggestedNextSteps` callback (or import the shared helper) so tool responses include follow-up chips.
4. In `sendMessages`, after detecting the last user message's intent:
   - `generate_course` → call `generateDraft` and emit a `course_draft` message.
   - `draft_new` → call `generateItemAdd` and emit a `draft` message.
   - `edit_existing` → call `generateItemEdit` with the current activity context and emit a `draft` message.
   - No intent / explain → fall through to the existing `/api/ai/chat` endpoint.
5. Wire the callbacks in `ChatRuntime` using `api.*` and `contextRef.current`.
6. Localize ready messages with `t()` from `useTranslation`.

This keeps the gateway stateless and reuses the battle-tested browser AI paths (`BrowserAiClient` → `/api/ai/generate-draft` and `/api/ai/item`).

## 4. Epic & Story Breakdown

### Epic: AI Chat Parity in Browser Mode

---

### Story 1: Share intent types and localize next steps

**Owner:** AI/chat track
**Files:** `apps/dev-server/src/studio/ai/chat/intent.ts`, `apps/dev-server/src/studio/ai/chat/policy.ts`

- Ensure `ParsedIntent` exported from `intent.ts` covers `draft_new` and `edit_existing` (it already does).
- Verify `extractSuggestedNextSteps` from `policy.ts` is safe to import in browser bundles (it is pure, no Node-only deps).
- Add tests in `intent.test.ts` for draft/edit intent cases.

**Acceptance criteria**

- `parseIntentFromMessage('Create a quiz about fractions')` returns `{ type: 'draft_new', kind: 'quiz' }`.
- `parseIntentFromMessage('Make this easier')` returns `{ type: 'edit_existing', intent: 'difficulty', params: { direction: 'easier' } }`.

---

### Story 2: Item draft new from chat in browser mode

**Owner:** AI/chat track
**Files:** `apps/dev-server/src/studio/ai/StudioChatProvider.tsx`

- Extend `HostedChatTransportOptions` with:
  ```ts
  generateItemAdd?: (kind: 'lesson' | 'quiz' | 'practice', description: string) => Promise<AiItemAddResult>;
  draftReadyMessage?: string;
  ```
- In `createHostedChatTransport.sendMessages`, when `intent.type === 'draft_new'` and `generateItemAdd` is provided:
  - Call `generateItemAdd(intent.kind, intent.description || '')`.
  - On success, emit a stream with `messageMetadata: { mode: 'draft', drafts: [result.item], suggestedNextSteps }`.
  - On failure, emit an error assistant message.
- Wire `generateItemAdd` in `ChatRuntime` to `api.generateItemAdd`.
- Pass `draftReadyMessage: t('studio.assistant.chat.draftReady', { kind: ... })`.

**Acceptance criteria**

- Typing "Create a quiz about photosynthesis" in browser-mode chat produces a draft quiz card.
- `StudioChatProvider.transport.test.tsx` has a test for this path.

---

### Story 3: Item edit from chat in browser mode

**Owner:** AI/chat track
**Files:** `apps/dev-server/src/studio/ai/StudioChatProvider.tsx`, `apps/dev-server/src/studio/ai/context.ts`

- Extend `HostedChatTransportOptions` with:
  ```ts
  generateItemEdit?: (
    kind: 'lesson' | 'quiz' | 'practice',
    intent: ItemIntent,
    currentContent: string,
    params?: ItemIntentParams,
  ) => Promise<AiItemEditResult>;
  getCurrentActivity?: () => StudioContextSnapshot['activity'] | undefined;
  ```
- In `sendMessages`, when `intent.type === 'edit_existing'`:
  - Read `getCurrentActivity()`.
  - If no activity is open, emit an explain-style message: "Open an activity first..." (localized).
  - Map `activity.kind` to `lesson`/`quiz`/`practice` (treat `other`/`reflection` as `lesson` or skip).
  - Call `generateItemEdit(kind, intent.intent || 'rewrite', activity.contentExcerpt || '', intent.params)`.
  - On success, emit metadata `{ mode: 'draft', drafts: result.items, suggestedNextSteps }`.
- Wire callbacks in `ChatRuntime`:
  ```ts
  generateItemEdit: api
    ? (kind, intent, currentContent, params) => api.generateItemEdit(kind, intent, currentContent, params)
    : undefined,
  getCurrentActivity: () => contextRef.current?.activity ?? undefined,
  ```

**Acceptance criteria**

- In browser mode, while editing a lesson, typing "Rewrite this to be simpler" produces a rewritten draft.
- A test verifies the edit path and the "no activity open" fallback.

---

### Story 4: Suggested next steps in browser-mode tool responses

**Owner:** AI/chat track
**Files:** `apps/dev-server/src/studio/ai/StudioChatProvider.tsx`, `apps/dev-server/src/studio/ai/chat/policy.ts`

- In `ChatRuntime`, pass a callback:
  ```ts
  getSuggestedNextSteps: (mode, hasCourseDraft) =>
    extractSuggestedNextSteps({
      mode,
      view: contextRef.current?.view ?? 'outline',
      hasCourseDraft,
      locale: contextRef.current?.locale || 'en',
    }),
  ```
- In the transport, for course-draft, draft, and edit responses, include `suggestedNextSteps` in the finish metadata.
- Ensure the chips render in `StudioAssistantMessage` (it already reads `metadata.suggestedNextSteps`).

**Acceptance criteria**

- After a browser-mode course draft, the assistant message shows chips like "Review checklist", "Accept draft", "Add notes".
- After a browser-mode item draft, chips like "Apply draft", "Make easier", "Add quiz" appear.

---

### Story 5: Error handling and edge cases

**Owner:** AI/chat track
**Files:** `apps/dev-server/src/studio/ai/StudioChatProvider.tsx`

- **No API provided:** If `generateDraft`/`generateItemAdd`/`generateItemEdit` callbacks are undefined, fall back to the generic chat endpoint (current behavior).
- **No active course:** `generateCourseDraft` will throw `no-active-course`. Catch it and emit a localized explain message.
- **No active activity for edit:** Emit a localized message instead of calling the API.
- **API failure:** Wrap errors in a user-friendly message and let `useChat` surface it (or emit a static error message).
- Add unit tests for each edge case.

**Acceptance criteria**

- "Create a course..." without an active course shows a helpful error, not a silent failure.
- "Rewrite this" without an open activity prompts the user to open an activity.

---

### Story 6: Integration tests for `StudioChatProvider` browser mode

**Owner:** Testing
**Files:** `apps/dev-server/src/studio/ai/StudioChatProvider.test.tsx`

- Mock `useChat` from `@ai-sdk/react` and provide a fake `StudioApi` with `generateCourseDraft`, `generateItemAdd`, and `generateItemEdit`.
- Render `StudioChatProvider` with `chatApiUrl='/api/ai/chat'` and `api={mockApi}`.
- Assert that sending a course-generation message calls `generateCourseDraft` and that the resulting message metadata contains `courseDraft`.
- Assert that sending "create a quiz" calls `generateItemAdd` and that the message metadata contains `drafts`.
- Assert that edit intents call `generateItemEdit` when an activity context is set.

**Acceptance criteria**

- `StudioChatProvider.test.tsx` covers browser-mode intent routing without relying on real network calls.

---

### Story 7: E2E test for chat-driven drafts in browser mode

**Owner:** Testing
**Files:** `tests/e2e/studio-ai.spec.ts`

- Extend the existing E2E spec or add a new test:
  1. Open the studio in browser mode.
  2. Click "Start with AI" / open the assistant.
  3. Type a course-generation prompt and submit.
  4. Assert that a course-draft card appears.
  5. Type "create a quiz about this topic" and submit.
  6. Assert that a draft quiz card appears.
- Mock the gateway responses (`/api/ai/generate-draft`, `/api/ai/item`) with deterministic fixtures.

**Acceptance criteria**

- E2E test passes in CI and documents the expected chat-driven draft flow.

---

### Story 8: Course-contextualized item generation (optional but recommended)

**Owner:** AI/chat track
**Files:** `apps/dev-server/src/gateway/itemGeneration.ts`, `apps/dev-server/src/studio/ai/itemGenerate.ts`

- The gateway `generateItem()` currently passes `packageDir: ''` to `generateItemAdd`/`generateItemEdit`, so existing activity titles are missing from the prompt.
- Options:
  1. **Client-side context:** Pass the current course outline in the `/api/ai/item` request body and use it inside `itemGeneration.ts`.
  2. **Browser API path:** For browser mode, skip the gateway item endpoint and call `api.generateItemAdd/Edit` directly (the browser already has the full course in IndexedDB).
- Recommended: Option 2 for browser mode. The transport can call `api.generateItemAdd/Edit` directly, which can read the active course and include context. The gateway `/api/ai/item` remains a generic stateless endpoint for other clients.

**Acceptance criteria**

- Item drafts generated from browser chat include existing activity titles in the prompt.
- A unit test verifies that `BrowserStudioApi.generateItemAdd` reads the active course context.

---

## 5. Implementation Sequence

| Order | Story                                      | Depends on | Estimated Effort |
| ----- | ------------------------------------------ | ---------- | ---------------- |
| 1     | Share intent types and localize next steps | —          | 1 day            |
| 2     | Item draft new from chat                   | 1          | 2 days           |
| 3     | Item edit from chat                        | 1          | 2 days           |
| 4     | Suggested next steps                       | 2, 3       | 1 day            |
| 5     | Error handling and edge cases              | 2, 3       | 1 day            |
| 6     | Integration tests for `StudioChatProvider` | 2, 3, 4    | 2 days           |
| 7     | E2E test for chat-driven drafts            | 2, 3, 6    | 2 days           |
| 8     | Course-contextualized item generation      | 2, 3       | 2 days           |

**Total estimated effort:** ~13 days (one engineer).

## 6. Key File Changes

### Modified

- `apps/dev-server/src/studio/ai/StudioChatProvider.tsx`
  - Extend `HostedChatTransportOptions`.
  - Implement `draft_new` and `edit_existing` routing in `createHostedChatTransport`.
  - Wire callbacks in `ChatRuntime`.
- `apps/dev-server/src/studio/ai/StudioChatProvider.test.tsx`
  - Add browser-mode intent routing tests.
- `apps/dev-server/src/studio/ai/StudioChatProvider.transport.test.tsx`
  - Add tests for draft/edit paths.
- `apps/dev-server/src/studio/ai/chat/intent.test.ts`
  - Add draft/edit intent cases.
- `tests/e2e/studio-ai.spec.ts`
  - Add chat-driven draft E2E tests.

### No changes required (reuse)

- `apps/dev-server/src/gateway/chat.ts` — explain path remains unchanged.
- `apps/dev-server/src/gateway/router.ts` — no routing changes.
- `apps/dev-server/src/studio/ai/chat/handler.ts` — non-browser path unchanged.
- `apps/dev-server/src/studio/ai/chat/intent.ts` — already shared.
- `apps/dev-server/src/studio/ai/chat/policy.ts` — `extractSuggestedNextSteps` already shared.

## 7. Testing Strategy

- **Unit tests:** Every new transport branch (course draft, item draft, item edit, no-activity fallback, no-api fallback).
- **Component tests:** `StudioChatProvider` browser-mode wiring with mocked `StudioApi` and mocked `useChat`.
- **E2E tests:** One happy-path test covering chat → course draft → item draft in browser mode.
- **Regression:** Run full `pnpm --filter @open-edu/dev-server test` and E2E suite before each story merge.

## 8. Risks & Mitigations

| Risk                                                                    | Impact | Mitigation                                                                                                          |
| ----------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| Transport callback signature becomes unwieldy                           | Medium | Group callbacks in a single `BrowserChatActions` object or keep them flat but well-typed.                           |
| `edit_existing` intent fires when user did not intend to edit           | Medium | Reuse the same regex thresholds as non-browser mode; keep parity tests aligned.                                     |
| Activity context becomes stale during async generation                  | Low    | `contextRef.current` is updated on every render; use the latest snapshot at call time.                              |
| `generateItemAdd/Edit` directly in browser bypasses gateway rate limits | Low    | The underlying `/api/ai/item` call still goes through gateway safeguards; only context gathering moves client-side. |
| Suggested next steps use English-only `studioChatMessage`               | Low    | Acceptable parity step; later migrate to `t()` when the helper supports React i18n namespaces.                      |

## 9. Acceptance Criteria for the Epic

- [ ] In browser mode, typing "Create a course from my notes..." in chat produces a course draft card.
- [ ] In browser mode, typing "Create a quiz about X" produces a draft quiz card.
- [ ] In browser mode, typing "Rewrite this to be simpler" while editing an activity produces a rewritten draft.
- [ ] Each tool response shows relevant suggested next-step chips.
- [ ] Missing course/activity context surfaces a helpful message instead of crashing or returning generic text.
- [ ] Non-browser mode behavior is unchanged.
- [ ] All new code has unit tests; browser-mode chat has an E2E test.
- [ ] `pnpm --filter @open-edu/dev-server test`, `typecheck`, and `lint` pass with no new errors.

## 10. Follow-up Work (Post-Parity)

- **Streaming:** Convert `/api/ai/chat` to SSE and update `createHostedChatTransport` to consume the stream.
- **Stop/cancel:** Wire `abortSignal` to cancel in-flight gateway requests.
- **Gateway tool support (optional):** If third-party clients need chat-driven tools, consider adding intent parsing to `gatewayChat` itself rather than only in the browser transport.
