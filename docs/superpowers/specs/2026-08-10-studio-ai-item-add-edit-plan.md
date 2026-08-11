---
type: Implementation Plan
title: Studio — AI-Assisted Add/Edit of Lesson, Quiz & Practice Items
description: Add per-item AI to the Studio: an "AI draft" dialog on the outline page (draft-then-commit) and an intent-menu AI edit panel in the activity editors, backed by a prompt-management module that injects the live widget catalog and is guarded against drift by tests.
tags: [dev-server, studio, creator-mode, outline, ai, prompts, plan]
---

# Studio — AI-Assisted Add/Edit of Lesson, Quiz & Practice Items

**Date:** 2026-08-10
**Scope:** `apps/dev-server` (Studio outline page, activity editors, AI module, vite routes, API) + `packages/i18n`
**Design:** `docs/superpowers/specs/2026-08-10-studio-ai-item-add-edit-design.md`
**Stories:** 5 work items, each ship-ready with Vitest coverage (per AGENTS.md rule 1).

---

## 1. Summary

The Studio's only AI path is full-course generation (`AiStartPanel` → `/api/studio/ai/generate`). We add **per-item AI**:

1. **AI add** — an "AI draft" button beside the three Add buttons opens `AiAddDialog` (kind selector + description). `POST /api/studio/ai/item/add` returns a validated `DraftItem`; Accept writes a new node via the existing `writeFile` + `saveOutlineOrder` (draft-then-commit).
2. **AI edit** — `AiEditPanel` (right column) in the activity editors offers per-kind intents (rewrite/expand/fix-quality/difficulty/translate/add-questions). `POST /api/studio/ai/item/edit` returns `DraftItem[]`; Accept fills the form (or, for `add-questions`, appends new quiz nodes via `StudioApp.handleSaveDraftItems`).

Prompts move into `apps/dev-server/src/studio/ai/prompts/`: readable templates that **inject the live widget catalog** (same source as `WidgetPicker`) instead of hardcoding IDs, with output validated against canonical Zod schemas + one retry, plus drift-guard tests.

---

## 2. Current-state findings

| #   | Area        | Current behavior                                                                                                                                                                                                  | Location                                                                                                      |
| --- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Prompts     | `COURSE_SPEC_CONTRACT` hardcodes widget IDs (`"core.multiple-choice", "core.matching", "math.fraction-visual", …`) that can drift from the catalog; `extractJsonObject` co-located                                | `apps/dev-server/src/studio/ai/draftPrompt.ts:1-50, 63-75`                                                    |
| 2   | LLM         | `completeWithLlm` (single-shot `generateText`, fast tier) + `isAiAvailable` guard                                                                                                                                 | `apps/dev-server/src/studio/ai/studioLlm.ts:4-19`                                                             |
| 3   | AI route    | `POST /api/studio/ai/generate` only; `aiGenerating` suppresses watcher reloads; keys never exposed                                                                                                                | `apps/dev-server/vite.config.ts:424-522`                                                                      |
| 4   | Client API  | `getAiStatus`, `generateFromNotes`, `uploadSpec`; `aiRequest<T>()` maps endpoint errors to `StudioApiError.code`                                                                                                  | `apps/dev-server/src/studio/studioApi.ts:28-48, 105-115`                                                      |
| 5   | Outline add | Add lesson/quiz writes a blank stub; add practice opens `WidgetPicker`; both timestamped paths + `persistOrder`                                                                                                   | `apps/dev-server/src/studio/components/OutlineView.tsx:111-151`                                               |
| 6   | Editors     | `LessonActivityEditor` (title+markdown textarea, heading sync), `QuizActivityEditor` (single MCQ, `options` from parsed file), `PracticeActivityEditor` (SchemaForm + `WidgetPreviewPanel` in a `lg:grid-cols-2`) | `components/LessonActivityEditor.tsx`, `QuizActivityEditor.tsx`, `PracticeActivityEditor.tsx`                 |
| 7   | Router      | `ActivityEditorRouter` props `{api, path, onSaved, onError, onCancel}`; no outline list/order access                                                                                                              | `apps/dev-server/src/studio/components/ActivityEditorRouter.tsx:10-22`                                        |
| 8   | StudioApp   | Renders router with `onSaved={() => {}}`; owns `handleNavigate`                                                                                                                                                   | `apps/dev-server/src/studio/StudioApp.tsx:139-148`                                                            |
| 9   | Widgets     | `listCuratedWidgets()` (non-deprecated + guide), `getCuratedWidget(id)`; `CuratedWidget.guide.configFields`; `validateWidgetConfigForType` exists in the editor                                                   | `apps/dev-server/src/studio/widgets/curatedCatalog.ts:59-69`, `apps/dev-server/src/editor/WidgetValidator.ts` |
| 10  | Node model  | `ExerciseNode {type:'exercise', title?, widget, config}`; `parseExerciseNode`/`serializeExerciseNode`; `QuizNodeSchema` is `options min(2).max(26)`, no exactly-one-correct rule                                  | `apps/dev-server/src/studio/widgets/exerciseNode.ts`, `packages/schemas/src/nodes.ts:13`                      |
| 11  | i18n        | `useTranslation()` returns `{locale, t, …}`; AI strings under `ai.*` in `packages/i18n/locales/en/studio.json`; `lint:hardcoded-strings` enforces `t()`                                                           | `packages/i18n/src/context.tsx:15-21`, `packages/i18n/locales/en/studio.json`                                 |

