# OpenEdu hosted Studio: implementation spec

**Date:** 2026-08-17  
**Status:** Draft for review  
**Design:** [`2026-08-17-phase0-saas-design.md`](./2026-08-17-phase0-saas-design.md)  
**Source app:** `apps/dev-server`

## 1. Purpose

This document turns the approved two-phase hosted Studio design into an implementation sequence. It defines the files, interfaces, package changes, test coverage, and deployment work required to deliver:

- Phase 1: browser-local, lossless course authoring and `.oep` exchange
- Phase 2: stateless hosted AI authoring through a serverless gateway

The implementation must preserve the existing local `edu dev` workflow and must not adapt browser courses through the learner app’s narrower `StoredCourse` representation.

## 2. Implementation rules

1. The OpenEdu package format remains the source of truth.
2. Every Phase 1 write and export preserves unknown package files.
3. Existing schemas and validation behavior are reused rather than duplicated.
4. The UI depends on `StudioApi`, not on IndexedDB, filesystem, or Vercel details.
5. Browser code uses ESM-compatible imports and browser-safe dependencies.
6. AI requests never make the gateway the owner of course or draft state.
7. Each work item adds or updates Vitest coverage before it is considered complete.
8. Local mode must remain usable when browser-only modules are unavailable.

## 3. Target architecture

```text
StudioApp
   │
   ▼
StudioApi
   ├── createLocalStudioApi()
   │       └── existing filesystem/Vite endpoints
   └── createBrowserStudioApi()
           ├── BrowserCourseStore
           │       └── @open-edu/storage: studio-courses store
           ├── package validation/loading from bytes
           ├── OepReader/OepWriter
           └── Phase 2: fetch('/api/ai/*')
```

The existing `@open-edu/storage` package remains the IndexedDB owner, but Studio courses use a separate object store from learner-installed courses. The two records can share package bytes through `.oep`; they do not require identical storage shapes.

The persisted Studio representation is an array of `{ path, data }` records for structured-clone compatibility. `BrowserCourseStore` must build an in-memory `Map<string, Uint8Array>` index when it loads a course, so editor reads and writes do not scan the persisted array for every operation. The index is rebuilt after each successful replacement and is never treated as the persisted source of truth.

## 4. Phase 1 implementation

### 4.1 Add a lossless Studio storage model

Modify `packages/storage/src/db.ts`:

- Increase `DB_VERSION` from `4` to `5`
- Add a `studio-courses` object store keyed by `id`
- Add types for `StoredStudioCourse` and `StoredStudioFile`
- Keep the existing `courses` store and `StoredCourse` type unchanged

Use structured-clone-compatible records rather than `Map` values in IndexedDB:

```ts
interface StoredStudioFile {
  path: string;
  data: ArrayBuffer;
}

interface StoredStudioCourse {
  id: string;
  version: string;
  title: string;
  files: StoredStudioFile[];
  updatedAt: string;
  source?: {
    kind: 'template' | 'oep-import' | 'browser-created';
    label?: string;
  };
}
```

All package entries, including JSON, Markdown, widgets, localization files, and unknown files, are stored as bytes. The editor decodes text only at the UI boundary.

Add `packages/storage/src/studio-course-store.ts` with:

- `saveStudioCourse(course)`
- `getStudioCourse(id)`
- `listStudioCourses()`
- `replaceStudioCourse(id, course)`
- `deleteStudioCourse(id)`

`replaceStudioCourse` must verify that the record exists inside the same read/write transaction before replacing it. A failed replacement must leave the prior record intact.

Update `packages/storage/src/index.ts` to export the new functions and types. Add migration and store-operation tests in `packages/storage/src/__tests__/studio-course-store.test.ts` and `packages/storage/src/__tests__/db.test.ts`.

### 4.2 Add the browser course store adapter

Create `apps/dev-server/src/studio/browserCourseStore.ts`.

Its public contract should operate on a complete package file map:

