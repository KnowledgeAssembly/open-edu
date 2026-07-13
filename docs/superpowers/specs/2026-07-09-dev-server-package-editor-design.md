# Dev-Server Package Editor Design

**Date:** 2026-07-09
**Status:** Draft
**Target Users:** Non-technical subject matter experts (content creators)

## Overview

Turn the dev-server from a read-only package previewer into a full package editor. Content creators can open any OpenEdu package directory in the dev-server and edit all package files — manifest, workflow, content nodes, rewards, cards, and assets — through structured forms with inline validation, then save changes back to disk.

## Architecture

### Backend: Vite Middleware API

Extend the existing `eduPackageLoader` Vite plugin (or create a companion `eduPackageEditor` plugin) to register REST API routes via Vite's `configureServer` hook (Connect middleware). No new server dependencies.

**API Routes:**

| Method   | Route                        | Purpose                                                                                  |
| -------- | ---------------------------- | ---------------------------------------------------------------------------------------- |
| `GET`    | `/api/package/tree`          | Returns file tree structure (manifest, workflow, nodes/, rewards, cards, assets/)        |
| `GET`    | `/api/package/file?path=...` | Reads file content by relative path from package root                                    |
| `PUT`    | `/api/package/file?path=...` | Writes file content (validates against Zod schema first, rejects with errors if invalid) |
| `POST`   | `/api/package/file?path=...` | Creates a new file (new node in nodes/, or new file elsewhere)                           |
| `DELETE` | `/api/package/file?path=...` | Deletes a node file or asset                                                             |
| `POST`   | `/api/package/assets/upload` | Multipart file upload for assets/ directory                                              |
| `POST`   | `/api/package/validate`      | Runs full `loadPackage()` against current disk state and returns all validation errors   |

**Validation-on-Save:** Before writing to disk, the server inspects the file path to determine which Zod schema applies:

| File Path       | Zod Schema                                         |
| --------------- | -------------------------------------------------- |
| `package.json`  | `PackageManifestSchema`                            |
| `workflow.json` | `WorkflowSchema`                                   |
| `rewards.json`  | `RewardsSchema`                                    |
| `cards.json`    | `CardDefinitionsSchema`                            |
| `nodes/*.json`  | `ContentNodeSchema` (discriminated union)          |
| `nodes/*.md`    | Content check (must have at least one `# Heading`) |
| `assets/*`      | No schema validation (binary files)                |

If validation fails, the server returns `{ valid: false, errors: [...] }` and **does not write** the file. The client shows inline errors.

**On Successful Save:** Invalidate the `virtual:open-edu-package` module cache and trigger `full-reload` via HMR. The preview then reflects the new state.

### File Tree Response Format

```json
{
  "rootDir": "/path/to/package",
  "files": {
    "manifest": { "path": "package.json", "type": "manifest" },
    "workflow": { "path": "workflow.json", "type": "workflow" },
    "nodes": [
      { "path": "nodes/intro.md", "type": "lesson", "title": "Introduction" },
      { "path": "nodes/quiz.json", "type": "quiz", "title": "Quick Check" },
      { "path": "nodes/outro.md", "type": "lesson", "title": "Conclusion" }
    ],
    "rewards": { "path": "rewards.json", "type": "rewards", "exists": false },
    "cards": { "path": "cards.json", "type": "cards", "exists": false },
    "assets": [{ "path": "assets/diagram.png", "type": "image" }]
  }
}
```

## UI Layout

### Mode Toggle

A `[✏️ Edit]` / `[👁️ Preview]` toggle button in the top toolbar (next to "Reset Progress"). Clicking toggles between modes. The preview is not lost — the page stays on the same route.

### Edit Mode Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ [👁 Preview]  ✏️ Editing: <package-title>     [💾 Save All] [↩ Undo] │
├──────────────┬───────────────────────────────────────────────────────┤
│ FILES        │  editor-area                                         │
│              │                                                       │
│  📄 Manifest │  (varies by file type — see Section 3)               │
│  📄 Workflow │                                                       │
│  📂 Nodes/   │                                                       │
│    📄 intro  │                                                       │
│    📄 quiz   │  ┌───────────────────────────────────────────────┐   │
│    📄 outro  │  │  ✅ All validations passed                    │   │
│  📄 Rewards  │  └───────────────────────────────────────────────┘   │
│  📄 Cards    │                                                       │
│  📂 Assets/  │  [View Raw] toggle per file                          │
│    🖼 diag   │                                                       │
│              │                                                       │
│  ➕ New Node │                                                       │
└──────────────┴───────────────────────────────────────────────────────┘
```

### Key Behaviors

- **File tree** (~260px left sidebar) — always visible. Nodes appear under `Nodes/`. Click to expand/collapse.
- **Editor area** — shows the appropriate editor for the selected file type.
- **Dirty indicator** — unsaved files show a `●` dot next to their name.
- **View Raw toggle** — per-file switch between structured form and raw JSON/Markdown textarea. Useful for power users and debugging.
- **Save All** — writes all dirty files sequentially, stopping on first validation error.
- **Undo** — reverts current file's in-memory edits to last saved state.
- **New Node** — opens a dialog: enter filename + select type (lesson/quiz/reflection/exercise/custom). Creates the file and adds a default routing entry to workflow.
- **Delete Node** — right-click on a node in the tree → "Delete". Prompts to update workflow routing that references this node.
- **Validation bar** — pinned to bottom of editor area. Shows "✅ All validations passed" in green or lists errors in red.

## Type-Specific Editors

### 1. Manifest Editor

Schema-driven form fields:
| Field | Control | Validation |
|-------|---------|-----------|
| `id` | Text input with auto-kebab transformation | Regex `^[a-z0-9][a-z0-9_-]*$` |
| `title` | Text input | Required, 1-256 chars |
| `version` | Text input | Semver regex |
| `author` | Text input | Required |
| `entry` | Dropdown of all node paths | Must select a valid node |
| `tags` | Tag input (chips) | Optional |

### 2. Content Node Editors

**Lesson nodes (.md):**

- Title field (maps to first `# Heading` in the markdown)
- Large textarea for Markdown content
- Live preview panel (side-by-side or toggle) using `remark`/`rehype` compilation (reuses existing MarkdownRenderer logic)

