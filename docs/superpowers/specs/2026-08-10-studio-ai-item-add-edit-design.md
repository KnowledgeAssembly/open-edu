# Studio: AI-Assisted Add/Edit of Lesson, Quiz & Practice Items — Design Document

**Date:** 2026-08-10
**Status:** Draft for review (rev 2 — addresses review findings)
**Scope:** `apps/dev-server` (Course Creator Studio) + `packages/i18n`
**Feature:** Let a teacher draft new lesson/quiz/practice items with AI from the outline page, and improve existing items with an AI edit assistant, using a type-aware preview/diff and a pragmatic prompt-management strategy that prevents prompt/schema drift.

## 1. Summary

Today the Studio's only AI path is full-course generation: `AiStartPanel` → `POST /api/studio/ai/generate` → a single `course-spec.json` compiled into a whole package. There is no per-item AI: adding a lesson/quiz/practice writes a blank stub (`OutlineView.addActivity`/`addPractice`), and editing happens entirely by hand in `LessonActivityEditor` / `QuizActivityEditor` / `PracticeActivityEditor`.

We add AI assistance for individual items, in a **hybrid** shape:

1. **Discrete AI add** — an "AI draft" button beside the three existing Add buttons opens `AiAddDialog` (kind selector + description). The server generates a _validated draft_; on Accept the client writes the file and persists outline order using the existing save paths.
2. **Assistant edit** — a right-side `AiEditPanel` in the activity editors offers an intent menu (rewrite, expand, add questions, fix quality, difficulty, translate). Each intent is a one-shot generation shown in a **type-aware preview** (rendered markdown for lessons, highlighted question+options for quizzes, live widget preview for practice). Accept applies the proposed content into the editor form (or appends new quiz nodes via a callback owned by `StudioApp`), Reject discards.

Both paths are **draft-then-commit**: the AI never writes to the package. Generation is validated server-side against canonical Zod schemas (plus a stricter Studio guardrail for quizzes) with one retry before anything is presented to the teacher. Prompt text is authored as readable templates that inject the **live widget catalog** (same source as the `WidgetPicker`) and are guarded against drift by tests.

## 2. Decisions locked

| Decision                    | Choice                                                                                                                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interaction model           | Hybrid: discrete AI add buttons + assistant edit panel                                                                                                                                              |
| Edit assistant              | Intent menu of transforms (one-shot per intent)                                                                                                                                                     |
| Practice generation         | AI picks widget + config; validated against widget Zod schema; one retry on failure                                                                                                                 |
| Quiz model                  | One question per node (no schema change); "add questions" = batch of new quiz nodes                                                                                                                 |
| Editor placement            | Right-side `AiEditPanel` (`w-80`, collapses to stacked section below `lg`)                                                                                                                          |
| Preview style               | Type-aware: lesson → rendered markdown; quiz → rendered Q&A, options changed vs current highlighted; practice → live `WidgetPreviewPanel`                                                           |
| Persistence                 | Draft-then-commit — AI returns validated drafts; client writes via existing `writeFile` + `saveOutlineOrder`                                                                                        |
| **Wire format**             | Unified `DraftItem { kind, title, content }` — `content` is the exact file body `writeFile` persists verbatim (see §3.2)                                                                            |
| **add-questions ownership** | Accept bubbles `DraftItem[]` editor → router → `StudioApp.handleSaveDraftItems` (immediate client commit, then navigate to outline)                                                                 |
| **Intent params**           | `translate` requires `targetLocale`; `difficulty` requires `direction: 'easier' \| 'harder'`; other intents none (see §3.1)                                                                         |
| **Quiz guardrail**          | `validateItemDraft` enforces a stricter-than-schema rule: generated quizzes have exactly 4 options and exactly one `correct: true`; edit transforms preserve an existing quiz's option count (§5.2) |
| **Accept semantics**        | Always replaces the relevant form fields (no dirty-confirm; editors have no dirty tracking)                                                                                                         |
| Prompt management           | Readable templates + catalog injection + schema-as-guardrail + drift-guard tests (see §5)                                                                                                           |
| Streaming                   | None — single-shot `generateText` via existing `completeWithLlm`                                                                                                                                    |
| Quiz node model             | Unchanged `{type:'quiz', question, options:[{id,text,correct}]}`                                                                                                                                    |

## 3. Architecture

### 3.1 Server: routes

Two new routes in `apps/dev-server/vite.config.ts`, registered alongside the existing AI middleware block (~line 424), Node-side only.

