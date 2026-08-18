# OpenEdu hosted Studio: independent implementation plan

**Date:** 2026-08-17  
**Target agent:** DeepSeek-4-Flash  
**Repository:** `/Users/sarthakpatnaik/Code/open-edu`  
**Design:** [`docs/superpowers/specs/2026-08-17-phase0-saas-design.md`](../specs/2026-08-17-phase0-saas-design.md)  
**Implementation spec:** [`docs/superpowers/specs/2026-08-17-phase0-saas-implementation-spec.md`](../specs/2026-08-17-phase0-saas-implementation-spec.md)

## 1. Mission

Implement the approved two-phase hosted Studio architecture:

- Phase 1: browser-local, lossless course authoring, validation, preview, `.oep` import, and `.oep` export
- Phase 2: stateless hosted AI gateway with browser-owned draft state

The implementation must preserve the existing filesystem-backed `edu dev` workflow. Do not use the learner app’s `StoredCourse` as the authoring representation because it cannot preserve arbitrary package files.

This plan is self-contained for an independent agent. Read the referenced design and implementation specs before changing code, then follow the task order exactly.

## 2. Agent operating contract

### 2.1 Read before coding

Read these files first:

1. `AGENTS.md`
2. `openwiki/quickstart.md`
3. `docs/superpowers/specs/2026-08-17-phase0-saas-design.md`
4. `docs/superpowers/specs/2026-08-17-phase0-saas-implementation-spec.md`
5. `packages/core/src/loader.ts`
6. `packages/core/src/manifest.ts`
7. `packages/core/src/workflow.ts`
8. `packages/core/src/rewards.ts`
9. `packages/core/src/cards.ts`
10. `packages/core/src/nodes.ts`
11. `packages/core/src/assets.ts`
12. `packages/storage/src/db.ts`
13. `packages/storage/src/course-store.ts`
14. `apps/dev-server/src/studio/studioApi.ts`
15. `apps/dev-server/src/studio/StudioApp.tsx`
16. `apps/dev-server/src/DevApp.tsx`
17. `apps/dev-server/src/studio/templates/catalog.ts`
18. `apps/dev-server/vite.config.ts`
19. `apps/dev-server/src/studio/ai/`
20. `packages/course-compiler/package.json`

Use `rg` for repository searches. Do not assume a file exists because it appears in a plan. Confirm paths before editing.

### 2.2 Working rules

- Work in a dedicated branch named `codex/phase0-saas-browser-studio` or an isolated worktree.
- Do not reset, discard, or overwrite unrelated user changes.
- Use `apply_patch` for intentional source edits.
- Add tests with each implementation task.
- Run the narrowest relevant tests after each task.
- Preserve existing public behavior unless this plan explicitly changes it.
- Do not add a fallback validator in `apps/dev-server`.
- Do not use CommonJS `require()` in browser code.
- Do not store browser courses in the learner `courses` object store.
- Do not introduce server-side draft persistence.
- Do not put provider credentials in client-exposed environment variables.

### 2.3 DeepSeek execution style

DeepSeek-4-Flash should keep each change small and verify it immediately. For every task:

1. State the intended invariant in a comment or task note.
2. Add or update focused tests.
3. Implement the smallest change satisfying those tests.
4. Run the task verification command.
5. Inspect the diff for unrelated changes.

When an existing abstraction is ambiguous, follow the decisions in the two specs. Do not invent a second storage format, validator, prompt system, or API contract.

## 3. Non-negotiable architecture

```text
StudioApp
   │
   ▼
Explicit StudioApi interface
   ├── local implementation → existing Vite/filesystem endpoints
   └── browser implementation
           ├── lossless StudioCourse store
           ├── browser-safe core loader
           ├── OepReader/OepWriter
           └── Phase 2 browser AI client → stateless Node gateway
```

### 3.1 Storage

Persist Studio courses in a separate `studio-courses` IndexedDB object store owned by `@open-edu/storage`.

The canonical in-memory representation is:

```ts
interface StudioFile {
  path: string;
  data: Uint8Array;
}
```

IndexedDB persists the same files as `{ path, data: ArrayBuffer }[]`. Build an in-memory `Map<string, Uint8Array>` index when loading a course. The array is the persisted source of truth.

### 3.2 Validation and preview

Refactor the six filesystem-bound core helpers into pure parsers plus filesystem adapters. Add `packages/core/src/file-loader.ts` with `loadPackageFromFiles()`. Both filesystem and browser loading must use the same schema and routing checks.

