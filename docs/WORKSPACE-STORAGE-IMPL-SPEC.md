# OpenEdu Studio — Workspace Migration Implementation Specification

**File:** `WORKSPACE-STORAGE-IMPL-SPEC.md`
**Status:** Implementation Specification
**Version:** 1.0
**Audience:** AI coding agents and human maintainers
**Scope:** OpenEdu Studio browser/local authoring architecture
**Priority:** High — execute before MVP production release

---

# 1. Purpose

This specification defines the implementation work required to migrate OpenEdu Studio from its current **whole-course IndexedDB storage model** to the target **CourseWorkspace + OPFS architecture**.

The current implementation is considered **pre-MVP**.

It MUST NOT be treated as an architectural constraint.

The migration SHALL establish:

```text
Studio
  │
  ├── Course Editor
  ├── Preview
  └── AI Companion
          │
          ▼
  CourseRepository
          │
          ▼
  CourseWorkspace
          │
          ▼
  OPFSWorkspace
          │
          ▼
  OPFS
```

with IndexedDB used for:

```text
metadata
file index
history
AI sessions
search indexes
application state
```

and NOT as the canonical storage location for course content.

---

# 2. Critical Agent Instruction

> **Do not preserve the current whole-course IndexedDB architecture merely for compatibility.**

The existing implementation is an early implementation and is being replaced.

Do NOT:

- build another abstraction around `StoredStudioCourse`
- continue storing the entire course as one IndexedDB record
- make `BrowserCourseStore` the new canonical abstraction
- implement the new API by wrapping whole-course reads/writes
- duplicate the entire course into IndexedDB
- make the AI operate on a complete course object
- use whole-course replacement for AI edits

Existing functionality SHOULD be preserved, but the underlying storage architecture MUST move to the new model.

---

# 3. Target Architecture

The final architecture SHALL be:

```text
                         OpenEdu Studio
                               │
              ┌────────────────┼────────────────┐
              │                │                │
           Editor            Preview        AI Companion
              │                │                │
              └────────────────┼────────────────┘
                               │
                       CourseRepository
                               │
                       CourseWorkspace
                               │
                  ┌────────────┴────────────┐
                  │                         │
             OPFSWorkspace             Services
                  │                         │
                  ▼                    ┌────┴────┐
                 OPFS                Search   History
                  │
                  ├── course.md
                  ├── metadata.json
                  ├── lessons/
                  ├── activities/
                  ├── assessments/
                  ├── resources/
                  ├── assets/
                  └── .openu/
```

IndexedDB:

```text
IndexedDB
├── courses
├── workspaces
├── files
├── history
├── aiSessions
└── searchIndex
```

---

# 4. Architectural Rules

The following rules are mandatory.

## Rule 1 — Canonical content lives in the workspace

Canonical course files MUST be stored through `CourseWorkspace`.

The browser implementation MUST use OPFS.

---

## Rule 2 — UI never accesses storage directly

React components MUST NOT directly access:

```text
OPFS
IndexedDB
FileSystemDirectoryHandle
FileSystemFileHandle
```

UI accesses course content through application services.

---

## Rule 3 — Storage backend is replaceable

Application code MUST depend on:

```ts
CourseWorkspace;
```

rather than:

```ts
OPFSWorkspace;
IndexedDbWorkspace;
BrowserCourseStore;
```

---

## Rule 4 — IndexedDB does not contain canonical course files

IndexedDB MAY contain:

```text
metadata
indexes
history
AI state
search state
```

It MUST NOT contain the authoritative copy of:

```text
lesson.md
activity.md
blueprint.json
course.md
assets/*
```

---

## Rule 5 — AI never silently replaces a course

AI modifications MUST use:

```text
inspect
→ read
→ propose
→ validate
→ diff
→ approve
→ commit
```

---

## Rule 6 — Multi-file AI changes are atomic

A multi-file AI change MUST either:

```text
commit all
```

or:

```text
commit none
```

Partial AI commits are prohibited.

---

# 5. Phase 0 — Repository Reconnaissance

Before modifying code, inspect the repository.

Identify:

```text
apps/dev-server/src/studio
packages/storage
packages/*
```

and locate:

```text
BrowserCourseStore
StoredStudioCourse
StoredStudioFile
StudioApi
browserStudioApi
localStudioApi
studio-course-store
courseFiles
applyDraft
commitLocalDraft
ConversationStore
search-store
OEP import/export
```

Document actual dependencies before deleting or changing code.

Do not assume the paths in this document are exact if the repository has evolved.

---

# 6. Phase 1 — Define Workspace Types

Create or extend the appropriate storage/workspace package.

Recommended location:

```text
packages/storage/src/workspace/
```

Suggested structure:

```text
workspace/
├── types.ts
├── course-workspace.ts
├── memory-workspace.ts
└── opfs-workspace.ts
```

Exact package location MAY follow existing monorepo conventions.

---

# 7. `CourseWorkspace` Interface

Implement:

```ts
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

---

# 8. Workspace Types

Implement:

```ts
export interface WorkspaceEntry {
  name: string;
  path: string;
  kind: 'file' | 'directory';
}
```

and:

```ts
export interface FileStat {
  path: string;
  kind: 'file' | 'directory';
  size: number;
  modifiedAt: number;
  mimeType?: string;
}
```

Types SHOULD remain storage-independent.

---

# 9. Path Handling

All workspace implementations MUST use the existing course path-security logic where possible.

Preserve:

```text
assertSafeCoursePath
assertInsideWorkspace
duplicate-normalized-path detection
```

The migration MUST NOT weaken existing path security.

Required rejection cases include:

```text
absolute paths
drive-letter paths
..
null bytes
workspace escape
normalized-path collisions
```

Add workspace-level tests for these cases.

---

# 10. Phase 2 — Implement `MemoryWorkspace`

Implement a true in-memory filesystem:

```ts
class MemoryWorkspace implements CourseWorkspace
```

It MUST support the complete `CourseWorkspace` interface.

Example:

```ts
const workspace = new MemoryWorkspace();

await workspace.writeText('lessons/01/lesson.md', '# Numbers');

const text = await workspace.readText('lessons/01/lesson.md');
```

Expected:

```text
# Numbers
```

---

# 11. MemoryWorkspace Requirements

`MemoryWorkspace` MUST support:

```text
list
exists
read
readText
write
writeText
delete
move
copy
stat
```

It SHOULD normalize paths consistently with the production implementation.

It SHOULD be used as the primary unit-test backend.

---

# 12. Workspace Contract Tests

Create a shared workspace test suite.

The same tests SHOULD run against:

```text
MemoryWorkspace
OPFSWorkspace
```

where practical.

Tests MUST verify:

```text
create file
read file
overwrite file
delete file
list directory
nested directories
move file
copy file
stat
binary content
UTF-8 text
missing file behavior
invalid path behavior
```

This test suite becomes the contract for future backends.

---

# 13. Phase 3 — Implement `OPFSWorkspace`

Implement:

```ts
class OPFSWorkspace implements CourseWorkspace
```

using the browser Origin Private File System API.

The implementation MUST obtain the course root beneath the application's OPFS namespace.

Recommended conceptual structure:

```text
OPFS
└── openedu/
    └── courses/
        └── <courseId>/
            ├── course.md
            ├── metadata.json
            ├── lessons/
            ├── activities/
            ├── assessments/
            ├── resources/
            ├── assets/
            └── .openu/
```

---

# 14. OPFS Isolation

Each course MUST have its own workspace root.

Do not allow:

```text
course A
```

to access:

```text
course B
```

through relative path operations.

Workspace paths are relative to the workspace root.

Isolation MUST be enforced by resolving every logical path into the workspace
root before touching OPFS:

```text
resolve workspace root
→ normalize the requested path
→ assert the path is root-relative (reject absolute/../escapes/root crossing)
→ descend into OPFS from the root using the safe segments only
```

The adapter MUST reuse the existing path-security helpers
(`assertSafeCoursePath`, `assertInsideWorkspace`, normalized-path collision
detection) so that a path that escapes the workspace root is rejected before any
OPFS handle is obtained.

---

# 15. OPFS File Operations

Implement:

```text
list
exists
read
readText
write
writeText
delete
move
copy
stat
```

Do not expose raw OPFS handles outside the workspace adapter.

### 15.1 Move/copy portability

OPFS has no native `copy()` operation and directory move/rename support is
inconsistent across browsers (notably limited in Chromium). The workspace
adapter MUST therefore implement `move` and `copy` using explicit operations
rather than assuming a single native call:

```text
move:
  resolve source handle
  → if destination parent is the same or a file being renamed
       use FileSystemHandle.move(destDir) where available
  → otherwise (or for directories) fall back to:
       recursive copy contents
       → write/copy each entry to destination
       → delete the source

