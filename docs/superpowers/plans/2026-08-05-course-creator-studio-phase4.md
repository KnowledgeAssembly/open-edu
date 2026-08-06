# Course Creator Studio — Phase 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Studio beyond a single open package: teachers manage a local **course library** (list/open/duplicate/rename/archive), create light **units/bundles** (2–5 lessons), import existing package folders safely, and share with an enriched **share kit** (`.oep` + copyable classroom instructions).

**Architecture:** Introduce a Studio **workspace root** (directory of courses) alongside the active package dir. Extend `StudioAPI` with library + bundle operations implemented in Vite middleware (`LocalStudioAdapter`). Bundle format stays canonical `bundle.json` + `modules/*` per `@open-edu/schemas` / `@open-edu/core` `loadBundle` + `OepWriter.buildBundle`. Creator UI gains Library and Unit views; single-course editing remains the Phase 1–3 loop.

**Tech Stack:** React 18, Vitest, `@open-edu/design-system`, `@open-edu/i18n`, `@open-edu/core`, `@open-edu/schemas`, `@open-edu/oep-distribution`

**Prerequisites:** Phase 0–1 complete (library depends on Home/recent/share). Phase 2–3 optional but compatible.  
**Spec:** `docs/superpowers/specs/2026-08-05-course-creator-studio-design.md` § Phase 4

**Out of scope:** Cloud sync (Phase 5), LMS rostering, catalog publish, QR deep links (optional stretch), full curriculum CMS.

---

## Architecture & design-system constraints (mandatory)

1. Same design-system / i18n / token rules.
2. **Workspace model (local):**
   - Env `OPEN_EDU_STUDIO_WORKSPACE` = root folder containing course package dirs (and optional unit/bundle dirs).
   - Fallback: parent of `OPEN_EDU_PACKAGE_DIR` if workspace unset.
   - Active course still set via `OPEN_EDU_PACKAGE_DIR` **or** new `POST /api/studio/library/open` that updates server-side `currentDir` used by existing package APIs (required for switching courses without restarting Vite).
3. Archive = move to `workspace/.archive/<id>-<timestamp>/` (not delete). Soft-delete only.
4. Import = copy folder into workspace after validating `PackageManifestSchema` (or bundle schema).
5. Duplicate = deep copy directory with new `id`/`title` in manifest.
6. Do not break single-package `edu dev ./path` — when workspace has one course, Library still works.

---

## File structure

| File                                                             | Status | Responsibility                                              |
| ---------------------------------------------------------------- | ------ | ----------------------------------------------------------- |
| `packages/i18n/locales/en/studio.json`                           | Modify | Library/unit/share-kit copy                                 |
| `apps/dev-server/src/studio/library/types.ts`                    | Create | LibraryEntry, UnitSummary types                             |
| `apps/dev-server/src/studio/library/libraryIndex.ts`             | Create | Scan workspace, classify package vs bundle                  |
| `apps/dev-server/src/studio/library/libraryIndex.test.ts`        | Create | Scan/classify tests (temp dirs)                             |
| `apps/dev-server/src/studio/library/courseOps.ts`                | Create | duplicate/rename/archive/import pure+fs helpers             |
| `apps/dev-server/src/studio/library/courseOps.test.ts`           | Create | FS ops tests                                                |
| `apps/dev-server/src/studio/library/unitBuilder.ts`              | Create | Create light bundle from selected courses                   |
| `apps/dev-server/src/studio/library/unitBuilder.test.ts`         | Create | Bundle manifest tests                                       |
| `apps/dev-server/vite.config.ts`                                 | Modify | `/api/studio/library/*`, unit export, switch active package |
| `apps/dev-server/src/studio/studioApi.ts`                        | Modify | Library client methods                                      |
| `apps/dev-server/src/studio/components/LibraryView.tsx`          | Create | Course library UI                                           |
| `apps/dev-server/src/studio/components/LibraryView.test.tsx`     | Create | Library tests                                               |
| `apps/dev-server/src/studio/components/UnitBuilderView.tsx`      | Create | Compose 2–5 lessons into unit                               |
| `apps/dev-server/src/studio/components/UnitBuilderView.test.tsx` | Create | Unit builder tests                                          |
| `apps/dev-server/src/studio/components/ImportCourseDialog.tsx`   | Create | Import flow                                                 |
| `apps/dev-server/src/studio/components/ShareView.tsx`            | Modify | Share kit enhancements                                      |
| `apps/dev-server/src/studio/components/HomeView.tsx`             | Modify | Link to Library                                             |
| `apps/dev-server/src/studio/StudioApp.tsx`                       | Modify | `library` / `unit-builder` views                            |
| `apps/dev-server/src/studio/types.ts`                            | Modify | Extend views                                                |
| `apps/dev-server/src/index.ts`                                   | Modify | Accept/log workspace env                                    |

