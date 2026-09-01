# Studio unified view — Implementation plan

> **For agentic workers (including small/fast models):** Implement **one task at a time**. Check every `- [ ]` step. Run that task’s **Verify** command and fix failures before starting the next task. Do not skip tests. Do not invent a second product mode.

**Goal:** One Course Creator Studio shell. Outline stays the activity spine, with a **Files** tab for the package file tree / raw editors / asset upload. Preview gets **DevTools** in a collapsed bottom drawer. Author Assistant stays pinned on Outline and Files. Remove Creator/Developer mode.

**Spec:** [`../specs/2026-09-01-studio-unified-view-design.md`](../specs/2026-09-01-studio-unified-view-design.md)

**Stack:** React 18, Vitest, Testing Library, Playwright, `@open-edu/i18n`, `@open-edu/design-system`, Tailwind `--oe-*` tokens via `cn()`. No inline hex colors. User-facing strings use `t()` + `packages/i18n/locales/en/studio.json`.

**Do not:**

- Reintroduce `ModeToggle`, `getStudioMode`, or `OPEN_EDU_STUDIO_MODE` after Task 8.
- Nest the full `EditorShell` Preview/Edit chrome or widget live-preview split into Outline.
- Port `BundleDevApp` or invent bundle authoring.
- Hand-edit `openwiki/` generated pages.
- Change `packages/` except `packages/i18n/locales/en/studio.json` (and i18n tests if they enumerate keys).
- Use `editor/api.ts` from Studio UI after Task 3 (StudioApi only).
- Commit unless the human asks.

**Branch:** Create `feat/studio-unified-view` from current main if not already on a feature branch. Do not implement on `main` unless the human says so.

---

## Current vs target (read this first)

Today `DevApp` (`apps/dev-server/src/DevApp.tsx`) branches:

- `studioMode === 'creator'` → `StudioApp` (no inspectors on Preview).
- else → `EditorShell` (edit) or `SinglePackageDeveloperApp` (preview + right-rail `InspectorPanel`).
- Bundles in creator → empty state “Bundles need Developer mode”; developer → `BundleDevApp`.

Target: **always** `StudioApp` (local and `VITE_OPEN_EDU_BROWSER === '1'`). Files live under Outline. Inspectors live under Preview as a bottom drawer.

Playwright helpers currently force developer mode:

```ts
// tests/e2e/helpers.ts
process.env.OPEN_EDU_STUDIO_MODE = 'developer';
```

Those e2e specs assume the **first paint is the learner runtime + open inspector**. After this work, first paint is Studio chrome. E2E must click **Preview**, then **DevTools**. Task 9 is mandatory, not optional.

---

## File map