copy:
  resolve source handle
  → copy file contents (read → write)
  → for a directory, copy recursively
```

The adapter MUST NOT assume `FileSystemHandle.move()` handles directories in
every supported browser. `move` and `copy` MUST behave identically whether the
path identifies a file or a directory.

---

# 16. OPFS Write Safety

For single-file writes, OPFS already provides atomicity for free:

```text
createWritable()
  → write data
  → close()        // atomically swaps the temp file into place
```

A single-file write using `createWritable().close()` MUST NOT leave a partially
written canonical file, even if the browser is killed mid-write. No custom
temporary-file strategy is required for an individual file.

For multi-file operations, atomicity must be staged explicitly because OPFS has
no multi-file transaction primitive:

```text
phase 1  validate all paths
phase 2  write each new/updated file to a temporary path
phase 3  flush/close all temporary writes
phase 4  rename each temp file to its canonical path, last write last
phase 5  on any failure before phase 4, delete temporary files
phase 6  on failure during phase 4, rename back any already-swapped files
```

The rename of each canonical file is the single atomic point per file. True
cross-file crash atomicity is not achievable with plain async OPFS handles;
restore-on-failure is best-effort per file and MUST be documented as such. Avoid
leaving partially written canonical files.

---

# 17. Phase 4 — Course Repository

Introduce:

```ts
export interface CourseRepository {
  list(): Promise<CourseInfo[]>;

  exists(courseId: string): Promise<boolean>;

  create(courseId: string): Promise<CourseWorkspace>;

  open(courseId: string): Promise<CourseWorkspace>;

  delete(courseId: string): Promise<void>;
}
```

The repository is responsible for course identity and workspace creation.

The workspace is responsible for files.

---

# 18. Course Identity

Course identity MUST be independent of filesystem location.

Use:

```text
courseId
```

from the OpenEdu course manifest.

Do not derive identity from:

```text
OPFS path
browser URL
IndexedDB key
```

---

# 19. Phase 5 — Browser Storage Migration

Replace the current architecture:

```text
BrowserCourseStore
    ↓
StoredStudioCourse
    ↓
files: StoredStudioFile[]
    ↓
IndexedDB
```

with:

```text
CourseRepository
    ↓
CourseWorkspace
    ↓
OPFSWorkspace
    ↓
OPFS
```

---

# 20. Existing `BrowserCourseStore`

`BrowserCourseStore` SHOULD be removed or reduced to migration-only functionality.

Do not retain it as the canonical course abstraction.

If required temporarily for migration:

```text
LegacyBrowserCourseStore
```

MAY be isolated from the new application architecture.

The new Studio code MUST NOT depend on it.

---

# 21. Existing `StoredStudioCourse`

The existing whole-course model:

```ts
StoredStudioCourse {
  files: StoredStudioFile[]
}
```

MUST NOT be used as the canonical storage representation.

It MAY remain temporarily for:

```text
legacy import
migration
tests during transition
```

but new code MUST NOT introduce new dependencies on it.

---

# 22. Phase 6 — Refactor `StudioApi`

Existing API methods such as:

```text
readFile
writeFile
deleteFile
```

MAY remain part of the application API.

However, their implementation MUST delegate to:

```text
CourseWorkspace
```

Example:

```text
StudioApi.readFile()
        ↓
CourseWorkspace.read()
```

not:

```text
StudioApi.readFile()
        ↓
