# File Management in Edit Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add right-click context menu, inline rename, per-category action buttons, and config file creation to the dev-server editor for course-package supported files only.

**Architecture:** One new server endpoint (`POST /api/package/rename`) + client-side ContextMenu wrapper around `@open-edu/design-system` DropdownMenu + inline rename state in FileTree + action buttons on section headers + config file creation rows. All UI uses DS primitives (DropdownMenu, Button, Input, Dialog, Badge).

**Tech Stack:** TypeScript, React 18, Radix UI (via @open-edu/design-system), Vite middleware, Vitest

---

## File Structure

| File                                                   | Status | Responsibility                                                                 |
| ------------------------------------------------------ | ------ | ------------------------------------------------------------------------------ |
| `apps/dev-server/vite.config.ts`                       | Modify | Add `POST /api/package/rename` endpoint                                        |
| `apps/dev-server/src/editor/api.ts`                    | Modify | Add `renameFile()` function + `CONFIG_TEMPLATES`                               |
| `apps/dev-server/src/editor/FileTree.tsx`              | Modify | Context menu trigger, rename mode, section action buttons, config missing rows |
| `apps/dev-server/src/editor/EditorShell.tsx`           | Modify | Context menu state, rename handler, new callbacks                              |
| `apps/dev-server/src/editor/types.ts`                  | Modify | Add `ContextMenuTarget` type                                                   |
| `apps/dev-server/src/editor/__tests__/api.test.ts`     | Modify | Test `renameFile`                                                              |
| `apps/dev-server/src/editor/__tests__/editor.test.tsx` | Modify | Test new FileTree actions                                                      |

### Task 1: Add rename endpoint to vite config

**Files:**

- Modify: `apps/dev-server/vite.config.ts` (after the DELETE handler, before the upload handler)

- [ ] **Step 1: Add POST /api/package/rename endpoint**