| File                                                                                                                                                       | Action                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/i18n/locales/en/studio.json`                                                                                                                     | Modify — Files tab, DevTools, bundle copy, drop unused mode keys at the end                                                                                                                                                                                                                                                              |
| `apps/dev-server/src/studio/studioApi.ts`                                                                                                                  | Modify — `listFiles`, `createFile`, `renameFile`, `uploadAsset`                                                                                                                                                                                                                                                                          |
| `apps/dev-server/src/studio/localStudioApi.ts`                                                                                                             | Modify — implement those methods                                                                                                                                                                                                                                                                                                         |
| `apps/dev-server/src/studio/localStudioApi.test.ts`                                                                                                        | Modify                                                                                                                                                                                                                                                                                                                                   |
| `apps/dev-server/src/studio/browserStudioApi.ts`                                                                                                           | Modify                                                                                                                                                                                                                                                                                                                                   |
| `apps/dev-server/src/studio/browserStudioApi.test.ts`                                                                                                      | Modify                                                                                                                                                                                                                                                                                                                                   |
| `apps/dev-server/src/studio/packageFileCategory.ts`                                                                                                        | Create — copy `getFileCategory` from vite.config                                                                                                                                                                                                                                                                                         |
| `apps/dev-server/src/studio/packageFileCategory.test.ts`                                                                                                   | Create                                                                                                                                                                                                                                                                                                                                   |
| `apps/dev-server/src/studio/studioSession.ts`                                                                                                              | Modify — outline sub-tab + files path                                                                                                                                                                                                                                                                                                    |
| `apps/dev-server/src/studio/devtoolsStorage.ts`                                                                                                            | Create                                                                                                                                                                                                                                                                                                                                   |
| `apps/dev-server/src/studio/devtoolsStorage.test.ts`                                                                                                       | Create                                                                                                                                                                                                                                                                                                                                   |
| `apps/dev-server/src/editor/EditorShell.tsx`                                                                                                               | Modify — `fileApi`, `variant="embedded"`                                                                                                                                                                                                                                                                                                 |
| `apps/dev-server/src/studio/components/PackageSourcePane.tsx`                                                                                              | Create — thin wrapper                                                                                                                                                                                                                                                                                                                    |
| `apps/dev-server/src/studio/components/PackageSourcePane.test.tsx`                                                                                         | Create                                                                                                                                                                                                                                                                                                                                   |
| `apps/dev-server/src/studio/components/OutlineWorkspace.tsx`                                                                                               | Create — Outline \| Files tabs                                                                                                                                                                                                                                                                                                           |
| `apps/dev-server/src/studio/components/OutlineWorkspace.test.tsx`                                                                                          | Create                                                                                                                                                                                                                                                                                                                                   |
| `apps/dev-server/src/studio/StudioApp.tsx`                                                                                                                 | Modify                                                                                                                                                                                                                                                                                                                                   |
| `apps/dev-server/src/studio/components/StudioChrome.tsx`                                                                                                   | Modify — remove mode                                                                                                                                                                                                                                                                                                                     |
| `apps/dev-server/src/studio/types.ts`                                                                                                                      | Modify — remove `StudioMode`                                                                                                                                                                                                                                                                                                             |
| `apps/dev-server/src/studio/CreatorPreview.tsx`                                                                                                            | Modify — telemetry + drawer                                                                                                                                                                                                                                                                                                              |
| `apps/dev-server/src/studio/CreatorPreview.test.tsx`                                                                                                       | Modify                                                                                                                                                                                                                                                                                                                                   |
| `apps/dev-server/src/inspectors/InspectorPanel.tsx`                                                                                                        | Modify — bottom drawer, i18n, no FAB                                                                                                                                                                                                                                                                                                     |
| `apps/dev-server/src/inspectors/InspectorPanel.test.tsx`                                                                                                   | Modify                                                                                                                                                                                                                                                                                                                                   |
| `apps/dev-server/src/DevApp.tsx`                                                                                                                           | Modify — always StudioApp; delete developer branches                                                                                                                                                                                                                                                                                     |
| `apps/dev-server/src/DevApp.test.tsx`                                                                                                                      | Modify                                                                                                                                                                                                                                                                                                                                   |
| `apps/dev-server/src/DevApp.bundle.test.tsx`                                                                                                               | Modify                                                                                                                                                                                                                                                                                                                                   |
| `apps/dev-server/vite.config.ts`                                                                                                                           | Modify — remove `OPEN_EDU_STUDIO_MODE` define                                                                                                                                                                                                                                                                                            |
| `apps/dev-server/src/env.d.ts`                                                                                                                             | Modify — remove `OPEN_EDU_STUDIO_MODE`                                                                                                                                                                                                                                                                                                   |
| `tests/e2e/helpers.ts`                                                                                                                                     | Modify                                                                                                                                                                                                                                                                                                                                   |
| `tests/e2e/telemetry.spec.ts`                                                                                                                              | Modify                                                                                                                                                                                                                                                                                                                                   |
| `tests/e2e/accessibility.spec.ts`                                                                                                                          | Modify                                                                                                                                                                                                                                                                                                                                   |
| Delete after unused: `modeStorage.ts`, `modeStorage.test.ts`, `ModeToggle.tsx`, `ModeToggle.test.tsx`, `DeveloperToolbar.tsx`, `DeveloperToolbar.test.tsx` | Delete in Task 8                                                                                                                                                                                                                                                                                                                         |
| `apps/dev-server/src/editor/api.ts`                                                                                                                        | Keep until EditorShell tests still import it **or** switch tests to a mock `fileApi` in Task 3 and leave `api.ts` as the local HTTP implementation used only by `createLocalStudioApi` (preferred: local StudioApi **calls the same URLs**; `editor/api.ts` can remain for existing `editor/__tests__/api.test.ts` until a cleanup step) |

**All `StudioApi` test stubs** that construct an object literal must gain the new methods or TypeScript will fail. Search `apps/dev-server` for `writeFile:` and `createLocalStudioApi:` mocks.

---

## Shared types to add on `StudioApi`

Add next to existing `readFile` / `writeFile` / `deleteFile` in `studioApi.ts`:

```ts
export interface PackageFileEntry {
  path: string;
  label: string;
  category: string;
  extension: string;
}