```ts
interface StudioFile {
  path: string;
  data: Uint8Array;
}

interface BrowserCourse {
  id: string;
  version: string;
  title: string;
  files: StudioFile[];
  updatedAt: number;
}

interface BrowserCourseStore {
  list(): Promise<BrowserCourseSummary[]>;
  get(id: string): Promise<BrowserCourse | null>;
  create(course: BrowserCourse): Promise<void>;
  replace(id: string, course: BrowserCourse): Promise<void>;
  duplicate(sourceId: string, newId: string, title: string): Promise<void>;
  delete(id: string): Promise<void>;
}
```

Responsibilities:

- convert between `Uint8Array` and IndexedDB `ArrayBuffer`
- normalize and validate relative paths
- preserve file order only where needed for UI; export ordering must be deterministic
- copy byte arrays before persistence to avoid caller mutation
- map storage failures to stable errors such as `storage-unavailable`, `quota-exceeded`, and `course-not-found`

Do not expose the underlying IndexedDB database to Studio components.

### 4.3 Implement path safety and file-map utilities

Create `apps/dev-server/src/studio/courseFiles.ts`.

Provide pure functions for:

- `normalizeCoursePath(path)`
- `assertSafeCoursePath(path)`
- `isTextCourseFile(path)`
- `cloneCourseFiles(files)`
- `sortCourseFiles(files)`
- `courseFilesToRecord(files)`
- `recordToCourseFiles(record)`

Path validation must reject:

- empty paths
- absolute POSIX paths
- Windows drive paths
- `.` and `..` segments
- backslash traversal after normalization
- duplicate normalized paths

Keep file classification separate from preservation. Unsupported text extensions remain stored and exported as bytes.

Add tests for POSIX paths, Windows paths, traversal, duplicate paths, binary data, and byte cloning.

### 4.4 Refactor core loading for browser safety

This is the first Phase 1 work item because the current `packages/core` loader reads from filesystem-bound helpers. `packages/core/src/loader.ts` orchestrates helpers that import `node:fs` or `node:path`: `manifest.ts`, `workflow.ts`, `rewards.ts`, `cards.ts`, `nodes.ts`, and `assets.ts`.

Refactor each helper into a pure parser plus a filesystem adapter:

- `manifest.ts`: extract `parseManifest(content, filePath)`; keep `loadManifest(packageDir)` as the filesystem adapter
- `workflow.ts`: extract `parseWorkflow(content, filePath)`; keep `loadWorkflow(packageDir)` as the filesystem adapter
- `rewards.ts`: extract `parseRewards(content, filePath)`; keep `loadRewards(packageDir)` as the filesystem adapter
- `cards.ts`: extract `parseCards(content, filePath)`; keep `loadCards(packageDir)` as the filesystem adapter
- `nodes.ts`: extract `parseNodeContent(relativePath, content)` and add a source-based node loader; keep directory traversal in the filesystem adapter
- `assets.ts`: extract normalized path and asset-list processing; keep directory traversal in the filesystem adapter

Add `packages/core/src/file-loader.ts` as the browser-safe orchestration layer:

```ts
interface PackageFileSource {
  get(path: string): Uint8Array | undefined;
  list(prefix?: string): string[];
}

async function loadPackageFromFiles(
  source: PackageFileSource,
  rootDir: string,
): Promise<LoadedPackage>;
```

The filesystem `loadPackage()` in `loader.ts` should build a `PackageFileSource` and delegate to `loadPackageFromFiles()`. The shared implementation must retain:

- `PackageManifestSchema`
- `WorkflowSchema`
- `RewardsSchema`
- `CardDefinitionsSchema`
- `ContentNodeSchema`
- entry-node validation
- workflow target validation
- node parsing and asset path resolution

Update the shared core error constructors so their context uses logical package paths such as `package.json` and `nodes/intro.md`. Browser-safe errors must not include host filesystem roots, `node:path` output, or assumptions that the package exists on disk.

Expose the new function from `packages/core/src/index.ts`. Add browser-safe tests that compare representative filesystem and in-memory loads.

Do not use a fallback validator in `apps/dev-server`. If the extraction requires staged commits, the first stage may introduce the pure parser functions while keeping the public filesystem APIs unchanged, but browser loading is blocked until all required checks delegate to the shared path.

