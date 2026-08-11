---
type: Implementation Plan (agent-executable)
title: Studio Outline & Editor Improvements — Execution Plan for Agent
description: Step-by-step, self-contained implementation plan (6 work items) for apps/dev-server Creator mode. Includes exact file paths, code sketches, i18n keys, test specs, and verification commands. Execute with the executing-plans skill workflow.
tags: [dev-server, studio, creator-mode, outline, agent-plan]
---

# Studio Outline & Editor Improvements — Agent Execution Plan

> **For the implementing agent.** This plan is self-contained. Read it fully, create a feature branch, then implement Work Items 1–6 in order. Use a todo list (TodoWrite) with one item per step. Run the verification command at the end of every step before moving on. STOP and ask the user if any step's verification fails in a way you cannot fix within two attempts, or if a file referenced below does not exist.

---

## 0. Repository context

- **Repo:** Open-Edu monorepo (pnpm workspaces, TypeScript 5, Vite 5, Vitest 1, React 18).
- **Key command facts:**
  - Filtered test run for one file: `pnpm --filter @open-edu/dev-server test -- <path>` (script is `vitest run`).
  - Widgets tests: `pnpm --filter @open-edu/widgets test -- <path>`.
  - Full checks at the end: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`.
  - Format a single file: `npx prettier --write <path>` (run after edits).
- **Hard rules from AGENTS.md (do not violate):**
  - Never add code comments unless a comment already exists and you are preserving its style.
  - All user-facing UI strings MUST use `t('studio.<key>')`; add the English value to `packages/i18n/locales/en/studio.json`. Do not hardcode strings (the lint step enforces this).
  - Use Tailwind tokens/utility classes via `cn()`; never hardcode hex colors. No inline `style={{}}` except for dynamic sizing / `var(--oe-*)` references (existing widget code already does this — do not touch it).
  - Every work item ships with Vitest tests. Do not weaken existing assertions to make tests pass.
- **Architecture facts you will rely on (already verified):**
  - Outline order's source of truth is `workflow.json` → `routing` keys. `GET /api/package/outline` (`apps/dev-server/vite.config.ts:1155-1162`) builds `orderedPaths = Object.keys(workflow.routing)`.
  - `WorkflowSchema` accepts `{ routing: {} }` (see `packages/schemas/src/workflow.test.ts:56-57`). `PackageManifestSchema.entry` requires a non-empty string (`packages/schemas/src/manifest.ts:16`).
  - `MarkdownRenderer` is exported from `@open-edu/runtime` and works outside a `RuntimeProvider` (`useRuntimeOptional`). The dev-server app is wrapped in `I18nProvider` (`apps/dev-server/src/main.tsx:38`).
  - Widget docs markdown (`apps/docs/docs/widget-library/*.md`) is generated from the structured `guide` field in `packages/widgets/src/widget-catalog-source.ts` by `packages/widgets/scripts/generate-widget-docs.ts`. There is one deprecated widget: `open-edu.multiple-choice-practice`.
  - The existing `studio.nav.backToOutline` i18n key ("Back to outline") is currently unused — reuse it.
- **Branching:** create and work on a branch (e.g., `feat/studio-outline-editor-improvements`). Never implement directly on `main`. Commit per work item with conventional messages (`fix(dev-server): ...`, `feat(dev-server): ...`).

---

## Work Item 1 — Cancel / Back button in activity editors

**Goal:** From any activity editor, the user can return to the outline (discarding unsaved edits).

### Step 1.1 — Add `onCancel` prop to the router

File: `apps/dev-server/src/studio/components/ActivityEditorRouter.tsx`

- Add `onCancel?: () => void;` to the props type (the object currently has `api`, `path`, `onSaved`, `onError`).
- Pass `onCancel={onCancel}` to `LessonActivityEditor`, `QuizActivityEditor`, and `PracticeActivityEditor`.

### Step 1.2 — Add a Cancel button to each editor

Files:

- `apps/dev-server/src/studio/components/LessonActivityEditor.tsx`
- `apps/dev-server/src/studio/components/QuizActivityEditor.tsx`
- `apps/dev-server/src/studio/components/PracticeActivityEditor.tsx`

In each:

- Add `onCancel?: () => void;` to the props type.
- In the button row next to the existing Save `<Button>`, render a secondary Cancel button, shown only when `onCancel` is provided:

```tsx
{
  onCancel ? (
    <Button variant="outline" size="sm" onClick={onCancel}>
      {t('studio.editor.cancel')}
    </Button>
  ) : null;
}
```

- Use lucide `ArrowLeft` (already imported icon set in each file) with `className="mr-1 h-4 w-4" aria-hidden="true"` if you want an icon; text label is sufficient.

### Step 1.3 — Wire navigation in StudioApp

File: `apps/dev-server/src/studio/StudioApp.tsx`

- In the `case 'edit-activity':` branch (currently lines 135-144), add `onCancel={() => handleNavigate('outline')}` to the `<ActivityEditorRouter ... />` props.

### Step 1.4 — i18n

File: `packages/i18n/locales/en/studio.json` — add:

```json
"editor.cancel": "Cancel"
```

### Step 1.5 — Tests

- `apps/dev-server/src/studio/components/ActivityEditorRouter.test.tsx`: add a test asserting the router forwards `onCancel` — render with `onCancel={spy}`, wait for the lesson editor to load, click the Cancel button, assert `spy` called. (The existing `makeApi` helper already returns a usable `readFile`.)
- `apps/dev-server/src/studio/components/LessonActivityEditor.test.tsx`: add a test — render with `onCancel={spy}`, click the Cancel button, assert `spy` called once; assert no `writeFile` call was made.
- `apps/dev-server/src/studio/components/QuizActivityEditor.test.tsx` and `PracticeActivityEditor.test.tsx`: same pattern (one test each).

### Step 1.6 — Verify

```bash
pnpm --filter @open-edu/dev-server test -- src/studio/components/ActivityEditorRouter.test.tsx src/studio/components/LessonActivityEditor.test.tsx src/studio/components/QuizActivityEditor.test.tsx src/studio/components/PracticeActivityEditor.test.tsx
```

Commit: `feat(dev-server): add cancel/back button to activity editors`

---

## Work Item 2 — Reset preview actually resets widget state

**Goal:** The "Reset preview" button in `WidgetPreviewPanel` remounts the widget so internal state (selected answers, submitted feedback, animation steps, interaction log) is cleared.

**Root cause (verified):** `apps/dev-server/src/editor/WidgetPreviewPanel.tsx:130-139` renders the reset `<Button>` with **no `onClick`**. `WidgetPreviewProvider` (`apps/dev-server/src/editor/WidgetPreviewProvider.tsx`) keeps `interactions` in state and passes `storedState: undefined`; widgets keep internal `useState` that survives re-renders. Remounting with a React `key` resets both.

### Step 2.1 — Wire the reset button

File: `apps/dev-server/src/editor/WidgetPreviewPanel.tsx`

- Change the react import line 1 from `import { useCallback, useRef } from 'react';` to include `useState`.
- Inside `WidgetPreviewPanel`, add `const [resetToken, setResetToken] = useState(0);`.
- Give the existing reset button an `onClick`:

```tsx
<Button
  variant="ghost"
  size="sm"
  className="h-6 w-6 p-0"
  title="Reset preview"
  aria-label="Reset preview"
  onClick={() => setResetToken((t) => t + 1)}
>
  <RotateCcw className="h-3.5 w-3.5" />
</Button>
```

- In the preview body, key the provider subtree (currently lines 185-187):

```tsx
<WidgetPreviewProvider key={resetToken}>
  <WidgetPreviewRenderer widgetType={widgetType} widgetConfig={widgetConfig ?? {}} />
</WidgetPreviewProvider>
```

This remounts the provider (clears the `interactions` log) and the renderer (resets the widget's internal `useState`, the `animationControllerRef`, and the `OasAnimationWrapper`).

**Do not** change `widgetConfig` on reset — the form fields are the source of truth for config.

### Step 2.2 — Tests

File: `apps/dev-server/src/editor/__tests__/widget-preview.test.tsx` — add to the `WidgetPreviewPanel` describe block:

```tsx
it('reset preview clears widget interaction state', async () => {
  render(
    <WidgetPreviewPanel
      widgetType="core.visual-counting"
      widgetConfig={{ items: ['🍎', '🍎', '🍎'], count: 3, interactive: true }}
      validationErrors={[]}
    />,
  );
  // interact: select the correct count then submit
  await userEvent.click(screen.getByRole('button', { name: 'Count 3' }));
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  expect(screen.getByText('Correct! The answer is 3.')).toBeInTheDocument();
  // reset
  await userEvent.click(screen.getByRole('button', { name: 'Reset preview' }));
  expect(screen.queryByText('Correct! The answer is 3.')).not.toBeInTheDocument();
  // a fresh Submit button means the widget remounted to its initial state
  expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
});
```

Notes for the test:

- Import `userEvent` (already imported in that file? if not, add `import userEvent from '@testing-library/user-event';`).
- `core.visual-counting` renders number buttons with `aria-label="Count N"` and a `Submit` button; after submit it shows `Correct! The answer is 3.` (verified in `packages/widgets/src/builtins/VisualCounting/VisualCounting.tsx:298-313`). `Count 3` works because `expected = content.count ?? 0` = 3 and the button label uses `aria-label={\`Count ${num}\`}`.
- If jsdom accessibility checks reject the emoji listitem labels, use `getAllByRole('button', { name: /^Count / })` and click the one whose accessible name ends with `3` instead.

### Step 2.3 — Verify

```bash
pnpm --filter @open-edu/dev-server test -- src/editor/__tests__/widget-preview.test.tsx
```

Commit: `fix(dev-server): make reset preview remount widget state`

---

## Work Item 3 — Delete item in outline page

**Goal:** Each outline row has a Delete action (with confirmation). Deleting removes the node file AND removes it from the `workflow.json` routing so the row disappears.

### Step 3.1 — Add `deleteFile` to the StudioApi client

File: `apps/dev-server/src/studio/studioApi.ts` — add inside `createStudioApi()` (the DELETE server endpoint reads `path` from the **query string**, `vite.config.ts:957-990`):

```ts
deleteFile: (path: string) =>
  apiRequest<{ success: boolean; path: string }>(
    `/file?path=${encodeURIComponent(path)}`,
    { method: 'DELETE' },
  ),
```

### Step 3.2 — Allow an empty outline server-side

File: `apps/dev-server/vite.config.ts` — the `PUT /api/package/outline` handler (lines 1170-1240) currently rejects empty arrays at lines 1182-1186. Replace that block with:

```ts
const orderedPaths = Array.isArray(body.orderedPaths) ? body.orderedPaths : [];
if (orderedPaths.length === 0) {
  await writeFile(
    join(getCurrentDir(), 'workflow.json'),
    JSON.stringify({ routing: {} }, null, 2),
    'utf-8',
  );
  const mod = srv.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
  if (mod) {
    srv.moduleGraph.invalidateModule(mod);
  }
  srv.ws.send({ type: 'full-reload' });
  res.end(JSON.stringify({ success: true }));
  return;
}
```

(Leave `manifest.entry` untouched — the schema requires a non-empty string, and the next "add" will rewrite a valid entry.)

### Step 3.3 — Delete button + confirmation in OutlineView

File: `apps/dev-server/src/studio/components/OutlineView.tsx`

- Imports: add `Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription` from `@open-edu/design-system` (match the `LibraryView.tsx:7-15` import shape), and `Trash2` from `lucide-react`.
- Add state: `const [deleteTarget, setDeleteTarget] = useState<ActivitySummary | null>(null);`
- Add a delete handler:

```tsx
const removeActivity = async (activity: ActivitySummary) => {
  setSaving(true);
  try {
    await api.deleteFile(activity.path);
    const remaining = activities.filter((a) => a.id !== activity.id);
    setActivities(remaining);
    await api.saveOutlineOrder(remaining.map((a) => a.path));
    setDeleteTarget(null);
  } catch (err) {
    onError(err instanceof Error ? err.message : t('studio.errors.generic'));
  } finally {
    setSaving(false);
  }
};
```

- In the row actions (`<div className="flex items-center gap-1">`, lines 179-202), add a Delete ghost button after the Edit button:

```tsx
<Button
  variant="ghost"
  size="sm"
  aria-label={t('studio.outline.delete', { title: activity.title })}
  disabled={saving}
  onClick={() => setDeleteTarget(activity)}
>
  <Trash2 className="h-4 w-4" aria-hidden="true" />
</Button>
```

- Render a confirmation `Dialog` at the end of the component (mirror `LibraryView`'s archive dialog pattern):

```tsx
<Dialog
  open={deleteTarget !== null}
  onOpenChange={(open) => {
    if (!open) setDeleteTarget(null);
  }}
>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>{t('studio.outline.deleteConfirmTitle')}</DialogTitle>
      <DialogDescription>
        {t('studio.outline.deleteConfirmLede', { title: deleteTarget?.title ?? '' })}
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
        {t('studio.outline.deleteCancel')}
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => deleteTarget && void removeActivity(deleteTarget)}
        disabled={saving}
      >
        {t('studio.outline.deleteConfirm')}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Step 3.4 — Clear stale selectedPath in StudioApp

File: `apps/dev-server/src/studio/StudioApp.tsx` — in `handleNavigate`, if the next view is `'outline'` or `'home'`, also `setSelectedPath(null); writeSelectedPath(null);` so a previously-selected (possibly deleted) activity is not re-opened. (Check `writeSelectedPath`'s signature in `studioSession.ts` — it accepts a string; `null` is fine for `readSelectedPath`'s return type, but confirm with a quick read of `studioSession.ts`.)

### Step 3.5 — i18n

File: `packages/i18n/locales/en/studio.json` — add:

```json
"outline.delete": "Delete {{title}}",
"outline.deleteConfirmTitle": "Delete this activity?",
"outline.deleteConfirmLede": "{{title}} will be removed from your course. This cannot be undone from Studio.",
"outline.deleteConfirm": "Delete",
"outline.deleteCancel": "Cancel"
```

### Step 3.6 — Tests

File: `apps/dev-server/src/studio/components/OutlineView.test.tsx`

- Extend `makeApi` (lines 23-35) with `deleteFile: vi.fn().mockResolvedValue({ success: true })`.
- Add tests:
  1. "deletes an activity and persists the new order": open delete for `nodes/q.json`, confirm, assert `api.deleteFile` called with `'nodes/q.json'` and `api.saveOutlineOrder` called with `['nodes/a.md']`; assert `Check` is removed from the list.
  2. "cancel does not delete": click delete then Cancel, assert `deleteFile` not called.
  3. "deleting the last activity succeeds with an empty order": mock `activities` = 1 item, delete it, assert `saveOutlineOrder` called with `[]` and the empty state appears.

### Step 3.7 — Verify

```bash
pnpm --filter @open-edu/dev-server test -- src/studio/components/OutlineView.test.tsx
```

Commit: `feat(dev-server): add delete action to outline with confirmation`

---

## Work Item 4 — Show widget guide markdown in the practice editor

**Goal:** While editing a practice activity, display that widget's guide (the same content as `apps/docs/docs/widget-library/*.md`).

**Design:** Extract the markdown renderer from the docs generator into `packages/widgets` so docs and Studio share one renderer (no drift), and render it with the runtime's `MarkdownRenderer`. The rendered body must NOT include Docusaurus frontmatter (so it reads cleanly in the editor); the docs generator prepends the frontmatter itself.

### Step 4.1 — New shared renderer in packages/widgets

Create `packages/widgets/src/guide-markdown.ts`:

````ts
import type { WidgetCatalogEntry } from './widget-catalog-source.js';

export function renderWidgetGuideMarkdown(entry: WidgetCatalogEntry): string {
  const g = entry.guide;
  if (!g) return '';
  const id = entry.id;
  const name = entry.name ?? entry.id;
  const domain = entry.domain ?? 'core';
  const status = entry.status ?? 'stable';
  return (
    [
      `# ${name}`,
      ``,
      `**Widget ID:** \`${id}\` | **Domain:** ${domain} | **Status:** ${status}`,
      ``,
      `> ${g.oneLiner}`,
      ``,
      `## What it does`,
      ``,
      g.whatItDoes,
      ...(g.whenToUse.length > 0
        ? [``, `## When to use this widget`, ``, ...g.whenToUse.map((item) => `- ${item}`)]
        : []),
      ``,
      `## Setting it up`,
      ``,
      ...g.setupSteps.map((step, i) => `${i + 1}. ${step}`),
      ``,
      `## Configuration fields`,
      ``,
      `| Field | Type | Required | Description |`,
      `|-------|------|----------|-------------|`,
      ...g.configFields.map(
        (f) => `| \`${f.name}\` | ${f.type} | ${f.required ? 'Yes' : 'No'} | ${f.description} |`,
      ),
      ``,
      `## Example`,
      ``,
      '```json',
      g.exampleJson.trim(),
      '```',
      ...(g.tips.length > 0 ? [``, `## Tips`, ``, ...g.tips.map((tip) => `- ${tip}`)] : []),
      ...(g.relatedWidgets && g.relatedWidgets.length > 0
        ? [
            ``,
            `## See also`,
            ``,
            ...g.relatedWidgets.map((r) =>
              r.domain === domain
                ? `- [${r.name}](${r.slug}.md)`
                : `- [${r.name}](../${r.domain}/${r.slug}.md)`,
            ),
          ]
        : []),
    ].join('\n') + '\n'
  );
}
````

(The body is a verbatim copy of `renderPage`'s body from `packages/widgets/scripts/generate-widget-docs.ts:57-107`, minus the frontmatter.)

### Step 4.2 — Export from widgets index

File: `packages/widgets/src/index.ts` — add:

```ts
export { renderWidgetGuideMarkdown } from './guide-markdown.js';
```

### Step 4.3 — Update the docs generator to reuse it

File: `packages/widgets/scripts/generate-widget-docs.ts`

- Import `renderWidgetGuideMarkdown` from `../src/guide-markdown.ts`.
- Replace the `renderPage(id, name, domain, status, g)` call (line 36) with:

```ts
const body = renderWidgetGuideMarkdown(entry);
const md = `---\nsidebar_position: ${g.sidebarPosition}\n---\n\n` + body;
```

- Delete the now-unused local `renderPage` function (lines 50-108).
- **After this change, verify docs output is byte-identical:** run `pnpm --filter @open-edu/widgets generate:widget-docs` and confirm `git diff` on `apps/docs/docs/widget-library/` is empty (only whitespace/`--` marker changes acceptable).

### Step 4.4 — Attach guideMarkdown to CuratedWidget

File: `apps/dev-server/src/studio/widgets/curatedCatalog.ts`

- Add `guideMarkdown?: string;` to the `CuratedWidget` interface.
- Import `renderWidgetGuideMarkdown` from `@open-edu/widgets`.
- In `loadRegistryWidgets()`, where `guide: GUIDE_BY_ID[v2.id]` is set, also set:

```ts
guideMarkdown: guide
  ? renderWidgetGuideMarkdown({
      id: v2.id,
      name: v2.name ?? v2.id,
      domain: v2.domain,
      status: v2.status,
      guide,
    })
  : undefined,
```

(Keep the existing `guide` assignment; add the new line to the same object literal.)

### Step 4.5 — New WidgetGuidePanel component

Create `apps/dev-server/src/studio/components/WidgetGuidePanel.tsx`:

```tsx
import { MarkdownRenderer } from '@open-edu/runtime';
import { useTranslation } from '@open-edu/i18n';

export function WidgetGuidePanel({ markdown }: { markdown: string }) {
  const { t } = useTranslation();
  return (
    <details className="border-outline-variant bg-surface rounded-lg border">
      <summary className="text-on-surface cursor-pointer select-none px-4 py-3 text-sm font-medium">
        {t('studio.widget.guideTitle')}
      </summary>
      <div className="border-outline-variant border-t px-4 py-4">
        <MarkdownRenderer content={markdown} className="text-on-surface-variant text-sm" />
      </div>
    </details>
  );
}
```

### Step 4.6 — Render the guide in PracticeActivityEditor

File: `apps/dev-server/src/studio/components/PracticeActivityEditor.tsx`

- Import `WidgetGuidePanel` from `./WidgetGuidePanel.js`.
- In the main editor layout (after the config `Card`, before or after the preview `Card`), render:

```tsx
{
  curated?.guideMarkdown ? <WidgetGuidePanel markdown={curated.guideMarkdown} /> : null;
}
```

### Step 4.7 — i18n

File: `packages/i18n/locales/en/studio.json` — add:

```json
"widget.guideTitle": "How this practice works"
```

### Step 4.8 — Tests

- New `packages/widgets/src/guide-markdown.test.ts`:
  - `renderWidgetGuideMarkdown` returns a string containing the widget name, `## Configuration fields`, and a code fence.
  - Returns `''` when `entry.guide` is undefined.
- `apps/dev-server/src/studio/widgets/curatedCatalog.test.ts`: add an assertion that `getCuratedWidget('core.multiple-choice')?.guideMarkdown` is a non-empty string containing `Multiple Choice`.
- `apps/dev-server/src/studio/components/PracticeActivityEditor.test.tsx`: the `mockCatalog` (lines 14-50) must add `guideMarkdown: '# Multiple Choice'` to the multiple-choice fixture; add a test that the guide summary text (`How this practice works`) renders for a widget with `guideMarkdown` and does not render for one without.

### Step 4.9 — Verify

```bash
pnpm --filter @open-edu/widgets test -- src/guide-markdown.test.ts
pnpm --filter @open-edu/dev-server test -- src/studio/components/PracticeActivityEditor.test.tsx src/studio/widgets/curatedCatalog.test.ts
pnpm --filter @open-edu/widgets generate:widget-docs && git diff --stat apps/docs/docs/widget-library
```

Commit: `feat(dev-server): show widget guide markdown in practice editor`

---

## Work Item 5 — Expand "Add practice" widget picker

**Goal:** The picker lists all non-deprecated catalog widgets that have a guide (≈27), not the current 3.

### Step 5.1 — Derive the curated list from the registry

File: `apps/dev-server/src/studio/widgets/curatedCatalog.ts`

- Remove the `CURATED_WIDGET_IDS` allowlist constant (lines 14-19) and its use in `listCuratedWidgets`.
- Change `listCuratedWidgets` to:

```ts
export function listCuratedWidgets(): CuratedWidget[] {
  return [...getRegistryMap().values()].filter(
    (widget) => widget.status !== 'deprecated' && widget.deprecated !== true && widget.guide,
  );
}
```

- `getCuratedWidget` stays as-is (already filters deprecated).
- Keep the rest of the file unchanged (`GUIDE_BY_ID`, `loadRegistryWidgets`, `getRegistryMap`).

### Step 5.2 — Update the curatedCatalog test

File: `apps/dev-server/src/studio/widgets/curatedCatalog.test.ts`

- Remove the imports/assertions that reference `CURATED_WIDGET_IDS` (lines 2, 17-20).
- Update assertions:
  - `listCuratedWidgets().length` is greater than or equal to `20`.
  - Every returned widget has `id`, `name`, `!deprecated`, and a `guide`.
  - `open-edu.multiple-choice-practice` is NOT in the list (deprecated).
  - Keep the existing `core.multiple-choice` and unknown-id assertions.

### Step 5.3 — Optional polish: group picker by domain

File: `apps/dev-server/src/studio/components/WidgetPicker.tsx`

- This is optional. If done, group `widgets` by `domain` in the dialog list with a small heading per group (e.g., `text-xs font-semibold text-on-surface-variant`). The existing search already filters; grouping only changes layout. Do not change the `onSelect` contract (used by `OutlineView.test` and `WidgetPicker.test`, both of which mock `curatedCatalog`).

### Step 5.4 — Verify

```bash
pnpm --filter @open-edu/dev-server test -- src/studio/widgets/curatedCatalog.test.ts src/studio/components/WidgetPicker.test.tsx src/studio/components/OutlineView.test.tsx
```

Commit: `feat(dev-server): expose all curated widgets in the practice picker`

---

## Work Item 6 — JSON value validation in edit forms

**Goal:** Invalid JSON in a config field is surfaced inline (never silently swallowed), widget schema errors appear at field level, and Save is disabled with a visible reason.

### Step 6.1 — Validate JSON in SchemaForm's JsonTextarea

File: `apps/dev-server/src/editor/SchemaForm.tsx`

- In `JsonTextarea` (lines 187-212), add local error state and validate on change + blur:

```tsx
function JsonTextarea({ value, onChange }: { value: object; onChange: (parsed: object) => void }) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(JSON.stringify(value, null, 2));
    setError(null);
  }, [value]);

  const validate = (raw: string): void => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    try {
      onChange(JSON.parse(trimmed) as object);
      setError(null);
    } catch {
      setError('Invalid JSON');
    }
  };

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          validate(e.target.value);
        }}
        onBlur={(e) => validate(e.target.value)}
        aria-invalid={error ? 'true' : undefined}
        className={`border-outline-variant focus:border-primary focus:ring-primary w-full rounded border px-2.5 py-1.5 font-mono text-sm focus:outline-none focus:ring-1 ${error ? 'border-error' : ''}`}
        rows={10}
      />
      {error ? (
        <p className="text-error mt-1 text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
```

Notes:

- The `validate` on `onChange` only calls `onChange` (parent) when the JSON parses — this keeps the parent config consistent while still showing an error for malformed text.
- If a test environment chokes on validating mid-typing, it's acceptable to only validate on blur (keep the `onChange` branch but omit `validate(e.target.value)` there). Prefer the change-time validation; revert to blur-only only if tests are flaky.

### Step 6.2 — Wire field-level widget errors in PracticeActivityEditor

File: `apps/dev-server/src/studio/components/PracticeActivityEditor.tsx`

- Add a memo that groups `validationErrors` by top-level key (the `topLevelKey` helper already exists at lines 29-31):

```tsx
const fieldErrors = useMemo(() => {
  const map: Record<string, ValidationError[]> = {};
  for (const err of validationErrors) {
    const key = topLevelKey(err.path);
    if (!key) continue;
    (map[key] ??= []).push(err);
  }
  return map;
}, [validationErrors]);
```

- Pass it to `<SchemaForm ... fieldErrors={fieldErrors} />` (the prop already exists; `FieldWrapper` renders `fieldErr?.[0]` with `aria-invalid`/`aria-describedby`).
- When `!nodeJsonValid`, add a visible reason next to the disabled Save button:

```tsx
{
  !nodeJsonValid ? (
    <span className="text-error text-sm">{t('studio.widget.validationFix')}</span>
  ) : null;
}
```

### Step 6.3 — i18n

File: `packages/i18n/locales/en/studio.json` — add:

```json
"editor.jsonInvalid": "Invalid JSON"
```

Then in `SchemaForm.tsx` use `t('studio.editor.jsonInvalid')` for the error message **instead of the literal `'Invalid JSON'`**. `SchemaForm` is inside `I18nProvider`, so `useTranslation` is available (import from `@open-edu/i18n`). If adding `useTranslation` to `SchemaForm` conflicts with its current pure-ness, pass the label via a new optional prop `jsonErrorText?: string` and supply it from `PracticeActivityEditor` as `t('studio.editor.jsonInvalid')` — choose whichever keeps `SchemaForm`'s imports clean and satisfies the hardcoded-strings lint.

### Step 6.4 — Tests

- `apps/dev-server/src/editor/__tests__/widget-preview.test.tsx` (or a new `apps/dev-server/src/editor/__tests__/schema-form.test.tsx`): render `SchemaForm` with `data={{ nested: { a: 1 } }}`, type invalid JSON (`{`) into the JSON textarea, assert an `Invalid JSON`/error message appears and `onChange` was NOT called with invalid data; type valid JSON (`{"a":2}`) and blur, assert `onChange` called with the parsed object and the error clears.
- `apps/dev-server/src/studio/components/PracticeActivityEditor.test.tsx`: add a test that when the widget config has a schema violation (e.g., config `{}` for multiple-choice), the field-level error appears and `Fix the highlighted settings before saving` renders next to Save (existing "seeds default settings" test already covers the banner; add a new assertion that a field-level error text from `validateWidgetConfigForType` renders in the form).

### Step 6.5 — Verify

```bash
pnpm --filter @open-edu/dev-server test -- src/editor/__tests__/widget-preview.test.tsx src/studio/components/PracticeActivityEditor.test.tsx
```

Commit: `feat(dev-server): add json validation to schema forms`

---

## Final verification (after Work Item 6)

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/widgets test
```

- Fix any lint/typecheck/format failures (run `npx prettier --write <files>` for formatting; do not disable lint rules).
- If `pnpm lint` flags a hardcoded user-facing string you introduced, route it through `t()` with a key in `studio.json`.
- Do NOT regenerate `apps/dev-server/src/tailwind.css` unless you changed Tailwind classes inside `packages/runtime/src` (you should not have).

Then run the manual smoke pass (optional but recommended if a browser is available):
`pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js dev ./examples/hello-world`
Check: Add practice → picker shows many widgets; edit a practice → guide visible, Cancel returns to outline, Reset preview clears widget state, invalid JSON shows an error; Outline → delete an activity with confirmation.

## Stop conditions (ask the user, do not guess)

- A referenced file/path does not exist or the expected code differs substantially from the sketch (file may have moved between sessions).
- A verification command fails repeatedly (2+ attempts) for a reason you cannot attribute to a mistake in your own edit.
- A repository rule (AGENTS.md) conflicts with an instruction in this plan — surface the conflict rather than silently choosing.
