---
type: Implementation Plan
title: Studio — Upload course-spec.json / course-spec.md
description: Add an "Upload spec" tab to the Studio start panel that compiles a user-supplied course-spec.json or course-spec.md through the existing AI draft pipeline (skipping the LLM step).
tags: [dev-server, studio, creator-mode, spec-upload, plan]
---

# Studio — Upload course-spec.json / course-spec.md

**Date:** 2026-08-09
**Scope:** `apps/dev-server` (Studio start panel, pipeline, vite routes, API) + `packages/i18n`
**Design:** `docs/superpowers/specs/2026-08-09-studio-spec-upload-design.md`
**Stories:** 3 work items, each ship-ready with Vitest coverage (per AGENTS.md rule 1).

---

## 1. Summary

The Studio's only generative start path is "Start with AI": notes → LLM → `course-spec.json` → compile → validated package. We add a second path — **upload a spec file** — that reuses the exact same compile pipeline, replacing the LLM step with the uploaded file's content. Both `.json` and `.md` specs are accepted (the compiler already parses both). The upload tab works even when AI is unavailable (no API key needed).

---

## 2. Current-state findings

| #   | Area        | Current behavior                                                                                                                                                               | Location                                                        |
| --- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| 1   | Pipeline    | `generateCourseDraft` takes flat `notes`/`completeText` options and always runs the LLM                                                                                        | `apps/dev-server/src/studio/ai/generateCourse.ts:17-23, 84-106` |
| 2   | Spec write  | Notes path serializes parsed JSON to `course-spec.json` in a scratch dir, then `compile()`s into a second scratch `out/` dir                                                   | `generateCourse.ts:100-141`                                     |
| 3   | Route       | `POST /api/studio/ai/generate` accepts only `{ notes?, force? }`; body read at `vite.config.ts:446`                                                                            | `apps/dev-server/vite.config.ts:440-490`                        |
| 4   | Client API  | `generateFromNotes(notes, force?)` only; no upload method                                                                                                                      | `apps/dev-server/src/studio/studioApi.ts:105-110`               |
| 5   | UI          | `AiStartPanel` renders a single notes+Generate card; the whole card is replaced by an `ai.unavailable` empty state when offline                                                | `apps/dev-server/src/studio/components/AiStartPanel.tsx:90-113` |
| 6   | Error codes | `AiGenerateErrorCode` has `notes-too-short`/`has-content`/`llm`/`parse`/`write`/`compile`; `AiEndpointErrorCode` has `no-active-package`/`missing-notes`/`unknown-ai-endpoint` | `studio/ai/types.ts:14-20, 33`                                  |
| 7   | i18n        | AI panel strings under `ai.*` in `packages/i18n/locales/en/studio.json:146-164`; `lint:hardcoded-strings` enforces `t()` usage                                                 | `packages/i18n/locales/en/studio.json`                          |

Key mechanics that shape the plan:

- **`compile()` auto-detects format by extension** (`course-compiler/src/cli/index.ts:41-42` uses `parseCourseSpecJSON` for `.json`, `parseCourseSpec` for `.md`). So the upload path just needs to write the content to a scratch file with the user's extension.
- **The `has-content` guard and scratch-dir isolation already exist** and are source-agnostic (`generateCourse.ts:29-32, 94-96, 115-164`). Reusing them is the whole point of Approach A.
- **The route stays at `/api/studio/ai/generate`** — it is the single "produce a draft" endpoint; `notes` takes precedence, `spec` is honored only when `notes` is absent.
- **`AiReviewView` consumes the same `AiGenerateResult`** (`studio/ai/types.ts:22-29`) from either tab; `HomeView` wiring (`HomeView.tsx:110`) needs no change.

---

## 3. Implementation plan

### Work Item 1 — Server pipeline: source-parameterized `generateCourseDraft`

**Goal:** `generateCourseDraft` accepts a `notes` source (LLM) or a `spec` source (uploaded content) and runs the same compile→copy→preview tail.

**Changes:**

- `apps/dev-server/src/studio/ai/types.ts`
  - Add `'spec-invalid'` to `AiGenerateErrorCode` (line 14-20).
  - Add `'missing-spec'` to `AiEndpointErrorCode` (line 33).