### 4.5 Extract the Studio API contract

Modify `apps/dev-server/src/studio/studioApi.ts`:

- write an explicit `StudioApi` interface and shared error types in the module
- keep request helpers private to the local implementation
- preserve existing method names and response shapes used by Studio components

Create `apps/dev-server/src/studio/localStudioApi.ts` by moving the current fetch-based implementation with behavior unchanged. Keep the current `/api/package`, `/api/studio/ai`, and `/api/studio/library` paths for local mode.

Do not retain `ReturnType<typeof createStudioApi>` as the public contract. Both implementations must conform to the explicit interface:

```ts
export interface StudioApi {
  getPackageDir(): Promise<string>;
  validate(): Promise<ValidationResult>;
  getOutline(): Promise<OutlineResult>;
  saveOutlineOrder(paths: string[]): Promise<{ success: boolean }>;
  applyTemplate(templateId: string): Promise<{ success: boolean }>;
  getLibrary(): Promise<LibraryResult>;
  openLibraryCourse(relativePath: string): Promise<{ success: boolean; packageDir: string }>;
  duplicateCourse(
    relativePath: string,
    newId: string,
    newTitle: string,
  ): Promise<{ success: boolean; entry: LibraryEntry }>;
  renameCourse(
    relativePath: string,
    newTitle: string,
  ): Promise<{ success: boolean; entry: LibraryEntry }>;
  archiveCourse(relativePath: string): Promise<{ success: boolean; archivedPath?: string }>;
  exportOep(): Promise<{ blob: Blob; fileName: string }>;
  importOep(bytes: Uint8Array): Promise<CourseSummary>;
  readFile(path: string): Promise<{ path: string; content: string }>;
  writeFile(path: string, content: string): Promise<{ success: boolean }>;
  deleteFile(path: string): Promise<{ success: boolean; path: string }>;
  getPreviewPackage(): Promise<LoadedPackage | null>;
  getStorageStatus(): Promise<StorageStatus>;
  getAiStatus(): Promise<AiStatus>;
  // Existing AI, unit, and draft methods remain in this shared interface.
}
```

Define `ValidationResult`, `OutlineResult`, `CourseSummary`, `LibraryResult`, `LibraryEntry`, `StorageStatus`, and `AiStatus` beside the interface or in `apps/dev-server/src/studio/types.ts`. Type-level conformance tests must compile both factories against `StudioApi`.

`getPackageDir()` returns the local filesystem package directory in local mode. Browser mode returns the stable synthetic identifier `browser://<course-id>`. Consumers must treat this value as a display and session identifier, not as a filesystem path.

The API contract must add browser-required operations where the current UI needs them:

- `importOep(bytes: Uint8Array)`
- `getPreviewPackage()` or an equivalent browser-safe preview operation
- `getStorageStatus()` for persistence notices and quota failures

Avoid adding browser-specific methods to components. The API factory should provide no-op or explicit unsupported responses for features outside the current phase, such as unit bundles.

### 4.6 Implement `BrowserStudioApi`

Create `apps/dev-server/src/studio/browserStudioApi.ts`.

The implementation owns the active course identifier inside a provider/session rather than a module-level singleton. This prevents stale course state when the app changes course or when tests run in parallel.

Implement these behaviors:

| API operation       | Browser behavior                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `getLibrary`        | list `BrowserCourseStore` summaries                                                                              |
| `openLibraryCourse` | set active course and return browser package identifier                                                          |
| `applyTemplate`     | read `templates/catalog.ts`, convert every file to bytes, create a new record, set it active, and reload preview |
| `readFile`          | decode a stored file as UTF-8, with an explicit binary-file error                                                |
| `writeFile`         | encode UTF-8, update the complete file set, and replace atomically                                               |
| `deleteFile`        | remove one file and replace atomically                                                                           |
| `validate`          | call shared browser-safe package validation                                                                      |
| `getOutline`        | derive outline from validated package files                                                                      |
| `saveOutlineOrder`  | update manifest/workflow files and persist the full set                                                          |
| `exportOep`         | build an archive from every stored file                                                                          |
| `importOep`         | inspect, read, validate, and persist every archive content file                                                  |
| `duplicateCourse`   | deep-copy all file bytes into a new record                                                                       |
| `renameCourse`      | update title in the manifest and record metadata                                                                 |
| `archiveCourse`     | hard-delete the browser record and return `{ success: true }`; do not fabricate an archived path                 |