Insert this block after line 578 (after the DELETE handler's `return;` and before the upload handler at line 617):

```typescript
// POST /api/package/rename — rename a file
if (pathname === '/api/package/rename' && method === 'POST') {
  const body = (await parseJsonBody(req)) as {
    oldPath: string;
    newPath: string;
  };
  const oldPath = toForwardSlashes(body.oldPath);
  const newPath = toForwardSlashes(body.newPath);

  if (!oldPath || !newPath) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Missing oldPath or newPath' }));
    return;
  }

  const absOldPath = join(currentDir, oldPath);
  const absNewPath = join(currentDir, newPath);

  if (!absOldPath.startsWith(currentDir) || !absNewPath.startsWith(currentDir)) {
    res.statusCode = 403;
    res.end(JSON.stringify({ error: 'Forbidden' }));
    return;
  }

  if (!existsSync(absOldPath)) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Source file not found' }));
    return;
  }

  if (existsSync(absNewPath)) {
    res.statusCode = 409;
    res.end(JSON.stringify({ error: 'Target file already exists' }));
    return;
  }

  const newDir = dirname(absNewPath);
  if (!existsSync(newDir)) {
    mkdirSync(newDir, { recursive: true });
  }

  await rename(absOldPath, absNewPath);

  const mod = srv.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
  if (mod) {
    srv.moduleGraph.invalidateModule(mod);
  }
  srv.ws.send({ type: 'full-reload' });

  res.end(JSON.stringify({ success: true, oldPath, newPath }));
  return;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/dev-server/vite.config.ts
git commit -m "feat: add POST /api/package/rename endpoint"
```

### Task 2: Add renameFile function + config templates to api.ts

**Files:**

- Modify: `apps/dev-server/src/editor/api.ts`

- [ ] **Step 1: Add renameFile function and CONFIG_TEMPLATES**

Add after `deleteFile` (line 58):

```typescript
export async function renameFile(
  oldPath: string,
  newPath: string,
): Promise<{ success: boolean; oldPath: string; newPath: string }> {
  return await apiRequest<{ success: boolean; oldPath: string; newPath: string }>('/rename', {
    method: 'POST',
    body: JSON.stringify({ oldPath, newPath }),
  });
}
```

Add at the end of the file (before the last closing brace):

```typescript
export const CONFIG_TEMPLATES: Record<string, string> = {
  'package.json': JSON.stringify(
    {
      name: 'my-package',
      id: 'my-package',
      title: 'My Package',
      version: '0.1.0',
      private: true,
      entry: 'nodes/intro.md',
    },
    null,
    2,
  ),
  'workflow.json': JSON.stringify({ nodes: [], edges: [] }, null, 2),
  'rewards.json': JSON.stringify({ rewards: [], triggers: [] }, null, 2),
  'cards.json': JSON.stringify({ cards: [] }, null, 2),
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/dev-server/src/editor/api.ts
git commit -m "feat: add renameFile api function and CONFIG_TEMPLATES"
```

### Task 3: Add ContextMenuTarget type

**Files:**

- Modify: `apps/dev-server/src/editor/types.ts`

- [ ] **Step 1: Add ContextMenuTarget type**

Add after the existing types (before the last closing brace):

```typescript
export interface ContextMenuTarget {
  x: number;
  y: number;
  /** The file entry if the menu was triggered on a file row, or null if on a section header */
  file: FileEntry | null;
  /** The category/section if triggered on a section header */
  section?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/dev-server/src/editor/types.ts
git commit -m "feat: add ContextMenuTarget type"
```

### Task 4: Add context menu state to EditorShell

**Files:**

- Modify: `apps/dev-server/src/editor/EditorShell.tsx`

- [ ] **Step 1: Import new dependencies and add state**

Add these imports (group with existing imports at top):

```typescript
import type { ContextMenuTarget } from './types';
import { CONFIG_TEMPLATES, renameFile as apiRenameFile } from './api';
import {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@open-edu/design-system';
import { Pencil } from 'lucide-react';
```

Add state after `const [showPreview, setShowPreview] = useState(true);` (line 64):

```typescript
const [contextMenu, setContextMenu] = useState<ContextMenuTarget | null>(null);
```

- [ ] **Step 2: Add context menu render block**

Add this right before the `<Toaster>` closing tag (around line 845):

```tsx
{
  /* Context menu */
}
{
  contextMenu && (
    <DropdownMenu
      open={true}
      onOpenChange={(open) => {
        if (!open) setContextMenu(null);
      }}
    >
      <DropdownMenuPortal>
        <DropdownMenuContent
          align="start"
          side="bottom"
          style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y }}
          className="min-w-[160px]"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {contextMenu.file && (
            <>
              <DropdownMenuItem
                onSelect={() => {
                  // TODO: trigger rename - will be connected in Task 5
                  setContextMenu(null);
                }}
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  setContextMenu(null);
                  if (contextMenu.file) {
                    // The delete will be handled by the existing delete handler
                    // We need to trigger the delete confirmation dialog
                    // This will be connected properly in a later task
                  }
                }}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </>
          )}
          {contextMenu.section === 'nodes' && (
            <DropdownMenuItem
              onSelect={() => {
                setContextMenu(null);
                setShowNewNode(true);
              }}
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              New Content Node
            </DropdownMenuItem>
          )}
          {contextMenu.section === 'assets' && (
            <DropdownMenuItem
              onSelect={() => {
                setContextMenu(null);
                // Trigger file input for upload
                document.getElementById('asset-upload-input')?.click();
              }}
            >
              <Upload className="mr-2 h-3.5 w-3.5" />
              Upload Asset
            </DropdownMenuItem>
          )}
          {contextMenu.section &&
            ['manifest', 'workflow', 'rewards', 'cards'].includes(contextMenu.section) && (
              <DropdownMenuItem
                onSelect={() => {
                  setContextMenu(null);
                  handleCreateConfigFile(contextMenu.section!);
                }}
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                Create{' '}
                {contextMenu.section === 'manifest'
                  ? 'package.json'
                  : `${contextMenu.section}.json`}
              </DropdownMenuItem>
            )}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Add handleCreateConfigFile callback**

Add this before the existing `handleCreateNode` callback (or nearby in the callback section):

```typescript
const handleCreateConfigFile = useCallback(
  async (section: string) => {
    const fileName = section === 'manifest' ? 'package.json' : `${section}.json`;
    const template = CONFIG_TEMPLATES[fileName];
    if (!template) return;
    try {
      await api.createFile(fileName, template, true);
      refreshFiles();
      setSelectedPath(fileName);
      toast.success(`Created ${fileName}`);
    } catch (err) {
      toast.error('Failed to create config file: ' + (err as Error).message);
    }
  },
  [refreshFiles],
);
```

- [ ] **Step 4: Add upload asset handler with hidden input**

Add a hidden file input (can be at the end of the JSX, near Toaster):

```tsx
<input
  id="asset-upload-input"
  type="file"
  className="hidden"
  onChange={async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await api.uploadAsset(file);
      refreshFiles();
      toast.success(`Uploaded ${file.name}`);
    } catch (err) {
      toast.error('Upload failed: ' + (err as Error).message);
    }
    e.target.value = '';
  }}