- `apps/dev-server/src/studio/ai/generateCourse.ts`
  - Add and export:
    ```ts
    export type CourseDraftSource =
      | { kind: 'notes'; notes: string; completeText: (prompt: string) => Promise<string> }
      | { kind: 'spec'; spec: string; extension: '.json' | '.md' };
    ```
  - Replace `GenerateCourseOptions` fields `notes`/`completeText` with `source: CourseDraftSource` (keep `packageDir`, `compile?`, `force?`).
  - In `generateCourseDraft`:
    - `source.kind === 'spec'`: if `spec.trim().length === 0` → `errorResult('spec-invalid', 'Spec file is empty')` **before** the `has-content` guard.
    - `source.kind === 'notes'`: existing `MIN_NOTES_LENGTH` guard, `completeText(buildCourseSpecPrompt(notes))`, `extractJsonObject`, serialize to JSON string (unchanged logic).
    - Compute `const scratchName = source.kind === 'notes' ? 'course-spec.json' : \`course-spec${source.extension}\`;`and write that in the scratch dir (currently hardcoded`course-spec.json` at line 116).
    - Everything after the scratch write (compile → outline preview → quality → copy into `packageDir` → cleanup) is unchanged.
- **Tests** (`apps/dev-server/src/studio/ai/generateCourse.test.ts`):
  - Refactor all existing tests to the new `source` shape (mechanical: wrap `notes`+`completeText` in `source: { kind: 'notes', notes, completeText }`).
  - New — spec source `.json`: mocked `compile` receives `expect.stringMatching(/course-spec\.json$/)`, `validate: true`, output ≠ packageDir; `completeText` never called; result `success`, title, outline, quality as today.
  - New — spec source `.md`: mocked `compile` receives `expect.stringMatching(/course-spec\.md$/)`.
  - New — empty spec → `success:false`, `code: 'spec-invalid'`, no `compile` call.
  - New — invalid spec content → `compile` returns `{ success:false, diagnostics:[{ severity:'error', message:'bad', code:'X' }] }` → `code:'compile'`, `error:'bad'`, `completeness` quality item fails (mirror the existing notes-path compile-failure test at lines 191-217).
  - New — `has-content` guard honored for spec source (pre-populated `nodes/` → `has-content`, no `compile` call; `force:true` proceeds).

---

### Work Item 2 — Server route: accept `spec`/`specExt`

**Goal:** The generate endpoint routes an uploaded spec through the new source path.

**Changes:**

- `apps/dev-server/vite.config.ts` (`POST /api/studio/ai/generate`, lines 440-490)
  - Body type becomes `{ notes?: string; spec?: string; specExt?: string; force?: boolean }`.
  - If `body.spec` is present:
    - Validate `specExt` is `'.json'` or `'.md'`; else `400 { code: 'spec-invalid', error: 'Unsupported spec extension' }`.
    - `source = { kind: 'spec', spec: body.spec, extension: body.specExt }`.
  - Else require `body.notes` (existing behavior); `source = { kind: 'notes', notes: body.notes, completeText: completeWithLlm }`.
  - Neither → `400 { code: 'missing-spec', error: 'Missing spec or notes' }` (replaces the current `missing-notes` 400 only when both are absent; keep `missing-notes` message when `notes` missing but `spec` absent too — see note).
  - All downstream handling (`aiGenerating`, reload, deferred `full-reload`, response) unchanged.
- **Note on `missing-notes` vs `missing-spec`:** simplify to one behavior — when `spec` is absent and `notes` is absent/not-a-string, return `400 missing-spec` with message "Missing spec or notes". `AiEndpointErrorCode['missing-spec']` covers it; keep `missing-notes` in the union for backward compat if any test/consumer references it (check `studioApi.test.ts` / `AiStartPanel.test.tsx` before removing — they reference `no-active-package`/`missing-notes`).
- **Verification:** route logic lives in the Vite middleware (no unit harness). Verify manually: start Studio on an empty dir, `curl -X POST /api/studio/ai/generate -H 'Content-Type: application/json' -d '{"spec":"{}","specExt":".json"}'` → expect `compile`-style failure, not 400; `-d '{"spec":"x","specExt":".yaml"}'` → `400 spec-invalid`; `-d '{}'` → `400 missing-spec`; existing `{"notes":"..."}` still reaches the LLM path.

---

### Work Item 3 — Client: `uploadSpec` API + Start panel tabs

**Goal:** The start panel gains an "Upload spec" tab usable regardless of AI availability; uploads land on the same review screen.

**Changes:**

- `apps/dev-server/src/studio/studioApi.ts`
  - Add:
    ```ts
    uploadSpec: (spec: string, specExt: '.json' | '.md', force?: boolean) =>
      aiRequest<AiGenerateResult>('/generate', {
        method: 'POST',
        body: JSON.stringify({ spec, specExt, force }),
      }),
    ```
- `packages/i18n/locales/en/studio.json` (new keys under `ai.`)
  - `ai.aiTab` ("Describe with AI"), `ai.specTab` ("Upload spec"), `ai.specLabel` ("course-spec.json / course-spec.md"), `ai.specHint` ("Drop a course spec or choose a file"), `ai.browse` ("Choose file"), `ai.upload` ("Upload spec"), `ai.uploading` ("Uploading…"), `ai.specInvalid` ("Not a valid course spec. Use a .json or .md file that follows the openedu-course-spec format."), `ai.uploadError` ("Could not compile the spec. Check the file and try again.").
