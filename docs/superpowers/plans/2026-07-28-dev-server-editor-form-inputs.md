# Dev-Server Editor — Replace Raw Form Inputs with Design-System Primitives

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all remaining raw `<input>`, `<textarea>`, and `<select>` elements in the dev-server editor components with `Input`, `Textarea`, and `Select` from `@open-edu/design-system`.

**Architecture:** Each editor file gets its `<Input>`/`<Textarea>`/`<Select>` imports from the UI proxy at `../components/ui/`. Raw HTML elements are replaced one-to-one, preserving all `onChange`, `value`, `placeholder`, and other props. The `className` stays on the component (design-system components forward className to the underlying element). `SchemaForm.tsx` is the most complex — it dynamically renders different input types based on value type; each branch gets the appropriate design-system component.

**Tech Stack:** React 18, `@open-edu/design-system` (Input, Textarea, Select via re-export proxies)

---

### Task 1: MarkdownEditor — `<textarea>` → `<Textarea>`

**Files:**

- Modify: `apps/dev-server/src/editor/MarkdownEditor.tsx` (line 37-43)

- [ ] **Step 1: Add import**

Add after line 3 (`import { Eye, EyeOff } from 'lucide-react';`):

```tsx
import { Textarea } from '../components/ui/textarea';
```

- [ ] **Step 2: Create the Textarea proxy file**

File: `apps/dev-server/src/components/ui/textarea.tsx` (NEW)

```tsx
export { Textarea } from '@open-edu/design-system';
export type { TextareaProps } from '@open-edu/design-system';
```

- [ ] **Step 3: Replace the raw `<textarea>` at lines 37-43**

Find:

```tsx
<textarea
  className="border-outline-variant focus:border-primary focus:ring-primary min-w-0 flex-1 resize-none rounded border p-3 font-mono text-sm leading-relaxed focus:outline-none focus:ring-1"
  value={content}
  onChange={(e) => onChange(e.target.value)}
  spellCheck={false}
  aria-label="Markdown editor"
/>
```

Replace with:

```tsx
<Textarea
  className="border-outline-variant focus:border-primary focus:ring-primary min-w-0 flex-1 resize-none rounded border p-3 font-mono text-sm leading-relaxed focus:outline-none focus:ring-1"
  value={content}
  onChange={(e) => onChange(e.target.value)}
  spellCheck={false}
  aria-label="Markdown editor"
/>
```

**Note:** `Textarea` from design-system is built on `<textarea>`. It forwards `className`, `value`, `onChange`, `spellCheck`, `aria-label`, and any other standard props. The `rows` prop is not provided (field auto-sizes). This is fine — the field has `flex-1` which handles sizing.

- [ ] **Step 4: Verify**

```bash
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server test
```

Expected: typecheck clean, 78 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/dev-server/src/components/ui/textarea.tsx apps/dev-server/src/editor/MarkdownEditor.tsx
git commit -m "feat(dev-server): replace MarkdownEditor textarea with design-system Textarea"
```

---

### Task 2: RawJsonEditor — `<textarea>` → `<Textarea>`

**Files:**

- Modify: `apps/dev-server/src/editor/RawJsonEditor.tsx` (line 19-25)

- [ ] **Step 1: Add import**

Add after line 1 (`import { useMemo } from 'react';`):

```tsx
import { Textarea } from '../components/ui/textarea';
```

- [ ] **Step 2: Replace the raw `<textarea>` at lines 19-25**

Find:

```tsx
<textarea
  className="h-full w-full resize-none p-3 font-mono text-xs leading-relaxed focus:outline-none"
  value={content}
  onChange={(e) => onChange(e.target.value)}
  spellCheck={false}
  aria-label="Raw JSON editor"
/>
```

Replace with:

```tsx
<Textarea
  className="h-full w-full resize-none rounded-none border-0 p-3 font-mono text-xs leading-relaxed focus:outline-none focus-visible:ring-0"
  value={content}
  onChange={(e) => onChange(e.target.value)}
  spellCheck={false}
  aria-label="Raw JSON editor"