// on StudioApi:
listFiles(): Promise<PackageFileEntry[]>;
createFile(path: string, content?: string): Promise<{ success: boolean; path: string }>;
renameFile(oldPath: string, newPath: string): Promise<{ success: boolean; oldPath: string; newPath: string }>;
uploadAsset(file: File, path?: string): Promise<{ success: boolean; path: string }>;
```

`PackageFileEntry` must match `FileEntry` in `apps/dev-server/src/editor/types.ts` (same four fields) so `FileTree` can consume it without mapping.

`writeFile` stays `(path, content)` — two arguments. Local client always sends `{ path, content, validate: true }` in the JSON body (already true today).

---

## Task 1: i18n + session helpers (no UI yet)

**Files:**

- Modify: `packages/i18n/locales/en/studio.json`
- Modify: `apps/dev-server/src/studio/studioSession.ts`
- Create: `apps/dev-server/src/studio/devtoolsStorage.ts`
- Create: `apps/dev-server/src/studio/devtoolsStorage.test.ts`
- Add tests in `studioSession` — if there is no `studioSession.test.ts`, create `apps/dev-server/src/studio/studioSession.test.ts`

- [ ] **Step 1:** Add these keys (exact English). Do not remove `mode.*` until Task 8 or ModeToggle tests break.

```json
"outline.tabOutline": "Outline",
"outline.tabFiles": "Files",
"outline.tabsLabel": "Course outline views",
"files.openAsActivity": "Open as activity",
"files.loadError": "Could not load package files.",
"files.binaryHint": "This file is binary and cannot be edited as text.",
"files.unsavedTitle": "Unsaved changes",
"files.unsavedLede": "Save changes to this file before switching, or discard them.",
"files.unsavedSave": "Save",
"files.unsavedDiscard": "Discard",
"files.unsavedCancel": "Cancel",
"preview.devtools": "DevTools",
"preview.devtoolsOpen": "Open DevTools",
"preview.devtoolsClose": "Close DevTools",
"preview.devtoolsPanel": "Preview DevTools",
"devtools.telemetry": "Telemetry",
"devtools.logs": "Logs",
"devtools.rewards": "Rewards",
"devtools.a11y": "A11y",
"devtools.bundle": "Bundle",
"bundle.unsupportedHeading": "Bundles are not supported yet",
"bundle.unsupportedLede": "Studio edits a single course package. Open a single-package course instead of a bundle."
```

Overwrite the existing `bundle.unsupportedHeading` / `bundle.unsupportedLede` values (they currently mention Developer mode).

- [ ] **Step 2:** In `studioSession.ts` add:

```ts
const OUTLINE_TAB_KEY = 'openedu.studio.outlineTab';
const FILES_PATH_KEY = 'openedu.studio.filesPath';
export type OutlineTab = 'outline' | 'files';

export function readOutlineTab(): OutlineTab;
export function writeOutlineTab(tab: OutlineTab): void;
export function readFilesPath(): string | null;
export function writeFilesPath(path: string | null): void;
```

Mirror the try/catch style of `readStudioView`. Invalid values → `'outline'` / `null`.

- [ ] **Step 3:** `devtoolsStorage.ts`:

```ts
const KEY = 'openedu.studio.devtools';
export type DevtoolsTab = 'telemetry' | 'logs' | 'rewards' | 'accessibility' | 'bundle';
export interface DevtoolsState {
  open: boolean;
  tab: DevtoolsTab;
}
export function readDevtoolsState(): DevtoolsState; // default { open: false, tab: 'telemetry' }
export function writeDevtoolsState(state: DevtoolsState): void;
```

Use `sessionStorage`. Parse JSON; on failure return default.

- [ ] **Step 4:** Tests: default tab outline; write/read files path; default DevTools closed; persist `{ open: true, tab: 'logs' }`.

**Verify:**

```bash
pnpm --filter @open-edu/dev-server test src/studio/studioSession.test.ts src/studio/devtoolsStorage.test.ts
```

---

## Task 2: Extend StudioApi (local + browser)

**Files:** listed in File map for studioApi / local / browser / packageFileCategory.

- [ ] **Step 1:** Create `packageFileCategory.ts` by copying `getFileCategory` from `apps/dev-server/vite.config.ts` lines 133–141. Export `getFileCategory(filePath: string): string`. Tests: `package.json` → `manifest`, `nodes/a.md` → `nodes`, `assets/x.png` → `assets`, `foo.txt` → `other`.

- [ ] **Step 2:** `localStudioApi.ts` — copy request shapes from `apps/dev-server/src/editor/api.ts`:

| Method        | HTTP                                                                                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listFiles`   | `GET /api/package/tree` → `{ files }`                                                                                                                            |
| `createFile`  | `POST /api/package/file` body `{ path, content, validate: true }`                                                                                                |
| `renameFile`  | `POST /api/package/rename` body `{ oldPath, newPath }`                                                                                                           |
| `uploadAsset` | `POST /api/package/assets/upload` **FormData** (`file`, optional `path`). Do **not** set `Content-Type: application/json`. Mirror `editor/api.ts` `uploadAsset`. |

Add these four functions onto the `api` object in `createLocalStudioApi`.

- [ ] **Step 3:** `localStudioApi.test.ts` — add tests mirroring `apps/dev-server/src/editor/__tests__/api.test.ts` for list/create/rename/upload URLs.

- [ ] **Step 4:** `browserStudioApi.ts`:

`listFiles`: `walkWorkspace(await requireActiveWorkspace())` (already imported). Map each file path to `{ path, label: basename, category: getFileCategory(path), extension }`. `extension` = from last `.` including the dot, or `''`.

`createFile`: `assertSafeCoursePath`, `writeText` with `content ?? ''`, `onPackageChanged()`.