/>
```

- [ ] **Step 5: Pass contextMenu handler down to FileTree**

Add `onContextMenu` to the FileTree props:

```tsx
<FileTree
  files={files}
  selectedPath={selectedPath}
  onSelect={handleFileSelect}
  onDelete={handleFileDelete}
  onContextMenu={(target: ContextMenuTarget) => setContextMenu(target)}
  onCreateFile={handleCreateConfigFile}
  onNewNode={() => setShowNewNode(true)}
  onUploadAsset={() => {
    document.getElementById('asset-upload-input')?.click();
  }}
/>
```

- [ ] **Step 6: Add Trash2 and Plus to imports if not already present**

Check the existing imports from `lucide-react` — `Trash2`, `Plus`, `Upload` must be included.

- [ ] **Step 7: Commit**

```bash
git add apps/dev-server/src/editor/EditorShell.tsx
git commit -m "feat: add context menu state and handlers to EditorShell"
```

### Task 5: Add context menu trigger + per-section action buttons + rename + config rows to FileTree

**Files:**

- Modify: `apps/dev-server/src/editor/FileTree.tsx`

- [ ] **Step 1: Update FileTree interface**

Replace the existing `FileTreeProps`:

```typescript
import type { FileEntry, ContextMenuTarget } from './types';
import { Upload, Plus } from 'lucide-react';