IndexedDB course record
```

The same rule applies to outline/order operations (`getOutline`,
`saveOutlineOrder`). They MUST read and write the individual `workflow.json` and
`package.json` files through `CourseWorkspace` rather than loading the entire
course into memory (consistent with §53). Do not reconstruct the course as one
in-memory file set just to read or reorder the outline.

---

# 23. Preserve UI Behavior

The migration SHOULD preserve existing user-facing behavior:

```text
open course
open lesson
edit lesson
save lesson
preview
import
export
delete
rename
```

The storage architecture should change without unnecessary UI redesign.

---

# 24. Phase 7 — IndexedDB Metadata Layer

Create a clear IndexedDB metadata model.

Suggested stores:

```text
courses
workspaces
files
history
aiSessions
searchIndex
```

The MVP MAY initially implement only:

```text
courses
workspaces
files
history
aiSessions
```

---

# 25. File Index

Implement:

```ts
interface IndexedFile {
  id: string;
  workspaceId: string;
  path: string;
  size: number;
  hash?: string;
  mimeType?: string;
  modifiedAt: number;
}
```

The index represents metadata about files.

It MUST NOT contain the canonical file content.

---

# 26. Building the File Index

On first opening a workspace:

```text
OPFS
 ↓
walk workspace
 ↓
build IndexedDB file index
```

Subsequent changes SHOULD update the index incrementally.

The system MUST remain correct if the index is deleted and rebuilt.

---

# 27. Hashing

File hashes SHOULD be used for:

```text
change detection
history
future sync
integrity checks
```

A cryptographic hash such as SHA-256 SHOULD be used where practical.

Hash calculation MUST NOT block the UI for large files.

Use a Worker when appropriate.

---

# 28. Phase 8 — Transactional Workspace Changes

Introduce:

```ts
interface WorkspaceChange {
  path: string;

  operation: 'create' | 'update' | 'delete' | 'move';

  previousContent?: Uint8Array;

  newContent?: Uint8Array;
}
```

and:

```ts
interface WorkspaceChangeSet {
  id: string;
  description: string;
  source: 'user' | 'ai';
  createdAt: number;
  changes: WorkspaceChange[];
}
```

---

# 29. Transaction API

Introduce:

```ts
interface WorkspaceTransaction {
  write(path: string, data: Uint8Array): void;

  delete(path: string): void;

  move(from: string, to: string): void;

  preview(): Promise<WorkspaceChangeSet>;

  validate(): Promise<ValidationResult>;

  commit(): Promise<CommitResult>;

  rollback(): Promise<void>;
}
```

The transaction API intentionally exposes only `write(path, Uint8Array)`. Text
convenience (`writeText`) is provided by `CourseWorkspace`; callers of the
transaction MUST encode text themselves (e.g. via `TextEncoder`) so the
transaction layer handles a single binary shape. Do not add a parallel
`writeText` to the transaction interface.

The exact API MAY differ if the repository has a better established transaction pattern.

The semantic behavior is mandatory.

---

# 30. Transaction Semantics

A transaction SHALL:

1. collect changes
2. validate paths
3. validate content
4. calculate affected files
5. prepare writes
6. commit all changes
7. update metadata/index
8. record history

Step 8 (history) is satisfied when Phase 10 lands. During Phase 8 the
transaction MUST structure its commit result so history recording can be wired
in later, but before History exists a no-op or in-memory history sink is
acceptable.

If a failure occurs before commit:

```text
no canonical changes
```

If a failure occurs during commit:

```text
restore previous state
```

where technically possible.

---

# 31. Phase 9 — AI Change Workflow

Replace the current whole-course AI draft flow.

The new flow MUST be:

```text
User request
    ↓
AI Companion
    ↓
inspect workspace
    ↓
read relevant files
    ↓
generate changes
    ↓
validate
    ↓
ChangeSet
    ↓
diff preview
    ↓
user approval
    ↓
atomic commit
    ↓
history
```

---

# 32. AI Workspace Tools

Implement initial tools:

```text
workspace.list
workspace.read
workspace.search
workspace.create
workspace.update
workspace.delete
workspace.move
```

The tools MUST operate on workspace paths.

---

# 33. AI Context

The AI MUST NOT receive the entire course by default.

Instead:

```text
request
 ↓
identify relevant content
 ↓
search
 ↓
read selected files
 ↓