`renameFile`: read bytes or text from old path, write to new path, delete old, `onPackageChanged()`. If workspace has `move`/`rename`, use that instead.

`uploadAsset`: `const buf = new Uint8Array(await file.arrayBuffer())`; dest path = `path ?? \`assets/${file.name}\``; `assertSafeCoursePath`; `ws.write(dest, buf)`; `onPackageChanged()`.

Add the four methods to the returned object (~line 648).

- [ ] **Step 5:** `browserStudioApi.test.ts` — after opening the fixture course: `listFiles()` includes `package.json` with category `manifest`; `createFile('notes.txt', 'hi')` then `readFile`; `renameFile`; `uploadAsset` with a small `File` and `readFile` may throw `binary-file` for png — that is OK; assert `uploadAsset` `{ success: true, path }`.

**Verify:**

```bash
pnpm --filter @open-edu/dev-server test src/studio/localStudioApi.test.ts src/studio/browserStudioApi.test.ts src/studio/packageFileCategory.test.ts
```

---

## Task 3: Embedded package source pane (EditorShell variant)

**Intent:** Reuse `EditorShell` internals. Do **not** duplicate 1000 lines. Do **not** show Preview/Edit package chrome or widget live-preview in embedded mode.

- [ ] **Step 1:** Define a small client type in `apps/dev-server/src/editor/types.ts` (or `fileApi.ts`):

```ts
export interface PackageFileApi {
  listFiles(): Promise<FileEntry[]>;
  getPackageDir(): Promise<string>;
  readFile(path: string): Promise<{ path: string; content: string }>;
  writeFile(path: string, content: string, validate?: boolean): Promise<{ success: boolean }>;
  deleteFile(path: string): Promise<{ success: boolean }>;
  renameFile(
    oldPath: string,
    newPath: string,
  ): Promise<{ success: boolean; oldPath: string; newPath: string }>;
  createFile(path: string, content?: string): Promise<{ success: boolean; path: string }>;
  uploadAsset(file: File, path?: string): Promise<{ success: boolean; path: string }>;
}
```

- [ ] **Step 2:** In `EditorShell.tsx`, replace `import * as api from './api'` usage with a prop:

```ts
fileApi?: PackageFileApi;
variant?: 'standalone' | 'embedded'; // default 'standalone'
initialPath?: string | null;
onOpenActivity?: (path: string) => void;
onDirtyChange?: (dirty: boolean) => void;
onTreeChanged?: () => void;
```

If `fileApi` is omitted, build a default from `./api` so existing EditorShell tests keep working:

```ts
const defaultFileApi: PackageFileApi = {
  listFiles: api.listFiles,
  getPackageDir: api.getPackageDir,
  readFile: api.readFile,
  writeFile: (path, content, validate) => api.writeFile(path, content, validate ?? true),
  deleteFile: api.deleteFile,
  renameFile: api.renameFile,
  createFile: api.createFile,
  uploadAsset: api.uploadAsset,
};
```

(Confirm `createFile` is already exported from `editor/api.ts` — it is.)

Use `const client = fileApi ?? defaultFileApi` everywhere `api.` is used for file ops.

- [ ] **Step 3:** `variant === 'embedded'` UI rules:

1. Do **not** render the top bar that contains “Edit Package” / “Done Editing” (the block around `EditorShell.tsx` ~680–695).
2. Always show the file-tree + editor split (the `mode === 'edit'` branch ~697+). Treat embedded as always-edit.
3. Hide widget “Show Preview” / split preview (`showPreview` force `false`; do not render `SplitPaneLayout` preview).
4. When `onOpenActivity` is passed and `selectedPath` starts with `nodes/`, show a button labelled `t('studio.files.openAsActivity')` that calls `onOpenActivity(selectedPath)`.
5. Call `onDirtyChange(dirtyCount > 0)` in an effect when `dirtyCount` changes.
6. After successful create/delete/rename/upload/save, call `onTreeChanged?.()` as well as `refreshFiles()`.
7. Replace hardcoded toasts later if easy; **not required** in this task if tests don’t assert toast copy. Prefer `t()` for the new Open-as-activity button only.

Dirty navigation inside the tree: keep existing EditorShell behavior if any; Outline tab switch is handled in Task 4 via `onDirtyChange`.

- [ ] **Step 4:** Create `PackageSourcePane.tsx`:

```tsx
export function PackageSourcePane({
  api,
  initialPath,
  onOpenActivity,
  onDirtyChange,
  onTreeChanged,
}: {
  api: StudioApi;
  initialPath?: string | null;
  onOpenActivity?: (path: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onTreeChanged?: () => void;
}) {
  const fileApi: PackageFileApi = {
    listFiles: () => api.listFiles(),
    getPackageDir: () => api.getPackageDir(),
    readFile: (path) => api.readFile(path),
    writeFile: (path, content) => api.writeFile(path, content),
    deleteFile: (path) => api.deleteFile(path),
    renameFile: (oldPath, newPath) => api.renameFile(oldPath, newPath),
    createFile: (path, content) => api.createFile(path, content),
    uploadAsset: (file, path) => api.uploadAsset(file, path),
  };
  return (
    <EditorShell
      variant="embedded"
      fileApi={fileApi}
      initialPath={initialPath}
      onOpenActivity={onOpenActivity}
      onDirtyChange={onDirtyChange}
      onTreeChanged={onTreeChanged}
      isOpen
      onToggle={() => {}}
      mode="edit"
      onModeChange={() => {}}
    />
  );
}
```

