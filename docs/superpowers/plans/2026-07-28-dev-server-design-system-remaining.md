# Dev-Server Design System Migration — Remaining Phases

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the dev-server migration to `@open-edu/design-system` by replacing remaining raw HTML elements, `window.confirm()` calls, and adding `FontSizeProvider`.

**Architecture:** Replace raw `<select>` with design-system `<Select>` in DevApp toolbar. Replace InspectorPanel custom tab buttons with Radix `<Tabs>`. Replace 3 `window.confirm()` calls with `<Dialog>` confirmations. Replace FileTree's raw delete `<button>` with `<Button>`. Wrap app tree in `<FontSizeProvider>`.

**Tech Stack:** React 18, Radix UI (via `@open-edu/design-system`), lucide-react, Tailwind CSS 3.x

---

### Task 1: DevApp Bundle Mode — Replace raw `<select>` with `<Select>`

**Files:**

- Modify: `apps/dev-server/src/DevApp.tsx` (lines 209-220)
- Modify: `apps/dev-server/src/DevApp.tsx` (lines 17-18, add import)

- [ ] **Step 1: Add missing imports to DevApp.tsx**

Add `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` imports. Find the existing import block at lines 17-18:

```tsx
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
```

Replace with:

```tsx
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';
```

- [ ] **Step 2: Replace the raw `<select>` in BundleDevApp**

Find the `<select>` element at lines 209-220 inside the `BundleDevApp` function:

```tsx
<select
  value={selectedModuleId}
  onChange={(e) => setSelectedModuleId(e.target.value)}
  className="border-outline-variant bg-surface text-on-surface focus:border-primary focus:ring-primary rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1"
  aria-label="Select module"
>
  {bundle.manifest.modules.map((m) => (
    <option key={m.id} value={m.id}>
      {m.title}
    </option>
  ))}
</select>
```

Replace with:

```tsx
<Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
  <SelectTrigger
    className="border-outline-variant bg-surface text-on-surface w-auto min-w-[200px] px-2 py-1 text-sm"
    aria-label="Select module"
  >
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {bundle.manifest.modules.map((m) => (
      <SelectItem key={m.id} value={m.id}>
        {m.title}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 3: Verify**

```bash
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server test
```

Expected: typecheck clean, 78 tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/dev-server/src/DevApp.tsx
git commit -m "feat(dev-server): replace raw select with design-system Select in DevApp"
```

---

### Task 2: InspectorPanel — Replace custom tab buttons with Radix `<Tabs>`

**Files:**

- Modify: `apps/dev-server/src/inspectors/InspectorPanel.tsx` (full replace of tabs section)

- [ ] **Step 1: Replace imports in InspectorPanel.tsx**

Read the file at `apps/dev-server/src/inspectors/InspectorPanel.tsx`. Replace the imports block (lines 1-8) with:

```tsx
import { useState } from 'react';
import type { TelemetryEvent } from '@open-edu/schemas';
import type { RewardReceipt } from '@open-edu/rewards';
import { TelemetryInspector } from './TelemetryInspector';
import { AccessibilityInspector } from './AccessibilityInspector';
import { RewardsInspector } from './RewardsInspector';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { PanelRightOpen, PanelRightClose } from 'lucide-react';
```

- [ ] **Step 2: Delete the `tabClass` helper and the `let content` block**

Find and delete lines 49-86 which include:

- The `let content: React.ReactNode;` declaration (line 49)
- The entire if/else if chain for `content` (lines 50-79)
- The `tabClass` function definition (lines 81-86)

- [ ] **Step 3: Replace the return JSX after the content block**

Find the return statement starting at line 88. Replace from the opening `<div>` at line 89 through the closing `</div>` at line 137 with:

```tsx
return (
  <div
    className="bg-surface-container-low border-outline-variant flex w-[360px] flex-col border-l font-mono text-xs"
    role="complementary"
    aria-label="Developer inspector panel"
  >
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as Tab)}
      className="flex flex-1 flex-col overflow-hidden"
    >
      <div className="bg-surface-container border-outline-variant flex shrink-0 border-b">
        <TabsList className="flex h-auto flex-1 rounded-none border-0 bg-transparent p-0">
          <TabsTrigger
            value="telemetry"
            className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-surface flex-1 rounded-none border-0 border-b-2 border-transparent px-3 py-2.5 text-xs font-semibold uppercase tracking-wider"
          >
            Telemetry
          </TabsTrigger>
          <TabsTrigger
            value="rewards"
            className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-surface flex-1 rounded-none border-0 border-b-2 border-transparent px-3 py-2.5 text-xs font-semibold uppercase tracking-wider"
          >
            Rewards
          </TabsTrigger>
          <TabsTrigger
            value="accessibility"
            className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-surface flex-1 rounded-none border-0 border-b-2 border-transparent px-3 py-2.5 text-xs font-semibold uppercase tracking-wider"
          >
            A11y
          </TabsTrigger>
          {bundleData && (
            <TabsTrigger
              value="bundle"
              className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-surface flex-1 rounded-none border-0 border-b-2 border-transparent px-3 py-2.5 text-xs font-semibold uppercase tracking-wider"
            >
              Bundle
            </TabsTrigger>
          )}
        </TabsList>
        <Button
          variant="ghost"
          size="icon"
          className="text-on-surface-variant h-auto w-auto rounded-none px-3"
          onClick={() => setIsOpen(false)}
          aria-label="Close inspector panel"
        >
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </div>

      <TabsContent value="telemetry" className="mt-0 flex-1 overflow-auto border-0 p-2">
        <TelemetryInspector events={telemetryEvents} />
      </TabsContent>
      <TabsContent value="rewards" className="mt-0 flex-1 overflow-auto border-0 p-2">
        <RewardsInspector
          receipts={rewardReceipts ?? []}
          definedRewards={definedRewards ?? []}
          onResend={onResendReward}
        />
      </TabsContent>
      <TabsContent value="accessibility" className="mt-0 flex-1 overflow-auto border-0 p-2">
        <AccessibilityInspector />
      </TabsContent>
      {bundleData && (
        <TabsContent value="bundle" className="mt-0 flex-1 overflow-auto border-0 p-2">
          <div className="p-2">
            <h3 className="mb-2 font-semibold">Bundle Modules</h3>
            {bundleData?.manifest?.modules?.map((mod: any) => (
              <div
                key={mod.id}
                className="border-outline-variant bg-surface mb-1 rounded border p-2"
              >
                <div className="font-medium">{mod.title}</div>
                <div className="text-on-surface-variant text-xs">
                  ID: {mod.id} | Deps: {mod.dependsOn?.join(', ') || 'none'}
                </div>
              </div>
            ))}
            {(!bundleData?.manifest?.modules || bundleData.manifest.modules.length === 0) && (
              <p className="text-on-surface-variant text-xs">No modules loaded.</p>
            )}
          </div>
        </TabsContent>
      )}
    </Tabs>
  </div>
);
```

- [ ] **Step 4: Verify**

```bash
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server test
```

Expected: typecheck clean, all tests pass (especially `InspectorPanel.test.tsx` — 7 tests).

- [ ] **Step 5: Update InspectorPanel tests if needed**

Run the tests. If `InspectorPanel.test.tsx` tests fail because they query for `<button>` elements that are now `<TabsTrigger>`, update the test assertions. The test file is at `apps/dev-server/src/inspectors/InspectorPanel.test.tsx`.

If tests pass without changes, skip this step.

- [ ] **Step 6: Commit**

```bash
git add apps/dev-server/src/inspectors/InspectorPanel.tsx
git add apps/dev-server/src/inspectors/InspectorPanel.test.tsx  # if modified
git commit -m "feat(dev-server): replace custom tab buttons with Radix Tabs in InspectorPanel"
```

---

### Task 3: EditorShell — Replace `window.confirm()` with `<Dialog>` for unsaved changes

**Files:**