reason
```

The context builder SHOULD prioritize:

```text
current lesson
course metadata
learner profile
relevant blueprint
related activities
relevant resources
```

according to the request.

---

# 34. AI Write Restrictions

The AI MUST NOT directly call arbitrary storage APIs.

The AI MAY request:

```text
create
update
delete
move
```

through controlled workspace tools.

All writes MUST pass through the change-set/transaction layer.

---

# 35. User Approval

The Studio MUST provide a review state for AI changes.

Minimum UI:

```text
AI proposes 4 changes

+ lessons/03/activity-01.md
~ lessons/03/lesson.md
~ lessons/03/blueprint.json
+ assets/place-value.svg

[Review]

[Accept changes] [Reject]
```

AI changes MUST NOT silently overwrite canonical content in interactive Studio mode.

---

# 36. Diff

The diff system SHOULD support:

### Text files

Line-oriented diff:

```text
- Old explanation
+ Simplified explanation
```

### Binary files

Metadata-level indication:

```text
~ assets/example.png
Binary file changed
```

### New files

```text
+ activities/activity-02.md
```

### Deleted files

```text
- activities/activity-old.md
```

---

# 37. Phase 10 — History

Implement file-level change history.

```ts
interface HistoryEntry {
  id: string;
  workspaceId: string;
  timestamp: number;
  source: 'user' | 'ai';
  description: string;
  changes: WorkspaceChange[];
}
```

History SHOULD be stored in IndexedDB.

Canonical course files remain in OPFS.

---

# 38. Undo/Redo

Minimum implementation:

```text
Undo
Redo
```

Undo SHOULD restore previous content for affected files.

Do not implement full Git semantics.

Snapshotting changed files is sufficient for MVP.

---

# 39. AI History

AI changes SHOULD be identifiable:

```text
source: "ai"
```

and SHOULD retain:

```text
request
description
changed files
timestamp
```

This allows the user to understand:

> What did the AI change?

---

# 40. Phase 11 — Search

Introduce:

```ts
interface WorkspaceSearch {
  search(query: string): Promise<SearchResult[]>;
}
```

Initial search MUST support:

```text
filename
path
heading
full text
```

Semantic search is optional at this stage.

---

# 41. Search Index

Search indexes are derived data.

They MAY live in IndexedDB.

Deleting the index MUST NOT invalidate the course.

The index MUST be rebuildable from:

```text
CourseWorkspace
```

---

# 42. Phase 12 — Import/Export

Preserve existing `.oep` functionality.

Import:

```text
.oep
 ↓
validate manifest
 ↓
validate paths
 ↓
extract
 ↓
CourseWorkspace
 ↓
rebuild metadata/index
```

Export:

```text
CourseWorkspace
 ↓
validate
 ↓
package canonical files
 ↓
.oep
```

---

# 43. Import/Export Rules

Exports MUST NOT include:

```text
AI conversation history
search indexes
embeddings
UI state
temporary files
IndexedDB state
workspace caches
```

unless explicitly required by the `.oep` format.

Only canonical course content and package metadata belong in the course package.

---

# 44. Phase 13 — Legacy Migration

Because the current MVP is not yet live, backward compatibility is low priority.

However, existing development courses SHOULD NOT be unnecessarily lost.

If practical, implement a one-time migration:

```text
Legacy IndexedDB course
        ↓
read StoredStudioCourse
        ↓
write individual files
        ↓
OPFS workspace
        ↓
build metadata
```

This migration MAY be a development utility rather than a permanent runtime subsystem.

---

# 45. Legacy Cleanup

After migration:

Remove or isolate:

```text
whole-course IndexedDB persistence
StoredStudioCourse as canonical model
StoredStudioFile as canonical persistence
BrowserCourseStore as primary storage
whole-course replace operations
```

Search the repository for all remaining references.

Every remaining reference MUST have an intentional reason.

---

# 46. Phase 14 — React Integration

The desired dependency graph is:

```text
React component
    ↓
Studio service/hook
    ↓
CourseRepository
    ↓
CourseWorkspace
    ↓
OPFSWorkspace
```

React components MUST NOT import:

```text
opfs APIs
indexedDB APIs
BrowserCourseStore
```

directly.

---

# 47. Error Handling

Define workspace errors.

Recommended:

```ts
class WorkspaceError extends Error {}