/>
```

**Note:** The `Textarea` component applies a default `rounded-md border` and `focus-visible:ring`. Since this field is inside a parent `<div className="...rounded border">`, we override with `rounded-none border-0 focus-visible:ring-0` to let the parent border handle the visual boundary.

- [ ] **Step 3: Verify**

```bash
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server test
```

Expected: typecheck clean, 78 tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/dev-server/src/editor/RawJsonEditor.tsx
git commit -m "feat(dev-server): replace RawJsonEditor textarea with design-system Textarea"
```

---

### Task 3: WorkflowEditor — `<input>` → `<Input>`, `<select>` → `<Select>`

**Files:**

- Modify: `apps/dev-server/src/editor/WorkflowEditor.tsx` (lines 115-121, 134-147, 152-158, 170-181, 183-194)

- [ ] **Step 1: Add imports**

Replace the import block at lines 1-2:

```tsx
import { useCallback } from 'react';
import { Plus, X } from 'lucide-react';
```

With:

```tsx
import { useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
```

- [ ] **Step 2: Replace the route key `<input>` at lines 115-121**

Find:

```tsx
<input
  type="text"
  className="border-outline-variant focus:border-primary focus:ring-primary min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1"
  value={routeKey}
  onChange={(e) => onKeyChange(e.target.value)}
  placeholder="nodes/example.md"
/>
```

Replace with:

```tsx
<Input
  className="border-outline-variant focus:border-primary focus:ring-primary min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1"
  value={routeKey}
  onChange={(e) => onKeyChange(e.target.value)}
  placeholder="nodes/example.md"
/>
```

- [ ] **Step 3: Replace the route type `<select>` at lines 134-147**

Find:

```tsx
<select
  className="border-outline-variant focus:border-primary focus:ring-primary rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
  value={isSimple ? 'simple' : 'conditional'}
  onChange={(e) => {
    if (e.target.value === 'simple') {
      onRouteChange({ onComplete: COMPLETED_SENTINEL });
    } else {
      onRouteChange({ conditions: [{ if: 'score >= 80', then: 'nodes/next.md' }] });
    }
  }}
>
  <option value="simple">Simple Route</option>
  <option value="conditional">Conditional</option>
</select>
```

Replace with:

```tsx
<Select
  value={isSimple ? 'simple' : 'conditional'}
  onValueChange={(value) => {
    if (value === 'simple') {
      onRouteChange({ onComplete: COMPLETED_SENTINEL });
    } else {
      onRouteChange({ conditions: [{ if: 'score >= 80', then: 'nodes/next.md' }] });
    }
  }}
>
  <SelectTrigger className="border-outline-variant focus:border-primary focus:ring-primary rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="simple">Simple Route</SelectItem>
    <SelectItem value="conditional">Conditional</SelectItem>
  </SelectContent>
</Select>
```

- [ ] **Step 4: Replace the "onComplete" target `<input>` at lines 152-158**

Find:

```tsx
<input
  type="text"
  className="border-outline-variant focus:border-primary focus:ring-primary min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1"
  value={route.onComplete ?? ''}
  onChange={(e) => onRouteChange({ onComplete: e.target.value })}
  placeholder={COMPLETED_SENTINEL}
/>
```

Replace with:

```tsx
<Input
  className="border-outline-variant focus:border-primary focus:ring-primary min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1"
  value={route.onComplete ?? ''}
  onChange={(e) => onRouteChange({ onComplete: e.target.value })}
  placeholder={COMPLETED_SENTINEL}
/>
```

- [ ] **Step 5: Replace the condition "if" `<input>` at lines 170-181**

Find:

```tsx
<input
  type="text"
  className="border-outline-variant focus:border-primary focus:ring-primary min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1"
  value={cond.if}
  onChange={(e) => {
    const conditions = [...(route.conditions ?? [])];
    const current = conditions[idx]!;
    conditions[idx] = { if: e.target.value, then: current.then };
    onRouteChange({ conditions });
  }}
  placeholder="score >= 80"
/>
```

Replace with:

```tsx
<Input
  className="border-outline-variant focus:border-primary focus:ring-primary min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1"
  value={cond.if}
  onChange={(e) => {
    const conditions = [...(route.conditions ?? [])];
    const current = conditions[idx]!;
    conditions[idx] = { if: e.target.value, then: current.then };
    onRouteChange({ conditions });
  }}
  placeholder="score >= 80"
/>
```

- [ ] **Step 6: Replace the condition "then" `<input>` at lines 183-194**

Find:

```tsx
<input
  type="text"
  className="border-outline-variant focus:border-primary focus:ring-primary min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1"
  value={cond.then}
  onChange={(e) => {
    const conditions = [...(route.conditions ?? [])];
    const current = conditions[idx]!;
    conditions[idx] = { if: current.if, then: e.target.value };
    onRouteChange({ conditions });
  }}
  placeholder="nodes/next.md"
/>
```

Replace with:

```tsx
<Input
  className="border-outline-variant focus:border-primary focus:ring-primary min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1"
  value={cond.then}
  onChange={(e) => {
    const conditions = [...(route.conditions ?? [])];
    const current = conditions[idx]!;
    conditions[idx] = { if: current.if, then: e.target.value };
    onRouteChange({ conditions });
  }}
  placeholder="nodes/next.md"
/>
```

- [ ] **Step 7: Verify**

```bash
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server test
```

Expected: typecheck clean, 78 tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/dev-server/src/editor/WorkflowEditor.tsx
git commit -m "feat(dev-server): replace WorkflowEditor raw inputs/selects with design-system components"
```

---

### Task 4: RewardsEditor — `<input>` → `<Input>`, `<select>` → `<Select>`, `<textarea>` → `<Textarea>`

**Files:**

- Modify: `apps/dev-server/src/editor/RewardsEditor.tsx` (lines 144-151, 192-200, 203-209, 213-219, 223-230)

- [ ] **Step 1: Add imports**

Replace line 1:

```tsx
import { X } from 'lucide-react';
```

With:

```tsx
import { X } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
```

- [ ] **Step 2: Replace the "On Event" `<input>` at lines 144-151**

Find:

```tsx
<input
  type="text"
  className="border-outline-variant focus:border-primary focus:ring-primary min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1"
  value={trigger.onEvent}
  onChange={(e) => onChange({ ...trigger, onEvent: e.target.value })}
  placeholder="node_complete"
  list="event-suggestions"
/>
```

Replace with:

```tsx
<Input
  className="border-outline-variant focus:border-primary focus:ring-primary min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1"
  value={trigger.onEvent}
  onChange={(e) => onChange({ ...trigger, onEvent: e.target.value })}
  placeholder="node_complete"
  list="event-suggestions"
/>
```

- [ ] **Step 3: Replace the reward action `<select>` at lines 192-200**

Find:

```tsx
<select
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
  value={reward.action}
  onChange={(e) => onChange({ ...reward, action: e.target.value })}
>
  <option value="badge.award">Badge Award</option>
  <option value="webhook">Webhook</option>
  <option value="script">Script</option>
</select>
```

Replace with:

```tsx
<Select value={reward.action} onValueChange={(value) => onChange({ ...reward, action: value })}>
  <SelectTrigger className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="badge.award">Badge Award</SelectItem>
    <SelectItem value="webhook">Webhook</SelectItem>
    <SelectItem value="script">Script</SelectItem>
  </SelectContent>
</Select>
```

- [ ] **Step 4: Replace the "Badge ID" `<input>` at lines 203-209**

Find:

```tsx
<input
  type="text"
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
  placeholder="Badge ID"
  value={reward.badge ?? ''}
  onChange={(e) => onChange({ ...reward, badge: e.target.value })}
/>
```

Replace with:

```tsx
<Input
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
  placeholder="Badge ID"
  value={reward.badge ?? ''}
  onChange={(e) => onChange({ ...reward, badge: e.target.value })}
/>
```

- [ ] **Step 5: Replace the "Webhook URL" `<input>` at lines 213-219**

Find:

```tsx
<input
  type="text"
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
  placeholder="https://example.com/webhook"
  value={reward.url ?? ''}
  onChange={(e) => onChange({ ...reward, url: e.target.value })}