`EditorShell` still requires `isOpen` / `mode` / `onModeChange` for standalone. Embedded ignores mode changes.

If `initialPath` is set, after `listFiles` select that path instead of `fileList[0]`.

- [ ] **Step 5:** Tests `PackageSourcePane.test.tsx`:

Wrap with `I18nProvider` like other studio tests. Mock `api.listFiles` → `[{ path: 'package.json', label: 'package.json', category: 'manifest', extension: '.json' }, { path: 'nodes/a.md', label: 'a.md', category: 'nodes', extension: '.md' }]`. Mock `readFile` for those paths.

- Renders a tree control / filename `package.json`.
- Clicking `nodes/a.md` then “Open as activity” calls `onOpenActivity` with `nodes/a.md`.
- Does **not** render a button named `/edit package/i` or `/done editing/i`.

Keep existing `editor/__tests__/editor.test.tsx` FileTree tests passing (unchanged).

**Verify:**

```bash
pnpm --filter @open-edu/dev-server test src/studio/components/PackageSourcePane.test.tsx src/editor/__tests__/editor.test.tsx
```

If `EditorShell` tests fail because of new required i18n, wrap EditorShell tests with `I18nProvider` **or** keep embedded-only strings behind `variant === 'embedded'`.

---

## Task 4: Outline page tabs (Outline | Files)

**Files:** `OutlineWorkspace.tsx`, tests, `StudioApp.tsx`.

- [ ] **Step 1:** `OutlineWorkspace` props:

```ts
{
  api: StudioApi;
  onEdit: (path: string) => void;
  onError: (message: string) => void;
  onTitleChange?: (title: string) => void;
  onShare?: () => void;
  onOutlineMutated?: () => void; // bump outlineRevision
}
```

Layout:

```tsx
<div className="flex h-full min-h-0 flex-col">
  <Tabs value={tab} onValueChange={...}>
    <TabsList aria-label={t('studio.outline.tabsLabel')}>
      <TabsTrigger value="outline">{t('studio.outline.tabOutline')}</TabsTrigger>
      <TabsTrigger value="files">{t('studio.outline.tabFiles')}</TabsTrigger>
    </TabsList>
    <TabsContent value="outline" className="min-h-0 flex-1 overflow-auto">
      <OutlineView ... existing props ... />
    </TabsContent>
    <TabsContent value="files" className="min-h-0 flex-1 overflow-hidden">
      <PackageSourcePane ... />
    </TabsContent>
  </Tabs>
</div>
```

Use Tabs from `@open-edu/design-system` if Studio already does (Outline/inspectors use `@open-edu/design-system` or `apps/dev-server/src/components/ui/tabs`). **Match InspectorPanel:** `apps/dev-server/src/components/ui/tabs`.

Initialize `tab` from `readOutlineTab()`. On change, `writeOutlineTab`.

`PackageSourcePane` `initialPath={readFilesPath()}`. On file select, `writeFilesPath` — pass a callback into PackageSourcePane if needed: add optional `onSelectPath?: (path: string) => void` on EditorShell/PackageSourcePane fired from `handleFileSelect`.

Dirty guard: if `filesDirty && nextTab === 'outline'`, show Dialog using `files.unsaved*` keys. Save: you cannot easily call save from outside unless you add `saveRef`. **Simpler approach for this task:** `window.confirm(t('studio.files.unsavedLede'))` is **not** acceptable (i18n + a11y). Use Dialog: Discard sets dirty false and switches; Cancel stays; Save — add `saveRequested` counter prop or `imperativeHandle`. **Required:** `useImperativeHandle` on PackageSourcePane:

```ts
export type PackageSourcePaneHandle = {
  isDirty: () => boolean;
  save: () => Promise<void>;
};
```

Forward ref from PackageSourcePane → EditorShell. Expose `handleSave` and `dirtyCount`.

If Save in the dialog fails, do not switch tabs.

- [ ] **Step 2:** `StudioApp.tsx` — for `view === 'outline'`, render `OutlineWorkspace` instead of `OutlineView`. Pass `onOutlineMutated={() => setOutlineRevision((n) => n + 1)}`. Keep `key={outlineRevision}` on OutlineWorkspace so Outline tab refreshes after Files mutations.

`handleEdit` already navigates to `edit-activity`. Pass it as `onEdit` and as `onOpenActivity`.