class WorkspaceNotFoundError extends WorkspaceError {}

class WorkspacePathError extends WorkspaceError {}

class WorkspacePermissionError extends WorkspaceError {}

class WorkspaceConflictError extends WorkspaceError {}

class WorkspaceTransactionError extends WorkspaceError {}

class WorkspaceUnavailableError extends WorkspaceError {}
```

Errors SHOULD expose enough context for debugging without leaking sensitive content.

### 47.1 OPFS availability

OPFS is unavailable in some environments — notably private/incognito browsing
and when the browser refuses storage — and operations may throw
`QuotaExceededError`. The factory that creates `OPFSWorkspace` MUST probe for a
usable OPFS root and report failure through `WorkspaceUnavailableError` rather
than leaking an opaque browser error.

`CourseRepository` and the existing `getStorageStatus` contract MUST surface this
condition so the browser Studio can fall back to a read-only or
non-persistent mode instead of failing opaque writes. `QuotaExceededError` MUST
be surfaced distinctly (as it is today via `storage-unavailable` /
`quota-exceeded`) so callers can tell "unsupported" from "out of space".

---

# 48. Testing Requirements

The migration MUST add tests for:

## Workspace

```text
MemoryWorkspace
OPFSWorkspace
```

OPFS is not available in Node's default Vitest environment. The contract suite
(§12) MUST therefore run against `MemoryWorkspace` in unit tests, and cover
`OPFSWorkspace` through either a platform shim or an in-browser Playwright
smoke test. `OPFSWorkspace` MUST still expose the same exception types and
behavioral surface so the contract suite can run against it where a browser or
shim is available.

## Course repository

```text
create
open
delete
list
```

## Path safety

```text
absolute path
..
drive letter
null byte
workspace escape
normalization collision
```

## Transactions

```text
single-file commit
multi-file commit
rollback
failed validation
failed write
```

## AI changes

```text
propose
diff
approve
reject
commit
undo
```

## Import/export

```text
export
import
round-trip
invalid package
path traversal
```

---

# 49. Critical Acceptance Test

The following scenario MUST work:

```text
1. Create a course.
2. Create Lesson 1.
3. Close the Studio.
4. Reopen the Studio.
5. Reopen the course.
6. Read Lesson 1.
7. Modify Lesson 1.
8. Save.
9. Close Studio.
10. Reopen.
11. Verify modification.
```

Canonical content MUST be recovered from OPFS.

The course MUST remain functional if IndexedDB metadata is deleted and rebuilt.

---

# 50. AI Acceptance Test

The following scenario MUST work:

```text
User:
"Add a visual activity to Lesson 3."

AI:
1. Searches workspace.
2. Reads Lesson 3.
3. Reads relevant blueprint.
4. Generates activity.
5. Proposes file changes.
6. Shows diff.
7. User accepts.
8. All files commit atomically.
9. History entry is created.
10. Undo restores the previous state.
```

The AI MUST NOT replace the entire course.

---

# 51. Storage Acceptance Test

After migration:

```text
IndexedDB
```

MUST NOT contain canonical lesson content.

A test SHOULD verify that:

```text
lesson.md
```

exists in OPFS and that the IndexedDB file record contains metadata rather than the full file content.

---

# 52. Backend Independence Test

The following should produce equivalent behavior:

```text
MemoryWorkspace
OPFSWorkspace
```

for the same workspace operations.

Future:

```text
CloudWorkspace
GitWorkspace
```

should be implementable without changing the Studio editor.

---

# 53. Performance Requirements

The Studio MUST NOT load the entire course into memory merely to edit one lesson.

Opening:

```text
lesson 05
```

SHOULD read only the necessary files.

The AI context builder SHOULD retrieve only relevant files.

Large binary assets SHOULD NOT be loaded unless required.

---

# 54. Concurrency

MVP does not require multi-user collaboration.

However, the design SHOULD avoid assumptions that make future synchronization impossible.

In particular:

```text
courseId
workspaceId
file path
file hash
revision/history
```

SHOULD remain independently identifiable.

---

# 55. Future Cloud Compatibility

Do not implement cloud synchronization now.

However, the architecture MUST permit:

```text
CourseWorkspace
    ├── OPFSWorkspace
    ├── MemoryWorkspace
    ├── CloudWorkspace
    └── GitWorkspace