/>
```

Replace with:

```tsx
<Input
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
  placeholder="https://example.com/webhook"
  value={reward.url ?? ''}
  onChange={(e) => onChange({ ...reward, url: e.target.value })}
/>
```

- [ ] **Step 6: Replace the "Script" `<textarea>` at lines 223-230**

Find:

```tsx
<textarea
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1"
  rows={2}
  placeholder="Script content"
  value={reward.exec ?? ''}
  onChange={(e) => onChange({ ...reward, exec: e.target.value })}
/>
```

Replace with:

```tsx
<Textarea
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1"
  rows={2}
  placeholder="Script content"
  value={reward.exec ?? ''}
  onChange={(e) => onChange({ ...reward, exec: e.target.value })}
/>
```

- [ ] **Step 7: Verify**

```bash
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server test
```

Expected: typecheck clean, 78 tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/dev-server/src/editor/RewardsEditor.tsx
git commit -m "feat(dev-server): replace RewardsEditor raw inputs/selects/textarea with design-system components"
```

---

### Task 5: JSONNodeEditor — `<input>` → `<Input>`, `<select>` → `<Select>`, `<textarea>` → `<Textarea>`

**Files:**

- Modify: `apps/dev-server/src/editor/JSONNodeEditor.tsx` (lines 126-136, 153-163, 211-217)

- [ ] **Step 1: Add imports**

Replace the import block at lines 1-3:

```tsx
import { useMemo } from 'react';
import { SchemaForm } from './SchemaForm';
import { X } from 'lucide-react';
```

With:

```tsx
import { useMemo } from 'react';
import { SchemaForm } from './SchemaForm';
import { X } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
```

- [ ] **Step 2: Replace the node type `<select>` at lines 126-136**

Find:

```tsx
<select
  className="border-outline-variant focus:border-primary focus:ring-primary rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1"
  value={data.type}
  onChange={(e) => onChange({ ...data, type: e.target.value as NodeType })}
>
  <option value="lesson">Lesson</option>
  <option value="quiz">Quiz</option>
  <option value="reflection">Reflection</option>
  <option value="exercise">Exercise</option>
  <option value="custom">Custom Widget</option>
</select>
```

Replace with:

```tsx
<Select value={data.type} onValueChange={(value) => onChange({ ...data, type: value as NodeType })}>
  <SelectTrigger className="border-outline-variant focus:border-primary focus:ring-primary rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="lesson">Lesson</SelectItem>
    <SelectItem value="quiz">Quiz</SelectItem>
    <SelectItem value="reflection">Reflection</SelectItem>
    <SelectItem value="exercise">Exercise</SelectItem>
    <SelectItem value="custom">Custom Widget</SelectItem>
  </SelectContent>
</Select>
```

- [ ] **Step 3: Replace the quiz option `<input>` at lines 153-163**

Find:

```tsx
<input
  type="text"
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
  placeholder={`Option ${String.fromCharCode(97 + idx)}...`}
  value={opt.text}
  onChange={(e) => {
    const opts = [...(data.options ?? [])];
    const current = opts[idx]!;
    opts[idx] = { id: current.id, text: e.target.value, correct: current.correct };
    onChange({ ...data, options: opts });
  }}
/>
```

Replace with:

```tsx
<Input
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
  placeholder={`Option ${String.fromCharCode(97 + idx)}...`}
  value={opt.text}
  onChange={(e) => {
    const opts = [...(data.options ?? [])];
    const current = opts[idx]!;
    opts[idx] = { id: current.id, text: e.target.value, correct: current.correct };
    onChange({ ...data, options: opts });
  }}
/>
```

- [ ] **Step 4: Replace the reflection prompt `<textarea>` at lines 211-217**

Find:

```tsx
<textarea
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
  rows={4}
  placeholder="Enter reflection prompt..."
  value={data.prompt ?? ''}
  onChange={(e) => onChange({ ...data, prompt: e.target.value })}
/>
```

Replace with:

```tsx
<Textarea
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
  rows={4}
  placeholder="Enter reflection prompt..."
  value={data.prompt ?? ''}
  onChange={(e) => onChange({ ...data, prompt: e.target.value })}
/>
```

- [ ] **Step 5: Verify**

```bash
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server test
```

Expected: typecheck clean, 78 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/dev-server/src/editor/JSONNodeEditor.tsx
git commit -m "feat(dev-server): replace JSONNodeEditor raw inputs/select/textarea with design-system components"
```

---

### Task 6: ManifestEditor — `<select>` → `<Select>`

**Files:**

- Modify: `apps/dev-server/src/editor/ManifestEditor.tsx` (lines 60-70)

- [ ] **Step 1: Add imports**

Replace the import block at lines 1-2:

```tsx
import { useMemo } from 'react';
import { SchemaForm } from './SchemaForm';
```

With:

```tsx
import { useMemo } from 'react';
import { SchemaForm } from './SchemaForm';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
```

- [ ] **Step 2: Replace the entry node `<select>` at lines 60-70**

Find:

```tsx
<select
  className="border-outline-variant text-on-surface focus:border-primary focus:ring-primary w-full rounded border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
  value={data.entry}
  onChange={(e) => onChange({ ...data, entry: e.target.value })}
>
  {sortedPaths.map((p) => (
    <option key={p} value={p}>
      {p}
    </option>
  ))}
</select>
```

Replace with:

```tsx
<Select value={data.entry} onValueChange={(value) => onChange({ ...data, entry: value })}>
  <SelectTrigger className="border-outline-variant text-on-surface focus:border-primary focus:ring-primary w-full rounded border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {sortedPaths.map((p) => (
      <SelectItem key={p} value={p}>
        {p}
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
git add apps/dev-server/src/editor/ManifestEditor.tsx
git commit -m "feat(dev-server): replace ManifestEditor raw select with design-system Select"
```

---

### Task 7: CardsEditor — `<input>` → `<Input>`, `<select>` → `<Select>`, `<textarea>` → `<Textarea>`

**Files:**

- Modify: `apps/dev-server/src/editor/CardsEditor.tsx` (lines 141-146, 152-158, 164-169, 175-181, 187-192, 198-208, 214-224, 230-237, 243-250, 256-261, 267-273, 279-285, 291-302, 327-340)

This file has the most raw elements — 10 `<input>`, 2 `<select>`, 3 `<textarea>`, 1 small tag `<input>`.

- [ ] **Step 1: Add imports**

Replace line 1:

```tsx
import { X } from 'lucide-react';
```

With:

```tsx
import { X } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
```

- [ ] **Step 2: Replace the Card ID `<input>` at lines 141-146**

```tsx
<Input
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
  value={card.id}
  onChange={(e) => onChange({ ...card, id: e.target.value })}
/>
```

- [ ] **Step 3: Replace the Slug `<input>` at lines 152-158**

```tsx
<Input
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
  value={card.slug ?? ''}
  onChange={(e) => onChange({ ...card, slug: e.target.value })}
  placeholder="Optional"
/>
```

- [ ] **Step 4: Replace the Title `<input>` at lines 164-169**

```tsx
<Input
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
  value={card.title}
  onChange={(e) => onChange({ ...card, title: e.target.value })}
/>
```

- [ ] **Step 5: Replace the Subtitle `<input>` at lines 175-181**

```tsx
<Input
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
  value={card.subtitle ?? ''}
  onChange={(e) => onChange({ ...card, subtitle: e.target.value })}
  placeholder="Optional"
/>
```

- [ ] **Step 6: Replace the Category `<input>` at lines 187-192**

```tsx
<Input
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
  value={card.category}
  onChange={(e) => onChange({ ...card, category: e.target.value })}