Assistant: do **not** remount `StudioChatProvider` / `StudioLayout` when switching Outline tabs (tabs are inside children). Do **not** put `key={tab}` on StudioLayout.

`onOpenPath` in `StudioChatProvider`: if path is under `nodes/`, keep `handleEdit`; else `writeOutlineTab('files'); writeFilesPath(path); handleNavigate('outline')`.

- [ ] **Step 3:** Tests `OutlineWorkspace.test.tsx`:

Mock api like `OutlineView.test.tsx` `makeApi` **plus** `listFiles`, `createFile`, `renameFile`, `uploadAsset`, `getPackageDir`.

- Default tab is Outline: “Add lesson” (or existing outline empty/add controls) visible; Files tree not required until click.
- Click Files tab: `listFiles` called; tree label appears.
- Author assistant is **not** tested here if OutlineWorkspace does not mount it — test in StudioApp: switch tabs, `getByRole` for assistant open button still present (`studio.assistant.open` / header button). Add one test in `StudioApp.test.tsx`: navigate to outline (existing tests already go there), click Files, expect no crash and Files trigger selected.

If assistant is disabled in StudioApp tests (`getAiStatus` false / flag), skip assistant assertion; still assert both tab triggers exist.

- [ ] **Step 4:** Update `StudioApp.test.tsx` mocks with the four new API methods (`listFiles` resolve `[]` at minimum).

**Verify:**

```bash
pnpm --filter @open-edu/dev-server test src/studio/components/OutlineWorkspace.test.tsx src/studio/StudioApp.test.tsx src/studio/components/OutlineView.test.tsx
```

---

## Task 5: InspectorPanel as bottom drawer (no FAB)

**Files:** `InspectorPanel.tsx`, `InspectorPanel.test.tsx`.

- [ ] **Step 1:** Remove internal `isOpen` default-true and the floating bottom-right Button. The panel is **only** the drawer chrome + tabs.

New props:

```ts
open: boolean;
onOpenChange: (open: boolean) => void;
activeTab?: Tab;
onActiveTabChange?: (tab: Tab) => void;
auditRootSelector?: string; // unused here; a11y inspector already uses .open-edu-runtime
```

If parent controls tab, use controlled tabs; else keep internal state initialized from `activeTab`.

Layout classes (drawer, not `w-[360px] border-l`):

```
className="border-outline-variant bg-surface-container-low flex h-[min(40vh,280px)] w-full shrink-0 flex-col border-t font-mono text-xs"
role="complementary"
aria-label={t('studio.preview.devtoolsPanel')}
```

Close button calls `onOpenChange(false)`, `aria-label={t('studio.preview.devtoolsClose')}`.

Replace visible tab labels with `t('studio.devtools.telemetry')` etc. `InspectorPanel` must use `useTranslation` from `@open-edu/i18n`. Tests must wrap with `I18nProvider` + `studio` dictionary (copy `CreatorPreview.test.tsx` wrap).

Bundle tab: keep `bundleData &&` trigger. Label `t('studio.devtools.bundle')`.

- [ ] **Step 2:** `Escape`: `useEffect` when `open`, listen `keydown` on `document` for `Escape` → `onOpenChange(false)`. Remove listener on cleanup. Tests: fire Escape, expect `onOpenChange(false)`.

- [ ] **Step 3:** Update `InspectorPanel.test.tsx`: pass `open` and `onOpenChange`. Default render `open={true}`. Assert complementary name from i18n (`Preview DevTools`). Remove any test that clicked the FAB to reopen.

**Verify:**

```bash
pnpm --filter @open-edu/dev-server test src/inspectors/InspectorPanel.test.tsx
```

---

## Task 6: CreatorPreview — telemetry, rewards, DevTools toggle

**Copy runtime wiring from** `SinglePackageDeveloperApp` in `DevApp.tsx` lines 291–370 and 429–466.

- [ ] **Step 1:** `CreatorPreview.tsx` additions:

State: `devtools` from `readDevtoolsState()`; `telemetryEvents`; `rewardReceipts`; refs for `TelemetrySession` and `RewardBroker`; `rewardBridge = useMemo(() => createRewardReceiptBridge(), [])`.

`useEffect` identical in behavior to SinglePackageDeveloperApp: start session, subscribe events, optional RewardBroker from `pkg.rewards`, subscribe engine to emit `node_open` / `node_complete` / `workflow_complete`, cleanup stop/unsubscribe.

Pass to `RuntimeProvider`:

- existing props
- `onTelemetryEvent={(e) => telemetrySessionRef.current?.emit(e)}`
- wrap with `RewardEventBridge receipts$={rewardBridge.receipts$}` like DevApp

Toolbar: keep Exit + Reset; add DevTools `Button` `aria-pressed={devtools.open}` `aria-label={t(devtools.open ? 'studio.preview.devtoolsClose' : 'studio.preview.devtoolsOpen')}` children `t('studio.preview.devtools')`. Toggle writes `writeDevtoolsState`.