---

### Task 1: Library types, scan, i18n

**Files:**

- Create: `apps/dev-server/src/studio/library/types.ts`
- Create: `apps/dev-server/src/studio/library/libraryIndex.ts`
- Create: `apps/dev-server/src/studio/library/libraryIndex.test.ts`
- Modify: `packages/i18n/locales/en/studio.json`

- [ ] **Step 1: i18n**

```json
{
  "nav.library": "My courses",
  "library.title": "My courses",
  "library.lede": "Open, duplicate, or package lessons into a unit.",
  "library.open": "Open",
  "library.duplicate": "Duplicate",
  "library.rename": "Rename",
  "library.archive": "Archive",
  "library.import": "Import folder",
  "library.newUnit": "Create unit",
  "library.empty": "No courses in this workspace yet.",
  "library.kind.course": "Course",
  "library.kind.unit": "Unit",
  "library.archivedHeading": "Archived",
  "unit.title": "Create a unit",
  "unit.lede": "Combine 2–5 courses into one shareable unit.",
  "unit.nameLabel": "Unit name",
  "unit.pickCourses": "Select courses",
  "unit.create": "Create unit",
  "unit.needTwo": "Pick at least two courses.",
  "import.title": "Import a course folder",
  "import.help": "Choose a folder that already contains an OpenEdu package.json.",
  "import.success": "Imported",
  "import.invalid": "That folder is not a valid OpenEdu package.",
  "share.kitHeading": "Share kit",
  "share.copyClassroomNote": "Copy note for students/parents",
  "share.classroomNote": "Here is our OpenEdu course file ({{fileName}}). Open the OpenEdu learner app → Install course → choose this file."
}
```

- [ ] **Step 2: types**

```ts
export type LibraryKind = 'course' | 'unit';

export interface LibraryEntry {
  id: string;
  title: string;
  kind: LibraryKind;
  relativePath: string; // from workspace root
  version: string;
  updatedAt: number; // mtime ms
  archived?: boolean;
}
```

- [ ] **Step 3: libraryIndex**

`scanWorkspace(workspaceRoot: string): LibraryEntry[]`

- Skip `node_modules`, `.git`, `.archive`, `.edu`, `dist`
- If dir has `bundle.json` → unit (parse `BundleManifestSchema`)
- Else if dir has package manifest (`package.json` with OpenEdu fields / use `loadPackage` try) → course
- Nested modules inside a bundle should **not** appear as top-level library courses (only bundle root + standalone courses)

Use temp directories in tests with fixture manifests.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(dev-server): add studio library index scanning and copy

EOF
)"
```

---

### Task 2: courseOps — duplicate, rename, archive, import

**Files:**

- Create: `apps/dev-server/src/studio/library/courseOps.ts`
- Create: `apps/dev-server/src/studio/library/courseOps.test.ts`

- [ ] **Step 1: Tests first (fs in tmp)**

Cover:

- `duplicateCourse(src, workspace, newId, newTitle)` copies tree; new manifest id/title; old untouched
- `renameCourse(path, newTitle)` updates title (and optionally id if teacher provides kebab id)
- `archiveCourse(path, workspace)` moves under `.archive/`
- `importCourseFolder(src, workspace)` rejects invalid; copies valid

Use `node:fs/promises` + `os.tmpdir()`. Path traversal: reject targets outside workspace.

- [ ] **Step 2: Implement with path safety**

Every operation resolves absolute paths and asserts `resolved.startsWith(workspaceRoot)`.

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(dev-server): add studio library duplicate rename archive import ops

EOF
)"
```

---

### Task 3: Unit builder (light bundles)

**Files:**

- Create: `apps/dev-server/src/studio/library/unitBuilder.ts`
- Create: `apps/dev-server/src/studio/library/unitBuilder.test.ts`

- [ ] **Step 1: Create bundle layout**

Given workspace + selected course relative paths + unit id/title/author:

```
units/<unit-id>/
  bundle.json
  modules/<course-id>/...copied package files...
```

`bundle.json` must satisfy `BundleManifestSchema` (see `packages/schemas/src/bundle.ts` and `examples/level-b-math`).

Module `path` fields should match on-disk layout expected by `loadBundle`.

- [ ] **Step 2: Export unit `.oep`**

Reuse `OepWriter.buildBundle` like `packages/cli/src/commands/oep-build-bundle.ts`. Expose via API in Task 4.

- [ ] **Step 3: Tests + commit**

```bash
git commit -m "$(cat <<'EOF'
feat(dev-server): add light unit/bundle builder for studio library

EOF
)"
```

---

### Task 4: Vite library APIs + studioApi + active package switching