`importCourseFolder`, `createUnit`, and `exportUnitOep` must return stable `unsupported-in-browser` errors until their browser-specific designs exist. The import UI must call `importOep`, not a folder-import method that always throws.

The existing `templates/catalog.ts` remains the canonical template source. Browser mode must not route template creation through `/api/package/create-from-template`; local mode continues to use that endpoint.

### 4.7 Wire browser mode without changing local mode

Modify `apps/dev-server/src/studio/StudioApp.tsx` and `apps/dev-server/src/DevApp.tsx`:

- inject `StudioApi` instead of constructing it inside `StudioApp`
- add a browser-mode bootstrap that loads the course list asynchronously
- keep `loadedPackage` nullable during bootstrap
- derive the active browser preview package from the current complete file map
- refresh the preview after a successful write or imported course
- preserve the existing virtual package module and filesystem preview path in local mode

Use an explicit `StudioRuntime` or provider containing:

- `api`
- active course id
- current browser package
- loading state
- storage status
- refresh function

Do not use synchronous `require()` or module-level mutable active-course state. Use static imports or an async bootstrap with `import()`.

The Creator preview must call `loadPackageFromFiles()` with the active `StudioFile[]` and provide the resulting `LoadedPackage` to the existing `CreatorPreview` and preview sidebar components. It must not synthesize a filesystem path or use `virtual:open-edu-package`.

The browser runtime session should expose `activeCourseId`, `loadedPackage`, `isLoading`, `error`, and `reloadPreview()`. Every successful template creation, import, file write, delete, or outline reorder calls `reloadPreview()` after persistence succeeds.

### 4.8 Add browser build configuration

Modify `apps/dev-server/vite.config.ts`, `apps/dev-server/package.json`, and `apps/dev-server/tsconfig.json`:

- add an explicit browser build mode
- keep Node-only Vite dev-server plugin code out of the browser bundle
- add `build:browser` and `preview:browser` scripts
- include browser entry files in TypeScript configuration where required
- add `@open-edu/storage` as a runtime workspace dependency
- preserve the current `build` script for local TypeScript output

Use `apps/dev-server` as the Vercel project root. Place serverless functions under `apps/dev-server/api`, set the output directory to `dist`, and keep the repository root out of the Vercel build context except for workspace dependency installation.

### 4.9 Add Phase 1 user-facing states

Add translated Studio strings for:

- browser storage available and local-only notice
- loading browser courses
- no saved courses
- IndexedDB unavailable
- storage quota exceeded
- import success and import failure
- export success and export failure
- unsupported browser-only operation
- unsaved, saving, saved, and save-failed states

All new visible strings must use `@open-edu/i18n` and be added to `packages/i18n/locales/en/studio.json`.

Use the existing `studio.*` namespace with a `studio.browser.*` subtree, for example `studio.browser.storageNotice`, `studio.browser.storageUnavailable`, `studio.browser.importSuccess`, and `studio.browser.saveFailed`.

Update `apps/dev-server/src/studio/recentCourses.ts` to store browser course identifiers and summaries without filesystem paths. Keep `studioSession.ts` limited to view and selected-path navigation state; it must not become a second course persistence layer.

## 5. Phase 1 test plan

### 5.1 Storage and file preservation

Add:

- `packages/storage/src/__tests__/studio-course-store.test.ts`
- `apps/dev-server/src/studio/courseFiles.test.ts`
- `apps/dev-server/src/studio/browserCourseStore.test.ts`

Import `fake-indexeddb/auto` in the storage and dev-server test setup. Reuse the existing `fake-indexeddb` dev dependency rather than adding a second IndexedDB mock. Reset the database between tests and use unique course ids to avoid cross-test records.

Cover:

- database migration from version 4 to version 5
- create/get/list/replace/delete
- failed replacement preserving the old record
- quota and unavailable-database error mapping
- text, binary, unknown, and nested package files
- duplicate and traversal rejection
- deep-copy behavior

### 5.2 Core loading and validation

Add tests for:

- in-memory loading of a valid package
- invalid manifest, workflow, reward, card, and node files
- missing entry node
- invalid workflow route targets
- asset discovery and path safety
- parity between filesystem and in-memory package loading

### 5.3 Browser API

Add `apps/dev-server/src/studio/browserStudioApi.test.ts` covering:

- template creation
- library listing and opening
- read/write/delete file behavior
- outline ordering
- validation errors
- import/export
- unknown-file preservation
- duplicate and rename
- unsupported unit operations
- active-course changes without stale state

Move the existing `apps/dev-server/src/studio/studioApi.test.ts` with the local implementation and preserve its current fetch-route assertions. Add `apps/dev-server/src/studio/studioApi.contract.test.ts` for explicit-interface conformance across both factories.

### 5.4 Integration and end-to-end

Add a Playwright flow for the browser build:

1. Open the browser Studio
2. Create a template course
3. Edit two activities
4. Reload and confirm persistence
5. Validate and export `.oep`
6. Import the exported `.oep` under a new course id
7. Confirm all package files remain present
8. Open preview and complete the first activity

Use a deterministic fixture containing at least one unknown text file, one binary asset, one JSON node, and the standard sidecars.

## 6. Phase 2 implementation

Phase 2 begins only after Phase 1 acceptance tests pass.

### 6.1 Gateway location and runtime

Create the serverless handler at `apps/dev-server/api/ai/[...route].ts`.

The handler must run in the Node.js runtime because course compilation uses Node APIs. It must not be included in the browser bundle.

The handler cannot run in the Edge runtime. `@open-edu/course-compiler` and its `@open-edu/core` dependency use Node.js filesystem and path APIs during compilation. Configure the function explicitly for the Node.js runtime.

Before any Phase 2 AI route work is accepted, the deployment must prove that the serverless bundle can load `@open-edu/course-compiler`, `@open-edu/core`, and `@open-edu/llm-config` in the Node.js runtime. The compiler depends on core, so the deployment must include workspace package outputs or bundle their source through the selected Vercel build. A deployment smoke test that compiles one fixture course inside the function runtime is a Phase 2 blocker, not a post-deploy follow-up.

Separate route parsing, body validation, model invocation, compilation, and response serialization into testable modules:

- `apps/dev-server/api/ai/router.ts`
- `apps/dev-server/api/ai/requestSchema.ts`
- `apps/dev-server/api/ai/generateDraft.ts`
- `apps/dev-server/api/ai/itemGeneration.ts`
- `apps/dev-server/api/ai/chat.ts`
- `apps/dev-server/api/ai/errors.ts`

### 6.2 Existing AI transition

The existing AI implementation spans `apps/dev-server/src/studio/ai/`, including conversation stores, chat handlers, rate limiting, prompt builders, item generation, quality mapping, and assistant state. Reuse its pure domain and prompt modules.

Keep the current Vite middleware routes for local `edu dev`. Extract route-independent operations from `vite.config.ts` into callable services where needed. The hosted handlers under `apps/dev-server/api/ai/` become a second transport adapter over those services. Do not duplicate prompts or silently change local route behavior during Phase 2.

The browser `StudioApi` continues to expose the existing AI methods. In browser mode those methods delegate to `browserAiClient.ts`; in local mode they continue to use the existing Vite middleware endpoints. The client is an adapter, not a replacement for the shared Studio API contract.

### 6.3 Gateway contract

Implement:

- `GET /api/ai/status`
- `POST /api/ai/generate-draft`
- `POST /api/ai/item`
- `POST /api/ai/chat`

Do not implement a server-side `commit` or `discard-draft` endpoint. The browser commits or discards the complete returned result locally.

Each response must include a stable `requestId`, route-specific result data, and structured error fields on failure. Do not return filesystem paths, stack traces, provider keys, or raw provider errors.

### 6.4 Draft generation