interface FileTreeProps {
  files: FileEntry[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onDelete: (path: string) => void;
  onContextMenu?: (target: ContextMenuTarget) => void;
  onCreateFile?: (section: string) => void;
  onNewNode?: () => void;
  onUploadAsset?: () => void;
}
```

- [ ] **Step 2: Add rename state**

Add inside the `FileTree` function component, after `const [deleteTarget, setDeleteTarget] = useState<string | null>(null);`:

```typescript
const [renameTarget, setRenameTarget] = useState<FileEntry | null>(null);
const [renameValue, setRenameValue] = useState('');
```

- [ ] **Step 3: Add context menu handler on file rows**

In the file row rendering (inside `group.files.map`), add `onContextMenu` to the file row div:

```tsx
onContextMenu={(e) => {
  e.preventDefault();
  onContextMenu?.({ x: e.clientX, y: e.clientY, file, section: undefined });
}}
```

- [ ] **Step 4: Add context menu handler on section headers**

In the section header rendering, add `onContextMenu`:

```tsx
<div
  className="text-on-surface-variant flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
  onContextMenu={(e) => {
    e.preventDefault();
    onContextMenu?.({ x: e.clientX, y: e.clientY, file: null, section: group.category });
  }}
>
  <span>{categoryLabels[group.category] ?? group.category}</span>
  {/* Action buttons for nodes and assets sections */}
  {group.category === 'nodes' && (
    <button
      type="button"
      className="text-primary hover:bg-primary-container flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium"
      onClick={(e) => {
        e.stopPropagation();
        onNewNode?.();
      }}
      title="New Content Node"
    >
      <Plus className="h-3 w-3" />
      New Node
    </button>
  )}
  {group.category === 'assets' && (
    <button
      type="button"
      className="text-primary hover:bg-primary-container flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium"
      onClick={(e) => {
        e.stopPropagation();
        onUploadAsset?.();
      }}
      title="Upload Asset"
    >
      <Upload className="h-3 w-3" />
      Upload
    </button>
  )}
</div>
```

- [ ] **Step 5: Implement inline rename mode**

Replace the file label rendering section. Instead of:

```tsx
<span className="truncate" title={file.path}>
  {file.label}
</span>
```

Use:

```tsx
{
  renameTarget?.path === file.path ? (
    <div className="flex items-center gap-1">
      <span className="text-on-surface-variant shrink-0 text-[10px]">
        {file.path.substring(0, file.path.lastIndexOf('/') + 1)}
      </span>
      <input
        className="border-primary bg-surface w-full min-w-0 rounded border px-1 py-0.5 text-xs outline-none"
        value={renameValue}
        onChange={(e) => setRenameValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            handleRenameConfirm(file);
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            setRenameTarget(null);
          }
        }}
        onBlur={() => {
          if (renameTarget) {
            const newLabel = renameValue.trim();
            if (newLabel && newLabel !== renameTarget.label) {
              handleRenameConfirm(renameTarget);
            } else {
              setRenameTarget(null);
            }
          }
        }}
        autoFocus
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  ) : (
    <span
      className="truncate"
      title={file.path}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setRenameTarget(file);
        setRenameValue(file.label);
      }}
    >
      {file.label}
    </span>
  );
}
```

- [ ] **Step 6: Add handleRenameConfirm function**

Add inside the `FileTree` component, before the return statement:

```typescript
const handleRenameConfirm = useCallback(
  (file: FileEntry) => {
    const newName = renameValue.trim();
    if (!newName || newName === file.label) {
      setRenameTarget(null);
      return;
    }
    // Build new path: keep directory prefix, replace filename
    const dir = file.path.includes('/')
      ? file.path.substring(0, file.path.lastIndexOf('/') + 1)
      : '';
    const newPath = dir + newName;

    if (newPath === file.path) {
      setRenameTarget(null);
      return;
    }

    // Call api.renameFile — parent needs to handle this
    // For now, emit via a custom callback (will be wired in Task 6)
    if (onRenameFile) {
      onRenameFile(file.path, newPath);
    }
    setRenameTarget(null);
  },
  [renameValue],
);
```

Wait, I need to add `onRenameFile` to the props. Let me add it:

```typescript
interface FileTreeProps {
  // ... existing props
  onRenameFile?: (oldPath: string, newPath: string) => void;
}
```

And update the call. Also add the `useCallback` import if not present.

- [ ] **Step 7: Add config missing files section**

Add this block after the `groups.map` iterator and before the empty state check (around line 104):

```tsx
{
  /* Config files section — show create buttons for missing files */
}
{
  (['manifest', 'workflow', 'rewards', 'cards'] as const).map((section) => {
    const hasFile = files.some((f) => {
      const target = section === 'manifest' ? 'package.json' : `${section}.json`;
      return f.path === target;
    });
    if (hasFile) return null;
    const fileName = section === 'manifest' ? 'package.json' : `${section}.json`;
    return (
      <div key={section}>
        <div className="text-on-surface-variant flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider">
          <span>{categoryLabels[section] ?? section}</span>
        </div>
        <div
          className="hover:bg-surface-container group flex cursor-pointer items-center gap-2 px-3 py-1.5"
          onClick={() => onCreateFile?.(section)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onCreateFile?.(section);
            }
          }}
        >
          <Plus className="text-primary h-3.5 w-3.5" />
          <span className="text-primary text-xs font-medium">Create {fileName}</span>
        </div>
      </div>
    );
  });
}
```

- [ ] **Step 8: Commit**

```bash
git add apps/dev-server/src/editor/FileTree.tsx
git commit -m "feat: add context menu trigger, rename mode, section buttons, and config file creation rows to FileTree"
```

### Task 6: Wire everything together in EditorShell

**Files:**

- Modify: `apps/dev-server/src/editor/EditorShell.tsx`

- [ ] **Step 1: Add renameFile handler**

Add before `handleCreateNode`:

```typescript
const handleRenameFile = useCallback(
  async (oldPath: string, newPath: string) => {
    try {
      await apiRenameFile(oldPath, newPath);
      refreshFiles();
      // Update selected path if the renamed file was selected
      if (selectedPath === oldPath) {
        setSelectedPath(newPath);
      }
      // Update openFiles key
      setOpenFiles((prev) => {
        const next = new Map(prev);
        const file = next.get(oldPath);
        if (file) {
          next.delete(oldPath);
          next.set(newPath, { ...file, path: newPath });
        }
        return next;
      });
      toast.success(`Renamed to ${newPath}`);
    } catch (err) {
      toast.error('Rename failed: ' + (err as Error).message);
    }
  },
  [selectedPath, refreshFiles],
);
```

- [ ] **Step 2: Connect the context menu Rename item**

Replace the placeholder `<DropdownMenuItem>` for Rename in the context menu block:

```tsx
<DropdownMenuItem
  onSelect={async () => {
    setContextMenu(null);
    if (contextMenu.file) {
      // Trigger inline rename in FileTree by passing the file
      // FileTree manages its own rename state via double-click
      // For context menu, we close and rely on the inline rename trigger
      // Actually, we need to signal FileTree to enter rename mode
      // We'll use a state variable setRenameTarget
      setRenameTargetFromMenu(contextMenu.file);
    }
  }}
