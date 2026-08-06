# Course Creator Studio — Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AI-assisted authoring a first-class Creator start/refine path: paste notes (and optionally upload a PDF later), generate a draft OpenEdu package via course-compiler, review quality in plain language, accept into Outline, with templates remaining the offline fallback.

**Architecture:** Extend `StudioAPI` with generate/refine endpoints that run **on the Vite server** (Node side): LLM draft → `course-spec.json` → `@open-edu/course-compiler` `compile()` into the active package directory (or a temp dir then sync). UI never shells out from the browser. Reuse quality dimensions from the authoring skill rubric, mapped to teacher-readable checklist items. Keep hybrid boundary: `LocalStudioAdapter` now; cloud can host the same API later.

**Tech Stack:** React 18, Vitest, `@open-edu/design-system`, `@open-edu/i18n`, `@open-edu/course-compiler`, `@open-edu/llm-config` (or existing learner/server model factory patterns), Zod schemas

**Prerequisites:** Phase 0–1 complete; Phase 2 recommended (widgets not required for AI MVP).  
**Spec:** `docs/superpowers/specs/2026-08-05-course-creator-studio-design.md` § Phase 3  
**Authoring references:** `skills/openedu-course-authoring/`, `packages/course-compiler/`

**Out of scope:** Full agentic multi-agent orchestration in-process; replacing the portable skill; LMS features; Phase 5 hosting; mandatory PDF pipeline (PDF is stretch — notes/outline is MVP).

---

## Architecture & design-system constraints (mandatory)

1. Same Studio UI / i18n / token rules as Phase 0–1.
2. **Never** expose API keys in client bundles. Keys via env on the Vite/Node process only (`OPEN_EDU_STUDIO_LLM_*` or existing llm-config env vars — match repo conventions when implementing).
3. Generation is **best-effort**: on failure or missing key, UI shows a clear offline message and keeps template gallery working.
4. Generated output must be valid OpenEdu packages (compiler + `edu`-equivalent validate). Prefer calling `compile()` from `@open-edu/course-compiler` programmatically, not `child_process` to CLI, unless programmatic API is insufficient.
5. Human-in-the-loop: do not auto-export `.oep` from AI without review; encourage Preview before Share (ready check may add “Reviewed AI draft” soft recommendation, not hard gate unless product decides otherwise — **soft** in this plan).
6. Add `@open-edu/course-compiler` and `@open-edu/llm-config` workspace deps to `apps/dev-server` if not present.

---

## File structure

| File                                                          | Status | Responsibility                                       |
| ------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| `packages/i18n/locales/en/studio.json`                        | Modify | AI start/review copy                                 |
| `apps/dev-server/package.json`                                | Modify | course-compiler + llm-config deps                    |
| `apps/dev-server/src/studio/ai/types.ts`                      | Create | Generate request/response, quality item types        |
| `apps/dev-server/src/studio/ai/qualityMap.ts`                 | Create | Map compiler/quality signals → ReadyCheck-like items |
| `apps/dev-server/src/studio/ai/qualityMap.test.ts`            | Create | Mapping tests                                        |
| `apps/dev-server/src/studio/ai/draftPrompt.ts`                | Create | Prompt builder notes → course-spec JSON              |
| `apps/dev-server/src/studio/ai/draftPrompt.test.ts`           | Create | Prompt tests                                         |
| `apps/dev-server/src/studio/ai/generateCourse.ts`             | Create | Server-side generate+compile orchestration           |
| `apps/dev-server/src/studio/ai/generateCourse.test.ts`        | Create | Orchestration tests with mocks                       |
| `apps/dev-server/vite.config.ts`                              | Modify | `/api/studio/ai/*` endpoints                         |
| `apps/dev-server/src/studio/studioApi.ts`                     | Modify | `generateFromNotes`, `getAiStatus`, refine helpers   |
| `apps/dev-server/src/studio/components/AiStartPanel.tsx`      | Create | Replace Phase 1 stub                                 |
| `apps/dev-server/src/studio/components/AiStartPanel.test.tsx` | Create | Start panel tests                                    |
| `apps/dev-server/src/studio/components/AiReviewView.tsx`      | Create | Accept/reject + quality checklist                    |
| `apps/dev-server/src/studio/components/AiReviewView.test.tsx` | Create | Review tests                                         |
| `apps/dev-server/src/studio/components/HomeView.tsx`          | Modify | Wire real AI panel                                   |
| `apps/dev-server/src/studio/StudioApp.tsx`                    | Modify | Add `ai-review` view                                 |
| `apps/dev-server/src/studio/types.ts`                         | Modify | Extend `StudioView`                                  |

---

### Task 1: Types, i18n, dependencies

**Files:**