/>
```

- [ ] **Step 7: Replace the Type `<select>` at lines 198-208**

Find the raw `<select>` and replace with:

```tsx
<Select value={card.type} onValueChange={(value) => onChange({ ...card, type: value })}>
  <SelectTrigger className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {cardTypeOptions.map((t) => (
      <SelectItem key={t} value={t}>
        {t}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 8: Replace the Difficulty `<select>` at lines 214-224**

Find the raw `<select>` and replace with:

```tsx
<Select
  value={card.difficulty ?? 'medium'}
  onValueChange={(value) => onChange({ ...card, difficulty: value })}
>
  <SelectTrigger className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {cardDifficultyOptions.map((d) => (
      <SelectItem key={d} value={d}>
        {d}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 9: Replace the Level `<input>` at lines 230-237**

```tsx
<Input
  type="number"
  min={1}
  max={5}
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
  value={card.level}
  onChange={(e) => onChange({ ...card, level: parseInt(e.target.value) || 1 })}
/>
```

- [ ] **Step 10: Replace the Max Level `<input>` at lines 243-250**

```tsx
<Input
  type="number"
  min={1}
  max={5}
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
  value={card.maximumLevel}
  onChange={(e) => onChange({ ...card, maximumLevel: parseInt(e.target.value) || 1 })}
/>
```

- [ ] **Step 11: Replace the Summary `<textarea>` at lines 256-261**

```tsx
<Textarea
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
  rows={2}
  value={card.summary}
  onChange={(e) => onChange({ ...card, summary: e.target.value })}
/>
```

- [ ] **Step 12: Replace the Detailed Explanation `<textarea>` at lines 267-273**

```tsx
<Textarea
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
  rows={2}
  value={card.detailedExplanation ?? ''}
  onChange={(e) => onChange({ ...card, detailedExplanation: e.target.value })}
  placeholder="Optional"
/>
```

- [ ] **Step 13: Replace the Icon `<input>` at lines 279-285**

```tsx
<Input
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1"
  value={card.icon ?? ''}
  onChange={(e) => onChange({ ...card, icon: e.target.value })}
  placeholder="Optional icon path"
/>
```

- [ ] **Step 14: Replace the Unlock Condition `<textarea>` at lines 291-302**

```tsx
<Textarea
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1"
  rows={2}
  value={JSON.stringify(card.unlock, null, 2)}
  onChange={(e) => {
    try {
      onChange({ ...card, unlock: JSON.parse(e.target.value) });
    } catch {
      // Allow invalid JSON during editing
    }
  }}
/>
```

- [ ] **Step 15: Replace the "Add tag" `<input>` at lines 327-340**

This is a small inline tag input. Replace the raw `<input>` with:

```tsx
<Input
  className="border-outline-variant focus:border-primary w-20 rounded border px-1 py-0.5 text-[10px] focus:outline-none"
  placeholder="Add tag"
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      const input = e.currentTarget;
      const val = input.value.trim();
      if (val) {
        onChange({ ...card, tags: [...(card.tags ?? []), val] });
        input.value = '';
      }
    }
  }}
/>
```

**Important note:** The `Input` component forwards refs via `React.forwardRef`. For the tag input, the `e.currentTarget.value` pattern used in `onKeyDown` works the same way — `e.currentTarget` is the DOM element, and the `Input` renders an `<input>`. This is fine.

- [ ] **Step 16: Verify**

```bash
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server test
```

Expected: typecheck clean, 78 tests pass.

- [ ] **Step 17: Commit**

```bash
git add apps/dev-server/src/editor/CardsEditor.tsx
git commit -m "feat(dev-server): replace CardsEditor raw inputs/selects/textareas with design-system components"
```

---

### Task 8: SchemaForm — Dynamic `<input>` → `<Input>`, `<textarea>` → `<Textarea>`

**Files:**

- Modify: `apps/dev-server/src/editor/SchemaForm.tsx` (lines 44-50, 60-66, 72-78, 86-92, 121-132, 142-149, 179-192)

SchemaForm dynamically renders different `<input>` / `<textarea>` types based on the value type (`null`, `string`, `number`, `boolean`, `Array`, `object`). Each branch gets replaced with the appropriate design-system component.

- [ ] **Step 1: Add imports**

Replace line 1:

```tsx
import { useCallback } from 'react';
import { X } from 'lucide-react';
```

With:

```tsx
import { useCallback } from 'react';
import { X } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
```

- [ ] **Step 2: Replace null/undefined value `<input>` at lines 44-50**

```tsx
<Input
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
  placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
  value=""
  onChange={(e) => handleFieldChange(key, e.target.value)}