>
```

Add a helper function that sets a ref or state to trigger rename in FileTree. Since FileTree manages its own rename state, the cleanest approach is to pass a `renameFileFromMenu` prop that FileTree watches.

Actually, the simplest approach: In FileTree, add a `useEffect` that watches an `externalRenameTarget` prop. When set, it enters rename mode for that file.

Add to `FileTreeProps`:

```typescript
externalRenameTarget?: FileEntry | null;
onExternalRenameHandled?: () => void;
```

In FileTree, add:

```typescript
useEffect(() => {
  if (externalRenameTarget) {
    setRenameTarget(externalRenameTarget);
    setRenameValue(externalRenameTarget.label);
    onExternalRenameHandled?.();
  }
}, [externalRenameTarget]);
```

In EditorShell, add state:

```typescript
const [renameTargetFromMenu, setRenameTargetFromMenu] = useState<FileEntry | null>(null);
```

- [ ] **Step 3: Connect the context menu Delete item**

Replace the placeholder Delete DropdownMenuItem:

```tsx
<DropdownMenuItem
  variant="destructive"
  onSelect={() => {
    setContextMenu(null);
    if (contextMenu.file) {
      // We can either trigger the existing deleteDialog directly
      // or signal FileTree to show its delete confirmation
      // For simplicity, show the delete confirmation in EditorShell
      setDeleteTarget(contextMenu.file);
    }
  }}
>
```

Wait, EditorShell doesn't have a delete dialog — it delegates to FileTree. The current delete flow is: click trash icon in FileTree → FileTree shows its own delete confirmation dialog → onConfirm calls `onDelete`.

For the context menu Delete, the simplest approach is to add a prop to FileTree: `externalDeleteTarget?: FileEntry` that triggers the delete confirmation dialog that already exists inside FileTree.

Let me add:

```typescript
// In FileTreeProps
externalDeleteTarget?: FileEntry | null;