Key mechanics that shape the plan:

- **Draft-then-commit:** the AI endpoints never write to `packageDir`, so they need **no** `aiGenerating` watcher suppression and no deferred full-reload (unlike `/generate`). The client's Accept reuses the existing `writeFile(path, content)` (with server-side `validateFile`) + `saveOutlineOrder` + outline refresh.
- **Uniform wire format:** both endpoints return `DraftItem {kind, title, content}` where `content` is the exact file body; the editors already parse that shape on load, so Accept is just the load-parse path applied to new content.
- **Strict quiz guardrail:** schema allows 2–26 options and any `correct` pattern; `validateItemDraft` enforces exactly 4 options + exactly one `correct:true` for _generated_ quizzes, and edit transforms preserve the source option count.
- **Catalog as the only widget source:** prompts render the widget table from `listCuratedWidgets()` at build time; a scan test forbids hardcoded widget-ID literals in prompt source.
- **`extractJsonObject` returns JSON only**, so lesson prompts use a `{title, markdown}` envelope that the server maps to `DraftItem.content = markdown`.
- **`useTranslation().locale`** gives the translate intent its `targetLocale` with no extra plumbing.

---

## 3. Implementation plan

### Work Item 1 — Prompt module + drift guards

**Goal:** Move prompt authoring into `apps/dev-server/src/studio/ai/prompts/` with live-catalog injection; keep `/generate` behavior identical. No behavior change to the full-course flow.

**Changes:**

- **`apps/dev-server/src/studio/ai/prompts/buildPrompt.ts`** (new)
  - `renderWidgetCatalogSection(): string` — builds a compact table from `listCuratedWidgets()`: one line per widget `id | name | domain | configFields` where `configFields` is `field.name:field.type` joined by `, ` (from `CuratedWidget.guide.configFields`, `curatedCatalog.ts:16`). Called by the practice prompts so the LLM can both pick a canonical widget and fill its config.
  - `renderCourseContext(titles: string[]): string` — renders "Existing items: 1. … 2. …" (empty → "").
  - No widget-ID literals in this file (it only reads the catalog).
- **`apps/dev-server/src/studio/ai/prompts/coursePrompt.ts`** (new) — move `COURSE_SPEC_CONTRACT` + `buildCourseSpecPrompt` from `draftPrompt.ts`, with two changes: (1) the RULES bullet listing widget ids is **deleted** and replaced by injecting `renderWidgetCatalogSection()` into the prompt when the contract mentions widgets; (2) the sample JSON's `"widgetId": "core.multiple-choice"` is replaced with the placeholder `"<canonical-widget-id>"`. This keeps **zero** literal widget IDs in prompt source (required for the scan test, and it is the stronger drift posture anyway). Keep the pedagogical rules (measurable objectives, one quiz per lesson, exactly-4 options) as prose.
- **`apps/dev-server/src/studio/ai/prompts/extract.ts`** (new) — move `extractJsonObject` verbatim from `draftPrompt.ts:63-75`.
- **`apps/dev-server/src/studio/ai/prompts/itemAddPrompts.ts`** (new)
  - `buildLessonAddPrompt(description, context)` — envelope `{ title, markdown }`; rule: markdown must start with a `# heading`.
  - `buildQuizAddPrompt(description, context)` — envelope `{ question, options: [{text, correct}] }`; rule: exactly 4 options, exactly one `correct:true`.
  - `buildPracticeAddPrompt(description, context)` — includes `renderWidgetCatalogSection()`; envelope `{ widget, title, config }`; rule: `widget` must be one of the listed ids and `config` must fill that widget's config fields.
  - Each prompt states "Output ONLY a single JSON object" (reuse the `COURSE_SPEC_CONTRACT` preamble style).
