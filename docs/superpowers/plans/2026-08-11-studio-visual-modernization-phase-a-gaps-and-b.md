# Studio Visual Modernization — Phase A Gaps & Phase B

**Date:** 2026-08-11
**Scope:** `apps/dev-server` — Phase A residual gaps + Phase B authoring craft (Outline spine, editor coaching, PageHeader consistency)
**Parent spec:** [`2026-08-10-studio-visual-modernization-design.md`](../specs/2026-08-10-studio-visual-modernization-design.md)
**Parent plan:** [`2026-08-10-studio-visual-modernization.md`](./2026-08-10-studio-visual-modernization.md)
**Phase A plan:** [`2026-08-11-studio-visual-modernization-agent.md`](./2026-08-11-studio-visual-modernization-agent.md) (merged via PR #569)

> **For the implementing agent (deepseek-4-flash):** Follow this document literally. Do NOT invent new components, new i18n keys, or new tokens beyond what is written. Copy code snippets verbatim. After every task, run the verification commands at the end of the task. When a task is done, mark its checkbox `[x]`. Never skip tests.

---

## 0. Constraints (mandatory)

1. **Tokens only** — use Tailwind token classes (`bg-surface`, `text-on-surface-variant`, `border-outline-variant`, `bg-primary/10`, etc.). NEVER use `#hex`, `rgb()`, `style={{}}`, or non-token palette classes.
2. **i18n only** — every user-facing string goes through `t('studio.*')`. All keys live in `packages/i18n/locales/en/studio.json`. Never hardcode English in `.tsx`.
3. **Design-system primitives only** — import from `@open-edu/design-system`. Available in this scope: `Button`, `Badge`, `DropdownMenu` (+Trigger/Content/Item/Separator), `Accordion` (+Item/Trigger/Content), `PageHeader`, `Spinner`, `Skeleton`, `EmptyState`, `Switch`, `cn`. Do not add new imports that are not listed here.
4. **No new dependencies.** No drag-and-drop lib, no motion lib, no icons beyond `lucide-react` (already used).
5. **Do NOT touch:** package format, StudioAPI contract (`studioApi.ts`), `packages/runtime`, `apps/learner`, `EditorShell.tsx`, `DevApp.tsx`, `InspectorPanel`, `ModeToggle.tsx` (except the one mobile-menu change in Task 1), `CreatorPreview.tsx`.
6. **Tests mandatory.** Co-located Vitest for every new component; update existing tests that break. Run the full dev-server suite before finishing.
7. **Reduced motion** — any new animation must be gated by the existing `@media (prefers-reduced-motion: reduce)` block in `apps/dev-server/src/index.css`.
8. **Conventional commits** — e.g. `feat(dev-server): outline spine — row menu + unified add`.

---

## 1. Workspace setup

- Branch from the Phase A branch (Phase A PR #569 is still open):
  ```bash
  git checkout feat/studio-visual-modernization-phase-a
  git pull
  git checkout -b feat/studio-visual-modernization-phase-b
  ```
  (If Phase A already merged to `main`, branch from `main` instead.)
- Install/build workspace packages so runtime imports resolve:
  ```bash
  pnpm install
  pnpm build
  ```

---

## 2. Phase A gaps

Only one real gap remains from Phase A. Do this first, alone, as its own commit.

### Task 1 — Add Mode toggle to the mobile overflow menu

**Why:** Design spec §8.1 mobile says the overflow menu must contain Library, Outline, Preview, **and Mode**. Today the mobile dropdown has only the three nav items; the Mode `Switch` is always visible in the header and crowds narrow widths.

**File:** `apps/dev-server/src/studio/components/StudioChrome.tsx`

Step 1. Wrap the header ModeToggle so it is hidden on mobile (line 184):

```tsx
<div className="hidden md:flex">
  <ModeToggle mode={mode} onChange={onModeChange} />
</div>
```

Step 2. Inside the `DropdownMenuContent` (currently lines 167–177), after the `{navItems.map(...)}` block, add a Mode row that is only visible on mobile:

```tsx
<DropdownMenuSeparator />
<div className="px-2 py-2 md:hidden">
  <ModeToggle mode={mode} onChange={onModeChange} />
</div>
```

Add `DropdownMenuSeparator` to the existing design-system import list in this file.

> ⚠️ **jsdom caveat (important):** jsdom ignores CSS media queries, so in Vitest BOTH the header `ModeToggle` AND the dropdown `ModeToggle` exist in the DOM → `screen.getByRole('switch')` will match 2 elements. Update the existing `StudioChrome.test.tsx` and `studio-a11y.test.tsx` so any `switch` queries are scoped with `within()` to the header or the menu (see Step 3).

Step 3. Update `apps/dev-server/src/studio/components/StudioChrome.test.tsx`:

- Change every `screen.getByRole('switch')` (or `getAllByRole`) to:
  ```tsx
  const header = screen.getByRole('banner'); // the <header> element
  within(header).getByRole('switch');
  ```
- Add a new test:
  ```tsx
  it('offers the mode toggle inside the mobile overflow menu', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    renderChrome({ mode: 'creator', onModeChange });
    await user.click(screen.getByRole('button', { name: /more/i }));
    const menu = await screen.findByRole('menu');
    const toggle = within(menu).getByRole('switch');
    await user.click(toggle);
    expect(onModeChange).toHaveBeenCalledWith('developer');
  });
  ```
- Update `studio-a11y.test.tsx` StudioChrome test if it queries `switch` at top level (scope it to the banner the same way).

Step 4. Verify: `pnpm --filter @open-edu/dev-server test`. Commit:

```bash
git add -A && git commit -m "feat(dev-server): move mode toggle into mobile overflow menu"
```

> Note: the header is already pinned (it lives outside the scrollable `<main>` in a `flex h-screen flex-col` wrapper — see `StudioApp.tsx:254-263`), so the design spec's "sticky header" needs no change. Do not add `sticky`.

---

## 3. PR B1 — Outline spine

**Goal:** Outline rows stop looking like a tool strip (three Add buttons, four per-row icon buttons) and read as a course spine: one Add menu, one overflow menu per row, accordion Advanced panels.

**Outcome after this PR:** Outline header = title + single `Add ▾` menu; each row = index number, title, kind badge, overflow `⋮` menu (Edit / Move up / Move down / Delete); Advanced panels are Radix Accordions.

### Task 2 — `AddActivityMenu` component

**New file:** `apps/dev-server/src/studio/components/AddActivityMenu.tsx`

Copy verbatim:

```tsx
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@open-edu/design-system';
import { Plus } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';

export function AddActivityMenu({
  onAddLesson,
  onAddQuiz,
  onAddPractice,
  onAddAi,
}: {
  onAddLesson: () => void;
  onAddQuiz: () => void;
  onAddPractice: () => void;
  onAddAi: () => void;
}) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" size="sm" aria-label={t('studio.outline.addMenuLabel')}>
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          {t('studio.outline.add')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onAddLesson}>{t('studio.outline.addLesson')}</DropdownMenuItem>
        <DropdownMenuItem onSelect={onAddQuiz}>{t('studio.outline.addQuiz')}</DropdownMenuItem>
        <DropdownMenuItem onSelect={onAddPractice}>
          {t('studio.outline.addPractice')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onAddAi}>{t('studio.ai.item.addTitle')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**New test file:** `apps/dev-server/src/studio/components/AddActivityMenu.test.tsx`

Reuse the `wrap()` + `I18nProvider` + `studioEn` pattern from `HomeTemplateGallery.test.tsx`. Tests:

1. renders the trigger labelled "Add activity" and shows no menu by default.
2. clicking the trigger opens the menu (use `await user.click(trigger)` then `await screen.findByRole('menu')`).
3. clicking "Add lesson" calls `onAddLesson` once; same pattern for "Add quiz", "Add practice", and the AI item (label from `studio.ai.item.addTitle`, value "Add with AI" — assert by `/add/i` within the menu or by the exact key string).
4. closes the menu after selecting an item (after clicking an item, `queryByRole('menu')` is null).

> i18n keys `studio.outline.add`, `studio.outline.addMenuLabel`, `studio.outline.addLesson`, `studio.outline.addQuiz`, `studio.outline.addPractice`, `studio.ai.item.addTitle` ALL ALREADY EXIST. Do not add them.

### Task 3 — `OutlineActivityRow` component

**New file:** `apps/dev-server/src/studio/components/OutlineActivityRow.tsx`

Copy verbatim:

```tsx
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@open-edu/design-system';
import { ArrowDown, ArrowUp, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import type { ActivitySummary } from '../types.js';

function kindLabelKey(kind: ActivitySummary['kind']): string {
  switch (kind) {
    case 'lesson':
      return 'studio.outline.kind.lesson';
    case 'quiz':
      return 'studio.outline.kind.quiz';
    case 'practice':
      return 'studio.outline.kind.practice';
    default:
      return 'studio.outline.kind.other';
  }
}

export function OutlineActivityRow({
  activity,
  index,
  total,
  saving,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  activity: ActivitySummary;
  index: number;
  total: number;
  saving: boolean;
  onEdit: (path: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <li className="hover:bg-surface-container-low group flex flex-wrap items-center gap-3 px-4 py-3 transition-colors">
      <span className="text-on-surface-variant w-6 shrink-0 text-right text-sm" aria-hidden="true">
        {index + 1}.
      </span>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onEdit(activity.path)}
          className="text-on-surface hover:text-primary truncate text-left text-sm font-medium"
        >
          {activity.title}
        </button>
        <Badge variant="outline" className="text-on-surface-variant mt-1">
          {t(kindLabelKey(activity.kind))}
        </Badge>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label={t('studio.outline.rowMenu', { title: activity.title })}
            disabled={saving}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onEdit(activity.path)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('studio.nav.editActivity')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onMoveUp} disabled={index === 0}>
            <ArrowUp className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('studio.outline.moveUp', { title: activity.title })}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onMoveDown} disabled={index === total - 1}>
            <ArrowDown className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('studio.outline.moveDown', { title: activity.title })}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onDelete} className="focus:text-error text-error">
            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('studio.outline.delete', { title: activity.title })}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