// In FileTree, add useEffect
useEffect(() => {
  if (externalDeleteTarget) {
    setDeleteTarget(externalDeleteTarget.path);
  }
}, [externalDeleteTarget]);
```

And in EditorShell:

```typescript
const [deleteTargetFromMenu, setDeleteTargetFromMenu] = useState<FileEntry | null>(null);
```

Pass to FileTree:

```tsx
externalDeleteTarget={deleteTargetFromMenu}
onExternalDeleteHandled={() => setDeleteTargetFromMenu(null)}
```

- [ ] **Step 4: Update FileTree prop passing**

Update the FileTree usage in EditorShell to pass all new props:

```tsx
<FileTree
  files={files}
  selectedPath={selectedPath}
  onSelect={handleFileSelect}
  onDelete={handleFileDelete}
  onContextMenu={(target: ContextMenuTarget) => setContextMenu(target)}
  onNewNode={() => setShowNewNode(true)}
  onUploadAsset={() => document.getElementById('asset-upload-input')?.click()}
  onCreateFile={handleCreateConfigFile}
  onRenameFile={handleRenameFile}
  externalRenameTarget={renameTargetFromMenu}
  onExternalRenameHandled={() => setRenameTargetFromMenu(null)}
  externalDeleteTarget={deleteTargetFromMenu}
  onExternalDeleteHandled={() => setDeleteTargetFromMenu(null)}
/>
```

- [ ] **Step 5: Commit**

```bash
git add apps/dev-server/src/editor/EditorShell.tsx apps/dev-server/src/editor/FileTree.tsx
git commit -m "feat: wire rename, delete, and context menu actions between EditorShell and FileTree"
```

### Task 7: Delete confirmation refinement

**Files:**

- Modify: `apps/dev-server/src/editor/FileTree.tsx`

- [ ] **Step 1: Improve delete dialog content**

Replace the existing Dialog inside FileTree (lines 111-142):

```tsx
<Dialog
  open={deleteTarget !== null}
  onOpenChange={(open) => {
    if (!open) setDeleteTarget(null);
  }}
>
  <DialogContent className="sm:max-w-sm">
    <DialogHeader>
      <DialogTitle>{deleteTargetLabel ? `Delete ${deleteTargetLabel}` : 'Delete File'}</DialogTitle>
    </DialogHeader>
    <p className="text-on-surface-variant text-sm">
      Are you sure you want to delete{' '}
      <span className="text-on-surface font-medium">{deleteTarget}</span>?
    </p>
    <p className="text-on-surface-variant text-xs">This will remove this file from the package.</p>
    <div className="mt-4 flex justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
        Cancel
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          if (deleteTarget) {
            onDelete(deleteTarget);
          }
          setDeleteTarget(null);
        }}
      >
        Delete
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

Add a computed label for the delete dialog title. Add before the return statement:

```typescript
const deleteTargetLabel = useMemo(() => {
  if (!deleteTarget) return null;
  const file = files.find((f) => f.path === deleteTarget);
  if (!file) return null;
  const labels: Record<string, string> = {
    manifest: 'Config File',
    workflow: 'Config File',
    rewards: 'Config File',
    cards: 'Config File',
    nodes: 'Content Node',
    assets: 'Asset',
  };
  return labels[file.category] ?? 'File';
}, [deleteTarget, files]);
```

- [ ] **Step 2: Commit**

```bash
git add apps/dev-server/src/editor/FileTree.tsx
git commit -m "feat: improve delete confirmation dialog with contextual titles"
```

### Task 8: Write tests

**Files:**

- Modify: `apps/dev-server/src/editor/__tests__/api.test.ts`
- Modify: `apps/dev-server/src/editor/__tests__/editor.test.tsx`

- [ ] **Step 1: Add renameFile test to api.test.ts**

Add before the last closing `}` of the `describe('api client')` block:

```typescript
it('renameFile sends POST to /api/package/rename', async () => {
  mockFetch.mockResolvedValueOnce(
    mockResponse({ success: true, oldPath: 'nodes/old.json', newPath: 'nodes/new.json' }),
  );
  const result = await renameFile('nodes/old.json', 'nodes/new.json');
  expect(mockFetch).toHaveBeenCalledWith(
    '/api/package/rename',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ oldPath: 'nodes/old.json', newPath: 'nodes/new.json' }),
    }),
  );
  expect(result).toEqual({ success: true, oldPath: 'nodes/old.json', newPath: 'nodes/new.json' });
});
```