If `!engine`, do not show a working DevTools toggle (disable).

Layout: column: toolbar; row: sidebar + `LayoutShell` (`flex-1 min-h-0`); **below the row**, if `devtools.open`, `InspectorPanel` with events, receipts, `definedRewards` mapped like DevApp (flatMap triggers). `bundleData` omit unless you have a bundle (you will not).

Reset progress: existing `setProgressKey`; also `setTelemetryEvents([])` and `setRewardReceipts([])`. The effect deps include `progressKey` **or** `engine` so session restarts — add `progressKey` to the effect dependency array so reset creates a new session.

- [ ] **Step 2:** Tests `CreatorPreview.test.tsx`:

Replace `'renders the runtime without DevTools inspectors'`:

- Complementary `Preview DevTools` **not** in document by default.
- Click DevTools; complementary appears; Telemetry tab visible (`getByRole('tab', { name: /telemetry/i })`).

Add: Reset progress still present; Exit still works.

Optional: `RuntimeProvider` mock is heavy; do **not** require asserting a real telemetry event in unit tests if the runtime is hard to drive. Instead unit-test that `InspectorPanel` receives events by exporting a tiny inner or testing the effect with a mocked session — **skip if too fragile**. E2E covers capture in Task 9.

**Verify:**

```bash
pnpm --filter @open-edu/dev-server test src/studio/CreatorPreview.test.tsx
```

---

## Task 7: Always mount StudioApp; delete developer shell from DevApp

- [ ] **Step 1:** `DevApp.tsx` `DevApp()`:

After browser-mode branch, **always**:

```tsx
return (
  <RuntimeThemeProvider themeId={themeId}>
    <StudioApp
      loadedPackage={loadedPkg}
      bundleUnsupported={Boolean(loadedBundle)}
      themeId={themeId}
      onThemeChange={setThemeId}
    />
  </RuntimeThemeProvider>
);
```

Delete `studioMode` state, `getStudioMode` / `setStudioMode` imports, `SinglePackageDeveloperApp`, `BundleDevApp` **functions** (entire components), `EditorShell` import, `InspectorPanel` import from DevApp, `DeveloperToolbar` import.

`BrowserStudioApp`: stop passing `mode` / `onModeChange`.

- [ ] **Step 2:** Strip `mode` / `onModeChange` from `StudioApp`, `StudioAppInner`, `StudioChrome`. Assistant header: show when `setPanelOpenProp` is defined (remove `mode === 'creator' &&`).

Remove ModeToggle from chrome (desktop and mobile overflow menu).

- [ ] **Step 3:** `types.ts` — remove `StudioMode` if unused. If other files still import it, delete those files in Task 8 first or in this task together.

- [ ] **Step 4:** `vite.config.ts` — remove `OPEN_EDU_STUDIO_MODE` from `define`. `env.d.ts` — remove `OPEN_EDU_STUDIO_MODE`.

- [ ] **Step 5:** Tests:

`StudioChrome.test.tsx` — delete tests `calls onModeChange on mode toggle` and the developer switch test. Render chrome **without** mode props. Assert **no** `role="switch"` named `/studio mode/i`.

`StudioApp.test.tsx` — remove `mode=` `onModeChange=` from all renders.

`DevApp.test.tsx` / `DevApp.bundle.test.tsx`:

- Bundle: still shows OpenEdu Studio + **new** bundle unsupported strings; **no** mode switch; **no** “Reading lesson” from developer bundle preview.
- Delete `'switches a bundle to developer mode and back'`.
- Single-package DevApp tests that clicked Edit Package / expected Inspector on first paint: rewrite to expect Studio chrome (`OpenEdu Studio`) and Outline/Home, **not** telemetry on first paint.

Search `apps/dev-server` for `studio mode`, `ModeToggle`, `onModeChange`, `mode="creator"`, `mode="developer"` and fix compile errors.

**Verify:**

```bash
pnpm --filter @open-edu/dev-server test src/DevApp.test.tsx src/DevApp.bundle.test.tsx src/studio/StudioApp.test.tsx src/studio/components/StudioChrome.test.tsx
```

---

## Task 8: Delete dead mode UI + leftover tests

Delete:

- `apps/dev-server/src/studio/modeStorage.ts`
- `apps/dev-server/src/studio/modeStorage.test.ts`
- `apps/dev-server/src/studio/components/ModeToggle.tsx`
- `apps/dev-server/src/studio/components/ModeToggle.test.tsx`
- `apps/dev-server/src/components/DeveloperToolbar.tsx`
- `apps/dev-server/src/components/DeveloperToolbar.test.tsx`

Remove `mode.creator`, `mode.developer`, `mode.toggleLabel` from `studio.json` only after no remaining `t('studio.mode.*')`.

Grep repo for `STUDIO_MODE`, `ModeToggle`, `DeveloperToolbar`, `StudioMode`, `OPEN_EDU_STUDIO_MODE`. Fix e2e in Task 9 if still present.

