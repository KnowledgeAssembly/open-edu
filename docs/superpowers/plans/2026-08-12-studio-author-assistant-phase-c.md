# Studio Author Assistant — Phase C Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring full-course AI generation into the Author Assistant sidebar, eliminate the standalone `ai-review` view, and fix write-before-review so **all** AI mutations are draft-then-commit.

**Architecture:** Split `generateCourse.ts` into draft-only (temp compile, no copy to `packageDir`) and commit (copy temp → package + reload). Chat exposes a `generateCourse` tool. Course draft cards show outline + quality checklist (from `AiReviewView`). Home `AiStartPanel` becomes a slim CTA; `ai-review` is removed from the router.

**Tech stack:** Same as Phase B + `generateCourse.ts`, `qualityMap.ts`, `aiSession.ts`, course-compiler

**Prerequisites:** Phase B merged (draft cards + `applyDraft` infrastructure).  
**Spec:** [`../specs/2026-08-12-studio-author-assistant-design.md`](../specs/2026-08-12-studio-author-assistant-design.md)  
**Index:** [`./2026-08-12-studio-author-assistant-index.md`](./2026-08-12-studio-author-assistant-index.md)  
**Studio Phase 3 product:** [`../specs/2026-08-05-course-creator-studio-design.md`](../specs/2026-08-05-course-creator-studio-design.md) § Phase 3

**Out of scope:** Streaming (Phase D), IDB history (Phase D), PDF pipeline, bundles, Developer mode AI.

---

## Architecture & constraints (mandatory)

1. **Course generation must not write `packageDir` until Accept.** Fix the current asymmetry where `/api/studio/ai/generate` writes before review.
2. Human-in-the-loop: Discard leaves package unchanged.
3. Preserve overwrite confirmation when package already has content (`force` flow from `AiStartPanel`).
4. Migrate `sessionStorage` `openedu.studio.ai.review` so mid-flight users are not stranded after deploy.
5. Keep `aiGenerating` HMR suppression only around **commit** writes, not draft generation.
6. Quality checklist remains teacher-readable (`AiQualityItem` + i18n label keys).

---

## File structure

| File                                                                      | Status        | Responsibility                               |
| ------------------------------------------------------------------------- | ------------- | -------------------------------------------- |
| `packages/i18n/locales/en/studio.json`                                    | Modify        | Course draft card, accept/discard, overwrite |
| `apps/dev-server/src/studio/ai/types.ts`                                  | Modify        | `CourseDraftResult`, `draftId`               |
| `apps/dev-server/src/studio/ai/generateCourse.ts`                         | Modify        | Split draft-only vs legacy; extract commit   |
| `apps/dev-server/src/studio/ai/commitCourseDraft.ts`                      | Create        | Temp → packageDir commit                     |
| `apps/dev-server/src/studio/ai/generateCourse.test.ts`                    | Modify/Create | Assert no package write on draft             |
| `apps/dev-server/src/studio/ai/commitCourseDraft.test.ts`                 | Create        | Commit writes + validation                   |
| `apps/dev-server/src/studio/ai/chat/tools.ts`                             | Modify        | `generateCourse` tool                        |
| `apps/dev-server/src/studio/ai/chat/metadata.ts`                          | Modify        | `mode: 'course_draft'`, course draft fields  |
| `apps/dev-server/src/studio/ai/chat/policy.ts`                            | Modify        | Course-from-notes guidance                   |
| `apps/dev-server/src/studio/ai/chat/handler.ts`                           | Modify        | Tool + long-running UX                       |
| `apps/dev-server/src/studio/ai/aiSession.ts`                              | Modify        | Migrate review → pending course draft        |
| `apps/dev-server/src/studio/components/AssistantCourseDraftCard.tsx`      | Create        | Outline + quality + Accept/Discard           |
| `apps/dev-server/src/studio/components/AssistantCourseDraftCard.test.tsx` | Create        | Card actions + quality render                |
| `apps/dev-server/src/studio/components/StudioAssistantMessage.tsx`        | Modify        | Render course draft cards                    |
| `apps/dev-server/src/studio/components/AiStartPanel.tsx`                  | Modify        | Slim CTA to open assistant                   |
| `apps/dev-server/src/studio/components/HomeView.tsx`                      | Modify        | Wire slim panel / remove full form           |
| `apps/dev-server/src/studio/components/AiReviewView.tsx`                  | Delete        | After migration                              |
| `apps/dev-server/src/studio/StudioApp.tsx`                                | Modify        | Remove `ai-review` case; wire commit         |
| `apps/dev-server/src/studio/types.ts`                                     | Modify        | Remove `'ai-review'` from `StudioView`       |
| `apps/dev-server/src/studio/studioApi.ts`                                 | Modify        | `generateCourseDraft`, `commitCourseDraft`   |
| `apps/dev-server/vite.config.ts`                                          | Modify        | Draft + commit routes; adjust `/generate`    |

