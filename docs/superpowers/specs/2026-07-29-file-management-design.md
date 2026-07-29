# File Management in Edit Mode

**Date:** 2026-07-29
**Status:** Draft
**Approach:** Right-click context menu + per-section action buttons
**Key constraint:** Only course-package supported files (nodes, assets, config) — no arbitrary file creation

## Architecture

### New server endpoint

`POST /api/package/rename` in `apps/dev-server/vite.config.ts`:

- Accepts `{oldPath: string, newPath: string}`
- Validates both paths against directory traversal (same pattern as existing endpoints)
- 400 on invalid paths, 404 if oldPath doesn't exist, 409 if newPath already exists
- Renames file/directory on disk
- Triggers HMR (module graph invalidation + WebSocket full-reload)
- Client helper: `renameFile(oldPath, newPath)` in `apps/dev-server/src/editor/api.ts`

### Default config file templates

For creating missing config files (all under package root):

- `package.json`: basic manifest with name, id, title, version, entry
- `workflow.json`: `{ "nodes": [], "edges": [] }`
- `rewards.json`: `{ "rewards": [], "triggers": [] }`
- `cards.json`: `{ "cards": [] }`

## UI Components

### Context menu (using @open-edu/design-system primitives)

- No new component — use `DropdownMenu` + `DropdownMenuPortal` + `DropdownMenuContent` + `DropdownMenuItem` + `DropdownMenuSeparator` from DS
- Portal-rendered at cursor coordinates
- State managed in EditorShell: `{ show: boolean, x: number, y: number, target: FileEntry | null }`
- Items built per file/section:
  - File items: **Rename** (Pencil icon, default variant), **Delete** (Trash2 icon, destructive variant)
  - Section header items: **New Content Node**, **Upload Asset**, **Create [config]**
- Radix handles click-outside-to-close and Escape key dismissal
- FileTree: `onContextMenu` on file rows and section headers

### Inline rename

- Triggered from context menu "Rename" or double-click on file label
- FileTree enters rename mode: file label replaced by controlled `<Input>` from DS
- Shows directory prefix as non-editable label, filename as editable Input
- Confirm on Enter, cancel on Escape or blur
- On confirm: `api.renameFile(oldPath, newPath)` → update tree + selected path
- No rename for config files at root (package.json, workflow.json, etc.)

### Per-category action buttons

Section headers in FileTree show action buttons:

- **Content Nodes → [+ New Node]** — opens existing "New Content Node" dialog
- **Assets → [+ Upload]** — triggers hidden file input → `api.uploadAsset`
- **Config Files** (always visible, even when empty):
  - Shows row per missing file with `+ Create package.json`, `+ Create workflow.json`, etc.
  - Clicking creates with default template and selects the file

### Delete confirmation refinement

- Dialog title contextualized: "Delete Content Node" / "Delete Asset" / "Delete Config File"
- Body shows full path and impact hint
- Delete dialog remains as confirmation gate before executing

## Files to modify

| File                                                   | Change                                                                             |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `apps/dev-server/vite.config.ts`                       | Add `POST /api/package/rename` endpoint                                            |
| `apps/dev-server/src/editor/api.ts`                    | Add `renameFile()` client function, export config templates                        |
| `apps/dev-server/src/editor/FileTree.tsx`              | Add context menu trigger, rename mode, section action buttons, config missing rows |
| `apps/dev-server/src/editor/EditorShell.tsx`           | Add context menu state, rename handler, connect create/upload/rename callbacks     |
| `apps/dev-server/src/editor/__tests__/editor.test.tsx` | Add tests for new FileTree actions                                                 |
| `apps/dev-server/src/editor/__tests__/api.test.ts`     | Add test for `renameFile`                                                          |