- `apps/dev-server/src/studio/components/AiStartPanel.tsx`
  - Add `mode: 'ai' | 'upload'` state and a two-tab control using the design-system `Tabs` primitive (`TabsList`/`TabsTrigger` from `@open-edu/design-system`, exported at `packages/design-system/src/index.ts:54`), with `ai.aiTab` and `ai.specTab` labels.
  - **Restructure the unavailable branch:** only the _AI tab_ shows the `ai.unavailable` empty state (existing lines 90-103); the tabs + upload tab render for every status.
  - Upload tab: hidden `<input type="file" accept=".json,.md,application/json,text/markdown">` + `ai.browse` button (shows chosen filename), `ai.upload` button disabled until a file is chosen. On change: validate extension (`.json`/`.md`); read via `file.text()`; wrong type → inline `ai.specInvalid` and don't send.
  - `runUpload(force)`: call `api.uploadSpec(spec, specExt, force)`; `has-content` → open overwrite dialog (reuse existing `confirmOverwrite` state/dialog); other failures → inline error (`result.error` when present, else `ai.specInvalid` for `code==='spec-invalid'`, else `ai.uploadError`); success → `onGenerated(result)`.
  - Keep the AI tab, its `notes-too-short` mapping, and the shared dialog/`onGenerated`/`onError` wiring as-is.
  - The `generating`/`confirmOverwrite` flows stay shared so both tabs reuse the same "Generating…"/"Replace content" dialog.
- **Tests:**
  - `apps/dev-server/src/studio/studioApi.test.ts`: `uploadSpec` posts to `/generate` with `{ spec, specExt, force }`; omits `force` when undefined.
  - `apps/dev-server/src/studio/components/AiStartPanel.test.tsx`:
    - Upload tab renders when AI is unavailable (`getAiStatus → available:false`), and still allows selecting a file.
    - Selecting a `.json` file enables Upload; clicking calls `uploadSpec(content, '.json', false)` and success → `onGenerated`.
    - Selecting a `.md` file sends `specExt: '.md'`.
    - Selecting an unsupported extension shows `ai.specInvalid` and never calls the API.
    - `has-content` on upload → overwrite dialog; confirming calls `uploadSpec(..., true)`.
    - Upload failure with `result.error` shows that message inline.
  - Existing AI-tab tests must keep passing unchanged (they drive the AI tab by default).

---

## 4. Sequencing

Recommended order (server-first so the client has a contract):

1. **Phase A** — Work Item 1 (pipeline + types + tests). Small, self-contained.
2. **Phase B** — Work Item 2 (route). Depends on WI 1's `CourseDraftSource`.
3. **Phase C** — Work Item 3 (client API + UI + i18n + tests). Depends on WI 1 + WI 2.

Each phase lands as its own conventional commit with its tests: `feat(dev-server): support course-spec upload in draft pipeline`, etc.

---

## 5. Risks & decisions

- **Route stays `/ai/generate`.** Naming wart accepted (design decision): it is the single draft endpoint; renaming would churn the client and tests for no functional gain.
- **`missing-notes` vs `missing-spec`:** collapse to `missing-spec` for the neither-present case; keep `missing-notes` in the union only if a test references it. Verify before removing.
- **Upload offline:** the upload tab must not be gated by `isAiAvailable`. The tabs render for every status; only the AI tab shows the unavailable empty state.
- **File read size:** `file.text()` is fine for course specs (KBs); no streaming needed. No explicit size cap in this pass (YAGNI).
- **Backend route verification:** middleware has no unit harness; covered by manual curl checks in WI 2 and (optionally) a Playwright assertion if a Studio E2E spec exists in `tests/e2e/`.
- **Overwrite semantics:** unchanged — `has-content` + force dialog identical to the AI path; upload never writes into a non-empty package without confirmation.

---

## 6. Verification checklist

Before merging each story:

- [ ] `pnpm --filter @open-edu/dev-server test`
- [ ] `pnpm lint` (includes hardcoded-string scan — new UI strings must use `t()` keys in `packages/i18n/locales/en/studio.json`)
- [ ] `pnpm typecheck`
- [ ] `pnpm format:check`
- [ ] Regenerate dev-server Tailwind CSS if any new utility classes were added to `packages/runtime` (not expected here; tab styles stay within existing tokens)
- [ ] Manual pass: `pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js dev ./my-empty-folder` → upload a sample `course-spec.json` and `.md` (compile succeeds, review screen shows outline + quality), upload a malformed file (inline error), AI-offline shows tabs with only the AI tab empty-stated
- [ ] Confirm no `OPEN_EDU_*`/LLM env vars leak to the client (spec content never contains keys; unchanged from current behavior)
- [ ] Conventional commit messages; one story per branch/PR
