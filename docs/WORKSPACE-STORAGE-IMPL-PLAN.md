# OpenEdu Studio — Workspace Storage Migration Implementation Plan

**Companion to:** `docs/WORKSPACE-STORAGE-IMPL-SPEC.md` (the "SPEC"). Read the SPEC first; this plan executes it.
**Target executor:** a single coding agent (e.g. deepseek-4-flash) working independently.
**Goal:** migrate Studio browser storage from whole-course IndexedDB to `CourseWorkspace` + OPFS, per SPEC §§6–56.
**Repo conventions that override defaults:** pnpm workspaces, Vitest 1.x, `fake-indexeddb/auto` for IndexedDB in unit tests, `@open-edu/storage` is the storage package, tests live next to source (`*.test.ts`) and are excluded from builds. See `AGENTS.md`.

---

## How to use this plan

- Work **top to bottom**. Do not skip ahead. Do not begin AI changes before the workspace abstraction is stable (SPEC §56).
- Every task is **TDD**: write the failing test first, then implement, then run the verification command. If the test passes before you implement, the test is wrong — fix it.
- Each task lists **exact files to create/edit** and a **verify command**. Run the verify command before moving on.
- When a step says "assert it fails," run it and confirm the failure is for the _expected reason_ (missing export/behavior), not a typo.
- If anything is ambiguous or a verify command fails for an unexpected reason, **stop and report** — do not guess or silence the error.

**Global setup (run once at the start):**

```bash
pnpm install
pnpm build
pnpm --filter @open-edu/storage test   # baseline green
pnpm --filter @open-edu/dev-server test # baseline green
```

If baseline is not green, stop and report before changing anything.

**Definition of Done** is SPEC §57 — re-check every box at the end.

---

## Phase 1 — Workspace types (SPEC §6–8)

### Task 1.1 — Add workspace types module

**Files:**

- Create `packages/storage/src/workspace/types.ts`

**Content (exact):**

```ts
export type WorkspaceKind = 'file' | 'directory';

export interface WorkspaceEntry {
  name: string;
  path: string;
  kind: WorkspaceKind;
}

export interface FileStat {
  path: string;
  kind: WorkspaceKind;
  size: number;
  modifiedAt: number;
  mimeType?: string;
}

export interface CourseWorkspace {
  list(path: string): Promise<WorkspaceEntry[]>;
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<Uint8Array>;
  readText(path: string): Promise<string>;
  write(path: string, data: Uint8Array): Promise<void>;
  writeText(path: string, content: string): Promise<void>;
  delete(path: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  copy(from: string, to: string): Promise<void>;
  stat(path: string): Promise<FileStat>;
}
```

**Test:**

- Create `packages/storage/src/workspace/types.test.ts`:
  - `it('compiles the CourseWorkspace interface')` — a compile-only check: `const _check: CourseWorkspace | null = null; expect(_check).toBeNull();`
- Run `pnpm --filter @open-edu/storage test` → expect this test to **fail to compile** initially only if types are missing; after creating `types.ts` it passes. (This is a smoke test that the module resolves.)

**Verify:** `pnpm --filter @open-edu/storage typecheck && pnpm --filter @open-edu/storage test`

---

### Task 1.2 — Workspace error hierarchy (SPEC §47)

**Files:**

- Create `packages/storage/src/workspace/errors.ts`

**Content (exact):**

```ts
export class WorkspaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class WorkspaceNotFoundError extends WorkspaceError {}
export class WorkspacePathError extends WorkspaceError {}
export class WorkspacePermissionError extends WorkspaceError {}
export class WorkspaceConflictError extends WorkspaceError {}
export class WorkspaceTransactionError extends WorkspaceError {}
export class WorkspaceUnavailableError extends WorkspaceError {}
```

**Test:**

- Create `packages/storage/src/workspace/errors.test.ts`:
  - `it('names subclasses correctly')` — `expect(new WorkspacePathError('x').name).toBe('WorkspacePathError')` for each subclass.
  - `it('is instanceof WorkspaceError and Error')`.

**Verify:** `pnpm --filter @open-edu/storage test -- workspace`

---

## Phase 2 — MemoryWorkspace (SPEC §10–11)

