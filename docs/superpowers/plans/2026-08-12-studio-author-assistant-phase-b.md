# Studio Author Assistant — Phase B Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move item-level AI authoring (add + edit) into the Author Assistant sidebar. Teachers get draft preview cards with Use/Discard; editor-embedded `AiEditPanel` and outline `AiAddDialog` are removed (or gated off) when the assistant flag is on.

**Architecture:** Extend Phase A chat with server tools wrapping `generateItemAdd` / `generateItemEdit`, plus a direct client path for structured intent chips. Centralize `applyDraft` / `applyDraftBatch` in Studio. Editors register content get/set via an editor bridge so “Use” can apply to buffer or write files.

**Tech stack:** Same as Phase A + existing `itemGenerate.ts`, `ItemDraftPreview`, `DraftItem` types

**Prerequisites:** Phase A merged (shell, providers, chat endpoint, context bridge).  
**Spec:** [`../specs/2026-08-12-studio-author-assistant-design.md`](../specs/2026-08-12-studio-author-assistant-design.md)  
**Index:** [`./2026-08-12-studio-author-assistant-index.md`](./2026-08-12-studio-author-assistant-index.md)  
**Prior AI item plan:** [`../specs/2026-08-10-studio-ai-item-add-edit-plan.md`](../specs/2026-08-10-studio-ai-item-add-edit-plan.md)

**Out of scope:** Course generation unification (Phase C), streaming (Phase D), reflection/raw AI, Developer mode, bundles.

---

## Architecture & constraints (mandatory)

1. **Draft-then-commit** for all item mutations (existing item endpoints already return drafts only).
2. Intent chips use **direct** `POST /api/studio/ai/item/edit` (fast, deterministic). Free text may use LLM tools.
3. Do not remove Phase A explain path; drafts are additive message metadata.
4. When assistant flag is on, do not show `AiEditPanel` or `AiAddDialog`.
5. Keep `EditorCoachingPanel` in the editor main column.
6. Confirm before applying a draft when the editor buffer is dirty.

---

## File structure

| File                                                                | Status           | Responsibility                                 |
| ------------------------------------------------------------------- | ---------------- | ---------------------------------------------- |
| `packages/i18n/locales/en/studio.json`                              | Modify           | Draft card, intent, apply/discard copy         |
| `apps/dev-server/src/studio/ai/chat/tools.ts`                       | Create           | `draftActivity`, `editActivity` tools          |
| `apps/dev-server/src/studio/ai/chat/metadata.ts`                    | Modify           | `mode: 'draft'`, `drafts?: DraftItem[]`        |
| `apps/dev-server/src/studio/ai/chat/policy.ts`                      | Modify           | Prefer tools for create/edit requests          |
| `apps/dev-server/src/studio/ai/chat/handler.ts`                     | Modify           | Register tools; attach draft metadata          |
| `apps/dev-server/src/studio/ai/chat/tools.test.ts`                  | Create           | Tool wrapper tests                             |
| `apps/dev-server/src/studio/ai/applyDraft.ts`                       | Create           | File write / buffer apply / batch              |
| `apps/dev-server/src/studio/ai/applyDraft.test.ts`                  | Create           | Apply path tests                               |
| `apps/dev-server/src/studio/ai/EditorBridgeContext.tsx`             | Create           | Register `getCurrentContent` / `applyToEditor` |
| `apps/dev-server/src/studio/ai/StudioAssistantProvider.tsx`         | Modify           | Presets, pending drafts, openWithPreset        |
| `apps/dev-server/src/studio/ai/StudioChatProvider.tsx`              | Modify           | `runIntent`, draft metadata handling           |
| `apps/dev-server/src/studio/ai/context.ts`                          | Modify           | `isDirty`, `selection`, validationIssues       |
| `apps/dev-server/src/studio/ai/suggestions.ts`                      | Modify           | Selection-aware edit chips                     |
| `apps/dev-server/src/studio/components/AssistantDraftCard.tsx`      | Create           | Preview + Use / Discard / Open                 |
| `apps/dev-server/src/studio/components/AssistantDraftCard.test.tsx` | Create           | Action callback tests                          |
| `apps/dev-server/src/studio/components/AssistantIntentRow.tsx`      | Create           | Port `INTENTS_BY_KIND`                         |
| `apps/dev-server/src/studio/components/AssistantIntentRow.test.tsx` | Create           | Kind-specific intents                          |
| `apps/dev-server/src/studio/components/StudioAssistantMessage.tsx`  | Modify           | Render draft cards from metadata               |
| `apps/dev-server/src/studio/components/StudioRightSidebar.tsx`      | Modify           | Intent row when editing                        |
| `apps/dev-server/src/studio/StudioApp.tsx`                          | Modify           | Wire `onApplyDraft` / batch                    |
| `apps/dev-server/src/studio/components/ActivityEditorRouter.tsx`    | Modify           | Register editor bridge                         |
| `apps/dev-server/src/studio/components/LessonActivityEditor.tsx`    | Modify           | Remove `AiEditPanel`; bridge hooks             |
| `apps/dev-server/src/studio/components/QuizActivityEditor.tsx`      | Modify           | Same                                           |
| `apps/dev-server/src/studio/components/PracticeActivityEditor.tsx`  | Modify           | Drop 3rd AI column                             |
| `apps/dev-server/src/studio/components/AddActivityMenu.tsx`         | Modify           | “Add with AI” → open assistant                 |
| `apps/dev-server/src/studio/components/OutlineView.tsx`             | Modify           | Empty-state CTA to assistant                   |
| `apps/dev-server/src/studio/components/AiAddDialog.tsx`             | Modify           | Gate behind legacy flag / unused               |
| `apps/dev-server/src/studio/components/AiEditPanel.tsx`             | Modify or delete | Unused when assistant on                       |

