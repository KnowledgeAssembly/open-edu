# Studio unified view — Design spec

**Date:** 2026-09-01  
**Status:** Draft for review  
**Source app:** `apps/dev-server`  
**Supersedes (in part):** Creator vs Developer split in `2026-08-05-course-creator-studio-design.md` (§3.4–3.5, DevTools hidden in Creator, ModeToggle)

---

## 1. Summary

Merge Course Creator Studio into **one view**. Creator chrome and IA stay the product. Developer capabilities that authors still need are **embedded**:

- **Outline** remains the course spine, with an optional **Files** tab for the package file browser, raw/typed file editing, and asset upload.
- **Preview** stays the learner runtime, with **DevTools** in a collapsed-by-default **bottom drawer**.
- **Author Assistant** stays pinned in `StudioLayout` across Outline and Files (same instance; no remount on tab switch).

There is no Creator/Developer mode toggle. `StudioApp` is the only shell.

**Implementation approach:** extract and embed (not nested-mount of `EditorShell`, not a hidden Developer escape hatch).

---

## 2. Decisions locked

| Decision                 | Choice                                                         |
| ------------------------ | -------------------------------------------------------------- |
| Product surface          | Single Studio (former Creator)                                 |
| Outline                  | Existing activity spine is the default tab                     |
| Package source           | Files tab on the Outline page (not a split pane, not a drawer) |
| File pick on Files       | Stay on Files; open typed or raw editor in the source pane     |
| Activity pick on Outline | Existing `edit-activity` form editors                          |
| Author Assistant         | Pinned on Outline and Files                                    |
| Preview DevTools         | Bottom drawer, Chrome-style, collapsed by default              |
| DevTools vs Assistant    | Assistant keeps the right rail; DevTools never take it         |
| Mode toggle              | Removed                                                        |
| Bundles                  | Out of scope; keep Creator “unsupported” empty state           |
| EditorShell nested mount | Rejected                                                       |
| Hidden Developer mode    | Rejected                                                       |

---

## 3. Information architecture

Navigation is unchanged: **Home · Library · Outline · Preview · Share**.

### 3.1 Outline page

Two **page-local** tabs (not top-nav items):

| Tab         | Default | Contents                                                                   |
| ----------- | ------- | -------------------------------------------------------------------------- |
| **Outline** | Yes     | Current `OutlineView`: activities, add/reorder, flow, rewards, ready check |
| **Files**   | No      | Package file tree + file editor + new node + asset upload                  |

Author Assistant remains the `StudioLayout` right sidebar for both tabs.

Picking an **activity row** on Outline still navigates to `edit-activity`. Picking a **file** on Files does not leave the Outline view; the source pane opens that file.

Persist last Outline sub-tab (`outline` \| `files`) and last Files selected path in existing studio session helpers.

### 3.2 Preview page

Learner runtime: Preview toolbar, `PreviewCourseSidebar`, `LayoutShell`.

Toolbar actions: Exit, Reset progress, **DevTools** (toggle). A bottom complementary region hosts inspector tabs when open.

### 3.3 Removed

- `ModeToggle` and `openedu.studio.mode` / `OPEN_EDU_STUDIO_MODE`
- `DevApp` branch that mounts `EditorShell`, `SinglePackageDeveloperApp`, or developer preview instead of `StudioApp`
- Developer toolbar as a second chrome
- Floating DevTools FAB (`InspectorPanel` closed state today)

### 3.4 Deferred

**Bundles.** Creator already shows an unsupported empty state. Do not port `BundleDevApp` in this change. The Bundle inspector tab is shown only if a bundle is actually loaded (it will not be, until a later story).

```
StudioChrome  (no mode toggle)
└── StudioLayout
      ├── main
      │     Outline: [ Outline | Files ]
      │     Preview: toolbar + course sidebar + runtime
      │              └── DevTools drawer (bottom, collapsed)
      └── Author Assistant (right, pinned)
```

---

## 4. Files tab

### 4.1 Layout

Extract a **Package source pane** from `EditorShell` without EditorShell chrome (no Preview/Edit mode bar, no second header):

```
┌──────────────┬─────────────────────────────────┐
│ FileTree     │ Form | Raw · Save · Open as     │
│ (grouped)    │ activity (when path is a node)  │
│              ├─────────────────────────────────┤
│ [+ Node]     │ Typed editor or raw Markdown/JSON│
│ [Upload]     │                                 │
└──────────────┴─────────────────────────────────┘
```

Reuse existing components: `FileTree`, `ManifestEditor`, `WorkflowEditor`, `RewardsEditor`, `CardsEditor`, `MarkdownEditor`, `JSONNodeEditor`, `RawJsonEditor`, `AssetManager`.

**Open as activity:** if the selected path is a known activity node, jump to existing form editors. Outline rows remain the teacher path; Files is the power path.

**Open files:** one selected file at a time. `EditorShell`’s `openFiles` map may remain an in-memory cache, not a tab strip.

**Not brought over:** EditorShell full-screen Preview/Edit split, widget live-preview pane (Preview owns runtime), Developer toolbar.

### 4.2 StudioApi (single façade)

Do not keep `editor/api.ts` as a second client. Files must work for local Studio and browser/OPFS.

Extend `StudioApi` with:

- `listFiles()` — tree entries (`/api/package/tree` locally; workspace walk in `BrowserStudioApi`)
- `createFile(path, content?)`
- `renameFile(oldPath, newPath)`
- `uploadAsset(file, path?)`
- existing `readFile` / `writeFile` / `deleteFile`