```

> Note: the title is a real `<button>` so the row's "open editor" action is keyboard-accessible without nested-interactive markup. Do NOT wrap the whole row in a `<button>`.

**New test file:** `apps/dev-server/src/studio/components/OutlineActivityRow.test.tsx`

Use the `wrap()` pattern. Fixture: `{ id: 'nodes/a.md', path: 'nodes/a.md', title: 'Intro', kind: 'lesson' }`, `total = 2`, `index = 0`, `saving = false`.
Tests:

1. renders the title, the kind badge "Lesson", and a menu trigger with `aria-label` containing "Intro" (`studio.outline.rowMenu` value is "Activity actions for Intro").
2. clicking the title button calls `onEdit('nodes/a.md')`.
3. opens the menu (`findByRole('menu')`) and clicking "Edit" calls `onEdit('nodes/a.md')`.
4. Move up is disabled when `index === 0`; render a second case with `index = 1` where Move down is disabled when `index === total - 1`.
5. clicking "Delete" calls `onDelete` once.

### Task 4 — Rewire `OutlineView` to the new components

**File:** `apps/dev-server/src/studio/components/OutlineView.tsx`

1. Replace the three Add buttons + AI button block (lines 210–227) with:
   ```tsx
   <AddActivityMenu
     onAddLesson={() => void addActivity('lesson')}
     onAddQuiz={() => void addActivity('quiz')}
     onAddPractice={() => setPickerOpen(true)}
     onAddAi={() => setAiDialogOpen(true)}
   />
   ```
2. Replace the `<li>…</li>` body inside the `<ul>` (lines 238–279) with:
   ```tsx
   <OutlineActivityRow
     key={activity.id}
     activity={activity}
     index={index}
     total={activities.length}
     saving={saving}
     onEdit={onEdit}
     onMoveUp={() => move(index, -1)}
     onMoveDown={() => move(index, 1)}
     onDelete={() => setDeleteTarget(activity)}
   />
   ```
3. Delete the now-unused imports: `Plus`, `Pencil`, `ArrowUp`, `ArrowDown`, `Trash2`, and the local `kindLabelKey` function (it moved into `OutlineActivityRow`). Keep `Sparkles`? No — the AI button is gone too; the AI entry is inside the Add menu. Remove `Sparkles` and the `Badge` import if no longer used (verify with typecheck/lint). Keep `Button` (still used by delete dialog + add menu trigger? no — add menu is its own component; Button still used in the delete `DialogFooter` and possibly `Skeleton` area — verify and trim only what is definitely unused).
4. Add imports: `import { AddActivityMenu } from './AddActivityMenu.js';` and `import { OutlineActivityRow } from './OutlineActivityRow.js';`.

Do NOT change `move`, `persistOrder`, `addActivity`, `addPractice`, `addAiDraft`, `removeActivity`, the `WidgetPicker`, `AiAddDialog`, or the delete `Dialog`. They stay exactly as-is.

### Task 5 — Replace `<details>` with Accordion for Advanced panels

**File:** `apps/dev-server/src/studio/components/OutlineView.tsx`

Replace the `<div className="space-y-4">…<details>…</details>…</div>` block (lines 325–342) with:

```tsx
<div className="border-outline-variant rounded-lg border px-4">
  <Accordion type="single" collapsible>
    <AccordionItem value="flow">
      <AccordionTrigger>{t('studio.flow.title')}</AccordionTrigger>
      <AccordionContent>
        <FlowAdvancedPanel api={api} onError={onError} />
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="rewards">
      <AccordionTrigger>{t('studio.rewards.title')}</AccordionTrigger>
      <AccordionContent>
        <RewardsCardsPanel api={api} onError={onError} />
      </AccordionContent>
    </AccordionItem>
  </Accordion>