- **`apps/dev-server/src/studio/ai/prompts/itemEditPrompts.ts`** (new)
  - `buildQuizEditPrompt(intent, currentContent, sourceOptionCount, context, params?)` — rewrite/difficulty/fix-quality/translate preserve `sourceOptionCount` options; `add-questions` returns `{ questions: [{question, options:[{text,correct}]}] }` (3 new quizzes, each exactly 4 options).
  - `buildLessonEditPrompt(intent, currentContent, context, params?)` — rewrite/expand/fix-quality/difficulty/translate return `{ title, markdown }`.
  - `buildPracticeEditPrompt(intent, currentContent, context, params?)` — returns `{ widget, title, config }`; includes the catalog section.
  - Params injection: `translate` → `"Target language: <targetLocale>"`; `difficulty` → `"Make it easier/harder for a <difficulty> learner"` using `params.direction`.
- **`apps/dev-server/src/studio/ai/prompts/index.ts`** (new) — re-export all prompt builders + `renderWidgetCatalogSection`.
- **`apps/dev-server/src/studio/ai/draftPrompt.ts`** — delete.
- **`apps/dev-server/src/studio/ai/generateCourse.ts`** — update imports: `buildCourseSpecPrompt` from `./prompts/coursePrompt.js` (or `./prompts/index.js`); `extractJsonObject` from `./prompts/extract.js` (both files live in `ai/prompts/`, so the paths are relative `./prompts/…`). No logic change.

**Tests:**

- `apps/dev-server/src/studio/ai/prompts/__tests__/catalog-guard.test.ts`:
  - `renderWidgetCatalogSection()` output contains every `listCuratedWidgets()` id, and the full-course `buildCourseSpecPrompt` output contains at least one catalog id (injection working).
  - **Source scan:** read `coursePrompt.ts`, `itemAddPrompts.ts`, `itemEditPrompts.ts` (exclude `buildPrompt.ts` and fixtures) and assert no string matches the widget-ID regexp `/\b(?:core|math|open-edu)\.[a-z0-9-]+/i`.
- `apps/dev-server/src/studio/ai/prompts/__tests__/contract-guard.test.ts`:
  - Fixture `fixtures/course-spec.sample.json` (a valid 2-lesson course mirroring the contract) parses via `CourseModelSchema` from `@open-edu/course-compiler`.
  - End-to-end: `compile(specPath, { output, validate: true })` on the fixture succeeds (exercises the real compiler).
  - `COURSE_SPEC_CONTRACT` text mentions required top-level keys `"format"`, `"version"`, `"generatedAt"`, `"metadata"`, `"lessons"`.
- `apps/dev-server/src/studio/ai/prompts/__tests__/prompts.test.ts`:
  - Each add/edit builder returns a non-empty string containing the description/current-content and (for practice) a catalog section.
  - Quiz edit prompt includes the source option count; difficulty prompt contains "easier"/"harder"; translate prompt contains the target locale.
- Move the old `draftPrompt.test.ts` assertions into `coursePrompt.test.ts` and **update** any that asserted specific hardcoded widget IDs (they now assert catalog-derived ids).