### Task 2.1 — Path utilities (shared)

Reuse the existing course path-security logic rather than re-implementing it (SPEC §9). Export the helpers the workspace needs without depending on the dev-server app.

**Files:**

- Create `packages/storage/src/workspace/paths.ts`

**Content:** Move/port the logic from `apps/dev-server/src/studio/courseFiles.ts` into this shared module:

- `normalizeCoursePath(path: string): string`
- `assertSafeCoursePath(path: string): string` (reuse `UnsafeCoursePathError`-equivalent behavior; you may throw `WorkspacePathError` and keep the existing `UnsafeCoursePathError` exported from courseFiles for back-compat — see note)
- `isTextCourseFile(path: string): boolean`

> Note: `apps/dev-server/src/studio/courseFiles.ts` currently owns these. To avoid a cross-package import cycle, copy the functions here and **re-export them from `courseFiles.ts`** as a thin wrapper so existing app code keeps working unchanged. Do not delete `courseFiles.ts`.

**Test:**

- Create `packages/storage/src/workspace/paths.test.ts` mirroring the existing `courseFiles.test.ts` cases (absolute, drive-letter, `..`, null bytes, normalization collision).
- Run `pnpm --filter @open-edu/storage test -- paths` → fails (module missing) → implement → passes.
- Also run `pnpm --filter @open-edu/dev-server test -- courseFiles` to confirm the re-export kept the app green.

**Verify:** `pnpm --filter @open-edu/storage test -- paths && pnpm --filter @open-edu/dev-server test -- courseFiles`

---

### Task 2.2 — MemoryWorkspace core

**Files:**

- Create `packages/storage/src/workspace/memory-workspace.ts`

Implement `class MemoryWorkspace implements CourseWorkspace` backed by a normalized-path `Map<string, Uint8Array>` plus derived directory knowledge. Required semantics:

- `write`/`writeText` create parent directories implicitly.
- `read`/`readText`/`stat`/`delete` throw `WorkspaceNotFoundError` on missing paths; `readText` uses `TextDecoder` and throws on invalid UTF-8 (parity with existing binary-file handling).
- `exists` returns boolean (never throws).
- `list(path)` returns direct children of a directory; throws `WorkspaceNotFoundError` for a missing dir; entries include `name`, `path`, `kind`.
- `move(from,to)` copies then deletes source; throws `WorkspaceNotFoundError` if source missing, `WorkspaceConflictError` if `to` exists.
- `copy(from,to)` deep-copies file or directory; same error rules.
- All paths validated via `assertSafeCoursePath` and normalized via `normalizeCoursePath`; reject `..`, absolute, drive-letter, null bytes, and root-crossing.

**Test:**

- Create `packages/storage/src/workspace/memory-workspace.test.ts`. Cover SPEC §11 verbs and §48 path-safety cases, plus:
  - write→read→overwrite→read returns latest
  - binary round-trip via `Uint8Array`
  - nested directory list returns only direct children
  - `move`/`copy` directory behavior (SPEC §15.1)
  - deleting a file removes it from `list` of its parent
- Run `pnpm --filter @open-edu/storage test -- memory-workspace` → fails (class missing) → implement → green.

**Verify:** `pnpm --filter @open-edu/storage test -- memory-workspace`

---

## Phase 3 — Workspace contract tests (SPEC §12)

### Task 3.1 — Shared contract suite

**Files:**

- Create `packages/storage/src/workspace/contract.ts` exporting a reusable suite factory:
  ```ts
  export function runWorkspaceContractTests(
    name: string,
    makeWorkspace: () => Promise<CourseWorkspace> | CourseWorkspace,
  ): void;
  ```
  Inside, use `describe(name, …)` and the SPEC §12 checklist (create/read/overwrite/delete/list/nested/move/copy/stat/binary/UTF-8/missing-file/invalid-path). All assertions go through the `CourseWorkspace` interface only.

**Test:**

- Create `packages/storage/src/workspace/contract.memory.test.ts` that calls `runWorkspaceContractTests('MemoryWorkspace', () => new MemoryWorkspace())`.
- Run `pnpm --filter @open-edu/storage test -- contract` → green against MemoryWorkspace.