- Modify: `apps/dev-server/src/editor/EditorShell.tsx` (lines 66-75, and add dialog JSX)

- [ ] **Step 1: Add state for the unsaved changes dialog**

In `EditorShell.tsx`, find the `useState` declarations block (around lines 41-43). Add a new state variable after the existing ones:

```tsx
const [showNewNode, setShowNewNode] = useState(false);
const [newNodeName, setNewNodeName] = useState('');
const [newNodeType, setNewNodeType] = useState<string>('lesson');
const [pendingModeChange, setPendingModeChange] = useState<EditorMode | null>(null);
```

- [ ] **Step 2: Replace the `window.confirm` in `onModeChange`**

Find the `onModeChange` callback at lines 66-75:

```tsx
const onModeChange = useCallback(
  (newMode: EditorMode) => {
    if (newMode === 'preview' && dirtyCount > 0) {
      if (!window.confirm('You have unsaved changes. Save before switching to preview?')) {
        return;
      }
    }
    rawOnModeChange(newMode);
  },
  [rawOnModeChange, dirtyCount],
);
```

Replace with:

```tsx
const onModeChange = useCallback(
  (newMode: EditorMode) => {
    if (newMode === 'preview' && dirtyCount > 0) {
      setPendingModeChange(newMode);
      return;
    }
    rawOnModeChange(newMode);
  },
  [rawOnModeChange, dirtyCount],
);
```

- [ ] **Step 3: Add the unsaved changes Dialog JSX**

Add the dialog right before the final `</div>` closing tag of the outermost div (before line 758, right before the `</div>` that closes `className="bg-surface flex h-full flex-col"`). Add it after the existing `<Dialog>` for "New Content Node" and before the `</div>`:

```tsx
<Dialog
  open={pendingModeChange !== null}
  onOpenChange={(open) => {
    if (!open) setPendingModeChange(null);
  }}
>
  <DialogContent className="sm:max-w-sm">
    <DialogHeader>
      <DialogTitle>Unsaved Changes</DialogTitle>
    </DialogHeader>
    <p className="text-on-surface-variant text-sm">
      You have unsaved changes. Switch to preview anyway?
    </p>
    <div className="mt-4 flex justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => setPendingModeChange(null)}>
        Cancel
      </Button>
      <Button
        size="sm"
        onClick={() => {
          if (pendingModeChange) {
            rawOnModeChange(pendingModeChange);
          }
          setPendingModeChange(null);
        }}
      >
        Switch Anyway
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

- [ ] **Step 4: Verify**

```bash
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server test
```

Expected: typecheck clean, 78 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/dev-server/src/editor/EditorShell.tsx
git commit -m "feat(dev-server): replace window.confirm with Dialog for unsaved changes"
```

---

### Task 4: FileTree — Replace `window.confirm()` with `<Dialog>` + raw button with `<Button>`

**Files:**

- Modify: `apps/dev-server/src/editor/FileTree.tsx` (add dialog, replace button)
- Modify: `apps/dev-server/src/editor/FileTree.tsx` (props — add `FileEntry` to dialog state)

- [ ] **Step 1: Add imports to FileTree.tsx**

Replace the existing imports at lines 1-3:

```tsx
import { useMemo } from 'react';
import type { FileEntry } from './types';
import { Trash2, FileJson, FileText, FileImage, File } from 'lucide-react';
import { cn } from '@open-edu/design-system';
```

With:

```tsx
import { useMemo, useState } from 'react';
import type { FileEntry } from './types';
import { Trash2, FileJson, FileText, FileImage, File } from 'lucide-react';
import { cn } from '@open-edu/design-system';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
```

- [ ] **Step 2: Add delete confirmation state**

Inside the `FileTree` function, add state at the top after the `groups` useMemo (after line 46):

```tsx
const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
```

The `FileTree` function signature and the `groups` useMemo should look like:

```tsx
export function FileTree({ files, selectedPath, onSelect, onDelete }: FileTreeProps) {
  const groups = useMemo(() => {
    const map = new Map<string, FileEntry[]>();
    for (const f of files) {
      const list = map.get(f.category) ?? [];
      list.push(f);
      map.set(f.category, list);
    }

    const result: GroupedFiles[] = [];
    for (const cat of categoryOrder) {
      const f = map.get(cat);
      if (f && f.length > 0) {
        result.push({ category: cat, files: f });
      }
    }
    return result;
  }, [files]);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
```

- [ ] **Step 3: Replace the delete button and `window.confirm`**

Find the delete button at lines 84-97:

```tsx
<button
  type="button"
  className="text-on-surface-variant hover:bg-error-container hover:text-error shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100"
  onClick={(e) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${file.path}"?`)) {
      onDelete(file.path);
    }
  }}
  aria-label={`Delete ${file.path}`}
  title="Delete file"
>
  <Trash2 className="h-3.5 w-3.5" />
</button>
```

Replace with:

```tsx
<Button
  variant="ghost"
  size="icon"
  className="text-on-surface-variant hover:bg-error-container hover:text-error h-auto w-auto shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100"
  onClick={(e) => {
    e.stopPropagation();
    setDeleteTarget(file.path);
  }}
  aria-label={`Delete ${file.path}`}
  title="Delete file"
>
  <Trash2 className="h-3.5 w-3.5" />
</Button>
```

- [ ] **Step 4: Add the delete confirmation Dialog**

Add the Dialog right before the final `</div>` of the outermost `div` (before the line that has `className="border-outline-variant bg-surface-container-low h-full overflow-auto border-r text-sm"` — find the closing `</div>` that ends the `FileTree` component's return statement, around line 107).

Add this **before** the outermost closing `</div>` (right after the empty state div block):

```tsx
<Dialog
  open={deleteTarget !== null}
  onOpenChange={(open) => {
    if (!open) setDeleteTarget(null);
  }}
>
  <DialogContent className="sm:max-w-sm">
    <DialogHeader>
      <DialogTitle>Delete File</DialogTitle>
    </DialogHeader>
    <p className="text-on-surface-variant text-sm">
      Are you sure you want to delete "{deleteTarget}"?
    </p>
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

- [ ] **Step 5: Verify**

```bash
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server test
```