- Modify: `packages/i18n/locales/en/studio.json`
- Modify: `apps/dev-server/package.json`
- Create: `apps/dev-server/src/studio/ai/types.ts`

- [ ] **Step 1: Add deps**

```bash
pnpm --filter @open-edu/dev-server add @open-edu/course-compiler@workspace:* @open-edu/llm-config@workspace:*
```

- [ ] **Step 2: i18n keys**

```json
{
  "home.aiHeading": "Or start with AI",
  "home.aiLede": "Paste your notes or lesson outline. We’ll draft a course you can edit.",
  "ai.notesLabel": "Your notes",
  "ai.notesPlaceholder": "Topic, what students should learn, any quiz ideas…",
  "ai.generate": "Generate draft",
  "ai.generating": "Generating draft…",
  "ai.unavailable": "AI is unavailable offline or no API key is configured. Use a template instead.",
  "ai.reviewTitle": "Review AI draft",
  "ai.reviewLede": "Check the outline and quality notes, then accept to edit in Studio.",
  "ai.accept": "Accept draft",
  "ai.reject": "Discard and start over",
  "ai.improveLesson": "Improve this lesson",
  "ai.addQuiz": "Add a quiz",
  "ai.qualityHeading": "Quality check",
  "ai.quality.objectives": "Learning goals look measurable",
  "ai.quality.assessment": "Practice/quiz aligns with the lesson",
  "ai.quality.duration": "Estimated length is reasonable",
  "ai.quality.completeness": "Required course fields are present",
  "ai.errorGeneric": "Could not generate a draft. Try again or use a template."
}
```

Update any Phase 1 “Coming soon” keys still referenced by HomeView.

- [ ] **Step 3: types**

```ts
export interface AiGenerateRequest {
  notes: string;
  titleHint?: string;
  locale?: string;
}

export interface AiQualityItem {
  id: string;
  labelKey: string;
  passed: boolean;
  detail?: string;
}

export interface AiGenerateResult {
  success: boolean;
  quality: AiQualityItem[];
  outlinePreview: Array<{ title: string; kind: string }>;
  error?: string;
}
```

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(dev-server): add Phase 3 AI authoring deps and studio AI types

EOF
)"
```

---

### Task 2: Prompt builder + quality map (pure)

**Files:**

- Create: `apps/dev-server/src/studio/ai/draftPrompt.ts`
- Create: `apps/dev-server/src/studio/ai/draftPrompt.test.ts`
- Create: `apps/dev-server/src/studio/ai/qualityMap.ts`
- Create: `apps/dev-server/src/studio/ai/qualityMap.test.ts`

- [ ] **Step 1: draftPrompt tests**

Assert `buildCourseSpecPrompt(notes)` includes notes text, asks for **only** JSON course-spec compatible with course-compiler JSON input, and mentions constraints (short lesson count for teachers, measurable objectives).

- [ ] **Step 2: Implement prompt builder**

Read `packages/course-compiler` JSON input shape (`parseCourseSpecJSON` / examples of `course-spec.json` in repo or skill artifact contract). Prompt must request that shape explicitly. Include a `extractJsonObject(text)` helper that strips markdown fences.

- [ ] **Step 3: qualityMap**

Map:

- Compiler diagnostics → completeness/quality items
- Lightweight heuristics on generated outline (lesson count 1–6, has ≥1 assessment-like node)

```ts
export function mapDiagnosticsToQuality(
  diagnostics: Array<{ severity: string; message: string; code?: string }>,
  outline: Array<{ title: string; kind: string }>,
): AiQualityItem[];
```

No dependency on running the full skill `quality-report.mjs` in Phase 3 MVP — port the _ideas_ of the rubric, not the whole script.

- [ ] **Step 4: Tests PASS + commit**

```bash
git commit -m "$(cat <<'EOF'
feat(dev-server): add AI draft prompt and quality mapping helpers