**Verify:** `pnpm --filter @open-edu/storage test -- contract`

---

## Phase 4 — OPFSWorkspace (SPEC §13–16, §47.1)

> OPFS is not available in Node/Vitest. Implement the adapter so it is testable via an injected root handle, and run the contract suite against a stubbed OPFS in unit tests plus a real browser smoke test (Playwright) as a follow-up. Keep the adapter free of any global `navigator` access at module scope so tests can inject.

### Task 4.1 — OPFS availability probe + errors (SPEC §47.1)

**Files:**

- Create `packages/storage/src/workspace/opfs-availability.ts`

**Content:** `async function getOpfsRoot(): Promise<FileSystemDirectoryHandle>` that:

- returns `navigator.storage.getDirectory()` when available,
- throws `WorkspaceUnavailableError` when `navigator.storage?.getDirectory` is absent or rejects with a "not available"/security error,
- lets `QuotaExceededError` propagate wrapped in `WorkspaceUnavailableError` with `.cause`.

**Test:**

- `opfs-availability.test.ts` using `vi.stubGlobal('navigator', …)` to simulate missing `getDirectory` (expect `WorkspaceUnavailableError`) and a rejecting stub.
- Run → fails → implement → green.

**Verify:** `pnpm --filter @open-edu/storage test -- opfs-availability`

---

### Task 4.2 — OPFSWorkspace

**Files:**

- Create `packages/storage/src/workspace/opfs-workspace.ts`

Implement `class OPFSWorkspace implements CourseWorkspace`:

- Constructor takes a `FileSystemDirectoryHandle` **workspace root** (a per-course directory). Provide a static `open(courseId: string): Promise<OPFSWorkspace>` that resolves `openedu/courses/<courseId>` under the OPFS root via `getOpfsRoot()` and `getDirectoryHandle(..., { create: true })`.
- Every public method first runs `assertSafeCoursePath` + `normalizeCoursePath`, then descends from the workspace root segment-by-segment (SPEC §14). Reject root-crossing before touching OPFS.
- `write`/`writeText`: obtain/create parent dir, `getFileHandle(name,{create:true})`, `createWritable()`, `write(data)`, `close()` (atomic per SPEC §16).
- `read`/`readText`: `getFileHandle` → `getFile()` → `arrayBuffer()`; throw `WorkspaceNotFoundError` when a segment is missing.
- `list`: iterate `directoryHandle.entries()` mapping to `WorkspaceEntry`; throw `WorkspaceNotFoundError` for a missing dir.
- `delete`: `parent.removeEntry(name)`; throw `WorkspaceNotFoundError` if absent.
- `move`/`copy`: per SPEC §15.1 — use `handle.move(destDir)` only when the destination parent is the same (rename); otherwise recursive copy + delete. Works identically for files and directories. Throw `WorkspaceNotFoundError` for missing source, `WorkspaceConflictError` if destination exists.
- `stat`: from `getFile()`/`FileSystemDirectoryHandle`, fill `FileStat` (`size`, `modifiedAt` from `File.lastModified`, `kind`).

**Test:**

- `opfs-workspace.test.ts` with a **stubbed in-memory `FileSystemDirectoryHandle`** (minimal fake implementing `getDirectoryHandle`/`getFileHandle`/`removeEntry`/`entries`/`createWritable`/`getFile`). Reuse `runWorkspaceContractTests('OPFSWorkspace', factoryWithFakeRoot)`.
- This is intentionally a fake because real OPFS needs a browser; the contract suite ensures behavioral parity with MemoryWorkspace.
- Run `pnpm --filter @open-edu/storage test -- opfs-workspace` → fails → implement → green.

**Verify:** `pnpm --filter @open-edu/storage test -- opfs-workspace`

---

### Task 4.3 — Browser smoke test (Playwright)

**Files:**

- Create `apps/dev-server/e2e/opfs-workspace.spec.ts` (follow existing Playwright patterns in `tests/e2e/`).

**Content:** Launch the Studio in a browser, evaluate in-page code that constructs a real `OPFSWorkspace` (via the built bundle or a small exposed test hook), run a create→write→read→delete round-trip, and assert persistence across a page reload.