**Quiz nodes (.json):**

- Question text field
- Dynamic options list: add/remove options, each with text + correct/incorrect toggle
- Score field (number, default 100)

**Reflection nodes (.json):**

- Prompt text field
- Optional word limit (number)

**Exercise nodes (.json):**

- Title field
- Instructions (textarea)
- **Widget selector** — dropdown populated from `@open-edu/widgets` registry (reads registered widget IDs)
- Widget-specific configuration fields — dynamic, rendered based on the selected widget's manifest/configuration schema. If the widget has no config schema, show a JSON textarea.

**Custom nodes (.json):**

- Title field
- **Widget selector** dropdown
- Version field (text)
- Config: free-form JSON textarea

### 3. Workflow Editor

Structured "routing table" — not a visual graph. More accessible for non-technical users:

```
┌─────────────┬───────────────────┬──────────────────────────────────┐
│ FROM NODE   │ ON COMPLETE →     │ CONDITIONS (optional)            │
├─────────────┼───────────────────┼──────────────────────────────────┤
│ intro.md    │ quiz.json    [▼]  │ + Add condition                  │
├─────────────┼───────────────────┼──────────────────────────────────┤
│ quiz.json   │ ──────────── [▼]  │ ✓ score >= 80 → advanced.md     │
│             │                   │ ✓ score < 80  → remediation.md  │
│             │                   │ [+ Add condition]                │
├─────────────┼───────────────────┼──────────────────────────────────┤
│ advanced.md │ COMPLETED    [▼]  │                                  │
└─────────────┴───────────────────┴──────────────────────────────────┘
```

- Row per node (auto-populated from nodes in the `nodes/` directory)
- "On Complete" dropdown: lists all other nodes + `COMPLETED` sentinel
- "Add Condition" button adds a conditional branch row (if/then with operator+value dropdowns)
- Multiple conditions per node supported (AND logic within a condition group, OR between groups)
- Renaming a node in the file tree automatically updates workflow references

### 4. Rewards Editor

Schema-driven form:

- Trigger event selector (dropdown of supported events)
- Condition builder: score thresholds, skill requirements, chain conditions, AND/OR logic groups
- Action picker: badge award (with badge ID), webhook (with URL), script (with path)

### 5. Cards Editor

Schema-driven form:

- Card type selector (knowledge/skill/achievement/exploration/mentor)
- Fillable fields per type (title, description, unlock conditions, related lessons/quizzes, level, difficulty)

### 6. Asset Manager

When `Assets/` is selected in the file tree:

- Gallery grid of existing assets (thumbnails for images, file-type icons for others)
- Upload button → native file picker → multipart upload to `POST /api/package/assets/upload`
- Drag-and-drop zone for bulk upload
- Delete button per asset (with confirmation)
- Displayed: filename, type, size, dimensions (for images)

## Save & Validation Flow

### Dirty Tracking

Each file has a "dirty" boolean state. Set to `true` when any form field or raw text changes from the last saved value. Cleared on successful save.

### Save Scenarios

| Trigger                     | Behavior                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------ |
| Click "Save All"            | Write all dirty files sequentially. Stop on first error. Show success/failure toast. |
| Auto-save (optional toggle) | Save dirty file on file switch or after 2s debounce.                                 |
| Switch Preview ← Edit       | If dirty files exist, prompt: "You have unsaved changes. Save before switching?"     |

### Validation Layers

1. **Per-field (client-side):** Immediate validation on blur (e.g., empty title, invalid semver). Red border + error message below field.
2. **Per-file (server-side):** On save, server validates content against Zod schema. Returns `{ valid: boolean, errors: string[] }`.
3. **Full-package (server-side):** `POST /api/package/validate` runs `loadPackage()` and returns all errors across all files.

### Error Display

- **Field level:** Red border + error text below the field
- **File level:** Error banner at top of editor listing issues
- **Package level:** Modal or sidebar showing all validation errors from full-package validation

## Dependencies

No new npm dependencies for the server side (uses Vite's built-in Connect middleware).

Frontend additions (all within existing React + Tailwind stack):

- No new UI libraries needed — forms built with existing Radix UI primitives (TextField, Select, etc.)
- Could optionally use `@monaco-editor/react` for the "View Raw" textarea if desired

## Implementation Plan

### Phase 1: Backend API

1. Add API routes to `eduPackageLoader` plugin (or new plugin)
2. Implement file read/write/delete/create/upload endpoints
3. Implement validation-on-save against Zod schemas
4. Wire HMR reload on save

### Phase 2: Editor UI Shell

1. Add Edit mode toggle to DevApp toolbar
2. Build `PackageEditor` container with mode switching
3. Build `FileTreePanel` component with file tree data fetching
4. Implement dirty tracking state management

### Phase 3: Structured Editors

1. Schema-driven form component (generic, maps Zod schema → form fields)
2. Markdown editor with live preview
3. Workflow routing table editor
4. Widget selector with dynamic config
5. Asset gallery with upload/delete

### Phase 4: Validation & Polish

1. Client-side validation display
2. Full-package validation endpoint and UI
3. Save flow (Save All, dirty prompts, auto-save)
4. Edge cases: node rename updates workflow, delete node updates workflow
5. Error states: disk write failure, permission errors, concurrent edits