---

## New types

```typescript
interface CourseDraftResult {
  success: boolean;
  title?: string;
  outlinePreview: Array<{ title: string; kind: string }>;
  quality: AiQualityItem[];
  draftId: string; // server temp reference
  error?: string;
  code?: AiGenerateErrorCode;
}

interface StudioResponseMetadata {
  mode: 'explain' | 'draft' | 'course_draft';
  drafts?: DraftItem[];
  courseDraft?: CourseDraftResult;
  suggestedNextSteps?: string[];
}
```

---

### Task 1: Split generate into draft-only + commit

**Files:** `generateCourse.ts`, `commitCourseDraft.ts`, types, tests, vite routes, `studioApi.ts`

- [ ] **Step 1: Implement `generateCourseDraftOnly(source)`**

  - LLM → course-spec JSON
  - Compile into **temp directory**
  - Map quality via `qualityMap`
  - Return `CourseDraftResult` with `draftId`
  - **Assert:** never copies into `packageDir`

- [ ] **Step 2: Implement `commitCourseDraft(draftId, { force })`**

  - Validate draft still exists
  - If package has content and `!force`, return `has-content` error
  - Copy temp → `packageDir`
  - Set `aiGenerating` during write; reload package; deferred full-reload as today

- [ ] **Step 3: Temp lifecycle** — TTL cleanup (e.g. delete after commit, discard, or expiry)

- [ ] **Step 4: Routes**

  | Method | Path                            | Behavior                                                                                                        |
  | ------ | ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
  | POST   | `/api/studio/ai/generate-draft` | draft-only (preferred)                                                                                          |
  | POST   | `/api/studio/ai/commit`         | commit by `draftId` + `force?`                                                                                  |
  | POST   | `/api/studio/ai/generate`       | **Change** to draft-only **or** thin alias to generate-draft (breaking change OK inside Studio; document in PR) |

- [ ] **Step 5: Client API** — `generateCourseDraft`, `commitCourseDraft` on `StudioApi`

- [ ] **Step 6: Tests** — draft never writes packageDir; commit writes; force required when content exists

---

### Task 2: Chat tool for course generation

**Files:** `chat/tools.ts`, `policy.ts`, `handler.ts`, sidebar progress UX

- [ ] **Step 1: Tool `generateCourse`** — accepts `notes` or `spec` + `specExt`

- [ ] **Step 2: System prompt** — when user pastes long notes / asks to build a course, call tool

- [ ] **Step 3: Metadata** — `mode: 'course_draft'` + `courseDraft`

- [ ] **Step 4: Long-running UX** — assistant “Generating course draft…” status message; blocking OK (streaming in Phase D)

- [ ] **Step 5: Error mapping** — surface `notes-too-short`, `llm`, `parse`, `compile` as teacher-readable chat errors

---

### Task 3: AssistantCourseDraftCard

**Files:** `AssistantCourseDraftCard.tsx`, message renderer, tests

- [ ] **Step 1: UI** — title, outline list (kind badges), quality checklist (pass/fail icons from `AiReviewView`)

- [ ] **Step 2: Accept** — if package has content, show overwrite Dialog → `commitCourseDraft({ force: true })`

- [ ] **Step 3: On success** — clear pending draft; refresh package; navigate to outline; record recent course

- [ ] **Step 4: Discard** — call discard/delete temp; clear card; optional thread note

- [ ] **Step 5: Failed quality** — still allow Accept (soft checklist, same as current review philosophy) unless product decides hard-block; document choice (recommend soft)

- [ ] **Step 6: Component tests**

---

### Task 4: Remove ai-review view

**Files:** `StudioApp.tsx`, `types.ts`, `AiReviewView.tsx`, `aiSession.ts`, any navigations to `ai-review`

- [ ] **Step 1: Remove `ai-review` from `StudioView` union**