**Verify:** `pnpm test:e2e -- opfs-workspace` (install Playwright first if needed: `pnpm test:e2e:install`).

> If wiring a test hook is non-trivial, mark this task **deferred** and note it in the PR; the unit contract suite is the correctness gate.

---

## Phase 5 — CourseRepository (SPEC §17–18)

### Task 5.1 — CourseRepository over OPFS

**Files:**

- Create `packages/storage/src/workspace/course-repository.ts`

**Content:**

```ts
export interface CourseInfo {
  courseId: string;
  workspaceId: string;
  createdAt: number;
  updatedAt: number;
}

export interface CourseRepository {
  list(): Promise<CourseInfo[]>;
  exists(courseId: string): Promise<boolean>;
  create(courseId: string): Promise<CourseWorkspace>;
  open(courseId: string): Promise<CourseWorkspace>;
  delete(courseId: string): Promise<void>;
}
```

- `create` makes `openedu/courses/<courseId>` and writes a minimal `.openu/manifest.json` via the workspace; `open` resolves an existing root and throws `WorkspaceNotFoundError` if absent.
- `courseId` comes from the manifest, never from the OPFS path (SPEC §18). `workspaceId` is a generated stable id stored in `.openu/manifest.json` (SPEC §54).
- Backed by `OPFSWorkspace`; accept an injected root for tests.

**Test:**

- `course-repository.test.ts` using the OPFS fake from 4.2: create→exists→open→list→delete, open-missing throws, and courseId does not derive from the path.
- Run → fails → implement → green.

**Verify:** `pnpm --filter @open-edu/storage test -- course-repository`

---

## Phase 6 — Studio storage migration (SPEC §19–22)

This phase re-points `browserStudioApi` at `CourseWorkspace`/`CourseRepository` instead of whole-course IndexedDB records. Keep the `StudioApi` interface stable so the UI does not change (SPEC §22–23).

### Task 6.1 — Workspace-backed course store for the browser API

**Files:**

- Edit `apps/dev-server/src/studio/browserCourseStore.ts`

**Change:** Replace the whole-course `StoredStudioCourse` persistence with a facade that reads/writes through `CourseRepository`. Concretely:

- Keep the exported `BrowserCourseStore` interface shape for now (so `browserStudioApi` compiles), but implement `list/get/create/replace/delete/duplicate` on top of `CourseRepository` + `CourseWorkspace`, materializing `files` only when `get` is called (by walking the workspace), and writing files individually on `create`/`replace`.
- Do **not** store `files` in IndexedDB. IndexedDB now holds only course metadata (`courses` store: id/title/version/updatedAt/fileCount), not content.

**Test:**

- Edit `apps/dev-server/src/studio/browserCourseStore.test.ts`: add a case asserting that after `create`/`replace`, the IndexedDB `studio-courses` record (if still present) contains **no** canonical file bytes — i.e. content lives in the workspace. Assert `get` reconstructs files from the workspace.
- Run `pnpm --filter @open-edu/dev-server test -- browserCourseStore` → fails (still whole-course) → implement → green.

**Verify:** `pnpm --filter @open-edu/dev-server test -- browserCourseStore`

---

### Task 6.2 — Point browserStudioApi at the workspace

**Files:**

- Edit `apps/dev-server/src/studio/browserStudioApi.ts`

**Change:**

- `readFile`/`writeFile`/`deleteFile` must delegate to `CourseWorkspace.read/write/delete` for the active course (SPEC §22). Remove per-call whole-course `buildFileIndex` reads for these paths.
- `getOutline`/`saveOutlineOrder` must read/write only `workflow.json` and `package.json` through the workspace (SPEC §22, §53). Do not load the entire course into memory to read/reorder the outline.
- Keep `getStorageStatus` working, now backed by the OPFS availability probe (`getOpfsRoot`) so "unsupported" vs "quota-exceeded" are distinguished (SPEC §47.1).

**Test:**

- Edit `browserStudioApi.test.ts`:
  - a write→read of a single file does not rewrite unrelated files (spy on the workspace to assert only one write).
  - `getOutline` does not read every file (spy that only `workflow.json`/`package.json` are read).
- Run `pnpm --filter @open-edu/dev-server test -- browserStudioApi` → fails → implement → green.

