# Dev-Server Design System Migration — Implementation Plan

## Overview

Convert `apps/dev-server` from raw HTML elements + hardcoded inline styles to the shared `@open-edu/design-system` primitives (Button, Dialog, Select, Tabs, Badge, Input, Toaster, etc.) so it matches the learner app's architecture.

**Critical rule:** Do NOT modify function signatures, component props, or business logic. Only change styling (`style={...}` → Tailwind classes) and replace raw HTML elements (`<button>`, `<select>`, `<input>`, custom modals) with design-system components.

---

## Step 1: Add `lucide-react` to `package.json`

**File:** `apps/dev-server/package.json`

Add `"lucide-react"` to `dependencies`. The learner app already uses it; the dev-server has it transitively but never imports it directly.

Find:

```json
    "axe-core": "^4.7.0",
```

Add AFTER it:

```json
    "lucide-react": "^0.400.0",
```

Then run:

```bash
pnpm install
```

---

## Step 2: Create `postcss.config.js` (PostCSS Pipeline)

**File:** `apps/dev-server/postcss.config.js` (NEW FILE)

The learner app processes Tailwind through PostCSS. The dev-server currently uses a pre-generated `tailwind.css`. Create this file to enable the same pipeline:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

---

## Step 3: Rewrite `src/index.css` — Add CSS Variable Bridge

**File:** `apps/dev-server/src/index.css`

REPLACE the entire file (currently 2 lines: `@tailwind components; @tailwind utilities;`) with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: var(--oe-color-surface);
    --foreground: var(--oe-color-on-surface);
    --card: var(--oe-color-surface-container-lowest);
    --card-foreground: var(--oe-color-on-surface);
    --popover: var(--oe-color-surface-container);
    --popover-foreground: var(--oe-color-on-surface);
    --primary: var(--oe-color-primary);
    --primary-foreground: var(--oe-color-on-primary);
    --secondary: var(--oe-color-surface-variant);
    --secondary-foreground: var(--oe-color-on-surface-variant);
    --muted: var(--oe-color-surface-variant);
    --muted-foreground: var(--oe-color-on-surface-variant);
    --accent: var(--oe-color-primary-container);
    --accent-foreground: var(--oe-color-on-primary-container);
    --destructive: var(--oe-color-error);
    --destructive-foreground: var(--oe-color-on-error);
    --success: var(--oe-color-success);
    --success-foreground: var(--oe-color-on-success);
    --border: var(--oe-color-outline);
    --input: var(--oe-color-outline);
    --ring: var(--oe-color-primary);
    --radius: var(--oe-radius-DEFAULT);
  }

  .open-edu-runtime {
    color: var(--foreground);
  }

  :root {
    --oe-reduced-motion: no-preference;
    --oe-high-contrast: 0;
  }

  .open-edu-runtime[data-reduced-motion='reduce'] *,
  .open-edu-runtime[data-reduced-motion='reduce'] *::before,
  .open-edu-runtime[data-reduced-motion='reduce'] *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }

  .open-edu-runtime[data-high-contrast='1'] {
    --oe-color-outline: #000000;
    --oe-color-outline-variant: #333333;
    --oe-color-on-surface: #000000;
    --oe-color-on-surface-variant: #1f1f1f;
    --oe-color-surface: #ffffff;
    --oe-color-surface-container: #ffffff;
    --oe-color-surface-container-low: #ffffff;
    --oe-color-surface-container-high: #f2f2f2;
  }

  .open-edu-runtime[data-high-contrast='1'][data-theme='nocturnal'] {
    --oe-color-outline: #ffffff;
    --oe-color-outline-variant: #cccccc;
    --oe-color-on-surface: #ffffff;
    --oe-color-on-surface-variant: #e0e0e0;
    --oe-color-surface: #000000;
    --oe-color-surface-container: #0a0a0a;
    --oe-color-surface-container-low: #0a0a0a;
    --oe-color-surface-container-high: #1a1a1a;
  }
}