/>
```

- [ ] **Step 3: Replace long-text string `<textarea>` at lines 60-66**

```tsx
<Textarea
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
  rows={4}
  placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
  value={value}
  onChange={(e) => handleFieldChange(key, e.target.value)}
/>
```

- [ ] **Step 4: Replace short-text string `<input>` at lines 72-78**

```tsx
<Input
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
  placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
  value={value}
  onChange={(e) => handleFieldChange(key, e.target.value)}
/>
```

- [ ] **Step 5: Replace number `<input>` at lines 86-92**

```tsx
<Input
  type="number"
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
  placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
  value={value}
  onChange={(e) => handleFieldChange(key, Number(e.target.value))}
/>
```

- [ ] **Step 6: Leave boolean `<input type="checkbox">` unchanged**

The checkbox at lines 101-106 is a native `<input type="checkbox">`. There is no `Checkbox` component in the design-system proxies (unlike the learner which has `Switch`). Leave this unchanged.

- [ ] **Step 7: Replace object array `<textarea>` at lines 121-132**

```tsx
<Textarea
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2.5 py-1.5 font-mono text-sm focus:outline-none focus:ring-1"
  rows={4}
  value={JSON.stringify(value, null, 2)}
  onChange={(e) => {
    try {
      handleFieldChange(key, JSON.parse(e.target.value));
    } catch {
      // Allow invalid JSON during editing
    }
  }}
/>
```

- [ ] **Step 8: Replace string array item `<input>` at lines 142-149**

```tsx
<Input
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1"
  value={typeof item === 'string' ? item : String(item)}
  onChange={(e) => {
    const newArray = [...value];
    newArray[idx] = e.target.value;
    handleFieldChange(key, newArray);
  }}
/>
```

- [ ] **Step 9: Replace object value `<textarea>` at lines 179-192**

```tsx
<Textarea
  className="border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2.5 py-1.5 font-mono text-sm focus:outline-none focus:ring-1"
  rows={3}
  value={JSON.stringify(value, null, 2)}
  onChange={(e) => {
    try {
      const parsed = JSON.parse(e.target.value);
      handleFieldChange(key, parsed);
    } catch {
      // Allow invalid JSON during editing
    }
  }}
/>
```

- [ ] **Step 10: Verify**

```bash
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server test
```

Expected: typecheck clean, 78 tests pass. The editor tests (`editor.test.tsx` — 30 tests) exercise SchemaForm indirectly through the manifest editor. They should pass without changes.

- [ ] **Step 11: Commit**

```bash
git add apps/dev-server/src/editor/SchemaForm.tsx
git commit -m "feat(dev-server): replace SchemaForm dynamic inputs/textareas with design-system components"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run full verification suite**

```bash
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server lint
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/dev-server exec prettier --check "src/**/*.{ts,tsx,css}"
```

Expected: typecheck clean, lint 0 errors, 78/78 tests pass, format check passes.

- [ ] **Step 2: Verify zero remaining raw form elements in editor components**

```bash
grep -rn '<input\|<textarea\|<select class' apps/dev-server/src/editor/ --include='*.tsx' | grep -v 'type="checkbox' | grep -v 'components/ui'
```

Expected: zero matches (all raw form elements replaced). Checkbox inputs are allowed since there's no design-system Checkbox proxy.

- [ ] **Step 3: Verify zero remaining raw form elements in inspectors**

```bash
grep -rn '<input\|<textarea\|<select ' apps/dev-server/src/inspectors/ --include='*.tsx'
```

Expected: zero matches.

- [ ] **Step 4: Smoke test**

```bash
pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js dev ../openedu-courses/liver-health
```

Expected: dev server starts on http://localhost:4000, UI renders correctly, no Tailwind warnings, no console errors. Editor forms render with design-system styled inputs.