**Verify:** `pnpm --filter @open-edu/dev-server test -- browserStudioApi`

---

## Phase 7 — IndexedDB metadata layer (SPEC §24–27)

### Task 7.1 — File index store

**Files:**

- Edit `packages/storage/src/db.ts` — add stores: `workspaces`, `files`, `history`, `aiSessions` (bump `DB_VERSION`, add `upgrade` steps; keep existing stores).
- Create `packages/storage/src/file-index-store.ts` with CRUD for `IndexedFile` (SPEC §25): `{ id, workspaceId, path, size, hash?, mimeType?, modifiedAt }`. The record MUST NOT contain file content.

**Test:**

- `file-index-store.test.ts` (with `fake-indexeddb/auto`): put/get/list-by-workspace/delete; assert a stored record has no content field.
- Run `pnpm --filter @open-edu/storage test -- file-index-store` → fails (store missing) → implement → green.

**Verify:** `pnpm --filter @open-edu/storage test -- file-index-store`

---

### Task 7.2 — Build/rebuild the file index from OPFS (SPEC §26)

**Files:**

- Create `packages/storage/src/workspace/index-builder.ts`: `buildFileIndexFromWorkspace(workspace, workspaceId): Promise<IndexedFile[]>` that walks the workspace and records metadata (no content), plus `rebuildFileIndex(workspace, workspaceId)` that clears and rewrites the `files` store.

**Test:**

- `index-builder.test.ts`: build from a MemoryWorkspace; delete the `files` store; rebuild; assert the index is equivalent and the course is unaffected (SPEC §26).
- Run `pnpm --filter @open-edu/storage test -- index-builder` → fails → implement → green.

**Verify:** `pnpm --filter @open-edu/storage test -- index-builder`

---

### Task 7.3 — Hashing (SPEC §27)

**Files:**

- Create `packages/storage/src/workspace/hash.ts`: `hashBytes(data: Uint8Array): Promise<string>` using `crypto.subtle.digest('SHA-256', …)`. Note in a comment that large files should be hashed off the main thread (Worker) — provide the sync-safe function now and document the Worker hook as follow-up.

**Test:**

- `hash.test.ts`: known-vector SHA-256 of `"abc"`; assert large input resolves without throwing.
- Run `pnpm --filter @open-edu/storage test -- hash` → fails → implement → green.

**Verify:** `pnpm --filter @open-edu/storage test -- hash`

---

## Phase 8 — Transactional workspace changes (SPEC §28–30)

### Task 8.1 — Change/ChangeSet types

**Files:**

- Create `packages/storage/src/workspace/change.ts` with `WorkspaceChange` and `WorkspaceChangeSet` exactly as SPEC §28.

**Test:** compile-only + shape test. **Verify:** `pnpm --filter @open-edu/storage typecheck`

---

### Task 8.2 — WorkspaceTransaction

**Files:**

- Create `packages/storage/src/workspace/transaction.ts`: `class WorkspaceTransaction` (SPEC §29) backed by a `CourseWorkspace`.
- Collect `write`/`delete`/`move` ops (binary-only `write(path, Uint8Array)`; callers encode text per SPEC §29).
- `preview()` returns a `WorkspaceChangeSet` (reads `previousContent` from the workspace).
- `validate()` runs path safety on all paths.
- `commit()` applies SPEC §16's staged multi-file strategy: write temps → flush/close → rename-last → on failure, restore (best-effort per file) and throw `WorkspaceTransactionError`.
- `rollback()` discards staged changes without touching canonical files.
- History recording (step 8) is deferred: expose the committed `WorkspaceChangeSet` so Phase 10 can persist it (SPEC §30 note).

**Test:**

- `transaction.test.ts` on MemoryWorkspace: single-file commit; multi-file commit; failure-inject a mid-commit write error and assert no partial canonical state; rollback leaves workspace unchanged; binary-only `write` (assert no `writeText` on the transaction interface by type).
- Run `pnpm --filter @open-edu/storage test -- transaction` → fails → implement → green.

**Verify:** `pnpm --filter @open-edu/storage test -- transaction`

---

## Phase 9 — AI change workflow (SPEC §31–36)