Optional stretch:

| File                            | Status | Responsibility                  |
| ------------------------------- | ------ | ------------------------------- |
| `AssistantSelectionToolbar.tsx` | Create | Selection → “Improve selection” |

---

### Task 1: Response metadata + tools

**Files:** `chat/metadata.ts`, `chat/tools.ts`, `chat/policy.ts`, `chat/handler.ts`, tests

- [ ] **Step 1: Extend metadata schema**

```typescript
interface StudioResponseMetadata {
  mode: 'explain' | 'draft';
  drafts?: DraftItem[];
  suggestedNextSteps?: string[]; // optional; Phase D expands
}
```

- [ ] **Step 2: Implement tools** wrapping `generateItemAdd` / `generateItemEdit`

- [ ] **Step 3: Update system prompt** — when user asks to create/edit content, call tools; never claim files were saved

- [ ] **Step 4: Handler** — tool results → `mode: 'draft'` + `drafts` on assistant message metadata

- [ ] **Step 5: Tests** with mocked LLM / itemGenerate

---

### Task 2: applyDraft orchestration

**Files:** `applyDraft.ts`, `applyDraft.test.ts`, `StudioApp.tsx`

- [ ] **Step 1: Define API**

```typescript
type ApplyMode = 'file' | 'buffer';

applyDraft(api, draft, {
  mode: ApplyMode;
  path?: string;           // for file writes
  applyToEditor?: (d: DraftItem) => void;
  openInEditor?: boolean;
}): Promise<{ path?: string }>

applyDraftBatch(api, drafts): Promise<string[]>  // reuse handleSaveDraftItems logic
```

- [ ] **Step 2: File path** — `writeFile` + `saveOutlineOrder` append; stamp paths like existing outline add

- [ ] **Step 3: Buffer path** — call editor bridge; do **not** auto-save (preserve today’s AiEditPanel behavior)

- [ ] **Step 4: Wire StudioApp callbacks** into sidebar props / provider

- [ ] **Step 5: Unit tests** for file, buffer, batch, error mid-batch

---

### Task 3: Editor bridge

**Files:** `EditorBridgeContext.tsx`, `ActivityEditorRouter.tsx`, activity editors

- [ ] **Step 1: Context** — `register({ getCurrentContent, applyToEditor, isDirty, kind, path })` / `unregister`

- [ ] **Step 2: Editors register on mount**; update when content/dirty changes

- [ ] **Step 3: Context bridge** reads selection + dirty into `StudioContextSnapshot`

- [ ] **Step 4: Cleanup on unmount** when leaving edit-activity

---

### Task 4: Draft cards in chat UI

**Files:** `AssistantDraftCard.tsx`, `StudioAssistantMessage.tsx`, provider

- [ ] **Step 1: Card UI** — wrap `ItemDraftPreview`; primary Use; secondary Discard; tertiary Open in editor (when file apply)

- [ ] **Step 2: Batch UI** — “N items generated”; preview first; expandable list for rest

- [ ] **Step 3: Dirty confirm** — Dialog before buffer overwrite when `isDirty`

- [ ] **Step 4: Success note** in thread after Use (“Applied to outline” / “Applied to editor — Save to keep”)

- [ ] **Step 5: Component tests** for Use/Discard callbacks

---

### Task 5: Intent chips row

**Files:** `AssistantIntentRow.tsx`, `StudioChatProvider.tsx`, `StudioRightSidebar.tsx`

- [ ] **Step 1: Port `INTENTS_BY_KIND`** from `AiEditPanel.tsx`