Expected: typecheck clean, 78 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/dev-server/src/editor/FileTree.tsx
git commit -m "feat(dev-server): replace window.confirm with Dialog and raw button with Button in FileTree"
```

---

### Task 5: AssetManager — Replace `window.confirm()` with `<Dialog>`

**Files:**

- Modify: `apps/dev-server/src/editor/AssetManager.tsx`

- [ ] **Step 1: Add imports to AssetManager.tsx**

Replace line 1:

```tsx
import { useState, useRef, useCallback } from 'react';
```

With:

```tsx
import { useState, useRef, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
```

- [ ] **Step 2: Add delete confirmation state**

In the `AssetManager` function, add state after the existing `useState` declarations (after line 14 `const [error, setError] = useState<string | null>(null);`):

```tsx
const [error, setError] = useState<string | null>(null);
const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
```

- [ ] **Step 3: Replace the `window.confirm` in `handleDelete`**

Find `handleDelete` at lines 40-50:

```tsx
const handleDelete = useCallback(
  async (assetPath: string) => {
    if (!window.confirm(`Delete "${assetPath}"?`)) return;
    try {
      await deleteFile(assetPath);
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    }
  },
  [onRefresh],
);
```

Replace with:

```tsx
const handleDelete = useCallback(async (assetPath: string) => {
  setDeleteTarget(assetPath);
}, []);

const confirmDelete = useCallback(async () => {
  if (!deleteTarget) return;
  try {
    await deleteFile(deleteTarget);
    onRefresh();
  } catch (err) {
    setError((err as Error).message);
  } finally {
    setDeleteTarget(null);
  }
}, [deleteTarget, onRefresh]);
```

- [ ] **Step 4: Add the delete confirmation Dialog**

Find the existing delete button at lines 180-189:

```tsx
<button
  type="button"
  className="bg-destructive absolute right-1 top-1 rounded px-1 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
  onClick={(e) => {
    e.stopPropagation();
    handleDelete(assetPath);
  }}
>
  Delete
</button>
```

Replace with:

```tsx
<Button
  variant="destructive"
  size="sm"
  className="absolute right-1 top-1 h-auto rounded px-1 py-0.5 text-[10px] opacity-0 transition-opacity group-hover:opacity-100"
  onClick={(e) => {
    e.stopPropagation();
    handleDelete(assetPath);
  }}
>
  Delete
</Button>
```

Add the Dialog before the final `</div>` of the component. Find the outermost closing `</div>` (the one that closes `className="space-y-4"` at line 122 or 194). Add right before it:

```tsx
<Dialog
  open={deleteTarget !== null}
  onOpenChange={(open) => {
    if (!open) setDeleteTarget(null);
  }}
>
  <DialogContent className="sm:max-w-sm">
    <DialogHeader>
      <DialogTitle>Delete Asset</DialogTitle>
    </DialogHeader>
    <p className="text-on-surface-variant text-sm">
      Are you sure you want to delete "{deleteTarget}"?
    </p>
    <div className="mt-4 flex justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
        Cancel
      </Button>
      <Button variant="destructive" size="sm" onClick={confirmDelete}>
        Delete
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

- [ ] **Step 5: Verify**

```bash
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server test
```

Expected: typecheck clean, all 78 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/dev-server/src/editor/AssetManager.tsx
git commit -m "feat(dev-server): replace window.confirm with Dialog and raw button with Button in AssetManager"
```

---

### Task 6: Wrap DevApp with `<FontSizeProvider>` from `@open-edu/design-system`

**Files:**

- Modify: `apps/dev-server/src/main.tsx`

- [ ] **Step 1: Add FontSizeProvider import and wrap**

In `apps/dev-server/src/main.tsx`, add the import after line 6:

```tsx
import { I18nProvider } from '@open-edu/i18n';
import { FontSizeProvider } from '@open-edu/design-system';
import { DevApp } from './DevApp';
```

Then wrap `DevApp` inside `FontSizeProvider`. Find lines 28-33:

```tsx
createRoot(root).render(
  <StrictMode>
    <I18nProvider locale="en" dictionaries={dictionaries}>
      <DevApp />
    </I18nProvider>
  </StrictMode>,
);
```

Replace with:

```tsx
createRoot(root).render(
  <StrictMode>
    <I18nProvider locale="en" dictionaries={dictionaries}>
      <FontSizeProvider>
        <DevApp />
      </FontSizeProvider>
    </I18nProvider>
  </StrictMode>,
);
```

- [ ] **Step 2: Verify**

```bash
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server test
```

Expected: typecheck clean, 78 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/dev-server/src/main.tsx
git commit -m "feat(dev-server): wrap DevApp with FontSizeProvider from design-system"
```

---

### Task 7: Final Verification

- [ ] **Step 1: Run full verification suite**

```bash
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server lint
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/dev-server exec prettier --check "src/**/*.{ts,tsx,css}"
```

Expected: typecheck clean, lint 0 errors, 78/78 tests pass, format check passes.

- [ ] **Step 2: Verify zero remaining raw HTML issues**

```bash
# Should return zero results — no remaining window.confirm calls
grep -r "window\.confirm" apps/dev-server/src/

# Should return zero results — no raw <button> elements (only <Button> from design-system)
grep -r "<button " apps/dev-server/src/
```

Expected: no matches for `window.confirm`. The `<button` grep may match some legitimate cases (like `buttonVariants` imports). Manually verify none are raw `<button type="button">` elements that should be `<Button>`.

- [ ] **Step 3: Smoke test**

Start the dev server manually:

```bash
pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js dev ../openedu-courses/liver-health
```

Expected: dev server starts on http://localhost:4000, UI renders with CSS styles, no Tailwind warnings.

- [ ] **Step 4: Final commit if any cleanup needed**

```bash
git status
git diff
```