> Only start after Phases 1–8 verify green.

### Task 9.1 — AI workspace tools (SPEC §32, §34)

**Files:**

- Create `apps/dev-server/src/studio/ai/workspaceTools.ts` exposing `workspace.list/read/search/create/update/delete/move` that operate on workspace paths and route **all writes through `WorkspaceTransaction`** (SPEC §34).

**Test:**

- `workspaceTools.test.ts`: writes go through a transaction (spy), reads hit the workspace, search delegates to the search service.
- Run `pnpm --filter @open-edu/dev-server test -- workspaceTools` → fails → implement → green.

**Verify:** `pnpm --filter @open-edu/dev-server test -- workspaceTools`

---

### Task 9.2 — ChangeSet proposal + diff (SPEC §16, §35–36)

**Files:**

- Create `apps/dev-server/src/studio/ai/changeSet.ts`: build a `WorkspaceChangeSet` from AI tool calls; `diffChangeSet(changeSet, workspace)` producing text/binary/new/deleted markers per SPEC §36.
- Create `apps/dev-server/src/studio/ai/applyChangeSet.ts`: `applyChangeSet(changeSet)` → `WorkspaceTransaction` → `commit()` (atomic per SPEC Rule 6).

**Test:**

- `changeSet.test.ts`: diff output for text/binary/new/deleted; `applyChangeSet` commits all-or-nothing.
- Run `pnpm --filter @open-edu/dev-server test -- changeSet` → fails → implement → green.

**Verify:** `pnpm --filter @open-edu/dev-server test -- changeSet`

---

### Task 9.3 — Approval flow wiring (SPEC §17, §35)

**Files:**

- Edit `apps/dev-server/src/studio/browserStudioApi.ts` `commitLocalDraft`: replace whole-course `store.replace` with building a `WorkspaceChangeSet`, showing it via the review state, and committing through `WorkspaceTransaction` **only after approval**. The AI MUST NOT silently overwrite (SPEC Rule 5, §35).
- Minimal UI hook per SPEC §35 (review list + Accept/Reject). Reuse existing Studio UI primitives; do not redesign.

**Test:**

- `browserStudioApi.test.ts`: committing an AI draft does not touch unrelated files and requires an explicit approve step (simulate reject → no commit).
- Run `pnpm --filter @open-edu/dev-server test -- browserStudioApi` → fails → implement → green.

**Verify:** `pnpm --filter @open-edu/dev-server test -- browserStudioApi`

---

## Phase 10 — History + Undo/Redo (SPEC §37–39)

### Task 10.1 — History store + recording

**Files:**

- Create `packages/storage/src/history-store.ts` for `HistoryEntry` (SPEC §37) in the `history` store.
- Edit `packages/storage/src/workspace/transaction.ts` to persist the committed `WorkspaceChangeSet` as a `HistoryEntry` on `commit()` (wire the step-8 hook from Task 8.2).

**Test:**

- `history-store.test.ts`: put/list; `transaction.commit()` writes a history entry with `source` and changed files.
- Run `pnpm --filter @open-edu/storage test -- history` → fails → implement → green.

**Verify:** `pnpm --filter @open-edu/storage test -- history`

---

### Task 10.2 — Undo/Redo (SPEC §38)

**Files:**

- Create `packages/storage/src/workspace/undo.ts`: `undo(workspace, historyId)` restores `previousContent`/`newContent` snapshots per SPEC §38 (snapshot-based, not full Git).

**Test:**

- `undo.test.ts`: commit a change → undo restores prior content → redo reapplies.
- Run `pnpm --filter @open-edu/storage test -- undo` → fails → implement → green.

**Verify:** `pnpm --filter @open-edu/storage test -- undo`

---

## Phase 11 — Workspace search (SPEC §40–41)

### Task 11.1 — Search service

**Files:**

- Create `apps/dev-server/src/studio/search/workspaceSearch.ts` implementing `WorkspaceSearch.search(query)` over the file index + content (filename/path/heading/full-text per SPEC §40).
- Create `packages/storage/src/search-index-store.ts` if a persisted derived index is needed (rebuildable from `CourseWorkspace`, SPEC §41).

**Test:**