```typescript
lesson: (rewrite, expand, fix - quality, difficulty, translate);
quiz: (rewrite, fix - quality, difficulty, translate, add - questions);
practice: (improve - prompt, difficulty, translate);
```

- [ ] **Step 2: Show row only** when `view === 'edit-activity'` and kind is lesson/quiz/practice

- [ ] **Step 3: `runIntent`** — call `api.generateItemEdit` with `getCurrentContent()`; append user+assistant messages to thread with draft metadata (so history stays coherent)

- [ ] **Step 4: Translate** uses `useTranslation().locale`; difficulty exposes easier/harder

- [ ] **Step 5: Disable while running**; surface inline errors like AiEditPanel

- [ ] **Step 6: Tests** — intents rendered per kind

---

### Task 6: Outline “Add with AI” → sidebar

**Files:** `AddActivityMenu.tsx`, `OutlineView.tsx`, `StudioAssistantProvider.tsx`, `AiAddDialog.tsx`

- [ ] **Step 1: `openWithPreset({ kind, message })`** — open panel; optionally auto-send or prefill composer

- [ ] **Step 2: Change “Add with AI”** to call preset instead of opening modal (when assistant flag on)

- [ ] **Step 3: Empty outline CTA** — “Ask assistant to add your first lesson”

- [ ] **Step 4: Gate `AiAddDialog`** — only when assistant flag off (legacy) or remove call sites

---

### Task 7: Remove AiEditPanel from editors

**Files:** Lesson / Quiz / Practice editors

- [ ] **Step 1: Remove `AiEditPanel` imports and columns** when assistant enabled (prefer unconditional removal if flag always on in Creator after A)

- [ ] **Step 2: Adjust grids**

  - Lesson/quiz: content + coaching only (`lg:grid-cols-[1fr_20rem]` or equivalent)
  - Practice: drop AI third column; keep config + preview (+ optional widget guide)

- [ ] **Step 3: Snapshot / render tests** updated without AiEditPanel

- [ ] **Step 4: Delete or leave `AiEditPanel.tsx` unused** — prefer delete if no flag-off path remains

---

### Task 8: Suggestions + i18n polish

- [ ] **Step 1: Selection-aware chips** when `activity.selection` present (“Rewrite selection”, “Simplify selection”)

- [ ] **Step 2: Add i18n** for intents, draft card actions, dirty confirm, applied messages

- [ ] **Step 3: Optional selection toolbar** (stretch) — pattern from learner `TextSelectionToolbar`

---

### Task 9: Integration + PR checklist

- [ ] **Manual QA**

  1. Outline → Add with AI → draft card → Use → activity in outline
  2. Edit lesson → Rewrite intent → Use → buffer updates → Save
  3. Quiz → add-questions → batch Use → multiple nodes
  4. Free text “add a quiz about fractions” → draft tool → card

- [ ] **Confirm** AiEditPanel / AiAddDialog not shown with flag on

- [ ] **Run**

```bash
pnpm --filter @open-edu/dev-server test
pnpm lint
pnpm typecheck
```

- [ ] **Commit** `feat(dev-server): move studio item AI into author assistant (phase B)`

---

## Apply path matrix

| Context             | Use action                                                 |
| ------------------- | ---------------------------------------------------------- |
| Outline / add draft | `writeFile` + outline append → optional navigate to editor |
| Editor / edit draft | Update in-memory buffer → user Save                        |
| Batch add-questions | Existing `handleSaveDraftItems`                            |

---

## Acceptance criteria

- [ ] “Add lesson with AI” from outline produces sidebar draft card; Use adds to outline
- [ ] Rewrite intent applies to editor buffer; separate Save still required
- [ ] `add-questions` batch creates multiple nodes via Use
- [ ] `AiEditPanel` removed from lesson/quiz/practice editors (when assistant on)
- [ ] `AiAddDialog` not shown when assistant on
- [ ] Free-text create/edit produces draft cards
- [ ] Phase A explain messages still work
- [ ] Tests / lint / typecheck pass

---

## Risks

| Risk                           | Mitigation                                            |
| ------------------------------ | ----------------------------------------------------- |
| Editor callback wiring fragile | Explicit register/unregister on bridge; tests         |
| LLM picks wrong tool           | Direct API for intent chips; tools for free text only |
| Lost unsaved edits             | Dirty confirm dialog                                  |
| Dual AI UIs confuse teachers   | Feature flag defaults; remove legacy call sites       |

---

## Exit → Phase C

Phase C may start when item add/edit flows work end-to-end via the sidebar and legacy editor/outline AI surfaces are gated or removed.