</div>
```

Add to the design-system import list: `Accordion, AccordionItem, AccordionTrigger, AccordionContent`.

> The `FlowAdvancedPanel` and `RewardsCardsPanel` themselves must NOT change. Remove the now-unused inner `<summary>`/border styling; the surrounding `px-4` container preserves the card look.

### Task 6 — Update `OutlineView.test.tsx`

The existing tests interact with the old buttons. Update selectors:

1. **Add flows** — the tests that click "Add lesson" / "Add quiz" / "Add practice" / AI button must now: click the `Add` trigger (`/add activity/i` aria-label), then click the menu item. Because Radix menus need a real event loop, use `userEvent`. Example:
   ```tsx
   await user.click(screen.getByRole('button', { name: /add activity/i }));
   await user.click(await screen.findByRole('menuitem', { name: /add lesson/i }));
   ```
   If a test used `fireEvent.click` on the old buttons, switch that test to `userEvent`.
2. **Move/delete flows** — replace `getByRole('button', { name: /move up/i })`-style queries with: open the row menu (`button` with aria-label matching the row title, value `Activity actions for Intro`), then click the `menuitem` "Move Intro up". Assert `saveOutlineOrder` was called with the reordered paths, exactly as the old test did.
3. **Delete confirm** — click the row menu → "Delete Intro" → assert the confirm dialog appears → click Confirm → assert `deleteFile` called. Keep existing assertions.
4. **Flow/Rewards panels** — if a test toggled the native `<details>` (e.g., `user.click(screen.getByText('Learning path'))`), it still works because `AccordionTrigger` renders the same text and is a real button. Verify the panel content becomes visible after clicking the trigger; if a test asserted the `<details>` element via `closest('details')`, replace with asserting the accordion content text becomes visible.
5. Add a new test: **only one Add control** — assert there is exactly one button with name matching `/add activity/i` and that no standalone "Add lesson" button exists outside a menu.

### Task 7 — Extend the a11y suite for Outline

**File:** `apps/dev-server/src/studio/components/studio-a11y.test.tsx`

Add (copy the HomeView audit shape from this file):

```tsx
it('OutlineView is accessible with a lesson row and advanced panels', async () => {
  const { container } = render(
    wrap(<OutlineView api={makeApi()} onEdit={() => {}} onError={() => {}} />),
  );
  await screen.findByText('Lesson');
  const violations = await runAxe(container);
  expect(violations).toEqual([]);
});
```

Import `OutlineView`. The `makeApi()` in this file already returns `getOutline` with a lesson + quiz. Note: the accordions start closed, so `runAxe` scans the visible tree — fine.

### Task 8 — B1 verification & commit

```bash
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/dev-server exec tsc --noEmit -p tsconfig.json
pnpm exec prettier --check "apps/dev-server/src/studio/**/*.{ts,tsx}"
```

Fix any failures, then:

```bash
git add -A && git commit -m "feat(dev-server): outline spine — row overflow menu, unified add, accordion advanced panels"
```

**B1 exit criteria:** Outline header shows ONE `Add` control; rows have only the `⋮` menu (no icon strip); Advanced panels are Accordions (no `<details>` in `OutlineView.tsx`); dev-server tests + typecheck green; `studio-a11y` includes an OutlineView audit.

---

## 4. PR B2 — Editor coaching + PageHeader consistency

**Goal:** Lesson/Quiz editors get a coaching rail and a compact editor header (Back + `text-h1`); Library/Share/AI review/Unit builder get `PageHeader`.

### Task 9 — `EditorCoachingPanel` component

**New file:** `apps/dev-server/src/studio/components/EditorCoachingPanel.tsx`

Copy verbatim:

```tsx
import { CheckCircle2, Circle } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';