`generate-draft` accepts either notes or an uploaded course specification. The handler:

1. Validates the request schema and limits
2. Generates or accepts a course specification
3. Compiles it in a request-scoped temporary directory
4. Reads the complete compiled output into memory
5. Validates the output through the shared package validation path
6. Returns complete file bytes encoded for JSON transport, or a documented streaming/binary response
7. Removes temporary files in a `finally` block

The browser stores the response as a local draft. A successful response must contain enough data to commit without another gateway request.

### 6.5 Item generation and chat

Reuse existing Studio prompt builders and result types where possible. Keep prompt construction separate from HTTP handling.

For item generation:

- validate `kind`, intent, description, and current content
- enforce request and response limits
- parse structured model output
- validate generated content before returning it
- return a complete operation or file set for local review

For chat:

- preserve the existing message and context contract where possible
- apply context size limits before model invocation
- stream only validated response events
- surface provider failure as a terminal structured error

### 6.6 Gateway safeguards

Implement and test:

- maximum body size
- maximum notes, context, and message count
- maximum generated files and response bytes
- request timeout
- configured model allowlist
- platform-compatible rate limiting
- spend or invocation budget
- explicit allowed-origin configuration
- `OPTIONS` handling only for allowed origins

Do not treat an in-memory `Map` in a serverless function as a reliable global rate limiter or draft store.

### 6.7 Browser AI client

Create `apps/dev-server/src/studio/browserAiClient.ts`.

Add a `studio-drafts` IndexedDB object store in `@open-edu/storage` at the start of Phase 2. Bump the database version from `5` to `6` and define `StoredStudioDraft` with a draft id, course id, complete `StoredStudioFile[]`, title/metadata, and timestamps. Draft records are browser-owned, survive reloads, and are deleted when accepted or discarded. They must not be written by the serverless gateway.

It should:

- call only `/api/ai/*`
- map HTTP failures into `StudioApiError` codes
- accept complete draft results and store them locally
- expose retry and discard operations without server state
- report unavailable status without throwing during manual authoring
- never include API keys in requests

The browser `StudioApi` methods should delegate to this client. Local mode continues to use the current local AI endpoints until a separate compatibility decision is made.

## 7. Phase 2 test plan

Add unit tests for:

- route and method dispatch
- request schema validation
- payload and response limits
- missing configuration
- model success and provider failure
- malformed model output
- temporary-directory cleanup
- complete draft response shape
- browser accept/discard/retry behavior
- origin policy
- rate-limit and budget enforcement
- chat stream termination and error events

Add a mocked-gateway browser E2E flow:

1. Enter notes
2. Receive a complete draft
3. Reload the browser without losing the draft
4. Accept the draft locally
5. Edit the generated course
6. Export `.oep`
7. Repeat with gateway failure and confirm manual authoring still works

## 8. Implementation order

### Phase 1 sequence

1. Extract pure parsers and browser-safe package loading from the six Node-bound core helpers
2. Add in-memory/filesystem loader parity tests
3. Add storage types, database migration, and store tests
4. Add path-safe lossless file utilities and tests
5. Extract the explicit `StudioApi` interface and local implementation without behavior changes
6. Implement the browser course store and Browser Studio API
7. Add template creation, `.oep` import/export, and round-trip tests
8. Implement the `StudioFile[]` to `LoadedPackage` preview bridge
9. Inject the API and browser runtime session into Studio and DevApp
10. Update recent-course/session behavior and translated browser states
11. Add browser build mode and deploy using `apps/dev-server` as the Vercel root
12. Run package, app, and browser E2E verification

### Phase 2 sequence

1. Define gateway request, response, and error schemas
2. Extract reusable prompt and compilation services
3. Implement the stateless draft route
4. Implement item generation and chat routes
5. Add safeguards and origin policy
6. Implement the browser AI client and local draft lifecycle
7. Add gateway unit and mocked E2E tests
8. Deploy a preview with server-side credentials
9. Verify no browser bundle contains provider credentials or Node-only imports

## 9. Acceptance checklist

### Phase 1