`PackageSourcePane` takes `api: StudioApi` only.

Local `createLocalStudioApi` may call the same `/api/package/*` routes EditorShell uses. Browser API maps them onto the workspace. Binary assets keep the existing `binary-file` read error; upload writes bytes through the workspace. After the pane is on StudioApi, migrate `editor/api` tests and delete the duplicate client.

### 4.3 Editing behavior

- **Form vs Raw** per file type, same as Developer `viewMode`.
- Dirty file: switching tree selection, Outline↔Files, or leaving Outline prompts save / discard / cancel (reuse EditorShell unsaved guard).
- Save uses `writeFile` with validation; errors render inline on the editor.
- Create node / upload asset refreshes the tree and bumps outline revision so the Outline tab stays in sync.
- Author Assistant `onOpenPath`: known activity nodes → `edit-activity`; all other paths → Files tab with that path selected.

---

## 5. Preview DevTools

### 5.1 Layout and interaction

- Bottom drawer, height about `min(40vh, 280px)`, **collapsed by default**.
- Open/close from Preview toolbar (pressed = open). No FAB.
- `Escape` closes the drawer when it (or a descendant) has focus.
- Persist open/closed and last inspector tab in session storage key `openedu.studio.devtools`.
- `role="complementary"`; accessible name via `t()`.
- Not resizable; no pop-out; inspectors do not edit the package.

Tabs: **Telemetry · Logs · Rewards · A11y**. **Bundle** only if bundle data is present.

Restyle `InspectorPanel` from a 360px right rail into this drawer. Keep tab bodies. Move hardcoded inspector chrome strings into `packages/i18n/locales/en/studio.json`.

### 5.2 Runtime wiring

`CreatorPreview` today has no telemetry session, no `onTelemetryEvent`, and no reward bridge. Port the developer preview stack into it:

1. `TelemetrySession` — subscribe; pass events to the Telemetry tab; pass `onTelemetryEvent` into `RuntimeProvider`.
2. `RewardBroker` + `createRewardReceiptBridge` + `RewardEventBridge` — Rewards tab; defined triggers from `pkg.rewards`.
3. Logs — existing process-wide memory sink (`setInspectorSink` in `main.tsx`).
4. Accessibility — keep current inspector; scope the audit root to the `LayoutShell` container so the drawer does not flood the report.
5. **Reset progress** also starts a new telemetry session and clears the in-memory event list.

Telemetry events live only for the **current Preview visit**. Leaving Preview stops the session; re-entering starts clean.

When there is no package or no workflow, keep current empty states and **disable** the DevTools control.

---

## 6. Error handling

| Situation                        | Behavior                                              |
| -------------------------------- | ----------------------------------------------------- |
| Tree/load failure                | Inline error on Files pane                            |
| Validation on save               | Inline on the file editor                             |
| Binary asset opened as text      | Do not load as text; AssetManager / cannot-edit state |
| Upload quota / OPFS              | Existing storage copy                                 |
| Dirty navigation                 | Save / discard / cancel                               |
| Preview without package/workflow | Existing empty states; DevTools disabled              |

---

## 7. Components and data flow

| Unit                      | Responsibility                              | Depends on                              |
| ------------------------- | ------------------------------------------- | --------------------------------------- |
| `DevApp`                  | Always mount `StudioApp` (local or browser) | `StudioApp`                             |
| `StudioApp`               | Views, session, assistant layout            | `StudioApi`                             |
| Outline page shell        | Outline \| Files tabs                       | `OutlineView`, `PackageSourcePane`      |
| `PackageSourcePane`       | Tree + editors + assets                     | `StudioApi`                             |
| `CreatorPreview`          | Runtime + DevTools drawer                   | runtime, telemetry, rewards, inspectors |
| `InspectorPanel` (drawer) | Inspector tabs UI                           | inspector components                    |
| `StudioApi`               | Package + library + AI + tree/upload        | local fetch or OPFS                     |

`StudioMode` type and mode storage go away once call sites are removed.

---

## 8. Testing

Every story ships Vitest coverage. Affected UI must pass axe-core.

- Chrome has no Creator/Developer switch; Studio always renders (including when a package is loaded).
- Outline page: Outline \| Files tabs; Assistant remains in the layout on both.
- Files: list tree via `StudioApi`, select, save, upload; cover local and browser API methods.
- Dirty-file guard: attempting to change selection with unsaved edits shows the prompt.
- Preview: DevTools collapsed by default; toggle opens the bottom drawer with inspector tabs; a mocked runtime telemetry emit appears in Telemetry.
- Update `CreatorPreview` test that currently asserts inspectors are absent.
- axe on Outline with Files selected and Preview with the drawer open.
- Remove or rewrite ModeToggle tests and DevApp tests that assert Creator hides DevTools.

---

## 9. Out of scope

- Bundle authoring or `BundleDevApp` in Studio
- Resizable or popped-out DevTools
- Multi-file editor tabs
- Widget live-preview inside Files
- Keeping telemetry across Preview visits
- Hosted/cloud Studio changes beyond `StudioApi` shape

---

## 10. Migration notes

Always mount `StudioApp`. Ignore leftover `openedu.studio.mode` in `localStorage` and `OPEN_EDU_STUDIO_MODE`. Document the removed toggle in OpenWiki after implementation (do not hand-edit generated wiki pages in this spec).

The 2026-08-05 Studio spec’s “progressive disclosure via Developer mode” is replaced by **progressive disclosure inside one shell**: Outline first, Files and Preview DevTools available without a product-mode switch.