export interface CoachingCheck {
  id: string;
  passed: boolean;
  label: string;
}

export function EditorCoachingPanel({ checks, tips }: { checks: CoachingCheck[]; tips: string[] }) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="editor-coaching-heading" className="w-full lg:w-80 lg:shrink-0">
      <h2 id="editor-coaching-heading" className="text-h3 text-on-surface mb-3">
        {t('studio.editor.coaching.title')}
      </h2>
      <ul className="space-y-2">
        {checks.map((check) => (
          <li key={check.id} className="text-on-surface-variant flex items-start gap-2 text-sm">
            {check.passed ? (
              <CheckCircle2 className="text-success mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <Circle
                className="text-on-surface-variant mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
            )}
            <span>{check.label}</span>
          </li>
        ))}
      </ul>
      {tips.length > 0 ? (
        <>
          <h3 className="text-on-surface-variant text-label-caps text-primary mb-2 mt-6">
            {t('studio.editor.coaching.tipsTitle')}
          </h3>
          <ul className="space-y-2">
            {tips.map((tip) => (
              <li key={tip} className="text-on-surface-variant text-sm">
                {tip}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
```

**New test file:** `apps/dev-server/src/studio/components/EditorCoachingPanel.test.tsx`
Tests (using `wrap()`):

1. renders each check label; passed checks render `CheckCircle2` (query by `getByTitle` is not set — instead assert the label is present and that the passed item's icon has class `text-success` via `container.querySelector('svg.text-success')`).
2. renders tips when provided; renders no tips heading when `tips` is empty.
3. no `role="switch"` / no buttons — purely informational; assert `queryByRole('button')` is null.

### Task 10 — Lesson editor coaching layout

**File:** `apps/dev-server/src/studio/components/LessonActivityEditor.tsx`

1. Add imports: `ArrowLeft` from `lucide-react`, `EditorCoachingPanel` from `./EditorCoachingPanel.js`.
2. **Compact header** — at the top of the returned JSX, before the existing `<div className="mx-auto flex max-w-6xl ...">`, add:
   ```tsx
   <div className="border-outline-variant bg-surface flex items-center gap-2 border-b px-4 py-2">
     {onCancel ? (
       <Button variant="ghost" size="sm" onClick={onCancel} aria-label={t('studio.editor.back')}>
         <ArrowLeft className="h-4 w-4" aria-hidden="true" />
       </Button>
     ) : null}
     <h1 className="text-h1 text-on-surface">{t('studio.editor.heading.lesson')}</h1>
   </div>
   ```
   Wrap the whole thing: the outer container becomes `<div className="flex min-h-0 flex-1 flex-col">` containing the header + the existing `<div className="mx-auto flex max-w-6xl flex-col gap-6 p-6 lg:flex-row">`.
3. **Remove monospace** — change the body `Textarea` class from `mt-2 min-h-[320px] font-mono` to `mt-2 min-h-[320px]`.
4. **Right rail = coaching + AI.** Replace the current right side (the `<AiEditPanel … />` element) with:
   ```tsx
   <div className="flex w-full flex-col gap-6 lg:w-80 lg:shrink-0">
     <EditorCoachingPanel
       checks={[
         {
           id: 'heading',
           passed: hasHeading,
           label: hasHeading
             ? t('studio.editor.coaching.lesson.headingPresent')
             : t('studio.editor.coaching.lesson.headingMissing'),
         },
       ]}
       tips={[
         t('studio.editor.coaching.lesson.addHeading'),
         t('studio.editor.coaching.lesson.oneIdea'),
       ]}
     />
     <AiEditPanel
       api={api}
       kind="lesson"
       getCurrentContent={() => body}
       onApply={applyDraft}
       onApplyBatch={(items) => onApplyBatch?.(items)}
       onError={onError}
     />
   </div>
   ```
   Remove the old in-canvas "Add a heading"/body-hint `<p>` block (lines 105–109) — the coaching panel now owns that messaging. Keep `studio.editor.lesson.bodyHint` in the i18n file (unused keys are acceptable; do not delete keys).
5. **Remove the footer Cancel button** (lines 111–115) — the header Back arrow replaces it. Keep the Save button + saved span; add `role="status"` + `aria-live="polite"` to the saved `<span>`:
   ```tsx
   {
     saved ? (
       <span role="status" aria-live="polite" className="text-on-surface-variant text-sm">
         {t('studio.editor.saved')}
       </span>
     ) : null;
   }
   ```
6. **Update `LessonActivityEditor.test.tsx`:** replace `screen.getByRole('button', { name: /cancel/i })` with `getByRole('button', { name: /back/i })` in the cancel test (line ~151). Add a test asserting the coaching panel shows the "Needs a heading" label when the body has no markdown heading, and "Has a clear heading" after typing a line starting with `# ` into the content textarea. If any test asserts `font-mono`, remove that assertion.

### Task 11 — Quiz editor coaching layout

**File:** `apps/dev-server/src/studio/components/QuizActivityEditor.tsx`

1. Add imports: `ArrowLeft`, `EditorCoachingPanel`.
2. Same compact header as Task 10, with `t('studio.editor.heading.quiz')`.
3. Right rail (replace the `<AiEditPanel … />` element) — note `hasCorrect = correctIndex !== null` and `minOptions = options.length >= 2`:
   ```tsx
   <div className="flex w-full flex-col gap-6 lg:w-80 lg:shrink-0">
     <EditorCoachingPanel
       checks={[
         {
           id: 'correct',
           passed: hasCorrect,
           label: hasCorrect
             ? t('studio.editor.coaching.quiz.hasCorrect')
             : t('studio.editor.coaching.quiz.noCorrect'),
         },
         {
           id: 'options',
           passed: minOptions,
           label: minOptions
             ? t('studio.editor.coaching.quiz.minOptions')
             : t('studio.editor.coaching.quiz.minOptionsMissing'),
         },
       ]}
       tips={[t('studio.editor.coaching.quiz.questionTip')]}
     />
     <AiEditPanel
       api={api}
       kind="quiz"
       getCurrentContent={() => serializeQuiz(question, options, correctIndex)}
       onApply={applyDraft}
       onApplyBatch={(items) => onApplyBatch?.(items)}
       onError={onError}
     />
   </div>
   ```
4. **Fix the bare `…` loader** (line 125): replace `<p className="p-6 text-sm">…</p>` with:
   ```tsx
   if (loading) {
     return (
       <div className="p-6" aria-busy>
         <p className="text-on-surface-variant text-sm">{t('studio.editor.quiz.loading')}</p>
       </div>
     );
   }
   ```
5. Remove the footer Cancel button; keep Save + Add option + the `noCorrectSelected` error message. Add `role="status"` `aria-live="polite"` to the saved span.
6. **Update `QuizActivityEditor.test.tsx`:** replace Cancel queries with Back; add coaching assertions: initially `hasCorrect` is true (correctIndex=0) and `minOptions` true → coaching shows "A correct answer is selected" and "At least two answers"; after deleting the second option (use whatever the existing test does to remove an option — if there is no remove-option flow, instead assert that the "At least two answers" label disappears when a test edits options down to 1; if that is not reachable through existing UI, skip the negative case and only assert the positive labels). Assert the loader test (if any) still works with the new text.

### Task 12 — ActivityEditorRouter loader

**File:** `apps/dev-server/src/studio/components/ActivityEditorRouter.tsx`

Replace line 44 `<p className="p-6 text-sm">…</p>` with:

```tsx
if (kind === null) {
  return (
    <div className="p-6" aria-busy>
      <p className="text-on-surface-variant text-sm">{t('studio.editor.loading')}</p>
    </div>
  );
}
```

Update `ActivityEditorRouter.test.tsx` if it asserted the old `…` text.

### Task 13 — Practice editor header alignment

**File:** `apps/dev-server/src/studio/components/PracticeActivityEditor.tsx`

1. Add the same compact header as Task 10, with `t('studio.editor.heading.practice')`, wrapping the existing content in the `flex min-h-0 flex-1 flex-col` container. Find where the existing main layout starts (the `<div …>` containing the `SchemaForm` / `WidgetPreviewPanel` two columns) and place the header above it.
2. Remove the footer Cancel button if present; keep Save; add `role="status"` `aria-live="polite"` to its saved span.
3. **Update `PracticeActivityEditor.test.tsx`** for the Back button and the saved span role if asserted.

### Task 14 — i18n additions

**File:** `packages/i18n/locales/en/studio.json`

Add EXACTLY these keys (place them alphabetically near their siblings, matching the file's existing ordering style):

```json
"editor.back": "Back",
"editor.loading": "Loading activity",
"editor.quiz.loading": "Loading quiz",
"editor.coaching.quiz.minOptionsMissing": "Add at least one more answer",
```

Reuse (do NOT add): `editor.coaching.title`, `editor.coaching.tipsTitle`, `editor.coaching.lesson.addHeading`, `editor.coaching.lesson.oneIdea`, `editor.coaching.lesson.headingPresent`, `editor.coaching.lesson.headingMissing`, `editor.coaching.quiz.hasCorrect`, `editor.coaching.quiz.noCorrect`, `editor.coaching.quiz.minOptions`, `editor.coaching.quiz.questionTip`, `editor.heading.lesson`, `editor.heading.quiz`, `editor.heading.practice`, `editor.save`, `editor.saved`.

Validate: `pnpm --filter @open-edu/i18n exec vitest run src/i18n-keys.test.ts`.

### Task 15 — PageHeader consistency (B3)

`PageHeader` renders a hero block with `title` + `subtitle` (see `packages/design-system/src/patterns/PageHeader.tsx`). It renders its own `<h1>`. Do NOT stack a second `h1` under it.

**15a. LibraryView** (`apps/dev-server/src/studio/components/LibraryView.tsx`):

- The two header branches (loading branch around lines 170–178 and loaded branch around lines 208–214) each currently render `<h1 className="text-h1 text-on-surface">{t('studio.library.title')}</h1>` + a lede `<p>`. Replace each with:
  ```tsx
  <PageHeader title={t('studio.library.title')} subtitle={t('studio.library.lede')} />
  ```
- Import `PageHeader` from `@open-edu/design-system`; remove the now-unused `text-h1` h1 markup and its lede `<p>` (keep the workspace chip and the Import/New-unit buttons as they are). Existing tests querying `getByRole('heading', { name: /my courses/i })` still pass because `PageHeader` renders an `h1`. The `data-testid="page-header"` is fine.

**15b. ShareView** (`apps/dev-server/src/studio/components/ShareView.tsx:104`):

- Replace the `<h1 …>{t('studio.share.title')}</h1>` with:
  ```tsx
  <PageHeader title={t('studio.share.title')} subtitle={t('studio.share.lede')} />
  ```
- Remove the now-redundant lede if it was rendered separately. Keep the Ready-check status section below.

**15c. AiReviewView** (`apps/dev-server/src/studio/components/AiReviewView.tsx:33`):

- Replace the `<h1 …>{t('studio.ai.reviewTitle')}</h1>` with:
  ```tsx
  <PageHeader title={t('studio.ai.reviewTitle')} />
  ```

**15d. UnitBuilderView** (`apps/dev-server/src/studio/components/UnitBuilderView.tsx:77` and `:88`):

- Replace both `<h1 …>{t('studio.unit.title')}</h1>` occurrences with:
  ```tsx
  <PageHeader title={t('studio.unit.title')} />
  ```

After 15a–15d, run `rg -n '<h1' apps/dev-server/src/studio/components/` — there must be NO `<h1` remaining in `LibraryView.tsx`, `ShareView.tsx`, `AiReviewView.tsx`, `UnitBuilderView.tsx`. (OutlineView and HomeView keep their `text-h1` headers — they are intentionally not hero `PageHeader`s.)

Update any tests in those four views' test files that asserted the old `text-h1` markup structurally (most assert by accessible name, which still passes). Run the suite to find breakage.

### Task 16 — B2/B3 verification & commit

```bash
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/dev-server exec tsc --noEmit -p tsconfig.json
pnpm exec prettier --check "apps/dev-server/src/studio/**/*.{ts,tsx}"
pnpm --filter @open-edu/i18n exec vitest run src/i18n-keys.test.ts
```

Fix any failures, then:

```bash
git add -A && git commit -m "feat(dev-server): editor coaching rails, compact editor headers, and PageHeader consistency"
```

**B2/B3 exit criteria:** Lesson & Quiz show at least one coaching item that updates with form state; editors show Back + `text-h1`; no `<h1>` in Library/Share/AI-review/Unit-builder except inside `PageHeader`; no `…` loaders in editors/router; dev-server tests + typecheck + i18n-keys green.

---

## 5. Final integration pass

Run the WHOLE gate before pushing:

```bash
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/dev-server exec tsc --noEmit -p tsconfig.json
pnpm exec prettier --check "apps/dev-server/src/studio/**/*.{ts,tsx}"
pnpm exec prettier --check "packages/i18n/locales/en/studio.json"
pnpm --filter @open-edu/i18n exec vitest run src/i18n-keys.test.ts
pnpm lint:hardcoded-strings
```

Manual smoke (optional but recommended):

```bash
pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js dev ./examples/hello-world
```

Verify: on a narrow window the More menu shows Library/Outline/Preview + mode switch; Outline has one Add menu and per-row `⋮`; Advanced panels open as accordions; lesson/quiz editors show coaching and Back; My courses / Share / AI review / Unit builder show hero headers.

## 6. Out of scope / follow-ups (do NOT implement here)

- HTML5 drag-reorder on Outline (parent plan recommends keyboard-first; drag is a follow-up).
- Outline course health strip (`outline.healthCount`/`healthReady`/`healthNotReady` keys already exist but the strip is Phase C2).
- Motion budget beyond the existing `studio-view-enter` (template-select and reorder settles are Phase C1).
- Outline left meta rail (Phase C3).
- Lesson Markdown Write/Preview tabs (deferred per parent open question).
- `studio.mode` segmented control restyle (deferred).

## 7. PR checklist before submitting

- [ ] Two commits: Task 1 (Phase A gap) and the B1 commit, plus the B2/B3 commit (three total; each separately testable)
- [ ] `pnpm --filter @open-edu/dev-server test` green
- [ ] `tsc --noEmit` green
- [ ] Prettier green on changed files
- [ ] `i18n-keys.test.ts` green
- [ ] No new dependencies
- [ ] No `#hex`/`rgb()`/inline `style` added
- [ ] No hardcoded user-facing English in touched `.tsx` files
- [ ] `studio-a11y.test.tsx` extended with OutlineView audit (Task 7)