**Verify:**

```bash
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/dev-server exec tsc --noEmit
```

(`tsc` path: use `pnpm --filter @open-edu/dev-server typecheck` if that script exists; else workspace `pnpm typecheck` filtered is OK.)

---

## Task 9: Playwright e2e — enter Preview, then DevTools

**Critical:** Studio home/outline is now the landing page. Inspector is closed until Preview → DevTools.

- [ ] **Step 1:** `tests/e2e/helpers.ts` — **delete** `process.env.OPEN_EDU_STUDIO_MODE = 'developer'`. Keep `OPEN_EDU_PACKAGE_DIR`.

Add helper:

```ts
export async function openStudioPreview(page: Page): Promise<void> {
  await page.goto(/* caller already goto */);
  const previewNav = page.getByRole('button', { name: /^preview$/i });
  await previewNav.click();
  await expect(page.getByRole('button', { name: /exit preview/i })).toBeVisible({ timeout: 15000 });
}

export async function openPreviewDevtools(page: Page): Promise<void> {
  await openStudioPreview(page);
  await page.getByRole('button', { name: /open devtools/i }).click();
  await expect(page.getByRole('complementary', { name: /preview devtools/i })).toBeVisible();
}
```

`openStudioPreview` should not call `goto`. Callers `goto` then call these.

Landing: `startServer` still loads a package, so Outline/Home has a course. If Preview is disabled without a title, wait for nav Preview to enable. If the app lands on `home`, click Outline or Preview as needed. **If Preview is disabled until a course is open:** click “Open this course” / Outline first. Inspect `HomeView` continue button `studio.home.openCurrentCourse`.

Recommended sequence for e2e:

1. `page.goto(server.url)`
2. If “Open this course” is visible, click it (lands on outline).
3. Click nav **Preview**.
4. Click **Open DevTools**.

- [ ] **Step 2:** `telemetry.spec.ts`:

- Empty state: after open DevTools, expect `No telemetry events yet` (same copy as TelemetryInspector — do not change inspector copy unless i18n’d; if still hardcoded English, assert that string).
- Capture test: open preview (devtools can be closed while clicking Next), complete lesson **inside preview runtime**, then open DevTools if closed, expect `node:` in the complementary region.
- Complementary accessible name is **Preview DevTools**, not `Developer inspector panel`.

- [ ] **Step 3:** `accessibility.spec.ts`:

- Keyboard tests that need **Next**: `openStudioPreview` then tab to Next (not DevTools).
- Landmark test: preview layout-shell still exists after opening Preview.
- Inspector tests: `openPreviewDevtools` then A11y tab. Name `/preview devtools/i`.

Grep `tests/e2e` for `Developer inspector`, `studio mode`, `Edit Package`.

**Verify:**

```bash
pnpm test:e2e tests/e2e/telemetry.spec.ts tests/e2e/accessibility.spec.ts
```

If Playwright browsers missing: `pnpm test:e2e:install` then retry. If e2e cannot run in the environment, still make the spec edits and note that in the summary.

---

## Task 10: axe + leftover StudioApi mocks + i18n lint

- [ ] **Step 1:** `studio-a11y.test.tsx` — add OutlineWorkspace (or Files tab) render with mocked `listFiles: []` and run axe. Add CreatorPreview with drawer **open** (`writeDevtoolsState` before render or click DevTools) and run axe. Follow existing `axe.run` pattern in that file.

- [ ] **Step 2:** `pnpm lint:hardcoded-strings` — fix InspectorPanel leftover English tab labels if any.

- [ ] **Step 3:** Typecheck entire workspace packages touched:

```bash
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/i18n test
pnpm lint
pnpm --filter @open-edu/dev-server exec tsc --noEmit
```

Fix every mock that does not satisfy `StudioApi`.

---

## Implementation order (do not reorder)

1. i18n + session (Task 1)
2. StudioApi (Task 2)
3. Embedded EditorShell (Task 3)
4. Outline tabs (Task 4)
5. Inspector drawer (Task 5)
6. CreatorPreview wiring (Task 6)
7. DevApp always Studio (Task 7)
8. Delete mode files (Task 8)
9. E2E (Task 9)
10. axe + lint (Task 10)

Tasks 5–6 can swap **only if** CreatorPreview still compiles against the old InspectorPanel (FAB). Prefer 5 then 6.

---

## Done when

- No Creator/Developer switch in Studio chrome.
- Outline has Outline | Files; Files lists the package tree and can save a text file via StudioApi.
- Preview DevTools starts closed; toggle opens a bottom complementary region.
- Author Assistant header button still works on Outline and Files (same `StudioLayout`).
- Bundle open still shows unsupported empty state **without** telling the user to switch to Developer.
- `pnpm --filter @open-edu/dev-server test` passes.
- E2E telemetry + accessibility specs pass or are updated and documented if the environment cannot run Playwright.