**Note (deviation from design doc §5.1):** the design lists 5 prompt files; `extract.ts` is added as the shared home of `extractJsonObject` (it is used by WI 2's orchestrator too). `buildPrompt.ts` renders the catalog; the scan test treats it (and fixtures) as exempt.

---

### Work Item 2 — Server: types + `itemGenerate` orchestrator + validation

**Goal:** `generateItemAdd` / `generateItemEdit` produce validated `DraftItem[]` (one retry on validation failure). Never writes to disk.

**Changes:**

- **`apps/dev-server/src/studio/ai/types.ts`**
  - Add:

    ```ts
    export type DraftItem =
      | { kind: 'lesson'; title: string; content: string }
      | { kind: 'quiz'; title: string; content: string }
      | { kind: 'practice'; title: string; content: string };

    export type ItemIntent =
      | 'rewrite'
      | 'expand'
      | 'fix-quality'
      | 'difficulty'
      | 'translate'
      | 'add-questions'
      | 'improve-prompt';

    export type ItemIntentParams =
      | { targetLocale: string } // translate
      | { direction: 'easier' | 'harder' }; // difficulty

    export type AiItemAddResult =
      | { ok: true; item: DraftItem }
      | { ok: false; code: 'item-retry-failed'; error: string };

    export type AiItemEditResult =
      | { ok: true; items: DraftItem[] }
      | { ok: false; code: 'item-retry-failed'; error: string };
    ```

  - Extend `AiGenerateErrorCode` with `'item-retry-failed'`; extend `AiEndpointErrorCode` with `'ai-unavailable'` and `'invalid-request'`.

- **`apps/dev-server/src/studio/ai/itemGenerate.ts`** (new)
  - `readCourseContext(packageDir): Promise<string[]>` — read `workflow.json` (via `fs`), derive ordered paths from `routing`, and for each path read the node file and derive a title with the existing `titleFromMarkdown` / `titleFromQuizJson` from `../outlineModel.js` (fall back to the basename). Same derivation as `GET /api/package/outline`.
  - `validateItemDraft(item: DraftItem, opts: { expectedOptionCount: number }): string | null` — per kind:
    - lesson → `/^#{1,6}\s/m.test(content)` else `"Lesson markdown must contain a # heading"`.
    - quiz → `JSON.parse(content)`, `ContentNodeSchema.safeParse` (from `@open-edu/schemas`) **and** strict guardrails: `options.length === opts.expectedOptionCount` and exactly one `correct:true` → else the specific message. `add`/`add-questions` pass `expectedOptionCount: 4`; rewrite-family intents pass the **parsed source option count** so a 2- or 5-option quiz being rewritten validates against its own shape (never "validate-forever-fail" against a fixed 4).
    - practice → `parseExerciseNode(content)` non-null; `widget` resolves via `getCuratedWidget`; `validateWidgetConfigForType(widget, config)` returns `[]`; `ExerciseNodeSchema.safeParse` passes.
  - `mapToDraftItem(kind, parsed): DraftItem` — lesson `{title: parsed.title, content: parsed.markdown}`; quiz: map `options:[{text,correct}]` → `{type:'quiz', question, options:[{id, text, correct}]}` minting `id = String.fromCharCode(97 + i)` for **any N options** (a, b, c, …, not just a–d) and `content = JSON.stringify(node, null, 2)`; practice: `content = serializeExerciseNode({type:'exercise', title?, widget, config})`.
  - `generateItemAdd({kind, description, packageDir})` — guard `isAiAvailable()`; `context = await readCourseContext(packageDir)`; pick prompt builder; loop (max 2 attempts): `completeWithLlm(prompt)` → `extractJsonObject` → `mapToDraftItem` → `validateItemDraft(item, { expectedOptionCount: kind === 'quiz' ? 4 : 1 })`; pass → `{ok:true, item}`; fail → append the validation error to the prompt and retry; second fail → `{ok:false, code:'item-retry-failed', error}`. Wrap `completeWithLlm`/parse throws → `{ok:false, code:'item-retry-failed', error}`. (Non-quiz kinds ignore the count; pass `1` as a placeholder.)
  - `generateItemEdit({kind, intent, currentContent, params, packageDir})` — validate `intent` against the per-kind allowlist (lesson `rewrite|expand|fix-quality|difficulty|translate`; quiz adds `add-questions`; practice `improve-prompt|difficulty|translate`); for quiz rewrite-family, parse `currentContent` to count source options, pass `sourceOptionCount` to the prompt **and `expectedOptionCount: sourceOptionCount` to `validateItemDraft`** (rewrite never forces a fixed 4); same retry loop; `add-questions` maps the parsed `{questions:[…]}` to an array of quiz `DraftItem`s (validate each with `expectedOptionCount: 4`; any failure → one retry of the whole batch).

**Tests (`apps/dev-server/src/studio/ai/itemGenerate.test.ts`, new):**

- `mapToDraftItem`/`validateItemDraft`: lesson w/o heading rejected; quiz with 3 options rejected when `expectedOptionCount:4`, 4 options + one correct accepted, 4 options + zero correct rejected, 4 options + two correct rejected; a 2-option quiz **accepted when `expectedOptionCount:2`** (rewrite-preserve path) and its `mapToDraftItem` mints ids `a,b`; a 5-option quiz accepted with `expectedOptionCount:5` minting ids `a..e`; practice with unknown widget rejected, valid widget + valid config accepted, valid widget + invalid config rejected.
- `generateItemAdd`: success returns the validated item; validation fails once then succeeds on retry (mock `completeWithLlm` to return bad-then-good); fails twice → `item-retry-failed`; unparseable LLM output → `item-retry-failed`; never touches `packageDir` (assert no fs writes).
- `generateItemEdit`: quiz rewrite prompt preserves source option count (assert via injected fake prompt builder or spy); `add-questions` returns 3 quiz items; unknown intent for kind throws (route turns into 400); translate params injected.
- Mock `completeWithLlm`; do not call the network.

---

### Work Item 3 — Server routes `/item/add` + `/item/edit`

**Goal:** The two endpoints wired into the existing Studio AI middleware block.

**Changes:**

- **`apps/dev-server/src/studio/ai/itemGenerate.ts`** — add exported request validators so the middleware stays thin and the logic is unit-testable (P3-1):
  - `assertItemAddBody(body): { kind, description }` — throws `{code:'invalid-request', reason}` unless `kind ∈ {lesson,quiz,practice}` and `description` is a non-empty string.
  - `assertItemEditBody(body): { kind, intent, currentContent, params? }` — throws `{code:'invalid-request', reason}` unless `intent` is in the kind allowlist, `currentContent` is a non-empty string, and `params` matches the intent (`translate` → string `targetLocale`; `difficulty` → `direction ∈ {'easier','harder'}`; absent for other intents).
- **`apps/dev-server/vite.config.ts`, inside the block at 424-522, before the `404` fallback at 515:**

- **`POST /api/studio/ai/item/add`** — body `{ kind, description }`:
  - Guards: `!packageDir` → `400 {code:'no-active-package'}`; `!isAiAvailable()` → `400 {code:'ai-unavailable'}`; then `assertItemAddBody(body)` → throw → `400 {code:'invalid-request'}`.
  - `const result = await generateItemAdd({kind, description, packageDir})`; `res.end(JSON.stringify(result))`.
  - No `aiGenerating`, no reload, no full-reload (nothing was written).
- **`POST /api/studio/ai/item/edit`** — body `{ kind, intent, currentContent, params? }`:
  - Same guards, then `assertItemEditBody(body)` → throw → `400 {code:'invalid-request'}`.
  - `const result = await generateItemEdit({kind, intent, currentContent, params, packageDir})`; `res.end(JSON.stringify(result))`.
- No changes to the existing `/generate` route, `aiGenerating`, or the reload logic.

**Tests (`apps/dev-server/src/studio/ai/itemGenerate.test.ts`):** `assertItemAddBody` accepts valid bodies and throws on unknown kind / empty description; `assertItemEditBody` accepts each intent's valid params, throws on unknown intent for kind, missing `currentContent`, and wrong/absent params per intent.

**Verification (no unit harness for the middleware — manual):** start Studio on an empty dir via `pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js dev ./tmp-empty`, then curl:

- `POST /api/studio/ai/item/add` `{"kind":"lesson","description":"Explain fractions"}` without an LLM key → `400 ai-unavailable`; with a key → `200 {ok:true, item:{kind:'lesson',…}}` and no files created under the package.
- `POST /api/studio/ai/item/edit` `{"kind":"quiz","intent":"add-questions","currentContent":"…"}` → `200 {ok:true, items:[3 × quiz DraftItem]}`.
- `{"kind":"lesson","intent":"difficulty"}` (no params) → `400 invalid-request`.

---

### Work Item 4 — Client: API + add dialog + outline button + shared preview

**Goal:** The outline page gains an AI-add flow that ends in the existing write + persist order path.

**Changes:**

- **`apps/dev-server/src/studio/studioApi.ts`**
  - Add (reuse `aiRequest<T>()`):
    ```ts
    generateItemAdd: (kind, description) =>
      aiRequest<AiItemAddResult>('/item/add', { method:'POST', body: JSON.stringify({ kind, description }) }),
    generateItemEdit: (kind, intent, currentContent, params?) =>
      aiRequest<AiItemEditResult>('/item/edit', { method:'POST', body: JSON.stringify({ kind, intent, currentContent, params }) }),
    ```
  - Import `AiItemAddResult` / `AiItemEditResult` / `ItemIntent` / `ItemIntentParams` from `./ai/types.js`.
- **`apps/dev-server/src/studio/components/ItemDraftPreview.tsx`** (new) — shared type-aware preview used by the add dialog and edit panel:
  - Props `{ item: DraftItem; currentContent?: string }`.
  - lesson → `MarkdownRenderer` from `@open-edu/runtime` (already used in the Studio).
  - quiz → render question + options; when `currentContent` is provided, parse both and highlight options whose text differs **by index** (changed → accent border, brand-new index → filled accent), a "question changed" badge when the question differs, and the correct marker on both.
  - practice → `RuntimeThemeProvider` + `WidgetPreviewPanel` with `parseExerciseNode(item.content)`; fall back to a `pre` JSON block if the node doesn't parse. Pass the full prop set `WidgetPreviewPanel` needs so the preview never stalls on missing props: `widgetType={node.widget}` `widgetConfig={node.config}` `validationErrors={validateWidgetConfigForType(node.widget, node.config)}` (imported from `../../editor/WidgetValidator.js` — same validator `PracticeActivityEditor` uses), inside `RuntimeThemeProvider`.
- **`apps/dev-server/src/studio/components/AiAddDialog.tsx`** (new)
  - Props `{ api, open, onOpenChange, onAccept(item: DraftItem), onError }`.
  - State: `kind` (`'lesson'|'quiz'|'practice'`), `description`, `generating`, `draft: DraftItem | null`, `error`.
  - Kind selector via the design-system `Tabs` (`packages/design-system` exports `Tabs`/`TabsList`/`TabsTrigger`, per the spec-upload plan) or segmented buttons; description textarea; Generate button disabled until description ≥ 20 chars.
  - Generate → `api.generateItemAdd(kind, description)` → `draft = result.item`; on `ok:false` → inline error (`item-retry-failed` → `ai.item.retryFailed`, else generic).
  - Preview via `ItemDraftPreview`; footer: Reject (closes) + **"Add to course"** → `onAccept(draft)` then close.
  - AI-unavailable state: `getAiStatus()` on open; if unavailable, show the `studio.ai.unavailable` hint and disable Generate.
- **`apps/dev-server/src/studio/components/OutlineView.tsx`**
  - Add a `Sparkles`-iconed **"AI draft"** button next to the existing three (`OutlineView.tsx:177-190`) → `setAiDialogOpen(true)`.
  - `onAccept(item)`: same mechanics as `addActivity`/`addPractice` (`OutlineView.tsx:111-151`): `path = nodes/{lesson|quiz|practice}-{Date.now()}.{md|json}`; `api.writeFile(path, item.content)`; append `{id:path, path, title:item.title, kind:item.kind}`; `persistOrder(next)`.
- **`packages/i18n/locales/en/studio.json`** — add keys under `ai.item.*`: `addTitle` ("AI draft"), `addDescription`, `kind.lesson/quiz/practice`, `description`, `descriptionShort`, `generate`, `generating`, `retryFailed`, `accept`, `reject`, `error`. (Edit-intent keys are added in WI 5.)

**Tests:**

- `apps/dev-server/src/studio/studioApi.test.ts` — `generateItemAdd` posts `{kind, description}` to `/item/add`; `generateItemEdit` posts `{kind, intent, currentContent, params}` to `/item/edit`; params omitted when undefined.
- `apps/dev-server/src/studio/components/AiAddDialog.test.tsx` — kind selector switches; description too short disables Generate; success → preview + "Add to course" calls `onAccept(item)`; `ok:false` → inline `retryFailed`; AI unavailable → hint, Generate disabled.
- `apps/dev-server/src/studio/components/ItemDraftPreview.test.tsx` — renders each kind; quiz highlight marks changed options by index; practice falls back when content unparseable.
- `apps/dev-server/src/studio/components/OutlineView.test.tsx` — AI draft button opens the dialog; accept writes via `writeFile`, appends the row, and calls `saveOutlineOrder`.
- a11y — `AiAddDialog` and `ItemDraftPreview` pass axe-core (AGENTS.md rule 4).

---

### Work Item 5 — Client: `AiEditPanel` + editor wiring + `StudioApp.handleSaveDraftItems`

**Goal:** Every activity editor gets the intent-menu AI panel on the right; `add-questions` commits new nodes through `StudioApp`.

**Changes:**

- **`apps/dev-server/src/studio/components/AiEditPanel.tsx`** (new)
  - Props `{ api, kind, getCurrentContent: () => string, onApply(item: DraftItem), onApplyBatch(items: DraftItem[]), onError }`.
  - Fetches `api.getAiStatus()` on mount; unavailable → `studio.ai.unavailable` hint, disabled.
  - Intent menu (chips) filtered by `kind`: lesson `rewrite|expand|fix-quality|difficulty|translate`; quiz `+ add-questions`; practice `improve-prompt|difficulty|translate`.
  - `difficulty` renders two sub-actions (easier / harder) mapping to `params: {direction}`; `translate` uses `useTranslation().locale` as `targetLocale`.
  - Run → `api.generateItemEdit(kind, intent, getCurrentContent(), params)` → loading → `ItemDraftPreview` with `currentContent={getCurrentContent()}` (drives quiz highlight + practice before/after).
  - Footer: Reject (clears preview) / **"Use"** → single-item `onApply(items[0])`; `add-questions` → `onApplyBatch(items)`.
  - `ok:false` → inline `ai.item.retryFailed` / generic.
- **Editor wiring (each editor composes its own layout so the panel can reach local form state; `ActivityEditorRouter` supplies `onApplyBatch`). Each editor passes a serializer as `getCurrentContent` (P2-2):**
  - `LessonActivityEditor.tsx` — wrap content in a `flex flex-col lg:flex-row`; right column `<AiEditPanel kind="lesson" …/>`; `getCurrentContent` returns `body`; `onApply(item)`: `setBody(item.content)`; derive `setTitle` from the first `# heading` (same regex as load, `LessonActivityEditor.tsx:42`).
  - `QuizActivityEditor.tsx` — right column panel; `getCurrentContent` returns `serializeQuiz(question, options, correctIndex)` (the editor's existing serializer — reuse it verbatim so the AI sees exactly what the form holds); `onApply(item)`: `JSON.parse(item.content)` → `setQuestion`, `setOptions` (regenerate ids via `freshOption`), `setCorrectIndex` (the option with `correct:true`); `onApplyBatch` → forward to prop.
  - `PracticeActivityEditor.tsx` — the existing `lg:grid-cols-2` (form + `WidgetPreviewPanel`) becomes `lg:grid-cols-[1fr_minmax(0,20rem)_minmax(0,24rem)]` (form, preview, panel) with the panel as the third column; `getCurrentContent` returns `serializeExerciseNode({type:'exercise', title, widget: widgetId ?? '', config})`; `onApply(item)`: `parseExerciseNode(item.content)` → `setTitle`, `setWidgetId`, `setConfig`.
- **`apps/dev-server/src/studio/components/ActivityEditorRouter.tsx`**
  - Add prop `onApplyBatch?: (items: DraftItem[]) => void`; pass through to the three editors. (Panel layout is inside each editor, so the router's `max-w-3xl` wrappers for lesson/quiz are replaced by a full-width flex container only if needed — verify widths in the manual pass.)
- **`apps/dev-server/src/studio/StudioApp.tsx`**
  - Add `handleSaveDraftItems(items)` callback: for each item write `nodes/{kind}-{Date.now()+i}.{md|json}` via `api.writeFile`; then `api.getOutline()` → `api.saveOutlineOrder([...outline.activities.map(a=>a.path), ...writtenPaths])`; `handleNavigate('outline')`. Thread as `onApplyBatch` into `ActivityEditorRouter` (`StudioApp.tsx:139-148`).
  - **Partial-failure policy (P2-3):** sequential `writeFile`s; on any failure, stop, report via `onError` with how many of the N items were written, and **do not** `saveOutlineOrder` (the outline is unchanged, so already-written files are unreferenced orphans — inert, since routing is driven by the outline). Retry-safe: a second Accept re-runs the whole batch (IDs differ by timestamp, so no collision).
- **`packages/i18n/locales/en/studio.json`** — add `ai.item.intents.*` (`rewrite`, `expand`, `fix-quality`, `difficulty`, `difficulty.easier`, `difficulty.harder`, `translate`, `add-questions`, `improve-prompt`), `ai.item.panelTitle`, `ai.item.panelHint`, `ai.item.use`.

**Tests:**

- `apps/dev-server/src/studio/components/AiEditPanel.test.tsx` — intent chips filtered by kind; difficulty shows easier/harder and sends `params.direction`; translate sends the provider `locale`; run calls `generateItemEdit` with `getCurrentContent()`; success renders preview; accept → `onApply(items[0])`; add-questions accept → `onApplyBatch(items)`; reject clears; unavailable disables.
- `apps/dev-server/src/studio/components/LessonActivityEditor.test.tsx` / `QuizActivityEditor.test.tsx` / `PracticeActivityEditor.test.tsx` — `onApply` fills form state (lesson heading re-synced; quiz question/options/correct restored; practice widget/config restored); quiz rewrite keeps the source option count.
- `apps/dev-server/src/studio/components/ActivityEditorRouter.test.tsx` — passes `onApplyBatch` to the right editor.
- `apps/dev-server/src/studio/StudioApp.test.tsx` — `handleSaveDraftItems` writes N files, re-reads outline order, saves combined order, navigates to `outline`.
- a11y — `AiEditPanel` passes axe-core.

---

## 4. Sequencing

Server-first so the client has a contract:

1. **Phase A** — WI 1 (prompts + drift guards; no behavior change). Land: `refactor(dev-server): move Studio AI prompts to catalog-injected module`.
2. **Phase B** — WI 2 (types + orchestrator + validation). Land: `feat(dev-server): add per-item AI draft orchestrator with validation`.
3. **Phase C** — WI 3 (routes). Land: `feat(dev-server): add /item/add and /item/edit AI routes`.
4. **Phase D** — WI 4 (client API + add dialog + outline button + preview). Land: `feat(dev-server): add AI item drafting to the outline page`.
5. **Phase E** — WI 5 (edit panel + editor wiring + StudioApp commit). Land: `feat(dev-server): add AI edit assistant to activity editors`.

Each phase ships with its tests (AGENTS.md rule 1); one branch/PR per phase.

---

## 5. Risks & decisions

- **Editor panel ownership (WI 5):** the design says the router renders the panel, but the panel must reach editor-local form state. Decision: each editor composes its own layout including `AiEditPanel`; the router only threads `onApplyBatch`. This keeps state local and avoids lifting content state to the router.
- **Quiz strictness vs schema:** `QuizNodeSchema` allows 2–26 options and any correct pattern (`packages/schemas/src/nodes.ts:13`). The exactly-4/one-correct guardrail lives in `validateItemDraft` only (generated quizzes); edit rewrites preserve the source count so an existing 2- or 5-option quiz is never force-changed. Write-time `validateFile` remains the final backstop.
- **No `aiGenerating`/full-reload for item routes:** correct because the AI never writes; the client's Accept goes through the normal `writeFile` route, which triggers the ordinary watcher reload. Do not copy the `/generate` reload plumbing.
- **`add-questions` partial failure (P2-3):** N sequential writes can leave orphans if a later write fails. Policy: stop on first failure, report how many of N wrote, skip `saveOutlineOrder` (outline unchanged → orphans inert), retry-safe via timestamped IDs. See WI 5.
- **Lesson prompt envelope:** `extractJsonObject` only returns JSON, so lessons use `{title, markdown}`; `DraftItem.content` is the markdown body. This is the one place the wire format is not literal JSON.
- **`add-questions` option ids:** the server mints `a, b, c, …` (`String.fromCharCode(97 + i)`) for however many options the LLM produced (studio quiz nodes require `{id,text,correct}`); the quiz editor regenerates ids via `freshOption` on apply, so collisions are not a concern.
- **Practice context titles (P3-2, accepted):** `readCourseContext` derives practice titles from the filename basename (same as `outlineModel` today); deriving widget titles from config is a possible follow-up, out of scope here.
- **Contract sample uses `<canonical-widget-id>`:** `COURSE_SPEC_CONTRACT`'s sample JSON no longer contains a literal widget ID — that is what keeps the catalog scan green and prevents any drift from the real catalog. The pedagogical rule text (exactly-4 options, etc.) stays in prose.
- **Widget table size in prompts:** ~27 widgets × one line each keeps prompts small; if a future catalog grows large, trim the table to the top-N configs per domain (YAGNI now).
- **Contract-fixture vs prose:** `COURSE_SPEC_CONTRACT` is prose and is never parsed; drift is caught by the maintained fixture + required-key test (per review finding).
- **Backend route verification:** middleware has no unit harness; covered by the manual curl checks in WI 3 (mirrors the spec-upload plan's approach).
- **Translate locale:** uses the teacher's current UI locale from `useTranslation().locale` (dev-server runs `I18nProvider` with supported locales including more than `en` when configured; falls back to `'en'`).

---

## 6. Verification checklist

Before merging each story:

- [ ] `pnpm --filter @open-edu/dev-server test`
- [ ] `pnpm lint` (includes hardcoded-string scan — every new UI string uses a `t()` key in `packages/i18n/locales/en/studio.json`)
- [ ] `pnpm typecheck`
- [ ] `pnpm format:check`
- [ ] Regenerate dev-server Tailwind CSS if any new utility classes were added to `packages/runtime` (WI 5 adds no runtime classes; panel styles use existing tokens)
- [ ] Manual pass (`pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js dev ./examples/hello-world`): AI draft a lesson/quiz/practice and Accept (new row appears, file written); in each editor run rewrite/difficulty/translate/add-questions and confirm the type-aware preview, Accept fills the form, add-questions adds quiz rows after returning to outline; Reject leaves the form untouched; no LLM key → buttons disabled with the hint
- [ ] Confirm the item AI endpoints never write to `packageDir` (curl before/after `ls nodes/`)
- [ ] Confirm no `OPEN_EDU_*`/LLM env vars leak to the client (unchanged from current AI behavior)
- [ ] Conventional commit messages; one story per branch/PR