The browser preview calls `loadPackageFromFiles()` and passes the resulting `LoadedPackage` to the existing `CreatorPreview` and preview sidebar. It must not use `virtual:open-edu-package` or synthesize a filesystem path.

### 3.3 API

Write an explicit `StudioApi` interface before moving the current implementation. Both local and browser factories conform to it. The interface includes course, library, preview, storage status, and existing AI methods.

Browser `getPackageDir()` returns `browser://<course-id>`. Browser archive is hard-delete and must not return a fabricated `archivedPath`.

### 3.4 AI

Keep current Vite middleware routes for local `edu dev`. Reuse pure code from `apps/dev-server/src/studio/ai/` in a second serverless transport. The gateway runs on Node.js, never Edge, because the course compiler and core use filesystem/path APIs.

The browser receives complete drafts and owns draft persistence. There is no server `commit` or `discard-draft` endpoint.

## 4. Phase 0: orientation and baseline

### Task 0.1: Inspect repository state

Commands:

```bash
git status --short
rg --files packages/core packages/storage apps/dev-server packages/course-compiler
pnpm --filter @open-edu/core test
pnpm --filter @open-edu/storage test
pnpm --filter @open-edu/dev-server test
```

Record any pre-existing failures. Do not attribute them to this work unless the diff changes the failure.

### Task 0.2: Create the composite browser Studio fixture

Create a new deterministic fixture at `packages/core/src/__fixtures__/browser-studio/`. Do not spend time searching for an existing fixture or combine fixtures dynamically in each test.

The fixture must contain:

- `package.json`
- `workflow.json`
- `rewards.json`
- `cards.json`
- `nodes/lesson.md`
- `nodes/quiz.json`
- `assets/diagram.png` as a small deterministic binary fixture
- `notes.txt` as an unknown text file

Use valid schemas and routing so the fixture loads successfully. Add a fixture README or test comment documenting that it intentionally combines the coverage from `full-package/` and `assets-package/`.

Use the fixture for loader parity, browser storage, import/export, and preview tests.

Verification:

```bash
pnpm --filter @open-edu/core test
```

Checkpoint: do not begin browser wiring until the baseline and fixture are understood.

## 5. Phase 1: browser authoring foundation

Implement Phase 1 completely before beginning Phase 2.

### Task 1.1: Extract pure manifest parsing

Files:

- `packages/core/src/manifest.ts`
- `packages/core/src/manifest.test.ts` or the existing manifest test file

Changes:

- Extract `parseManifest(content, filePath)` from filesystem reading
- Preserve `PackageManifestSchema` validation and diagnostic details
- Make all error context use logical paths such as `package.json`
- Keep `loadManifest(packageDir)` as a filesystem adapter calling the pure parser
- Ensure no browser-safe parser imports `node:fs` or `node:path`

Tests:

- valid manifest
- malformed JSON
- schema-invalid manifest
- logical file path in errors
- filesystem adapter parity

Verification:

```bash
pnpm --filter @open-edu/core test
pnpm --filter @open-edu/core typecheck
```

### Task 1.2: Extract pure workflow parsing

Files:

- `packages/core/src/workflow.ts`
- corresponding workflow tests

Changes:

- Extract `parseWorkflow(content, filePath)`
- Preserve `WorkflowSchema` validation and diagnostic details
- Keep `loadWorkflow(packageDir)` as the filesystem adapter
- Use logical file paths in error context

Tests:

- valid workflow
- malformed JSON
- schema-invalid workflow
- filesystem/in-memory parity

Verification:

```bash
pnpm --filter @open-edu/core test
pnpm --filter @open-edu/core typecheck
```

### Task 1.3: Extract rewards and cards parsing

Files:

- `packages/core/src/rewards.ts`
- `packages/core/src/cards.ts`
- corresponding tests

Changes:

- Extract pure `parseRewards()` and `parseCards()` functions
- Keep optional-file behavior unchanged
- Keep filesystem access in adapters only
- Preserve `RewardsSchema` and `CardDefinitionsSchema` behavior

Tests:

- omitted optional files
- valid files
- malformed JSON
- schema-invalid files
- logical error paths

Verification:

```bash
pnpm --filter @open-edu/core test
```

### Task 1.4: Extract pure node parsing

Files:

- `packages/core/src/nodes.ts`
- corresponding tests