```

without changing:

```text
Editor
AI Companion
course schema
lesson model
```

---

# 56. Implementation Order

The coding agent MUST execute approximately in this order:

```text
Phase 1
CourseWorkspace types

Phase 2
MemoryWorkspace

Phase 3
Workspace contract tests

Phase 4
OPFSWorkspace

Phase 5
CourseRepository

Phase 6
Studio storage migration

Phase 7
IndexedDB metadata/index

Phase 8
Transactional changes

Phase 9
AI ChangeSets + approval

Phase 10
History + Undo/Redo

Phase 11
Workspace search

Phase 12
Import/export integration

Phase 13
Legacy cleanup
```

Do not begin with AI changes before the workspace abstraction is stable.

---

# 57. Definition of Done

The migration is complete when all of the following are true:

- [ ] `CourseWorkspace` exists.
- [ ] `MemoryWorkspace` exists.
- [ ] `OPFSWorkspace` exists (with OPFS-availability probing and `WorkspaceUnavailableError`).
- [ ] `OPFSWorkspace.move`/`copy` handle directories without relying on native directory move.
- [ ] Workspace contract tests exist.
- [ ] Course content is stored canonically in OPFS.
- [ ] IndexedDB no longer stores whole-course canonical content.
- [ ] `CourseRepository` exists.
- [ ] Studio uses `CourseWorkspace`.
- [ ] UI does not access storage backends directly.
- [ ] Existing path-security guarantees are preserved.
- [ ] `.oep` import works.
- [ ] `.oep` export works.
- [ ] File index exists in IndexedDB.
- [ ] File hashes are supported.
- [ ] Multi-file transactions exist.
- [ ] AI modifications use ChangeSets.
- [ ] AI modifications require approval.
- [ ] AI changes are atomic.
- [ ] History exists.
- [ ] Undo exists.
- [ ] Workspace search exists.
- [ ] Existing Studio tests pass.
- [ ] New workspace tests pass.
- [ ] Course survives browser restart.
- [ ] IndexedDB metadata can be rebuilt from OPFS.
- [ ] No production Studio code depends on `StoredStudioCourse` as canonical storage.
- [ ] No production Studio code performs whole-course replacement for normal editing or AI changes.

---

# 58. Final Architectural Invariant

The implementation MUST preserve this invariant:

```text
                    COURSE
                      │
                      ▼
              CourseWorkspace
                      │
                      ▼
                    OPFS
                      │
             canonical artifacts
```

while:

```text
                   IndexedDB
                       │
        ┌──────────────┼──────────────┐
        │              │              │
      index          history        AI state
```

The following architecture is explicitly prohibited:

```text
                    COURSE
                      │
                      ▼
              StoredStudioCourse
                      │
                      ▼
                  IndexedDB
                      │
                 whole course
```

---

# 59. Final Agent Instruction

Treat this migration as an **architectural correction before MVP**, not as a backward-compatibility exercise.

Prefer:

```text
clean architecture
clear boundaries
small interfaces
testable adapters
safe AI writes
```

over:

```text
preserving legacy storage structures
minimizing changed files
wrapping existing whole-course persistence
```

Do not introduce unnecessary abstractions beyond those specified here.

Do not redesign the course content schema unless required by an existing incompatibility.

Do not redesign the Studio UI unless required to expose:

```text
AI change review
diff
approval
undo
```

At completion, the Studio should conceptually behave as:

```text
          HUMAN
             │
             ▼
       OpenEdu Studio
             │
       ┌─────┴─────┐
       │           │
    Editor      AI Agent
       │           │
       └─────┬─────┘
             ▼
      CourseWorkspace
             │
             ▼
            OPFS
             │
       course files
```

The course is a **workspace**, not a database record.

The AI Companion is a **workspace agent**, not a course-object transformer.

This architecture is the foundation for future:

```text
offline authoring
course packages
cloud sync
Git/versioning
collaboration
AI-native authoring
```

without requiring another fundamental storage rewrite.