EOF
)"
```

---

### Task 3: Server-side `generateCourse` + Vite API

**Files:**

- Create: `apps/dev-server/src/studio/ai/generateCourse.ts`
- Create: `apps/dev-server/src/studio/ai/generateCourse.test.ts`
- Modify: `apps/dev-server/vite.config.ts`
- Modify: `apps/dev-server/src/studio/studioApi.ts`

- [ ] **Step 1: Ai status endpoint**

`GET /api/studio/ai/status` → `{ available: boolean, reason?: 'missing-key' | 'disabled' }`

Detect env key presence without returning the secret.

- [ ] **Step 2: generateCourse orchestration (test with mocks)**

```ts
export async function generateCourseDraft(options: {
  notes: string;
  packageDir: string;
  completeText: (prompt: string) => Promise<string>; // inject LLM
  compile: typeof import('@open-edu/course-compiler').compile; // inject
}): Promise<AiGenerateResult>;
```

Algorithm:

1. If notes trimmed length < N (e.g. 40), return error “Add more detail”
2. `completeText(buildCourseSpecPrompt(notes))`
3. `extractJsonObject` → write temp `course-spec.json` under `os.tmpdir()` or `.edu/studio-ai/` inside package
4. `compile(specPath, { output: packageDir, validate: true })`
5. If compile fails, return diagnostics mapped via `qualityMap`
6. If success, build outline preview from written package files + quality items

**Overwrite policy:** Refuse to generate into a package that already has `nodes/` unless `force: true`. Home “Generate draft” on a fresh template dir may use force after confirm dialog; default for empty/new: allow.

- [ ] **Step 3: Wire LLM via `@open-edu/llm-config`**

Follow existing factory patterns used by learner/Pipili (search `ModelFactory` / `createModel` in repo). Keep provider selection env-driven. If llm-config cannot be called from Vite Node context, add a thin `studioLlm.ts` wrapper with a clear interface and mock in tests.

- [ ] **Step 4: POST `/api/studio/ai/generate`**

Body: `{ notes, force?: boolean }` → runs orchestration against `OPEN_EDU_PACKAGE_DIR`.

- [ ] **Step 5: studioApi client methods**

```ts
getAiStatus(): Promise<{ available: boolean; reason?: string }>
generateFromNotes(notes: string, force?: boolean): Promise<AiGenerateResult>
```

- [ ] **Step 6: Tests + commit**

```bash
git commit -m "$(cat <<'EOF'
feat(dev-server): add studio AI generate API and compile orchestration

EOF
)"
```

---

### Task 4: AiStartPanel + AiReviewView UI

**Files:**

- Create: `apps/dev-server/src/studio/components/AiStartPanel.tsx`
- Create: `apps/dev-server/src/studio/components/AiStartPanel.test.tsx`
- Create: `apps/dev-server/src/studio/components/AiReviewView.tsx`
- Create: `apps/dev-server/src/studio/components/AiReviewView.test.tsx`
- Modify: `HomeView.tsx`, `StudioApp.tsx`, `types.ts`

- [ ] **Step 1: AiStartPanel**

On mount call `getAiStatus()`. If unavailable, show `ai.unavailable` + emphasize templates (no fake enabled Generate). If available: `Textarea` + Generate button → loading state → on success navigate to `ai-review` with result in state (React state or sessionStorage key `openedu.studio.ai.review`).

Use design-system `Button`, `Textarea`, `Card`, `EmptyState`.

- [ ] **Step 2: AiReviewView**

Show:

- Outline preview list
- Quality checklist (`labelKey` via `t()`)
- Accept → `onNavigate('outline')` + `recordRecentCourse`
- Discard → clear generated files policy: either re-apply empty/template or leave and go Home — **prefer** “Discard” restores previous snapshot if you saved one; if too heavy for MVP, Discard only navigates Home and shows warning that files may remain, with “Reset from template” CTA. Document chosen behavior in test.

- [ ] **Step 3: Refine actions (MVP)**

`Improve this lesson` / `Add a quiz` can be Phase 3.1 stretch. Minimum for Phase 3 exit: **generate + review + accept**. If implementing refine in this plan:

- `POST /api/studio/ai/refine` with `{ action: 'add-quiz' | 'improve-lesson', path?: string }`
- Same compile pipeline on a patched course-spec

Mark refine as optional sub-tasks only after generate/review works.

- [ ] **Step 4: Tests + commit**

```bash
git commit -m "$(cat <<'EOF'
feat(dev-server): add AI start and draft review views for Studio

EOF
)"
```

---

### Task 5: Offline fallback + acceptance

- [ ] **Step 1: Ensure Home still works with AI unavailable** (test + manual)

- [ ] **Step 2: Manual happy path with key configured**

1. Paste notes → Generate
2. Review quality + outline
3. Accept → edit in Outline
4. Preview → Share `.oep`

- [ ] **Step 3: Verification commands**

```bash
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server lint
```

- [ ] **Step 4: Commit polish**

```bash
git commit -m "$(cat <<'EOF'
feat(dev-server): complete Course Creator Studio Phase 3 AI authoring loop

EOF
)"
```

---

## Stretch (same phase only if time)

- PDF upload → extract text locally (simple pdf parse) **or** hand off to `open-edu-pipeline` when detected
- Persist AI review history

## Phase 3 exit criteria

- [ ] AI start works when key present
- [ ] Clear fallback when AI unavailable
- [ ] Draft compiles to package teacher can edit
- [ ] Plain-language quality checklist shown
- [ ] Accept → Outline/edit/share path unchanged
- [ ] No secrets in client

## Follow-on

Phase 4 plan: `docs/superpowers/plans/2026-08-05-course-creator-studio-phase4.md`