@media (prefers-reduced-motion: reduce) {
  .open-edu-runtime {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

---

## Step 4: Update `src/main.tsx` — Remove Pre-Generated CSS Import

**File:** `apps/dev-server/src/main.tsx`

REPLACE line 2:

```tsx
import './tailwind.css';
```

WITH:

```tsx
// Tailwind CSS is now processed by PostCSS at build time (via postcss.config.js).
// No pre-generated tailwind.css import needed.
```

(i.e., delete the line and leave a comment noting the change)

---

## Step 5: Create Re-Export Proxy Files `src/components/ui/`

These match the pattern used by `apps/learner/src/components/ui/`. Each is a thin proxy that re-exports from `@open-edu/design-system`.

### Step 5a: Create directory

```bash
mkdir -p apps/dev-server/src/components/ui
```

### Step 5b: Create each proxy file

**File:** `apps/dev-server/src/components/ui/button.tsx` (NEW)

```tsx
export { Button, buttonVariants } from '@open-edu/design-system';
export type { ButtonProps } from '@open-edu/design-system';
```

**File:** `apps/dev-server/src/components/ui/badge.tsx` (NEW)

```tsx
export { Badge, badgeVariants } from '@open-edu/design-system';
export type { BadgeProps } from '@open-edu/design-system';
```

**File:** `apps/dev-server/src/components/ui/dialog.tsx` (NEW)

```tsx
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@open-edu/design-system';
```

**File:** `apps/dev-server/src/components/ui/select.tsx` (NEW)

```tsx
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from '@open-edu/design-system';
```

**File:** `apps/dev-server/src/components/ui/tabs.tsx` (NEW)

```tsx
export { Tabs, TabsList, TabsTrigger, TabsContent } from '@open-edu/design-system';
```

**File:** `apps/dev-server/src/components/ui/input.tsx` (NEW)

```tsx
export { Input } from '@open-edu/design-system';
export type { InputProps } from '@open-edu/design-system';
```

---

## Step 6: Rewrite `src/inspectors/InspectorPanel.tsx`

**Goal:** Replace inline `panelStyle` object and raw `<button>` tabs with Tailwind classes + design-system `<Tabs>`.

**Imports to add at top:**

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { cn } from '@open-edu/design-system';
import { PanelRightOpen, PanelRightClose } from 'lucide-react';
```

**Replace the entire file** content. Keep ALL business logic (state, event handlers, tab selection) identical. Only change the JSX and remove the `panelStyle` object.

The toggle button (when panel is closed) becomes:

```tsx
<Button
  variant="default"
  size="sm"
  className="shadow-elevation-modal fixed bottom-4 right-4 z-[9999]"
  onClick={() => setIsOpen(true)}
  aria-label="Open inspector panel"
>
  <PanelRightOpen className="mr-1 h-4 w-4" />
  DevTools
</Button>
```

The panel container (when open) becomes:

```tsx
<div
  className="bg-surface-container-low border-outline-variant flex w-[360px] flex-col border-l font-mono text-xs"
  role="complementary"
  aria-label="Developer inspector panel"
>
  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
    <div className="bg-surface-container border-outline-variant flex border-b">
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

    <TabsContent value="telemetry" className="mt-0 flex-1 overflow-auto p-2">
      <TelemetryInspector events={telemetryEvents} />
    </TabsContent>
    <TabsContent value="rewards" className="mt-0 flex-1 overflow-auto p-2">
      <RewardsInspector
        receipts={rewardReceipts ?? []}
        definedRewards={definedRewards ?? []}
        onResend={onResendReward}
      />
    </TabsContent>
    <TabsContent value="accessibility" className="mt-0 flex-1 overflow-auto p-2">
      <AccessibilityInspector />
    </TabsContent>
    {bundleData && (
      <TabsContent value="bundle" className="mt-0 flex-1 overflow-auto p-2">
        {/* ... bundle content ... */}
      </TabsContent>
    )}
  </Tabs>
</div>
```

The bundle tab content stays the same JSX but replace all inline `style={}` with Tailwind classes:

- `style={{ padding: '0.5rem' }}` → `className="p-2"`
- `style={{ fontWeight: 600, marginBottom: '0.5rem' }}` → `className="mb-2 font-semibold"`
- `style={{ padding: '0.5rem', marginBottom: '0.25rem', background: '#fff', borderRadius: '4px', border: '1px solid #e5e7eb' }}` → `className="border-outline-variant bg-surface mb-1 rounded p-2 border"`
- `style={{ fontWeight: 500 }}` → `className="font-medium"`
- `style={{ fontSize: '0.75rem', color: '#6b7280' }}` → `className="text-on-surface-variant text-xs"`

---

## Step 7: Rewrite `src/inspectors/TelemetryInspector.tsx`

**Goal:** Replace ALL `containerStyle` objects with Tailwind classes. Keep ALL business logic identical.

**Remove:** The entire `containerStyle` object (lines 9-57).

**Import to add:**

```tsx
import { cn } from '@open-edu/design-system';
```

Replace JSX as follows:

Summary section:

```tsx
<div className="bg-success/10 border-outline-variant space-y-0.5 border-b p-2 text-[0.7rem] leading-relaxed">
```

Summary title:

```tsx
<div className="text-success mb-1 text-xs font-semibold">Summary</div>
```

Summary row:

```tsx
<div className="text-on-surface">Events: {summary.totalEvents}</div>
<div className="text-on-surface">Node opens: {summary.nodeOpens}</div>
<div className="text-on-surface">Node completions: {summary.nodeCompletions}</div>
<div className="text-on-surface">
  Avg quiz score:{' '}
  {summary.averageQuizScore !== null ? summary.averageQuizScore.toFixed(1) : 'N/A'}
</div>
<div className="text-on-surface">Session: {currentSessionId ?? 'N/A'}</div>
```

Empty state:

```tsx
<div className="text-on-surface-variant py-8 text-center text-xs">
  No telemetry events yet. Interact with the content above.
</div>
```

Event list container:

```tsx
<div ref={listRef} className="flex max-h-[calc(100vh-120px)] flex-col gap-1 overflow-auto">
```

Event item (inside the map):

```tsx
<div key={idx} className="bg-surface border-outline-variant rounded border p-1.5 text-xs leading-snug break-all">
```

Event type:

```tsx
<span className="text-primary font-semibold">{eventType}</span>
```

Meta timestamp:

```tsx
<span className="text-on-surface-variant ml-1">{new Date(timestamp).toLocaleTimeString()}</span>
```

Data:

```tsx
{
  nodeId && <div className="text-on-surface mt-0.5">node: {nodeId}</div>;
}
{
  typeof score === 'number' && <div className="text-on-surface mt-0.5">score: {score}</div>;
}
```

---

## Step 8: Rewrite `src/inspectors/AccessibilityInspector.tsx`

**Goal:** Replace ALL `style` objects with Tailwind classes. Keep ALL business logic identical.

**Remove:** The entire `style` object (lines 19-113) and the `impactStyle()` function.

**Import to add:**

```tsx
import { Button } from '../components/ui/button';
import { cn } from '@open-edu/design-system';
import { Play } from 'lucide-react';
```

Replace JSX:

Error state:

```tsx
<div className="text-on-surface-variant py-8 text-center text-xs">{error}</div>
```

Controls area:

```tsx
<div className="mb-2 flex items-center gap-2">
  <Button
    variant="default"
    size="sm"
    onClick={runAudit}
    disabled={running}
    className="h-auto py-1.5"
  >
    <Play className="mr-1 h-3 w-3" />
    {running ? 'Running...' : 'Run Audit'}
  </Button>
  <span className="text-on-surface-variant text-[0.625rem]">
    {violations.length > 0
      ? `${violations.length} violation${violations.length === 1 ? '' : 's'}`
      : 'No violations'}
  </span>
</div>
```

No violations:

```tsx
<div className="text-success py-8 text-center text-xs">No accessibility violations found</div>
```

Violations list:

```tsx
<div className="flex flex-col gap-2">
  {violations.map((v) => (
    <div key={v.id} className="bg-error/10 border-error/20 space-y-1 rounded border p-2 text-xs">
```

Violation ID + impact badge:

```tsx
<div>
  <span className="text-error font-semibold">{v.id}</span>
  <span
    className={cn(
      'ml-1.5 inline-block rounded px-1 py-px text-[0.625rem] font-semibold uppercase text-white',
      v.impact === 'critical' && 'bg-destructive',
      v.impact === 'serious' && 'bg-orange-600',
      v.impact === 'moderate' && 'bg-amber-600',
      v.impact === 'minor' && 'bg-yellow-600',
    )}
  >
    {v.impact}
  </span>
</div>
```

Description:

```tsx
<div className="text-on-surface mt-1">{v.description}</div>
```

Help link:

```tsx
<div className="text-on-surface-variant mt-0.5 text-[0.6875rem]">
  <a
    href={v.helpUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="text-primary hover:underline"
  >
    {v.help}
  </a>
</div>
```

Node target:

```tsx
{
  v.nodes.slice(0, 3).map((node, i) => (
    <div
      key={i}
      className="bg-surface text-on-surface mt-1 overflow-hidden text-ellipsis rounded px-1.5 py-1 font-mono text-[0.6875rem]"
    >
      {node.target.join(', ')}
    </div>
  ));
}
```

---

## Step 9: Rewrite `src/inspectors/RewardsInspector.tsx`

**Goal:** Replace ALL `style` objects with Tailwind classes. Keep ALL business logic identical.

**Remove:** The entire `style` object (lines 15-103) and the `statusStyle()` function.

**Import to add:**

```tsx
import { Button } from '../components/ui/button';
import { cn } from '@open-edu/design-system';
```

Replace JSX:

Empty state (no rewards configured):

```tsx
<div className="text-on-surface-variant py-8 text-center text-xs">
  No rewards configured. Add a <code>rewards.json</code> to your package.
</div>
```

List container:

```tsx
<div className="flex max-h-[calc(100vh-120px)] flex-col gap-2 overflow-auto">
```

Section title:

```tsx
<div className="border-outline-variant text-on-surface-variant border-t pt-2 text-[0.6875rem] font-semibold uppercase tracking-wider">
  Dispatched ({receipts.length})
</div>
```

Receipt card:

```tsx
<div
  key={receipt.actionId}
  className="bg-surface border-outline-variant rounded border p-2 text-xs"
>
  <div className="mb-1 flex items-center justify-between">
    <span className="text-primary font-semibold">{receipt.actionType}</span>
    <span
      className={cn(
        'inline-block rounded px-1 py-px text-[0.625rem] font-semibold uppercase',
        receipt.status === 'delivered' && 'bg-success/20 text-success',
        receipt.status === 'failed' && 'bg-error/20 text-error',
        receipt.status !== 'delivered' &&
          receipt.status !== 'failed' &&
          'bg-amber-100 text-amber-700',
      )}
    >
      {receipt.status}
    </span>
  </div>
  <div className="text-on-surface-variant text-[0.6875rem]">
    {new Date(receipt.dispatchedAt).toLocaleTimeString()}
  </div>
  {receipt.detail && (
    <div className="text-on-surface mt-0.5 text-[0.6875rem]">{receipt.detail}</div>
  )}
  {receipt.error && <div className="text-error mt-0.5 text-[0.6875rem]">{receipt.error}</div>}
  {receipt.status === 'failed' && onResend && (
    <Button
      variant="destructive"
      size="sm"
      className="mt-1 h-auto px-2 py-1 text-[0.625rem]"
      onClick={() => onResend(receipt)}
    >
      Re-send
    </Button>
  )}
</div>
```

Pending item:

```tsx
<div key={idx} className="bg-primary/10 border-primary/20 rounded border p-1.5 text-xs">
  <div className="text-primary font-semibold">
    {def.action}
    {def.badge ? `: ${def.badge}` : ''}
  </div>
  {def.condition && (
    <div className="text-on-surface mt-1 text-[0.6875rem]">
      Condition: {formatCondition(def.condition)}
    </div>
  )}
</div>
```

"No rewards triggered" empty:

```tsx
<div className="text-on-surface-variant py-8 text-center text-xs">
  No rewards have been triggered yet.
</div>
```

---

## Step 10: Rewrite `src/DevApp.tsx` — Replace Inline Styles with Design-System Components

**Goal:** Replace ALL `style={...}` objects on toolbar elements in both `BundleDevApp` and `SinglePackageDevApp`, and on the `DevAppFallback` component, with Tailwind classes + design-system components.

**Add imports:**

```tsx
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
```

### Step 10a: `DevAppFallback` component

Replace lines 37-48 with:

```tsx
function DevAppFallback({ title, message }: { title: string; message: string }): JSX.Element {
  return (
    <div className="text-error max-w-[40rem] p-8 font-sans">
      <h1 className="mb-2 text-2xl">{title}</h1>
      <p className="text-on-surface-variant">{message}</p>
    </div>
  );
}
```

### Step 10b: `BundleDevApp` — Toolbar (lines 210-283)

Replace the ENTIRE outer `<div>` that starts at line 210 with:

```tsx
<div className="flex h-screen">
  <div className="min-w-0 flex-1 overflow-auto">
    {/* Toolbar */}
    <div className="border-outline-variant bg-surface-container-low flex flex-wrap items-center gap-3 border-b px-4 py-2">
      <Badge>Bundle Mode</Badge>
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
      <Button variant="outline" size="sm" onClick={() => setShowOverview(true)}>
        Bundle Overview
      </Button>
      <Button
        variant="default"
        size="sm"
        className="bg-success hover:bg-success/90"
        onClick={handleEditorToggle}
      >
        Edit Package
      </Button>
    </div>

    {/* Reset + Edit floating buttons */}
    <div className="fixed bottom-4 right-96 z-50 flex gap-2">
      <Button variant="destructive" size="sm" tabIndex={-1} onClick={handleReset}>
        Reset Progress
      </Button>
    </div>
    <LayoutShell />
  </div>
  <InspectorPanel
    telemetryEvents={telemetryEvents}
    rewardReceipts={rewardReceipts}
    bundleData={bundle}
  />
</div>
```

### Step 10c: `SinglePackageDevApp` — Floating Buttons (lines 462-505)

Replace lines 462-505 (the outer div with layout and buttons) with:

```tsx
<div className="flex h-screen">
  <div className="min-w-0 flex-1 overflow-auto">
    <div className="fixed bottom-4 right-96 z-50 flex gap-2">
      <Button
        variant="default"
        size="sm"
        className="bg-success hover:bg-success/90"
        tabIndex={-1}
        onClick={handleEditorToggle}
      >
        Edit Package
      </Button>
      <Button variant="destructive" size="sm" onClick={handleReset}>
        Reset Progress
      </Button>
    </div>
    <LayoutShell />
  </div>
  <InspectorPanel
    telemetryEvents={telemetryEvents}
    rewardReceipts={rewardReceipts}
    definedRewards={
      loadedPkg?.rewards
        ? loadedPkg.rewards.triggers.flatMap((t) =>
            t.rewards.map((r) => ({
              action: r.action,
              badge: (r as any).badge,
              condition: (r as any).condition,
            })),
          )
        : undefined
    }
  />
</div>
```

**IMPORTANT:** Keep the `InspectorPanel` wrapper divs exactly as shown. The `LayoutShell` must remain inside the scroll area.

---

## Step 11: Rewrite `src/editor/EditorShell.tsx` — Replace Custom Modal, Select, Buttons, Toast

**Goal:** Replace the custom modal overlay for "New Node", raw `<select>`, raw `<button>` elements, and custom toast with design-system components.

**Add imports at top:**

```tsx
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Toaster } from '@open-edu/design-system';
import { toast } from 'sonner';
import { cn } from '@open-edu/design-system';
import { Plus, Eye, EyeOff } from 'lucide-react';
```

### Step 11a: Replace the toast system

Remove the `ToastMessage` interface and the `showToast` callback. Replace the entire toast system (lines 23-60, including the `toastTimeoutRef`) with sonner's `toast`:

**Delete these lines:**

```tsx
interface ToastMessage {
  text: string;
  type: 'success' | 'error' | 'info';
}
```

And lines 37-60 (the `toast` and `toastTimeoutRef` state/ref).

**Remove from `useState` destructuring:**

```tsx
const [toast, setToast] = useState<ToastMessage | null>(null);
```

**Replace all `showToast(...)` calls** with `toast.success(...)`, `toast.error(...)`, or `toast(...)` (info). For example:

- `showToast(`Deleted ${path}`, 'success')` → `toast.success(`Deleted ${path}`)`
- `showToast('Failed to delete: ' + (err as Error).message, 'error')` → `toast.error('Failed to delete: ' + (err as Error).message)`
- `showToast('No changes to save', 'info')` → `toast('No changes to save')`

### Step 11b: Add `<Toaster />` to the JSX

Inside the outermost `<div>` at line 559, add as the LAST child (before closing `</div>`):

```tsx
<Toaster position="bottom-right" />
```

Remove the old toast JSX (lines 811-823).

### Step 11c: Replace buttons in the toolbar (lines 560-602)

Replace the "Raw JSON / Form View" toggle button (line 578-588):

```tsx
<Button
  variant={viewMode === 'raw' ? 'default' : 'outline'}
  size="sm"
  className="text-xs"
  onClick={() => setViewMode(viewMode === 'raw' ? 'form' : 'raw')}
>
  {viewMode === 'raw' ? 'Form View' : 'Raw JSON'}
</Button>
```

Replace the "Done Editing / Edit Package" button (lines 590-601):

```tsx
<Button
  variant={mode === 'edit' ? 'default' : 'outline'}
  size="sm"
  className={mode === 'edit' ? 'bg-success hover:bg-success/90' : ''}
  onClick={() => onModeChange(mode === 'preview' ? 'edit' : 'preview')}
>
  {mode === 'edit' ? 'Done Editing' : 'Edit Package'}
</Button>
```

### Step 11d: Replace the "New Node" button in the file tree sidebar (lines 613-629)

```tsx
<Button
  variant="ghost"
  size="sm"
  className="text-primary hover:bg-primary-container w-full justify-start gap-1 text-xs font-medium"
  onClick={() => setShowNewNode(true)}
>
  <Plus className="h-3.5 w-3.5" />
  New Node
</Button>
```

### Step 11e: Replace the "New Node" modal overlay (lines 740-809)

Replace the ENTIRE modal (the `{showNewNode && (` ... `)}` block starting at line 740) with:

```tsx
<Dialog open={showNewNode} onOpenChange={setShowNewNode}>
  <DialogContent className="sm:max-w-sm">
    <DialogHeader>
      <DialogTitle>New Content Node</DialogTitle>
    </DialogHeader>
    <div className="space-y-3">
      <div>
        <label className="text-on-surface-variant mb-0.5 block text-xs font-medium">Filename</label>
        <Input
          placeholder="e.g., introduction"
          value={newNodeName}
          onChange={(e) => setNewNodeName(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreateNode();
            if (e.key === 'Escape') setShowNewNode(false);
          }}
        />
        <p className="text-on-surface-variant mt-1 text-[10px]">
          Will create: nodes/
          {newNodeName.trim().toLowerCase().replace(/\s+/g, '-') || 'filename'}
          {newNodeType === 'lesson' ? '.md' : '.json'}
        </p>
      </div>
      <div>
        <label className="text-on-surface-variant mb-0.5 block text-xs font-medium">Type</label>
        <Select value={newNodeType} onValueChange={setNewNodeType}>
          <SelectTrigger className="w-full text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NODE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
    <div className="mt-4 flex justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => setShowNewNode(false)}>
        Cancel
      </Button>
      <Button size="sm" onClick={handleCreateNode} disabled={!newNodeName.trim()}>
        Create
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

### Step 11f: Replace toolbar buttons in the file header (lines 634-670)

"Undo" button:

```tsx
<Button
  variant="ghost"
  size="sm"
  className="text-on-surface-variant text-xs font-medium"
  onClick={handleUndo}
  disabled={!currentFile?.isDirty}
  title="Revert to last saved state"
>
  Undo
</Button>
```

"Save All" button:

```tsx
<Button
  variant="ghost"
  size="sm"
  className="text-on-surface-variant text-xs font-medium"
  onClick={handleSaveAll}
  disabled={dirtyCount === 0 || savingAll}
>
  {savingAll ? 'Saving...' : `Save All${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
</Button>
```

"Save" button:

```tsx
<Button
  variant="ghost"
  size="sm"
  className="text-primary text-xs font-medium"
  onClick={handleSave}
  disabled={!currentFile?.isDirty || saving}
>
  {saving ? 'Saving...' : 'Save'}
</Button>
```

---

## Step 12: Update `src/editor/MarkdownEditor.tsx` — Replace Preview Toggle Button

**Add import:**

```tsx
import { Button } from '../components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
```

Replace lines 23-33 (the "Show/Hide Preview" button) with:

```tsx
<Button
  variant={showPreview ? 'default' : 'outline'}
  size="sm"
  className="text-xs"
  onClick={() => setShowPreview(!showPreview)}
>
  {showPreview ? <EyeOff className="mr-1 h-3 w-3" /> : <Eye className="mr-1 h-3 w-3" />}
  {showPreview ? 'Hide Preview' : 'Show Preview'}
</Button>
```

Also replace line 45: `className="border-outline-variant w-1/2 min-w-0 overflow-auto rounded border bg-white p-3"` with:

```tsx
className = 'border-outline-variant bg-surface w-1/2 min-w-0 overflow-auto rounded border p-3';
```

---

## Step 13: Update Remaining Editor Files — Replace SVGs with lucide-react Icons

### Step 13a: `src/editor/WorkflowEditor.tsx`

**Add imports:**

```tsx
import { Plus, X } from 'lucide-react';
```

Replace lines 84-93 (plus icon SVG for "Add Route") with:

```tsx
<Plus className="h-3.5 w-3.5" />
```

Replace lines 136-143 (X icon SVG for "Remove route") and lines 219-227 (X icon for "Remove condition") with:

```tsx
<X className="h-3.5 w-3.5" />
```

### Step 13b: `src/editor/RewardsEditor.tsx`

**Add imports:**

```tsx
import { X } from 'lucide-react';
```

Replace lines 132-141 (X icon for "Remove trigger") and lines 243-252 (X icon for "Remove reward") with:

```tsx
<X className="h-3.5 w-3.5" />
```

### Step 13c: `src/editor/JSONNodeEditor.tsx`

**Add imports:**

```tsx
import { X, Plus } from 'lucide-react';
```

Replace lines 187-195 (X icon for "Remove option") with:

```tsx
<X className="h-3.5 w-3.5" />
```

### Step 13d: `src/editor/SchemaForm.tsx`

**Add imports:**

```tsx
import { X } from 'lucide-react';
```

Replace lines 159-171 (X icon for "Remove item" in array fields) with:

```tsx
<X className="h-3.5 w-3.5" />
```

### Step 13e: `src/editor/CardsEditor.tsx`

**Add imports:**

```tsx
import { X } from 'lucide-react';
```

Replace lines 132-139 (X icon for "Remove card") with:

```tsx
<X className="h-3.5 w-3.5" />
```

### Step 13f: `src/editor/FileTree.tsx`

**Add imports:**

```tsx
import { Trash2 } from 'lucide-react';
import { cn } from '@open-edu/design-system';
```

Replace lines 93-106 (trash icon SVG) with:

```tsx
<Trash2 className="h-3.5 w-3.5" />
```

### Step 13g: `src/editor/AssetManager.tsx`

**Add imports:**

```tsx
import { cn } from '@open-edu/design-system';
import { Upload } from 'lucide-react';
```

Replace lines 92-104 (upload icon SVG) with:

```tsx
<Upload className="text-on-surface-variant mb-2 h-8 w-8" />
```

---

## Step 14: Update `src/editor/EditorShell.tsx` — Replace Remaining SVGs

**Add import (if not already added):**

```tsx
import { FileText, Eye, Plus } from 'lucide-react';
```

Replace lines 689-701 (file icon SVG for empty state) with:

```tsx
<FileText className="text-on-surface-variant/40 mx-auto mb-2 h-10 w-10" strokeWidth={1} />
```

Replace lines 714-731 (eye icon SVG for preview mode placeholder) with:

```tsx
<Eye className="text-on-surface-variant/40 mx-auto mb-3 h-12 w-12" strokeWidth={1} />
```

---

## Step 15: Run CSS Regeneration + Build Verification

After all changes, regenerate the dev-server Tailwind CSS (in case the pre-generated file is still needed during transition):

```bash
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css
```

Run all verification steps:

```bash
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server lint
pnpm --filter @open-edu/dev-server test
```

Fix any type errors, lint warnings, or test failures. If tests reference inline style objects or DOM structure that has changed, update the test assertions to match the new HTML output.

---

## Summary of Changes by File

| File                                        | Changes                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `package.json`                              | Add `lucide-react` dependency                                                                          |
| `postcss.config.js`                         | NEW — PostCSS pipeline                                                                                 |
| `src/index.css`                             | FULL REPLACE — Add `@tailwind base` + CSS variable bridge                                              |
| `src/main.tsx`                              | Remove `import './tailwind.css'`                                                                       |
| `src/components/ui/button.tsx`              | NEW — re-export proxy                                                                                  |
| `src/components/ui/badge.tsx`               | NEW — re-export proxy                                                                                  |
| `src/components/ui/dialog.tsx`              | NEW — re-export proxy                                                                                  |
| `src/components/ui/select.tsx`              | NEW — re-export proxy                                                                                  |
| `src/components/ui/tabs.tsx`                | NEW — re-export proxy                                                                                  |
| `src/components/ui/input.tsx`               | NEW — re-export proxy                                                                                  |
| `src/inspectors/InspectorPanel.tsx`         | FULL REPLACE — Tabs + Tailwind classes                                                                 |
| `src/inspectors/TelemetryInspector.tsx`     | FULL REPLACE — Inline styles → Tailwind                                                                |
| `src/inspectors/AccessibilityInspector.tsx` | FULL REPLACE — Inline styles → Tailwind + Button                                                       |
| `src/inspectors/RewardsInspector.tsx`       | FULL REPLACE — Inline styles → Tailwind + Button                                                       |
| `src/DevApp.tsx`                            | Replace toolbar/fallback inline styles → Button, Badge, Tailwind                                       |
| `src/editor/EditorShell.tsx`                | Replace modal → Dialog; select → Select; buttons → Button; toast → sonner Toaster; SVGs → lucide-react |
| `src/editor/MarkdownEditor.tsx`             | Replace toggle button → Button; bg-white → bg-surface                                                  |
| `src/editor/WorkflowEditor.tsx`             | Replace SVGs → lucide-react icons                                                                      |
| `src/editor/RewardsEditor.tsx`              | Replace SVGs → lucide-react icons                                                                      |
| `src/editor/JSONNodeEditor.tsx`             | Replace SVGs → lucide-react icons                                                                      |
| `src/editor/SchemaForm.tsx`                 | Replace SVGs → lucide-react icons                                                                      |
| `src/editor/CardsEditor.tsx`                | Replace SVGs → lucide-react icons                                                                      |
| `src/editor/FileTree.tsx`                   | Replace SVGs → lucide-react icons                                                                      |
| `src/editor/AssetManager.tsx`               | Replace SVGs → lucide-react icons                                                                      |