Changes:

- Export or introduce pure `parseNodeContent(relativePath, content)`
- Preserve Markdown title extraction
- Preserve JSON node parsing and `ContentNodeSchema` validation
- Add a source-based node loader that receives a `PackageFileSource`
- Keep directory traversal in the filesystem adapter
- Preserve unsupported-extension and subdirectory behavior

Tests:

- Markdown node
- valid JSON node
- malformed JSON node
- schema-invalid JSON node
- missing `type`
- unsupported extension
- filesystem/in-memory parity

Verification:

```bash
pnpm --filter @open-edu/core test
```

### Task 1.5: Extract asset path processing

Files:

- `packages/core/src/assets.ts`
- corresponding tests

Changes:

- Separate path normalization and asset-list processing from directory traversal
- Add a source-based asset resolver
- Preserve traversal rejection
- Keep filesystem enumeration in the filesystem adapter
- Ensure logical paths work with synthetic browser roots

Tests:

- nested assets
- missing assets directory
- safe relative paths
- absolute paths and traversal rejection
- filesystem/in-memory parity

Verification:

```bash
pnpm --filter @open-edu/core test
```

### Task 1.6: Add the browser-safe file loader

Files:

- `packages/core/src/file-loader.ts`
- `packages/core/src/file-loader.test.ts`
- `packages/core/src/loader.ts`
- `packages/core/src/index.ts`

Define:

```ts
export interface PackageFileSource {
  get(path: string): Uint8Array | undefined;
  list(prefix?: string): string[];
}

export async function loadPackageFromFiles(
  source: PackageFileSource,
  rootDir: string,
): Promise<LoadedPackage>;
```

Implementation:

1. Parse `package.json` through `parseManifest()`.
2. Parse optional sidecars through their pure parsers.
3. Load nodes from `PackageFileSource`.
4. Resolve asset paths from the source.
5. Preserve entry-node validation.
6. Preserve workflow route-key and route-target validation.
7. Return the existing `LoadedPackage` shape with `rootDir` set to a synthetic identifier in browser mode.
8. Make filesystem `loadPackage()` delegate to this shared path.

Do not duplicate validation in `apps/dev-server`.

Tests:

- valid in-memory package
- missing manifest
- invalid manifest
- invalid sidecars
- missing entry node
- invalid route key
- invalid route target
- asset paths
- filesystem and in-memory `LoadedPackage` parity
- errors contain logical paths, not host filesystem roots

Verification:

```bash
pnpm --filter @open-edu/core test
pnpm --filter @open-edu/core typecheck
pnpm --filter @open-edu/core build
```

Checkpoint: Phase 1 cannot continue if browser-safe core loading is weaker than filesystem loading.

### Task 1.7: Add Studio IndexedDB records

This task requires Task 1.6 to be complete, including its core build and export verification. Do not begin storage or dev-server integration against an unbuilt `@open-edu/core` output.

Files:

- `packages/storage/src/db.ts`
- `packages/storage/src/studio-course-store.ts`
- `packages/storage/src/index.ts`
- `packages/storage/src/__tests__/db.test.ts`
- `packages/storage/src/__tests__/studio-course-store.test.ts`

Changes:

- Increase `DB_VERSION` from `4` to `5`
- Create `studio-courses` keyed by `id`
- Add `StoredStudioFile { path, data: ArrayBuffer }`
- Add `StoredStudioCourse { id, version, title, files, updatedAt, source? }`
- Keep learner `courses` store and `StoredCourse` unchanged
- Implement save/get/list/replace/delete functions
- Make replace verify existence inside one read/write transaction

Tests must import `fake-indexeddb/auto`, reset the database between cases, and use unique ids.

Verification:

```bash
pnpm --filter @open-edu/storage test
pnpm --filter @open-edu/storage typecheck
pnpm --filter @open-edu/storage build
```

### Task 1.8: Add path-safe file utilities

Files:

- `apps/dev-server/src/studio/courseFiles.ts`
- `apps/dev-server/src/studio/courseFiles.test.ts`

Implement:

- `normalizeCoursePath`
- `assertSafeCoursePath`
- `isTextCourseFile`
- `cloneCourseFiles`
- `sortCourseFiles`
- `courseFilesToRecord`
- `recordToCourseFiles`

Reject empty, absolute, drive-letter, traversal, normalized duplicate, and backslash traversal paths. Preserve unknown extensions as bytes.