- `workspaceSearch.test.ts`: filename, path, heading, full-text matches against a MemoryWorkspace; deleting the search index does not affect the course.
- Run `pnpm --filter @open-edu/dev-server test -- workspaceSearch` → fails → implement → green.

**Verify:** `pnpm --filter @open-edu/dev-server test -- workspaceSearch`

---

## Phase 12 — Import/Export integration (SPEC §42–43)

### Task 12.1 — Route `.oep` import/export through the workspace

**Files:**

- Edit `apps/dev-server/src/studio/browserStudioApi.ts` `importOep`/`exportOep`: extract into a `CourseWorkspace` (import) and package canonical files only from the workspace (export). Rebuild metadata/index on import (SPEC §42). Exclude derived data on export (SPEC §43).

**Test:**

- `browserStudioApi.test.ts`: import→export round-trip yields identical canonical files; export excludes `.openu/history`, search index, AI state.
- Run `pnpm --filter @open-edu/dev-server test -- browserStudioApi` → green.

**Verify:** `pnpm --filter @open-edu/dev-server test -- browserStudioApi`

---

## Phase 13 — Legacy migration + cleanup (SPEC §44–45)

### Task 13.1 — One-time legacy migration (dev utility)

**Files:**

- Create `apps/dev-server/src/studio/migrateLegacyCourses.ts`: read legacy `StoredStudioCourse` records, write files into an OPFS workspace via `CourseRepository`, build metadata/index. Guard behind an explicit call (not automatic on startup).

**Test:**

- `migrateLegacyCourses.test.ts`: seeds a legacy record (via `fake-indexeddb`), runs migration, asserts files now exist in the workspace and the course opens.
- Run `pnpm --filter @open-edu/dev-server test -- migrateLegacyCourses` → fails → implement → green.

**Verify:** `pnpm --filter @open-edu/dev-server test -- migrateLegacyCourses`

---

### Task 13.2 — Remove whole-course canonical persistence

**Files:**

- Edit `packages/storage/src/db.ts` and `studio-course-store.ts`: stop using `studio-courses` as the canonical content store (keep the store only if needed for course metadata, or drop content fields).
- Remove whole-course replace code paths in `browserCourseStore.ts`/`browserStudioApi.ts`.

**Test:**

- Update `browserCourseStore.test.ts`/`browserStudioApi.test.ts` to assert no canonical content is persisted in IndexedDB (SPEC §51).
- Run `pnpm --filter @open-edu/dev-server test` and `pnpm --filter @open-edu/storage test` → green.

**Verify:** `pnpm --filter @open-edu/dev-server test && pnpm --filter @open-edu/storage test`

---

## Final verification (SPEC §57 Definition of Done)

Run all of these and confirm green before reporting completion:

```bash
pnpm --filter @open-edu/storage test
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/storage typecheck
pnpm --filter @open-edu/dev-server typecheck
pnpm test:e2e -- opfs-workspace   # if the Playwright smoke test was implemented
```

Then check every box in SPEC §57, and confirm the acceptance tests:

- **§49 Critical acceptance:** create course → add lesson → close → reopen → verify content persists from OPFS; deleting IndexedDB metadata does not break the course.
- **§50 AI acceptance:** AI propose → diff → approve → atomic commit → history → undo.
- **§51 Storage acceptance:** `lesson.md` is in OPFS; IndexedDB file record is metadata-only.
- **§52 Backend independence:** same operations behave identically on MemoryWorkspace and OPFSWorkspace.

If any acceptance test cannot be run in the current environment, state that explicitly in the final report rather than claiming it passed.

---

## Notes for the executor

- **Do not** wrap or preserve the whole-course IndexedDB model (SPEC §2). `StoredStudioCourse`/`BrowserCourseStore` are being replaced, not extended.
- **Do not** introduce abstractions beyond those in the SPEC (SPEC §59).
- Keep `StudioApi` method signatures stable so the UI does not change (SPEC §23).
- Reuse path-security helpers; never weaken them (SPEC §9).
- Commit message style: conventional commits scoped to the package, e.g. `feat(storage): add MemoryWorkspace` (AGENTS.md).
- If the repo has drifted from the paths in this plan, adapt paths to reality and note the change; do not invent new architecture.