- [ ] `pnpm --filter @open-edu/storage test` passes
- [ ] `pnpm --filter @open-edu/core test` passes
- [ ] `pnpm --filter @open-edu/dev-server test` passes
- [ ] Browser build succeeds from the selected Vercel project root
- [ ] Local `edu dev` behavior remains unchanged
- [ ] Course files survive save, reload, export, and import
- [ ] Unknown package files survive round trips
- [ ] Browser preview renders the current stored course
- [ ] Browser `getPackageDir()` returns a stable `browser://<course-id>` identifier
- [ ] Browser archive deletes the record and does not claim to support undo
- [ ] No browser course content is sent to a server
- [ ] New user-facing strings pass i18n and hardcoded-string lint
- [ ] Playwright flow passes against a preview build

### Phase 2

- [ ] Deployed Node.js function compiles a fixture course successfully
- [ ] AI status degrades cleanly when credentials are absent
- [ ] Gateway returns complete drafts without server-side draft storage
- [ ] Browser reload preserves accepted and pending local drafts
- [ ] Provider failures do not mutate the active course
- [ ] Request, response, origin, timeout, and budget limits are enforced
- [ ] Provider credentials remain server-only
- [ ] Chat streaming has deterministic terminal behavior
- [ ] Mocked gateway E2E flow passes

## 10. Files expected to change

### Phase 1

```text
packages/storage/src/db.ts
packages/storage/src/index.ts
packages/storage/src/studio-course-store.ts
packages/storage/src/studio-draft-store.ts
packages/storage/src/__tests__/db.test.ts
packages/storage/src/__tests__/studio-course-store.test.ts
packages/core/src/index.ts
packages/core/src/file-loader.ts
packages/core/src/file-loader.test.ts
packages/core/src/manifest.ts
packages/core/src/workflow.ts
packages/core/src/rewards.ts
packages/core/src/cards.ts
packages/core/src/nodes.ts
packages/core/src/assets.ts
apps/dev-server/package.json
apps/dev-server/tsconfig.json
apps/dev-server/vite.config.ts
apps/dev-server/src/DevApp.tsx
apps/dev-server/src/studio/StudioApp.tsx
apps/dev-server/src/studio/studioApi.ts
apps/dev-server/src/studio/localStudioApi.ts
apps/dev-server/src/studio/localStudioApi.test.ts
apps/dev-server/src/studio/studioApi.contract.test.ts
apps/dev-server/src/studio/browserCourseStore.ts
apps/dev-server/src/studio/courseFiles.ts
apps/dev-server/src/studio/browserStudioApi.ts
apps/dev-server/src/studio/browserStudioApi.test.ts
apps/dev-server/src/studio/courseFiles.test.ts
apps/dev-server/src/studio/browserCourseStore.test.ts
apps/dev-server/src/studio/browserPreview.ts
apps/dev-server/src/studio/browserPreview.test.ts
apps/dev-server/src/studio/recentCourses.ts
apps/dev-server/src/studio/recentCourses.test.ts
packages/i18n/locales/en/studio.json
tests/e2e/*studio*.spec.ts
```

### Phase 2

```text
apps/dev-server/api/ai/[...route].ts
apps/dev-server/api/ai/router.ts
apps/dev-server/api/ai/requestSchema.ts
apps/dev-server/api/ai/generateDraft.ts
apps/dev-server/api/ai/itemGeneration.ts
apps/dev-server/api/ai/chat.ts
apps/dev-server/api/ai/errors.ts
apps/dev-server/src/studio/browserAiClient.ts
apps/dev-server/src/studio/browserAiClient.test.ts
apps/dev-server/api/ai/*.test.ts
tests/e2e/*studio-ai*.spec.ts
apps/dev-server/vercel.json
```

The exact location of `api/` and `vercel.json` must match the selected Vercel project root. The implementation must not create duplicate API routes for both repository-root and app-root deployment layouts.

## 11. Deferred work

Do not implement the following in this effort:

- cloud course storage
- accounts and authorization
- cross-device synchronization
- collaboration or conflict resolution
- cryptographic package signing
- bundle/unit browser authoring
- automatic learner progress migration
- server-side draft persistence