Verification:

```bash
pnpm --filter @open-edu/dev-server test -- courseFiles
```

### Task 1.9: Add browser course store adapter

Files:

- `apps/dev-server/src/studio/browserCourseStore.ts`
- `apps/dev-server/src/studio/browserCourseStore.test.ts`

Implement the `BrowserCourseStore` contract from the implementation spec.

Rules:

- Convert `Uint8Array` to copied `ArrayBuffer` before persistence.
- Convert stored buffers to copied `Uint8Array` values on read.
- Build a `Map<string, Uint8Array>` index on load.
- Persist the array representation, not the map.
- Normalize paths before storage.
- Map IndexedDB failures to stable error codes.
- Preserve last-known-good data after a failed replacement.

Use the existing `fake-indexeddb` setup.

Verification:

```bash
pnpm --filter @open-edu/dev-server test -- browserCourseStore
```

### Task 1.10: Extract the explicit Studio API and local implementation

Files:

- `apps/dev-server/src/studio/studioApi.ts`
- `apps/dev-server/src/studio/localStudioApi.ts`
- existing `apps/dev-server/src/studio/studioApi.test.ts`, renamed or moved to `localStudioApi.test.ts`
- new `apps/dev-server/src/studio/studioApi.contract.test.ts`

Changes:

- Replace inferred `ReturnType<typeof createStudioApi>` with an explicit `StudioApi` interface.
- Include all current course, library, unit, AI, and draft methods.
- Add `importOep`, `getPreviewPackage`, and `getStorageStatus` where required by browser mode.
- Move the current fetch implementation to `createLocalStudioApi()` without changing endpoint paths or response behavior.
- Keep local AI middleware calls unchanged.
- Make both factories type-check against the interface.

Browser contract decisions:

- `getPackageDir()` returns `browser://<course-id>`.
- `archiveCourse()` hard-deletes and returns success without an `archivedPath`.
- Unsupported browser unit/folder operations return stable unsupported errors.

Verification:

```bash
pnpm --filter @open-edu/dev-server test -- studioApi
pnpm --filter @open-edu/dev-server typecheck
```

### Task 1.11: Implement BrowserStudioApi

Files:

- `apps/dev-server/src/studio/browserStudioApi.ts`
- `apps/dev-server/src/studio/browserStudioApi.test.ts`

Implement:

- library listing and opening
- template creation
- read/write/delete file operations
- validation through `loadPackageFromFiles()`
- outline generation and order persistence
- `.oep` export using every stored file
- `.oep` import using the `rawEntries` field from the `OepReader.read()` result or equivalent complete extraction
- deep-copy duplicate
- manifest/title rename
- hard-delete archive behavior

Template flow:

1. Call `getTemplateById()` from `templates/catalog.ts`.
2. Convert every template file to UTF-8 `StudioFile` bytes.
3. Create a new browser course record.
4. Set it active.
5. Reload the browser preview.

Do not call `/api/package/create-from-template` in browser mode.

Import flow:

1. Read and inspect `.oep` bytes.
2. Apply existing ZIP safety checks through `OepReader`.
3. Preserve every content-root entry from the `rawEntries` field on the `OepReader.read()` result, not only recognized sidecars.
4. Validate the complete course through `loadPackageFromFiles()`.
5. Persist the complete file set.
6. Set the imported course active.

Verification:

```bash
pnpm --filter @open-edu/dev-server test -- browserStudioApi
```

### Task 1.12: Build the browser preview bridge

Files:

- `apps/dev-server/src/studio/browserPreview.ts`
- `apps/dev-server/src/studio/browserPreview.test.ts`
- `apps/dev-server/src/studio/StudioApp.tsx`
- `apps/dev-server/src/DevApp.tsx`

Implement a browser runtime session/provider containing:

- `activeCourseId`
- `loadedPackage`
- `isLoading`
- `error`
- `reloadPreview()`

`reloadPreview()` must:

1. Load the active complete `StudioFile[]` from `BrowserCourseStore`.
2. Build a `PackageFileSource`.
3. Call `loadPackageFromFiles()`.
4. Store the resulting `LoadedPackage`.
5. Supply it to `CreatorPreview` and preview sidebar components.

Call it after template creation, import, write, delete, and outline reorder. Keep local mode on the existing virtual module and filesystem package flow.

Do not use a module-level active course id or `require()`.

Verification:

```bash
pnpm --filter @open-edu/dev-server test -- browserPreview StudioApp DevApp
pnpm --filter @open-edu/dev-server typecheck
```

### Task 1.13: Wire session, recent courses, and UI states

Files:

- `apps/dev-server/src/studio/recentCourses.ts`
- `apps/dev-server/src/studio/recentCourses.test.ts`
- `apps/dev-server/src/studio/studioSession.ts` only if needed
- `packages/i18n/locales/en/studio.json`
- affected Studio components

Rules:

- `recentCourses.ts` stores stable browser ids and summaries, not fake paths.
- `studioSession.ts` stores only view and selected-path navigation state.
- Add strings under `studio.browser.*` for loading, storage availability, storage errors, import/export, unsupported operations, and save states.
- Use `t()` for all visible strings.

Verification:

```bash
pnpm --filter @open-edu/dev-server test -- recentCourses
pnpm lint:hardcoded-strings
pnpm --filter @open-edu/cli build
pnpm i18n:validate
```

### Task 1.14: Add browser build and Vercel configuration

Files:

- `apps/dev-server/package.json`
- `apps/dev-server/vite.config.ts`
- `apps/dev-server/tsconfig.json`
- `apps/dev-server/vercel.json`

Decisions:

- Vercel project root is `apps/dev-server`.
- Browser output directory is `dist` relative to that root.
- Serverless functions live under `apps/dev-server/api`.
- Node-only Vite middleware code is excluded from the browser bundle.
- `build:browser` and `preview:browser` are distinct from the local `build` script.
- Add `@open-edu/storage` as a runtime dependency.

Verify the monorepo workspace dependency installation strategy from the selected Vercel root. Do not create duplicate root-level and app-level API routes.

Verification:

```bash
pnpm --filter @open-edu/dev-server build
pnpm --filter @open-edu/dev-server build:browser
```

### Task 1.15: Phase 1 integration and acceptance checkpoint

Add or update a Playwright test under `tests/e2e/` that:

1. Opens the browser build.
2. Creates a template course.
3. Edits two activities.
4. Reloads and confirms persistence.
5. Validates and exports `.oep`.
6. Imports the export under a new course id.
7. Confirms unknown text and binary files remain.
8. Opens preview and completes the first activity.

Use a deterministic fixture with unknown text, binary asset, JSON node, and sidecars.

Phase 1 checkpoint commands:

```bash
pnpm --filter @open-edu/core test
pnpm --filter @open-edu/storage test
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/core typecheck
pnpm --filter @open-edu/storage typecheck
pnpm --filter @open-edu/dev-server typecheck
pnpm build
pnpm --filter @open-edu/dev-server build:browser
pnpm test:e2e -- tests/e2e/studio-browser.spec.ts
```

Phase 1 is blocked if:

- local `edu dev` behavior regresses
- browser validation differs from filesystem validation
- preview cannot render the stored package
- any package file is lost during save or `.oep` round trip
- browser course bytes are sent to a server

Do not start Phase 2 until this checkpoint passes.

## 6. Phase 2: hosted AI gateway

### Task 2.1: Verify Node.js compiler viability first

Files:

- `apps/dev-server/api/ai/runtime-smoke.test.ts`
- `apps/dev-server/api/ai/runtime-smoke-fixture/` if needed
- `apps/dev-server/vercel.json`

Requirements:

- Explicitly configure the function for Node.js runtime.
- Never use Edge runtime.
- Prove the deployed function can load `@open-edu/course-compiler`, `@open-edu/core`, and `@open-edu/llm-config`.
- Compile one fixture course inside the function runtime.
- Confirm temporary files are cleaned up.

This is a Phase 2 blocker. If the compiler cannot bundle or execute in the deployed runtime, stop Phase 2 and report the deployment constraint instead of duplicating the compiler or weakening validation.

Verification:

```bash
pnpm --filter @open-edu/dev-server test -- runtime-smoke
pnpm --filter @open-edu/dev-server build:browser
```

### Task 2.2: Extract shared AI services from Vite middleware

Inspect all files under `apps/dev-server/src/studio/ai/` and the AI route sections in `apps/dev-server/vite.config.ts`.

Start with these key files and directories before scanning the remaining modules:

- `apps/dev-server/src/studio/ai/generateCourse.ts`
- `apps/dev-server/src/studio/ai/itemGenerate.ts`
- `apps/dev-server/src/studio/ai/studioLlm.ts`
- `apps/dev-server/src/studio/ai/ConversationStore.ts`
- `apps/dev-server/src/studio/ai/chat/handler.ts`
- `apps/dev-server/src/studio/ai/chat/messages.ts`
- `apps/dev-server/src/studio/ai/chat/policy.ts`
- `apps/dev-server/src/studio/ai/prompts/`

Then inspect the remaining AI modules for imports and shared types. The goal is to identify transport-independent services, not to rewrite all 34 files.

Extract route-independent operations without changing local behavior:

- prompt builders
- request/body schemas
- model selection
- course draft generation
- item generation
- quality mapping
- chat message/context normalization
- structured output parsing
- error classification

Keep local Vite middleware routes intact and make them call the extracted services. Do not copy prompt strings into `apps/dev-server/api/ai`.

Tests:

- existing AI tests continue passing
- extracted service tests cover the same success and failure cases
- local endpoint route tests remain unchanged

Verification:

```bash
pnpm --filter @open-edu/dev-server test -- ai
pnpm --filter @open-edu/dev-server typecheck
```

### Task 2.3: Define gateway schemas and error contract

Files:

- `apps/dev-server/api/ai/requestSchema.ts`
- `apps/dev-server/api/ai/errors.ts`
- corresponding tests

Define schemas for:

- status request
- notes/spec draft request
- item add/edit request
- chat request
- complete draft response
- structured gateway error

Every response includes a stable `requestId`. Errors must not expose provider keys, raw provider errors, stack traces, temporary paths, or host filesystem roots.

Enforce:

- maximum body size
- maximum notes/context/message count
- maximum generated file count
- maximum response size
- supported content types

Verification:

```bash
pnpm --filter @open-edu/dev-server test -- requestSchema errors
```

### Task 2.4: Implement stateless draft gateway

Files:

- `apps/dev-server/api/ai/[...route].ts`
- `apps/dev-server/api/ai/router.ts`
- `apps/dev-server/api/ai/generateDraft.ts`
- tests

Implement:

- `GET /api/ai/status`
- `POST /api/ai/generate-draft`

Draft request flow:

1. Validate request and limits.
2. Generate or accept the course specification.
3. Compile in a request-scoped temporary directory.
4. Read all compiled files into memory.
5. Validate the compiled package with shared core validation.
6. Return complete file bytes and metadata.
7. Delete temporary files in `finally`.

Do not create `draftRegistry`, server commit endpoints, or server discard endpoints. The browser must be able to commit from the returned response without another gateway request.

Verification:

```bash
pnpm --filter @open-edu/dev-server test -- generateDraft router
```

### Task 2.5: Implement item generation and chat routes

Files:

- `apps/dev-server/api/ai/itemGeneration.ts`
- `apps/dev-server/api/ai/chat.ts`
- route tests

Implement:

- `POST /api/ai/item`
- `POST /api/ai/chat`

Reuse existing prompt builders and result types. Validate generated item content before returning it. Preserve the existing chat message/context contract where possible. Stream deterministic terminal success or error events.

Verification:

```bash
pnpm --filter @open-edu/dev-server test -- itemGeneration chat
```

### Task 2.6: Add gateway safeguards

Files:

- `apps/dev-server/api/ai/router.ts`
- `apps/dev-server/api/ai/errors.ts`
- `apps/dev-server/vercel.json`
- safeguards tests

Implement:

- explicit allowed-origin policy
- `OPTIONS` handling only for allowed origins
- request timeout
- model/provider allowlist
- platform-compatible rate limit
- spend or invocation budget
- response-size limit
- safe error logging

Do not treat an in-memory `Map` as a globally reliable serverless rate limiter. If a platform facility is unavailable, document the limitation and enforce per-request cost bounds.

Verification:

```bash
pnpm --filter @open-edu/dev-server test -- safeguards router
```

### Task 2.7: Implement browser AI client and local draft lifecycle

Files:

- `packages/storage/src/db.ts`
- `packages/storage/src/studio-draft-store.ts`
- `packages/storage/src/index.ts`
- `packages/storage/src/__tests__/studio-draft-store.test.ts`
- `apps/dev-server/src/studio/browserAiClient.ts`
- `apps/dev-server/src/studio/browserAiClient.test.ts`
- affected AI UI/provider files

Implement:

- This task extends the implementation spec with explicit browser persistence for pending drafts. Add the draft store and migration before wiring the client so reload-safe draft behavior has a defined owner.
- At the start of Phase 2, bump the storage database version from `5` to `6`.
- Add a `studio-drafts` object store keyed by draft id.
- Persist complete draft `StoredStudioFile[]`, course id, title/metadata, and timestamps.
- Delete a draft record after local accept or discard.
- Never write draft records from the gateway.

- `/api/ai/status`
- `/api/ai/generate-draft`
- `/api/ai/item`
- `/api/ai/chat`

Rules:

- No API keys in browser requests.
- Map gateway errors to `StudioApiError` codes.
- Store complete pending drafts in the dedicated `studio-drafts` store in the same browser-owned database.
- Accept and discard locally.
- Preserve pending drafts across reload.
- Do not mutate the active course until the user accepts a draft.
- Keep manual authoring available when the gateway is unavailable.

Local mode continues using existing Vite middleware endpoints.

Verification:

```bash
pnpm --filter @open-edu/dev-server test -- browserAiClient StudioAssistant
pnpm --filter @open-edu/dev-server typecheck
```

### Task 2.8: Phase 2 integration and acceptance checkpoint

Add a mocked-gateway Playwright flow:

1. Enter notes.
2. Receive a complete draft.
3. Reload without losing the pending draft.
4. Accept it locally.
5. Edit the generated course.
6. Export `.oep`.
7. Repeat with gateway failure.
8. Confirm manual authoring still works.

Phase 2 checkpoint commands:

```bash
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server build:browser
pnpm test:e2e -- tests/e2e/studio-ai.spec.ts
pnpm lint
pnpm typecheck
pnpm format:check
```

Phase 2 is blocked if the Node.js compiler smoke test fails, if drafts depend on server instance memory, or if provider credentials enter the browser bundle.

## 7. Final verification and handoff

Before claiming completion:

1. Run `git diff --check`.
2. Run focused tests for every changed package.
3. Run affected app tests.
4. Run Phase 1 and Phase 2 acceptance flows.
5. Run `pnpm lint`, `pnpm typecheck`, and `pnpm format:check`.
6. Inspect the browser bundle for `node:fs`, `node:path`, and provider credential names.
7. Inspect `git diff --stat` and confirm no unrelated files changed.
8. Report any pre-existing failures separately from new failures.

Do not claim the work is complete without verification output.

## 8. Expected implementation file groups

### Phase 1

```text
packages/core/src/manifest.ts
packages/core/src/workflow.ts
packages/core/src/rewards.ts
packages/core/src/cards.ts
packages/core/src/nodes.ts
packages/core/src/assets.ts
packages/core/src/loader.ts
packages/core/src/file-loader.ts
packages/core/src/index.ts
packages/storage/src/db.ts
packages/storage/src/studio-course-store.ts
packages/storage/src/index.ts
apps/dev-server/src/studio/courseFiles.ts
apps/dev-server/src/studio/browserCourseStore.ts
apps/dev-server/src/studio/studioApi.ts
apps/dev-server/src/studio/localStudioApi.ts
apps/dev-server/src/studio/browserStudioApi.ts
apps/dev-server/src/studio/browserPreview.ts
apps/dev-server/src/studio/StudioApp.tsx
apps/dev-server/src/DevApp.tsx
apps/dev-server/src/studio/recentCourses.ts
packages/i18n/locales/en/studio.json
apps/dev-server/vercel.json
```

### Phase 2

```text
packages/storage/src/db.ts
packages/storage/src/studio-draft-store.ts
packages/storage/src/__tests__/studio-draft-store.test.ts
apps/dev-server/api/ai/[...route].ts
apps/dev-server/api/ai/router.ts
apps/dev-server/api/ai/requestSchema.ts
apps/dev-server/api/ai/generateDraft.ts
apps/dev-server/api/ai/itemGeneration.ts
apps/dev-server/api/ai/chat.ts
apps/dev-server/api/ai/errors.ts
apps/dev-server/src/studio/browserAiClient.ts
```

## 9. Stop conditions

Stop and report instead of guessing when:

- the repository’s current package or API shape conflicts with the plan
- core validation parity cannot be achieved without changing package semantics
- the browser preview cannot construct `LoadedPackage` from files
- the Vercel project root cannot resolve workspace dependencies
- the course compiler cannot run in the Node.js function runtime
- a test failure persists after three focused correction attempts
- a proposed fix would change learner storage semantics or local Studio behavior outside this plan