- [ ] **Step 2: Delete switch case** and `handleAiGenerated` navigation to review

- [ ] **Step 3: Replace generation success path** — push course draft into chat thread + open sidebar

- [ ] **Step 4: Migrate `readAiReview()`** on StudioApp mount:

  - If legacy review exists and assistant on → convert to pending `course_draft` message **only if** a `draftId` can be recovered; otherwise show explain note “Previous AI review expired — regenerate” and `clearAiReview()`
  - Note: legacy reviews were already written to disk — migration may only clear session + send user to outline with a toast. Document behavior in PR.

- [ ] **Step 5: Delete `AiReviewView.tsx`** and its tests

- [ ] **Step 6: Grep** for `ai-review` / `AiReviewView` / `writeAiReview` and clean remaining call sites

---

### Task 5: Slim Home AI start

**Files:** `AiStartPanel.tsx`, `HomeView.tsx`, suggestions

- [ ] **Step 1: Replace full notes/upload form** with card:

  - Heading + lede
  - Primary button: “Open Author Assistant” → `openWithPreset({ message: … })`
  - Secondary: keep “Upload course spec” as attachment entry that opens assistant with file, **or** small upload control that posts to generate-draft and shows card in sidebar

- [ ] **Step 2: Move overwrite confirm** into `AssistantCourseDraftCard` (already Task 3)

- [ ] **Step 3: Update Home suggestions** — primary chip “Create course from notes”

- [ ] **Step 4: Update HomeView tests**

---

### Task 6: Spec upload in assistant

**Files:** sidebar composer / attach control, chat tool

- [ ] **Step 1: Attachment control** — accept `.md` / `.json` (reuse `AiStartPanel` validation)

- [ ] **Step 2: On attach** — call generate-draft tool with `spec` + `specExt`

- [ ] **Step 3: Same course draft card** path as notes

---

### Task 7: Post-commit suggestions + quality Q&A

- [ ] **Step 1: After Accept** — seed next-step chips: “Add another activity”, “Preview course”, “Check share readiness”

- [ ] **Step 2: Free-text** “why did X fail?” uses `quality[].detail` from pending/last course draft in context

- [ ] **Step 3: Chip “Fix failing checks”** sends message listing failed ids

---

### Task 8: Integration + PR checklist

- [ ] **Manual QA**

  1. Notes → course draft card → Discard → package unchanged
  2. Notes → Accept on empty package → outline populated
  3. Notes → Accept on non-empty → overwrite confirm → package replaced
  4. Spec upload → draft card → Accept
  5. No navigation to `ai-review` after generate
  6. Home no longer hosts full generation form

- [ ] **Run**

```bash
pnpm --filter @open-edu/dev-server test
pnpm lint
pnpm typecheck
```

- [ ] **Commit** `feat(dev-server): unify course AI generation in author assistant (phase C)`

---

## Migration table

| Before                                            | After                                           |
| ------------------------------------------------- | ----------------------------------------------- |
| Generate → Vite full reload → `ai-review`         | Generate → draft card in sidebar (no write yet) |
| Accept → navigate outline (files already written) | Accept → commit → soft reload → outline         |
| Discard does not roll back files                  | Discard leaves package unchanged                |
| `writeAiReview` / `readAiReview`                  | Thread metadata `courseDraft` + temp `draftId`  |

---

## Acceptance criteria

- [ ] Course generation does **not** write files until Accept
- [ ] Discard leaves package unchanged
- [ ] No navigation to `ai-review` anywhere
- [ ] `AiReviewView.tsx` deleted
- [ ] Home no longer hosts the full generation form
- [ ] Quality checklist visible on course draft card before Accept
- [ ] Legacy `sessionStorage` review key handled safely
- [ ] Tests / lint / typecheck pass

---

## Risks

| Risk                         | Mitigation                                                |
| ---------------------------- | --------------------------------------------------------- |
| Temp draft storage on disk   | Unique dirs under OS temp; TTL cleanup; no path traversal |
| Breaking `/generate` clients | Only Studio client; update `studioApi` in same PR         |
| Long compile blocking UI     | Status message; Phase D streams progress                  |
| Legacy written packages      | Migration docs: old sessions may need regenerate          |

---

## Exit → Phase D

Phase D may start when course + item AI both live entirely in the sidebar with draft-then-commit, and legacy review/start surfaces are removed or reduced to CTAs.
