# Studio: Upload course-spec.json / course-spec.md — Design Document

**Date:** 2026-08-09
**Status:** Draft for review
**Scope:** `apps/dev-server` (Course Creator Studio) + `packages/i18n`
**Feature:** Let a teacher bypass AI drafting and directly upload a `course-spec.json` (or `course-spec.md`) file that gets compiled into a full OpenEdu package through the existing pipeline.

## 1. Summary

Today the Studio's only generative start path is "Start with AI" (`AiStartPanel`): the teacher pastes notes, the server calls an LLM to produce a `course-spec.json`, and `generateCourseDraft` compiles it into a validated package. We add a second start path — **upload a spec file** — that reuses the exact same compile → scratch-dir → copy → outline-preview → quality pipeline, just replacing the LLM step with the uploaded file's content.

The compiler already accepts both `.json` and `.md` specs (`packages/course-compiler/src/parser/index.ts`), so both formats are supported at no extra cost.

## 2. Decisions locked

| Decision                | Choice                                                                |
| ----------------------- | --------------------------------------------------------------------- |
| UI placement            | Tab in the existing start panel (`AiStartPanel`)                      |
| Post-upload flow        | Same review screen as AI (`AiReviewView`)                             |
| Validation              | Server-side only, via `course-compiler` (no duplicated client schema) |
| File formats            | `.json` and `.md`                                                     |
| LLM independence        | Upload works even when AI is unavailable (no API key required)        |
| Implementation approach | Approach A: parameterize `generateCourseDraft` by source              |

## 3. Architecture

### 3.1 Server: source-parameterized pipeline

`apps/dev-server/src/studio/ai/generateCourse.ts`

Introduce a union source type and thread it through `generateCourseDraft`:

```ts
export type CourseDraftSource =
  | { kind: 'notes'; notes: string; completeText: (prompt: string) => Promise<string> }
  | { kind: 'spec'; spec: string; extension: '.json' | '.md' };

export interface GenerateCourseOptions {
  source: CourseDraftSource;
  packageDir: string;
  compile?: typeof compileFromCourseCompiler;
  force?: boolean;
}
```

Flow inside `generateCourseDraft`:

- `kind === 'notes'` — unchanged: `MIN_NOTES_LENGTH` guard, `completeText(buildCourseSpecPrompt(notes))`, `extractJsonObject`, then serialize the parsed object back to a JSON string.
- `kind === 'spec'` — skip the LLM. Use `source.spec` verbatim. Empty/whitespace content → `spec-invalid` error result.
- Both sources converge on the existing tail: write spec content to a scratch temp file, `compile()` into a scratch `out/` dir (`validate: true`), build the outline preview + quality map, and only on success `cp` into `packageDir`. Failure cleanup (`rm` of scratch dir) and the `has-content` guard are unchanged.

Scratch file naming: `course-spec.json` for the notes source (always JSON); `course-spec.{json|md}` for the upload source, matching `source.extension` so `compile()` picks the right parser.

### 3.2 Server: route

`apps/dev-server/vite.config.ts` — extend the existing `POST /api/studio/ai/generate` route (`configureServer`, ~line 440). Request body becomes:

```ts
{ notes?: string; spec?: string; specExt?: '.json' | '.md'; force?: boolean }
```

- Exactly one of `notes` / `spec` is required; if neither is present → `400` with `missing-spec`. If `notes` is present, it wins (existing behavior preserved); `spec` is only honored when `notes` is absent.
- `spec` present → validate `specExt` is `.json` or `.md` (else `400`), build `source = { kind: 'spec', spec, extension: specExt }`.
- `spec` absent → `source = { kind: 'notes', notes, completeText: completeWithLlm }`.
- Everything downstream (scratch isolation, `aiGenerating` watcher suppression, package reload, deferred full-reload, response shape) is untouched. The route keeps its `/ai/` path — it is the single draft endpoint.

### 3.3 Client: API

`apps/dev-server/src/studio/studioApi.ts` — add:

```ts
uploadSpec: (spec: string, specExt: '.json' | '.md', force?: boolean) =>
  aiRequest<AiGenerateResult>('/generate', {
    method: 'POST',
    body: JSON.stringify({ spec, specExt, force }),
  }),
```

### 3.4 Client: UI

`apps/dev-server/src/studio/components/AiStartPanel.tsx` — restructure the card into a "Start a course" panel with two tabs. Both tabs render for every AI status, because upload does not depend on an API key:

- **Tab "Describe with AI"** — the existing notes textarea + Generate button. When status is `unavailable`, this tab shows the existing `studio.ai.unavailable` empty state.
- **Tab "Upload spec"** — a file input (`accept=".json,.md,application/json,text/markdown"`), a browse button showing the chosen filename, and an Upload button disabled until a file is chosen. File content is read with `file.text()`. Wrong extension → inline error, never sent.
- Shared below the tabs: the existing overwrite-confirmation dialog and `onGenerated` / `onError` props. Both tabs call the same endpoint; `has-content` triggers the overwrite dialog.

Result rendering is unchanged: `HomeView` routes any `AiGenerateResult` (from either tab) into `AiReviewView`.

### 3.5 Error handling

| Case                      | Behavior                                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Wrong file extension      | Client-side inline error (`studio.ai.specInvalid`), file not sent                                              |
| Empty spec content        | Server returns `spec-invalid`; inline error                                                                    |
| Invalid spec schema       | `compile()` diagnostics → `compile` error result → inline error with `result.error` (first diagnostic message) |
| `has-content` (non-empty) | Overwrite-confirmation dialog, same as AI                                                                      |

New i18n key `studio.ai.specInvalid` added to `packages/i18n/locales/en/studio.json`. The upload tab surfaces the server's compile message (`result.error`) inline when present, falling back to `studio.ai.errorGeneric`.

## 4. Data flow

```
Teacher selects course-spec.json / .md
        ↓
AiStartPanel (Upload tab) → file.text() → client-side extension check
        ↓
studioApi.uploadSpec(spec, specExt, force)
        ↓
POST /api/studio/ai/generate  { spec, specExt, force }
        ↓
vite.config.ts middleware → generateCourseDraft({ source: { kind: 'spec', ... } })
        ↓
(skip LLM) → write scratch course-spec.{json|md} → compile() → scratch out/
        ↓
outlinePreview + quality map → cp into packageDir → reload + deferred full-reload
        ↓
AiGenerateResult → AiReviewView (same as AI flow) → editable course
```

## 5. Files touched

| File                                                     | Change                                                                                   |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `apps/dev-server/src/studio/ai/generateCourse.ts`        | Add `CourseDraftSource`, parameterize `generateCourseDraft`                              |
| `apps/dev-server/src/studio/ai/types.ts`                 | Add `spec-invalid` to `AiGenerateErrorCode`; add `missing-spec` to `AiEndpointErrorCode` |
| `apps/dev-server/vite.config.ts`                         | Extend generate route body handling                                                      |
| `apps/dev-server/src/studio/studioApi.ts`                | Add `uploadSpec`                                                                         |
| `apps/dev-server/src/studio/components/AiStartPanel.tsx` | Add tabs + upload UI                                                                     |
| `packages/i18n/locales/en/studio.json`                   | Add `studio.ai.specInvalid`                                                              |

## 6. Testing

- **`generateCourse.test.ts`** — spec source: valid `.json` → success; valid `.md` → success; invalid spec → `compile` failure with diagnostic message; empty spec → `spec-invalid`; `has-content` guard honored; package dir untouched on failure.
- **`studioApi.test.ts`** — `uploadSpec` builds the correct request path, method, and body.
- **`AiStartPanel.test.tsx`** — upload tab renders regardless of AI status; file selection enables Upload; invalid extension → inline error (no request); success → `onGenerated` with result; `has-content` → overwrite dialog.

## 7. Non-goals

- No client-side spec schema validation (server-only, per locked decision).
- No LLM involvement in the upload path.
- No support for non-spec JSON (e.g. raw node files) — only `course-spec.json` / `course-spec.md`.
- No hosted/cloud upload — local file picker only.