**Files:**

- Modify: `apps/dev-server/vite.config.ts`
- Modify: `apps/dev-server/src/studio/studioApi.ts`
- Modify: `apps/dev-server/src/index.ts`

- [ ] **Step 1: Endpoints**

| Method | Path                                  | Behavior                                                                                                                                                                                                                                                        |
| ------ | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/studio/library`                 | `{ workspace, entries }`                                                                                                                                                                                                                                        |
| POST   | `/api/studio/library/open`            | `{ relativePath }` → set active `currentDir` / package dir used by `/api/package/*`                                                                                                                                                                             |
| POST   | `/api/studio/library/duplicate`       | body ids/titles                                                                                                                                                                                                                                                 |
| POST   | `/api/studio/library/rename`          |                                                                                                                                                                                                                                                                 |
| POST   | `/api/studio/library/archive`         |                                                                                                                                                                                                                                                                 |
| POST   | `/api/studio/library/import`          | `{ sourcePath }` absolute path selected via dialog — **note:** browser cannot pick arbitrary server paths; for local Studio use an Input for absolute path **or** copy-upload zip. Phase 4 MVP: text field “Folder path on this computer” (teacher local-only). |
| POST   | `/api/studio/library/create-unit`     | `{ title, courseRelativePaths: string[] }`                                                                                                                                                                                                                      |
| POST   | `/api/studio/library/export-unit-oep` | `{ relativePath }` → octet stream                                                                                                                                                                                                                               |

Active package switching must update the same `currentDir` variable the existing package file API uses (refactor vite plugin state carefully; add tests that open switches subsequent `/api/package/dir`).

- [ ] **Step 2: Client wrappers in studioApi**

- [ ] **Step 3: Log workspace on server start in `index.ts` / vite plugin**

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(dev-server): add studio library HTTP API and active course switching

EOF
)"
```

---

### Task 5: LibraryView + ImportCourseDialog UI

**Files:**

- Create: `apps/dev-server/src/studio/components/LibraryView.tsx`
- Create: `apps/dev-server/src/studio/components/LibraryView.test.tsx`
- Create: `apps/dev-server/src/studio/components/ImportCourseDialog.tsx`
- Modify: `HomeView.tsx`, `StudioApp.tsx`, `types.ts`

- [ ] **Step 1: LibraryView**

Design-system `Card` list of entries with kind badge; actions Open / Duplicate / Rename (`Dialog`) / Archive (`Dialog` confirm). EmptyState when none. Button Import + Create unit.

Open → `library.open` → navigate Outline (and ensure preview loads new package — may require StudioApp remount key on packageDir change).

- [ ] **Step 2: ImportCourseDialog**

`Dialog` + `Input` for absolute folder path + validate via API.

- [ ] **Step 3: Wire nav**

`StudioTopBar` / Home: “My courses” → library view.

- [ ] **Step 4: Tests + commit**

```bash
git commit -m "$(cat <<'EOF'
feat(dev-server): add creator course library and import UI

EOF
)"
```

---

### Task 6: UnitBuilderView + Share kit polish

**Files:**

- Create: `apps/dev-server/src/studio/components/UnitBuilderView.tsx`
- Create: `apps/dev-server/src/studio/components/UnitBuilderView.test.tsx`
- Modify: `ShareView.tsx`

- [ ] **Step 1: UnitBuilderView**

Multi-select 2–5 courses (checkbox list), name field, Create → API → appear in Library as unit. Optional: export unit `.oep` immediately.

Use design-system controls only; disable Create until 2–5 selected (`unit.needTwo` / max message).

- [ ] **Step 2: Share kit**

On ShareView success after export:

- Show `share.kitHeading`
- Button copies `t('share.classroomNote', { fileName })` — if i18n interpolation unsupported, format in component with `fileName`
- Keep existing how-to steps

- [ ] **Step 3: Acceptance**

1. Two courses in workspace → visible in Library
2. Duplicate + rename works
3. Archive hides from main list (optional archived section)
4. Create unit of 2 courses → bundle loads / exports
5. Import valid example path
6. Share kit copy works

- [ ] **Step 4: Verification**

```bash
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server lint
```

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(dev-server): complete Studio Phase 4 library, units, and share kit

EOF
)"
```

---

## Phase 4 exit criteria

- [ ] Teacher can manage multiple courses in a workspace
- [ ] Duplicate / rename / archive / import work safely
- [ ] Light unit (bundle) of 2–5 courses can be created and exported
- [ ] Share kit improves classroom handoff copy
- [ ] Single-course Creator loop still works
- [ ] Design-system + i18n constraints held

## Follow-on

Phase 5 (not in this plan): `CloudStudioAdapter`, auth, hosted storage — same StudioUI against cloud StudioAPI.