**`POST /api/studio/ai/item/add`** — body `{ kind: 'lesson' | 'quiz' | 'practice', description: string }`

- Guards: `isAiAvailable()` → else `ai-unavailable`; active package → else `no-active-package`.
- Builds the prompt via `itemAddPrompts`. The server itself reads course context from `packageDir` (see §3.4) — the client body stays `{ kind, description }`.
- `completeWithLlm(prompt)` → `extractJsonObject` → validate per kind (see §3.2 / §5.2).
- On validation failure: **one retry** with the validation error appended to the prompt; if still failing → `item-retry-failed` with the underlying message.
- Response `{ ok: true, item: DraftItem }`. Never writes to `packageDir`.

**`POST /api/studio/ai/item/edit`** — body `{ kind, intent, currentContent: string, params?: IntentParams }`

- Intents per kind:
  - lesson: `rewrite | expand | fix-quality | difficulty | translate`
  - quiz: `rewrite | difficulty | fix-quality | translate | add-questions`
  - practice: `improve-prompt | difficulty | translate`
- `IntentParams` (discriminated by intent): `translate → { targetLocale: string }` (client sends the teacher's current UI locale from the i18n provider); `difficulty → { direction: 'easier' | 'harder' }`; other intents send no params. Unknown params for an intent → `400`.
- `add-questions` returns a batch of new quiz `DraftItem`s; all other intents return one revised `DraftItem` for the edited node.
- Same validation + one retry as add. Response `{ ok: true, items: DraftItem[] }`. Never writes.
- Edit transforms **preserve the existing option count** when rewriting a quiz already in the form; only `add`/`add-questions` enforce exactly 4 (see §5.2).

### 3.2 Wire format: `DraftItem`

Single discriminated-by-`kind` object returned for both endpoints:

```ts
type DraftItem =
  | { kind: 'lesson'; title: string; content: string } // content = .md body (must start with "# heading")
  | { kind: 'quiz'; title: string; content: string } // content = serialized {type:'quiz', question, options:[{id,text,correct}]}
  | { kind: 'practice'; title: string; content: string }; // content = serializeExerciseNode({type:'exercise', widget, title?, config})
```

`content` is always the exact file body that `writeFile` persists verbatim — there is no second derivation step on Accept, and it is what the editors already parse on load (`LessonActivityEditor` reads markdown; `QuizActivityEditor` `JSON.parse`s; `PracticeActivityEditor` `parseExerciseNode`s). The server produces `content` as follows:

- **lesson** — LLM returns `{ title, markdown }`; validate markdown contains a `#` heading (same rule as `validateFile`); `content = markdown`.
- **quiz** — LLM returns `{ question, options: [{ text, correct }] }`; server generates option ids and maps to `{ type:'quiz', question, options:[{id, text, correct}] }`; validate via `ContentNodeSchema` **and** the strict quiz guardrail (§5.2); `content = JSON.stringify(node, null, 2)`.
- **practice** — LLM returns `{ widget, title, config }`; server maps to `ExerciseNode` via `serializeExerciseNode({ type:'exercise', widget, title, config })`; validate via `ExerciseNodeSchema`/`parseExerciseNode` + `validateWidgetConfigForType` + widget membership in the live curated catalog; `content = serializeExerciseNode(node)`.

The lesson path uses a `{ title, markdown }` envelope _inside_ the LLM's JSON output so `extractJsonObject` works uniformly; the `DraftItem` shape then normalizes it to a plain content string.

### 3.3 Server: orchestrator

New `apps/dev-server/src/studio/ai/itemGenerate.ts`:

```ts
generateItemAdd(kind, description, context); // build prompt → LLM → parse → map → validate → retry
generateItemEdit(kind, intent, currentContent); // same pipeline, transform intents
```

Reuses `completeWithLlm`, `isAiAvailable`, `extractJsonObject` from the existing AI module. A shared `validateItemDraft(kind, draft)` helper holds the per-kind validation rules and the strict quiz guardrail (the schema-as-guardrail boundary).

### 3.4 Server: course context

The add/edit routes read context server-side from `packageDir`, reusing the same derivation as `GET /api/package/outline`: read `workflow.json` routing order, then `titleFromMarkdown`/`titleFromQuizJson` from `outlineModel.ts` for the existing item titles. The server injects these titles into the prompt so new items stay coherent, and into an edit request so transforms are aware of the surrounding course. No client or API changes beyond the body fields already specified.

### 3.5 Client: API

`apps/dev-server/src/studio/studioApi.ts` — add (mirroring the existing `aiRequest<T>()` helper):

```ts
generateItemAdd(kind, description)                    // POST /item/add   → { ok, item }
generateItemEdit(kind, intent, currentContent, params?) // POST /item/edit → { ok, items }
```

### 3.6 Client: add dialog

`apps/dev-server/src/studio/components/AiAddDialog.tsx` (new) — opened from a new `Sparkles` "AI draft" button in `OutlineView` beside the three existing Add buttons:

- Segmented kind selector (Lesson / Quiz / Practice); textarea for the teacher's description (min ~20 chars).
- Generate → loading → on success, type-aware preview + Accept/Cancel.
- **Accept** writes a new timestamped node via the existing `writeFile(item.path, item.content)` + `saveOutlineOrder(next)` + outline refresh — identical mechanics to `addActivity`/`addPractice`. Path = `nodes/{kind}-{stamp}.{md|json}`. Because add always creates a new node, there is no overwrite-confirmation concern.
- Practice drafts surface the chosen widget (from parsing the returned exercise content) so the teacher can open the editor afterward to tweak config.

### 3.7 Client: edit panel

`apps/dev-server/src/studio/components/AiEditPanel.tsx` (new) — composed by **each activity editor** as a right column (the editors own their layout so the panel can read local form state; `ActivityRouter` only threads `onApplyBatch`, see §3.8), taking `kind`, a current-content getter `getCurrentContent()`, `onApply(item)`, `onApplyBatch(items)`, `onError`:

- Disabled with the existing `studio.ai.unavailable` hint when AI is unavailable.
- Intent menu chips filtered by kind → click runs the edit request → loading → type-aware preview:
  - lesson → rendered markdown of `item.content` via `MarkdownRenderer`
  - quiz → rendered question + options; options whose text differs from the current quiz (compared by index) are highlighted (changed = accent border, brand-new = filled accent); a "question changed" badge when the question text differs; correct-answer marker shown on both versions
  - practice → `WidgetPreviewPanel` under `RuntimeThemeProvider` rendering the proposed config (parsed via `parseExerciseNode`); the editor's existing preview below the form continues to show the current, unapplied config — giving an implicit before/after
- **Accept (single)** → `onApply(item)`: the editor parses `item.content` back into its form state (same parse path used on load) and replaces the relevant fields — **always replace, no dirty-confirm**. Teacher then saves via the existing Save button and its validation.
- **Accept (add-questions)** → `onApplyBatch(items)`: bubbles `DraftItem[]` up through `ActivityEditorRouter` to `StudioApp` (see §3.8). Immediate client commit, then navigate to outline.
- **Reject** → clears the preview, stays in the editor.

### 3.8 add-questions ownership

The editors and router have no outline list or order API (`ActivityEditorRouter` props are `api, path, onSaved, onError, onCancel`). `StudioApp` owns the commit:

- `ActivityEditorRouter` gains `onApplyBatch?: (items: DraftItem[]) => void`, threaded through to the quiz editor (which composes its own `AiEditPanel`).
- `StudioApp.handleSaveDraftItems(items)` (new): for each item, `api.writeFile(nodes/quiz-{stamp}.json, item.content)`; then `api.getOutline()` to read the current order, append the new paths, and `api.saveOutlineOrder(combined)`; finally `handleNavigate('outline')` (OutlineView refreshes on mount, showing the new items).
- This preserves draft-then-commit: the server never writes; the client commits explicitly on Accept, reusing existing `writeFile` validation and `saveOutlineOrder`.

### 3.9 Data flow (add)

```
OutlineView "AI draft" → AiAddDialog {kind, description}
        ↓
studioApi.generateItemAdd → POST /api/studio/ai/item/add
        ↓
itemGenerate.ts: itemAddPrompts (catalog + server-read course context) → completeWithLlm → extractJsonObject
        ↓
map → DraftItem → validateItemDraft(kind)  → pass | retry once with error feedback | item-retry-failed
        ↓
{ ok, item } → AiAddDialog type-aware preview
        ↓
Accept → writeFile(nodes/{kind}-{stamp}.{md|json}) → saveOutlineOrder(next) → refresh outline
```

## 4. Error handling

| Case                      | Behavior                                                                       |
| ------------------------- | ------------------------------------------------------------------------------ |
| No API key                | Entry points disabled with `studio.ai.unavailable` hint                        |
| No active package         | `no-active-package` error (same as full-course flow)                           |
| Validation fails once     | Silent one-shot retry with error feedback injected into the prompt             |
| Validation fails twice    | `item-retry-failed` (final failure surfaces the underlying validation message) |
| Unknown intent / params   | `400`                                                                          |
| LLM output unparseable    | `extractJsonObject` throws → mapped to inline generic error                    |
| Network / endpoint errors | `StudioApiError` mapping via existing `aiRequest<T>()` helper                  |

Error-code additions to `AiGenerateErrorCode`: `ai-unavailable`, `item-retry-failed`. (`item-validation-failed` is intentionally **not** added — the retry path is the single surface for validation failures, surfaced as `item-retry-failed`.)

New i18n keys in `packages/i18n/locales/en/studio.json`: `studio.ai.item.addTitle`, `studio.ai.item.addDescription`, `studio.ai.item.kind.*`, `studio.ai.item.generate`, `studio.ai.item.retryFailed`, `studio.ai.item.intents.*`, `studio.ai.item.params.*` (difficulty direction, target locale label), `studio.ai.item.accept`, `studio.ai.item.reject`.

## 5. Prompt management — pragmatic path

Goal: eliminate the drift class of bug where prompt text duplicates canonical sources (the hardcoded widget list in `draftPrompt.ts:48` is already stale versus the catalog).

**Principles:** author prompts as readable templates; inject canonical data; validate outputs against canonical schemas; guard drift with tests.

### 5.1 New module `apps/dev-server/src/studio/ai/prompts/`

| File                 | Purpose                                                                                                                                                                                                                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `buildPrompt.ts`     | Shared builder: renders the **live widget catalog** (via `listCuratedWidgets()` — same source as `WidgetPicker`) into a compact table (`id \| name \| domain \| configFields` so the LLM can fill configs); formats course context (existing item titles). Widget IDs are never hardcoded anywhere in prompts. |
| `coursePrompt.ts`    | `buildCourseSpecPrompt` / `COURSE_SPEC_CONTRACT` moved verbatim from `draftPrompt.ts`, now using catalog injection instead of the hardcoded widget list.                                                                                                                                                       |
| `itemAddPrompts.ts`  | Per-kind add prompts; the LLM is told the exact JSON envelope per kind (`{title, markdown}` / `{question, options:[{text,correct}]}` / `{widget, title, config}`). Contracts deliberately loose — validation is the guardrail, not the prose.                                                                  |
| `itemEditPrompts.ts` | Per-intent transform prompts (single-transform contract; add-questions returns N quiz envelopes).                                                                                                                                                                                                              |
| `index.ts`           | Single export surface.                                                                                                                                                                                                                                                                                         |

### 5.2 Schema as guardrail (incl. strict quiz rule)

Every output is validated server-side before it is returned to the client (`validateItemDraft`):

- **lesson** — markdown contains a `#` heading.
- **quiz** — `ContentNodeSchema.safeParse` **plus** a stricter Studio/pedagogy guardrail: generated quizzes have exactly 4 options and exactly one `correct: true`. This is stricter than `QuizNodeSchema` (which allows `min(2).max(26)` options and any correct pattern, `packages/schemas/src/nodes.ts:13`; the blank quiz starts with 2 options). Edit transforms that rewrite an existing quiz **preserve the current option count** — only `add`/`add-questions` enforce 4 — so a 2- or 5-option quiz already in the form is never force-widened/narrowed.
- **practice** — `ExerciseNodeSchema.safeParse`/`parseExerciseNode` + `validateWidgetConfigForType` + `widget` membership in the live curated catalog.
- Write time re-validates via the existing `validateFile` (`ContentNodeSchema`/markdown heading) — so a draft that somehow slips past the guardrail still fails cleanly at commit.

This parallels the existing full-course path, where `generateCourseDraft` compiles + validates the generated `course-spec.json` with `@open-edu/course-compiler` before copying it into the package.

### 5.3 Drift-guard tests (`prompts/__tests__`)

- **Catalog guard** — a test builds every prompt and asserts the catalog section derives from `listCuratedWidgets()`; a source scan asserts no prompt file contains a hardcoded widget-ID literal.
- **Contract guard** — `COURSE_SPEC_CONTRACT` is prose with placeholders and is **not** parsed. Instead the suite keeps a maintained fixture `fixtures/course-spec.sample.json` representing the contract's intended output and asserts it parses via the compiler's `CourseModelSchema`; a companion test asserts the prompt text names the required top-level keys (`format`, `version`, `generatedAt`, `metadata`, `lessons`).
- **Validation** — per-kind tests assert `validateItemDraft` accepts canonical drafts and rejects malformed ones (missing heading, <4 or >4 options for generated quizzes, no correct answer, widget not in catalog, config failing the widget schema); edit rewrite preserves the source option count.

### 5.4 Alternatives considered (rejected)

- **Auto-generate the whole contract from Zod schemas** — eliminates drift but produces unreadable prompts and cannot express pedagogical rules ("measurable objectives", "exactly 4 options"). Rejected.
- **Status quo (fully hand-written)** — simple but demonstrably drifts. Rejected.

## 6. Files touched

| File                                                                                                       | Change                                                                               |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `apps/dev-server/src/studio/ai/prompts/{buildPrompt,coursePrompt,itemAddPrompts,itemEditPrompts,index}.ts` | new                                                                                  |
| `apps/dev-server/src/studio/ai/draftPrompt.ts`                                                             | move/refactor → `prompts/coursePrompt.ts`                                            |
| `apps/dev-server/src/studio/ai/itemGenerate.ts`                                                            | new: build → LLM → parse → map → validate → retry orchestrator                       |
| `apps/dev-server/src/studio/ai/types.ts`                                                                   | `DraftItem`, `IntentParams`, extend `AiGenerateErrorCode`                            |
| `apps/dev-server/vite.config.ts`                                                                           | add `/item/add` + `/item/edit` routes                                                |
| `apps/dev-server/src/studio/studioApi.ts`                                                                  | add `generateItemAdd`, `generateItemEdit`                                            |
| `apps/dev-server/src/studio/components/AiAddDialog.tsx`                                                    | new                                                                                  |
| `apps/dev-server/src/studio/components/AiEditPanel.tsx`                                                    | new                                                                                  |
| `apps/dev-server/src/studio/components/OutlineView.tsx`                                                    | AI draft button + dialog wiring                                                      |
| `apps/dev-server/src/studio/components/ActivityEditorRouter.tsx`                                           | thread `onApplyBatch` through to the editors (panel layout lives inside each editor) |
| `apps/dev-server/src/studio/components/{Lesson,Quiz,Practice}ActivityEditor.tsx`                           | wire `onApply`/`onApplyBatch` into form state                                        |
| `apps/dev-server/src/studio/StudioApp.tsx`                                                                 | `handleSaveDraftItems`; pass `onApplyBatch` to router                                |
| `packages/i18n/locales/en/studio.json`                                                                     | new AI item keys                                                                     |

## 7. Testing

- **`prompts` unit tests** — catalog injection (no hardcoded IDs), contract fixture vs `CourseModelSchema` + required-key presence, per-kind prompt smoke.
- **`itemGenerate.test.ts`** — per-kind validation pass/fail (incl. strict 4-option quiz rule and preserve-option-count on rewrite); retry-once semantics (fails on second); unparseable output; unknown intent/params → 400; never writes to `packageDir`.
- **`studioApi.test.ts`** — `generateItemAdd`/`generateItemEdit` request shape (incl. params).
- **`AiAddDialog.test.tsx`** — kind selector renders; generate flow; accept calls `writeFile` + `saveOutlineOrder`; error surfaces inline.
- **`AiEditPanel.test.tsx`** — intents filtered by kind; type-aware preview per kind (incl. quiz highlight by index comparison); accept invokes `onApply`; reject clears.
- **`StudioApp.test.tsx`** — `handleSaveDraftItems` writes files, re-reads order, saves combined order, navigates to outline.
- **`OutlineView.test.tsx`** — AI draft button opens dialog; accept refreshes the outline.
- **`generateCourse.test.ts`** — refactor imports if `coursePrompt.ts` moves `draftPrompt.ts`.
- a11y — `AiAddDialog` / `AiEditPanel` pass axe-core (per AGENTS.md rule 4).

## 8. Non-goals

- No multi-turn chat / streaming in the assistant panel (one-shot intents only).
- No AI writing directly to the package (draft-then-commit only; `StudioApp` commits on explicit Accept).
- No change to the quiz node model (one question per node).
- No nested lesson+activities model in Creator mode (flat outline stays).
- No prompt auto-generation from Zod schemas.
- No support for editing reward cards / flow graph via AI in this pass.
- No dirty-form confirm on Accept (always replace, per locked decision).