Add `renameFile` to the import at the top of the file:

```typescript
import {
  listFiles,
  readFile,
  writeFile,
  createFile,
  deleteFile,
  renameFile,
  uploadAsset,
  getPackageDir,
  validatePackage,
} from '../api';
```

- [ ] **Step 2: Add FileTree context menu test to editor.test.tsx**

Add after the existing FileTree tests (before the `describe('ManifestEditor')` block):

```typescript
it('renders New Node button in nodes section header', () => {
  const onNewNode = vi.fn();
  render(
    <FileTree
      files={sampleFiles}
      selectedPath={null}
      onSelect={vi.fn()}
      onDelete={vi.fn()}
      onNewNode={onNewNode}
    />,
  );
  const newBtn = screen.getByTitle('New Content Node');
  expect(newBtn).toBeInTheDocument();
  fireEvent.click(newBtn);
  expect(onNewNode).toHaveBeenCalled();
});

it('renders Upload button in assets section header', () => {
  const onUploadAsset = vi.fn();
  render(
    <FileTree
      files={sampleFiles}
      selectedPath={null}
      onSelect={vi.fn()}
      onDelete={vi.fn()}
      onUploadAsset={onUploadAsset}
    />,
  );
  const uploadBtn = screen.getByTitle('Upload Asset');
  expect(uploadBtn).toBeInTheDocument();
  fireEvent.click(uploadBtn);
  expect(onUploadAsset).toHaveBeenCalled();
});
```

- [ ] **Step 3: Add rename input test**

```typescript
it('shows rename input on double-click', () => {
  const files: FileEntry[] = [
    { path: 'nodes/test.md', label: 'test.md', category: 'nodes', extension: '.md' },
  ];
  render(
    <FileTree
      files={files}
      selectedPath={null}
      onSelect={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
  const label = screen.getByText('test.md');
  fireEvent.doubleClick(label);
  // After double-click, the rename input should appear
  const input = document.querySelector('input');
  expect(input).toBeInTheDocument();
  expect(input).toHaveValue('test.md');
});
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @open-edu/dev-server test`
Expected: 10 test files, all passing

- [ ] **Step 5: Commit**

```bash
git add apps/dev-server/src/editor/__tests__/api.test.ts apps/dev-server/src/editor/__tests__/editor.test.tsx
git commit -m "test: add renameFile API test and FileTree action button tests"
```

### Task 9: Final integration check

**Files:**

- Check: `apps/dev-server/src/editor/EditorShell.tsx`
- Check: `apps/dev-server/src/editor/FileTree.tsx`
- Check: `apps/dev-server/vite.config.ts`

- [ ] **Step 1: Verify all imports are correct**

In `EditorShell.tsx`:

- `ContextMenuTarget` from `'./types'`
- `CONFIG_TEMPLATES`, `renameFile as apiRenameFile` from `'./api'`
- `DropdownMenu`, `DropdownMenuPortal`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator` from `'@open-edu/design-system'`
- `Pencil`, `Trash2`, `Plus`, `Upload` from `'lucide-react'`
- `useCallback` is already imported

In `FileTree.tsx`:

- `ContextMenuTarget` from `'./types'`
- `Upload`, `Plus` from `'lucide-react'`
- `useCallback` from `'react'`

In `vite.config.ts`:

- `rename` should already be available from the existing `fs` import (imported as `{ rename }` from `fs/promises` or via `const { rename } = await import('fs/promises')`)

- [ ] **Step 2: Run full test suite**

Run: `pnpm --filter @open-edu/dev-server test`
Expected: All tests pass

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: All packages pass

- [ ] **Step 4: Run format check**

Run: `pnpm format:check`
Expected: All files pass

- [ ] **Step 5: Run lint**

Run: `pnpm lint`
Expected: No new errors

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: final integration fixes for file management feature"
git push origin feat/widget-live-preview-jul-2026
```
