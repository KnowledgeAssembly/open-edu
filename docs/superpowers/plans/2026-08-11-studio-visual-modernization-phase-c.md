# Studio Visual Modernization — Phase C (Atmosphere & Cohesion)

**Date:** 2026-08-11
**Scope:** `apps/dev-server` — motion budget (C1), course health strip + Share success (C2), Outline left rail (C3), Light/Dark/Zen QA (C4)
**Parent spec:** [`2026-08-10-studio-visual-modernization-design.md`](../specs/2026-08-10-studio-visual-modernization-design.md) (§7.5 Motion, §8.4 Outline, §8.8 Share, §13 Phase C)
**Parent plan:** [`2026-08-10-studio-visual-modernization.md`](./2026-08-10-studio-visual-modernization.md) (Phase C)
**Phase B plan:** [`2026-08-11-studio-visual-modernization-phase-a-gaps-and-b.md`](./2026-08-11-studio-visual-modernization-phase-a-gaps-and-b.md) — LANDED on branch `feat/studio-visual-modernization-phase-a` (commits `dac05ee`, `84bf492`, `ff29bb9`). This plan builds directly on that state.

> **For the implementing agent (deepseek-4-flash):** Follow this document literally. Do NOT invent new components, new i18n keys, or new tokens beyond what is written. Copy code snippets verbatim. After every task, run the verification commands at the end of the task. When a task is done, mark its checkbox `[x]`. Never skip tests.

---

## 0. Constraints (mandatory)

1. **Tokens only** — use Tailwind token classes (`bg-surface`, `text-on-surface-variant`, `border-outline-variant`, `bg-primary/10`, `shadow-raised`, etc.). NEVER use `#hex`, `rgb()`, `style={{}}`, or non-token palette classes.
2. **i18n only** — every user-facing string goes through `t('studio.*')`. **This phase adds ZERO new i18n keys.** Reuse only these existing keys: `outline.healthCount`, `outline.healthReady`, `outline.healthNotReady`, `nav.share`, `outline.dragHint`, `flow.title`, `rewards.title`, `share.exportSuccess`, `share.exportSuccessLede`, `outline.title`. Never hardcode English in `.tsx`.
3. **Design-system primitives only** — import from `@open-edu/design-system`. Available in this scope: `Button`, `Badge`, `Accordion` (+Item/Trigger/Content), `Skeleton`, `EmptyState`, `Dialog*`, `cn`. Icons only from `lucide-react` (already used). Do not add new imports that are not listed here.
4. **No new dependencies.** No motion library, no drag-and-drop library.
5. **Do NOT touch:** package format, StudioAPI contract (`studioApi.ts`), `packages/runtime`, `apps/learner`, `EditorShell.tsx`, `DevApp.tsx` (EXCEPT the temporary `themeId` probe in Task 12 — revert it), `InspectorPanel`, `ModeToggle.tsx`, `CreatorPreview.tsx`, `FlowAdvancedPanel.tsx`, `RewardsCardsPanel.tsx`, `AddActivityMenu.tsx`, `EditorCoachingPanel.tsx`.
6. **Tests mandatory.** Co-located Vitest for every new component; update existing tests that break. Run the full dev-server suite before finishing.
7. **Reduced motion** — every new animation/transition must be disabled under `@media (prefers-reduced-motion: reduce)`. The existing guard lives at the bottom of `apps/dev-server/src/index.css`.
8. **Conventional commits** — e.g. `feat(dev-server): outline health strip and share export success`.
9. **Do NOT regenerate `apps/dev-server/src/tailwind.css`.** The dev-server now compiles `src/index.css` directly through PostCSS (see `main.tsx`); the checked-in `tailwind.css` is legacy and unused. Edit `index.css` only.

---

## 1. Workspace setup

- Branch from the Phase A/B branch (PR #569 is still open):
  ```bash
  git checkout feat/studio-visual-modernization-phase-a
  git pull
  git checkout -b feat/studio-visual-modernization-phase-c
  ```
  (If Phase A/B already merged to `main`, branch from `main` instead.)
- Install/build workspace packages so runtime imports resolve:
  ```bash
  pnpm install
  pnpm build
  ```

---

## 2. PR C1 — Motion budget

**Outcome:** two of the three spec motions (§7.5) land: template-select settle (120ms) and outline reorder settle (150ms). View-enter already ships (`studio-view-enter` on the view wrapper in `StudioApp.tsx:265` — do not change it).

### Task 1 — Template select settle

**File:** `apps/dev-server/src/index.css`

Step 1. Insert this block directly after the `.studio-row-enter` rule (currently lines 86–88), before the `@keyframes`:

```css
.studio-select-settle {
  transition:
    border-color 120ms cubic-bezier(0, 0, 0.15, 1),
    background-color 120ms cubic-bezier(0, 0, 0.15, 1),
    box-shadow 120ms cubic-bezier(0, 0, 0.15, 1);
}
```

Step 2. Extend the reduced-motion guard (currently the last block in the file, lines 109–114) so it reads:

```css
@media (prefers-reduced-motion: reduce) {
  .studio-view-enter,
  .studio-row-enter {
    animation: none;
  }
  .studio-select-settle {
    transition: none;
  }
}
```

**File:** `apps/dev-server/src/studio/components/HomeTemplateGallery.tsx`

Step 3. Change the template card `className` (currently lines 30–34) from:

```tsx
className={cn(
  'border text-left transition-colors',
  selected ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface',
  'rounded-lg px-6 py-5',
)}
```

to:

```tsx
className={cn(
  'studio-select-settle border text-left',
  selected ? 'border-primary bg-primary/5 shadow-raised' : 'border-outline-variant bg-surface',
  'rounded-lg px-6 py-5',
)}
```

(`shadow-raised` is a design-system elevation token already wired into the dev-server Tailwind config — `tailwindElevationExtensions`. Do not use a literal shadow.)

**Test — `HomeTemplateGallery.test.tsx`:** add:

```tsx
it('marks the selected template with the settle transition and elevation', () => {
  const { container } = render(
    wrap(
      <HomeTemplateGallery selectedId="reading-lesson" onSelect={() => {}} onApply={() => {}} />,
    ),
  );
  const card = container.querySelector('button');
  expect(card?.className).toContain('studio-select-settle');
  expect(card?.className).toContain('shadow-raised');
});
```

The four existing tests in this file must keep passing unchanged (they do not assert the className).

### Task 2 — Outline reorder settle

The settle replays the existing `.studio-row-enter` keyframe on the moved row only, by remounting that one row and restoring focus to its menu trigger (spec §10.2: focus stays sane after keyboard reorder).

**File:** `apps/dev-server/src/studio/components/OutlineActivityRow.tsx`

Step 1. Add a `settling?: boolean` prop to the destructured props and the props type (currently lines 35–44):

```tsx
  saving,
  settling,
  onEdit,
  ...
  saving: boolean;
  settling?: boolean;
  onEdit: (path: string) => void;
```

Step 2. Change the `<li>` className (currently line 47) from:

```tsx
<li className="hover:bg-surface-container-low group flex flex-wrap items-center gap-3 px-4 py-3 transition-colors">
```

to:

```tsx
<li
  className={cn(
    'hover:bg-surface-container-low group flex flex-wrap items-center gap-3 px-4 py-3 transition-colors',
    settling && 'studio-row-enter',
  )}
>
```

Step 3. Add `data-row-menu={activity.path}` to the `DropdownMenuTrigger` `Button` (currently lines 65–73) — this is the focus-restore anchor:

```tsx
<Button
  variant="ghost"
  size="sm"
  aria-label={t('studio.outline.rowMenu', { title: activity.title })}
  disabled={saving}
  data-row-menu={activity.path}
>
```

**File:** `apps/dev-server/src/studio/components/OutlineView.tsx`

Step 4. Add two state values after `deleteTarget` (currently line 66):

```tsx
const [settledPath, setSettledPath] = useState<string | null>(null);
const [settleKey, setSettleKey] = useState(0);
```

Step 5. Replace the `move` function (currently lines 97–104) with:

```tsx
const move = (index: number, delta: -1 | 1) => {
  const next = [...activities];
  const target = index + delta;
  if (target < 0 || target >= next.length) return;
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item!);
  setSettledPath(item!.path);
  setSettleKey((key) => key + 1);
  void persistOrder(next);
};
```

Step 6. Add a focus-restore effect right after the `persistOrder` definition (after line 95):

```tsx
useEffect(() => {
  if (!settledPath) return;
  const frame = requestAnimationFrame(() => {
    document.querySelector<HTMLButtonElement>(`[data-row-menu="${settledPath}"]`)?.focus();
  });
  return () => cancelAnimationFrame(frame);
}, [settledPath, settleKey]);
```

Step 7. Change the row `key` and add the `settling` prop (currently lines 217–227):

```tsx
<OutlineActivityRow
  key={activity.path === settledPath ? `${activity.id}-settle-${settleKey}` : activity.id}
  activity={activity}
  index={index}
  total={activities.length}
  saving={saving}
  settling={activity.path === settledPath}
  onEdit={onEdit}
  onMoveUp={() => move(index, -1)}
  onMoveDown={() => move(index, 1)}
  onDelete={() => setDeleteTarget(activity)}
/>
```

Step 8. Do NOT change `persistOrder`, `addActivity`, `addPractice`, `addAiDraft`, `removeActivity`, the loading skeleton, or the delete dialog.

**Test — `OutlineView.test.tsx`:** add `waitFor` to the `@testing-library/react` import (line 2). Add:

```tsx
it('settles the moved row and restores focus to its menu trigger', async () => {
  const user = userEvent.setup();
  const api = makeApi();
  render(wrap(<OutlineView api={api} onEdit={() => {}} onError={() => {}} />));
  await screen.findByText('Intro');
  await user.click(screen.getByRole('button', { name: /activity actions for intro/i }));
  await user.click(await screen.findByRole('menuitem', { name: /move intro down/i }));
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /activity actions for intro/i })).toHaveFocus();
  });
  expect(api.saveOutlineOrder).toHaveBeenCalledWith(['nodes/q.json', 'nodes/a.md']);
});
```

The existing `saves new order on move down` test must keep passing unchanged (it makes the same clicks and only asserts `saveOutlineOrder`).

### Task 3 — C1 verification & commit

```bash
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/dev-server exec tsc --noEmit -p tsconfig.json
pnpm exec prettier --check "apps/dev-server/src/studio/**/*.{ts,tsx}" apps/dev-server/src/index.css
```

Fix any failures, then:

```bash
git add -A && git commit -m "feat(dev-server): studio motion — template select settle and outline reorder settle"
```

**C1 exit criteria:** selected template card animates border/bg/shadow over 120ms (and is frozen under reduced motion); moving a row replays the 150ms settle on that row and refocuses its menu trigger; `.studio-select-settle` and `.studio-row-enter` are both disabled under `prefers-reduced-motion`.

---

## 3. PR C2 — Course health + Share polish

**Outcome:** Outline shows a course-health strip (activity count + ready/not-ready → Share) computed from the existing ready-check helpers; Share shows a subtle export-success banner announced via a live region.

### Task 4 — `OutlineHealthStrip` component

**New file:** `apps/dev-server/src/studio/components/OutlineHealthStrip.tsx`

Copy verbatim:

```tsx
import { Badge, Button } from '@open-edu/design-system';
import { CheckCircle2, X } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';

export function OutlineHealthStrip({
  count,
  ready,
  onShare,
}: {
  count: number;
  ready: boolean;
  onShare: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="border-outline-variant bg-surface flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
      <div className="flex items-center gap-2">
        {ready ? (
          <CheckCircle2 className="text-success h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <X className="text-error h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <div>
          <p className="text-on-surface text-sm font-medium">
            {t('studio.outline.healthCount', { count: String(count) })}
          </p>
          <p className="text-on-surface-variant text-sm">
            {ready ? t('studio.outline.healthReady') : t('studio.outline.healthNotReady')}
          </p>
        </div>
      </div>
      <Badge variant="outline" className="hidden sm:inline-flex">
        {ready ? t('studio.share.ready') : t('studio.share.notReady')}
      </Badge>
      <Button variant={ready ? 'default' : 'outline'} size="sm" onClick={onShare}>
        {t('studio.nav.share')}
      </Button>
    </div>
  );
}
```

> Uses `CheckCircle2` / `X` (both already imported elsewhere in this app) and the `Badge` primitive. All five i18n keys already exist. The `Badge` shows `share.ready` ("Ready") or `share.notReady` ("Needs attention").

**New test file:** `apps/dev-server/src/studio/components/OutlineHealthStrip.test.tsx`

Reuse the `wrap()` + `I18nProvider` + `studioEn` pattern from `OutlineHealthStrip.test.tsx`'s sibling tests (`HomeTemplateGallery.test.tsx`). Tests:

1. renders the count and "Ready to share" when `ready` is true.
2. renders "Review ready check" when `ready` is false.
3. clicking the Share button calls `onShare` once.

### Task 5 — Wire health into `OutlineView`

**File:** `apps/dev-server/src/studio/components/OutlineView.tsx`

Step 1. Add imports (keep alphabetical order with the existing `./` imports):

```tsx
import { OutlineHealthStrip } from './OutlineHealthStrip.js';
import { buildReadyCheck, isReadyToExport } from '../readyCheck.js';
```

Step 2. Add `onShare?: () => void;` to the props type (currently lines 54–58).

Step 3. Add two state values after `deleteTarget` (currently line 66):

```tsx
const [title, setTitle] = useState('');
const [health, setHealth] = useState<{ count: number; ready: boolean } | null>(null);
```

Step 4. In `refresh` (currently lines 68–79), set the local title alongside the callback:

```tsx
setActivities(outline.activities);
setTitle(outline.title);
onTitleChange?.(outline.title);
```

Step 5. Add a health effect right after the `refresh` definition (`useEffect` is already imported):

```tsx
useEffect(() => {
  if (loading || activities.length === 0) {
    setHealth(null);
    return;
  }
  let cancelled = false;
  void (async () => {
    try {
      const outline = await api.getOutline();
      const validation = await api.validate();
      const files = new Map<string, string>();
      for (const activity of outline.activities) {
        try {
          const file = await api.readFile(activity.path);
          files.set(activity.path, file.content);
        } catch {
          // unreadable node counts as missing content
        }
      }
      if (cancelled) return;
      const items = buildReadyCheck({
        title: outline.title,
        files,
        validationErrors: validation.errors,
      });
      setHealth({ count: outline.activities.length, ready: isReadyToExport(items) });
    } catch {
      if (!cancelled) setHealth(null);
    }
  })();
  return () => {
    cancelled = true;
  };
}, [activities, api, loading]);
```

Step 6. Render the strip between the header row and the empty-state/list (between the block ending at line 207 and the `activities.length === 0` branch at line 209):

```tsx
{
  health ? (
    <OutlineHealthStrip count={health.count} ready={health.ready} onShare={() => onShare?.()} />
  ) : null;
}
```

**File:** `apps/dev-server/src/studio/StudioApp.tsx`

Step 7. Pass `onShare` to `OutlineView` (currently lines 163–171):

```tsx
<OutlineView
  api={api}
  onEdit={handleEdit}
  onError={handleError}
  onTitleChange={setCourseTitle}
  onShare={() => handleNavigate('share')}
/>
```

**Test updates — `OutlineView.test.tsx`:**

Step 8. Update the shared `makeApi` defaults (currently lines 60–75) so the health effect is deterministic. Change `validate: vi.fn(),` to `validate: vi.fn().mockResolvedValue({ valid: true, errors: [] }),` and `readFile: vi.fn(),` to:

```tsx
readFile: vi.fn().mockImplementation((path: string) =>
  Promise.resolve({
    path,
    content: path.endsWith('.json') ? validQuiz : validLesson,
  }),
),
```

and add these fixture constants above `makeApi`:

```tsx
const validLesson = '# Fractions\n\nHello';
const validQuiz = JSON.stringify({
  type: 'quiz',
  question: 'Q?',
  options: [
    { id: 'a', text: 'A', correct: true },
    { id: 'b', text: 'B', correct: false },
  ],
});
```

Step 9. Add four tests:

```tsx
it('shows the health strip with the activity count when ready', async () => {
  render(wrap(<OutlineView api={makeApi()} onEdit={() => {}} onError={() => {}} />));
  expect(await screen.findByText('2 activities')).toBeInTheDocument();
  expect(screen.getByText('Ready to share')).toBeInTheDocument();
});

it('shows the review-ready label when a quiz has no correct answer', async () => {
  const badQuiz = JSON.stringify({
    type: 'quiz',
    question: 'Q?',
    options: [{ id: 'a', text: 'A', correct: false }],
  });
  const api = makeApi({
    readFile: vi
      .fn()
      .mockImplementation((path: string) =>
        Promise.resolve({ path, content: path.endsWith('.json') ? badQuiz : validLesson }),
      ),
  });
  render(wrap(<OutlineView api={api} onEdit={() => {}} onError={() => {}} />));
  expect(await screen.findByText('Review ready check')).toBeInTheDocument();
});

it('navigates to Share from the health strip', async () => {
  const user = userEvent.setup();
  const onShare = vi.fn();
  render(
    wrap(<OutlineView api={makeApi()} onEdit={() => {}} onError={() => {}} onShare={onShare} />),
  );
  await screen.findByText('Ready to share');
  await user.click(screen.getByRole('button', { name: /share/i }));
  expect(onShare).toHaveBeenCalled();
});

it('hides the health strip when the course is empty', async () => {
  const api = makeApi({ getOutline: vi.fn().mockResolvedValue({ activities: [], title: 'T' }) });
  render(wrap(<OutlineView api={api} onEdit={() => {}} onError={() => {}} />));
  expect(await screen.findByText('Add your first activity to get started.')).toBeInTheDocument();
  expect(screen.queryByText(/activities/)).not.toBeInTheDocument();
});
```

### Task 6 — Share export success banner

**File:** `apps/dev-server/src/studio/components/ShareView.tsx`

Insert directly after the `PageHeader` line (currently line 103):

```tsx
{
  exportedFileName ? (
    <div
      role="status"
      aria-live="polite"
      className="border-success bg-success/10 flex items-start gap-3 rounded-lg border p-4"
    >
      <Check className="text-success mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div>
        <p className="text-on-surface text-sm font-medium">
          {t('studio.share.exportSuccess', { fileName: exportedFileName })}
        </p>
        <p className="text-on-surface-variant text-sm">{t('studio.share.exportSuccessLede')}</p>
      </div>
    </div>
  ) : null;
}
```

`Check` is already imported (line 3). Do NOT change the export handler, the ready-check section, the how-to steps, or the share-kit section.

**Test — `ShareView.test.tsx`:** add:

```tsx
it('announces export success after downloading', async () => {
  render(wrap(<ShareView api={makeApi()} onError={() => {}} />));
  const exportButton = await screen.findByRole('button', { name: /export \.oep file/i });
  await userEvent.click(exportButton);
  const status = await screen.findByRole('status');
  expect(status).toHaveTextContent('Exported fractions-1.0.0.oep');
});
```

The existing tests, including `shows the share kit with the exported file name after a successful export` and the axe audit `ShareView is accessible including the share kit after export` (in `studio-a11y.test.tsx`), must keep passing — the banner is additive.

### Task 7 — C2 verification & commit

```bash
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/dev-server exec tsc --noEmit -p tsconfig.json
pnpm exec prettier --check "apps/dev-server/src/studio/**/*.{ts,tsx}"
```

Fix any failures, then:

```bash
git add -A && git commit -m "feat(dev-server): outline health strip and share export success"
```

**C2 exit criteria:** Outline shows count + ready/not-ready with a Share affordance that navigates (computed via `buildReadyCheck`/`isReadyToExport`); empty outline hides the strip; after export ShareView announces "Exported {{fileName}}" via `role="status"`; no new i18n keys.

---

## 4. PR C3 — Outline left rail

**Outcome:** On `lg`, Outline becomes a two-column composition per spec §8.4: a left rail (course title, health strip, Advanced accordions, tip) beside the course spine (sticky header with the single Add menu + rows). Below `lg` the rail stacks above the spine.

**File:** `apps/dev-server/src/studio/components/OutlineView.tsx`

Step 1. Replace the entire return block (currently lines 197–290 — the `return (` through the closing `</div>` before `);`) with:

```tsx
return (
  <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 lg:flex-row">
    <aside className="w-full shrink-0 space-y-4 lg:w-64">
      <h2 className="text-h3 text-on-surface">{title}</h2>
      {health ? (
        <OutlineHealthStrip count={health.count} ready={health.ready} onShare={() => onShare?.()} />
      ) : null}
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
      <p className="text-on-surface-variant text-sm">{t('studio.outline.dragHint')}</p>
    </aside>

    <div className="min-w-0 flex-1 space-y-6">
      <div className="bg-surface sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-on-surface">{t('studio.outline.title')}</h1>
        <AddActivityMenu
          onAddLesson={() => void addActivity('lesson')}
          onAddQuiz={() => void addActivity('quiz')}
          onAddPractice={() => setPickerOpen(true)}
          onAddAi={() => setAiDialogOpen(true)}
        />
      </div>

      {activities.length === 0 ? (
        <EmptyState
          heading={t('studio.outline.empty')}
          description={t('studio.outline.emptyDescription')}
        />
      ) : (
        <ul className="border-outline-variant bg-surface divide-outline-variant divide-y rounded-lg border">
          {activities.map((activity, index) => (
            <OutlineActivityRow
              key={
                activity.path === settledPath ? `${activity.id}-settle-${settleKey}` : activity.id
              }
              activity={activity}
              index={index}
              total={activities.length}
              saving={saving}
              settling={activity.path === settledPath}
              onEdit={onEdit}
              onMoveUp={() => move(index, -1)}
              onMoveDown={() => move(index, 1)}
              onDelete={() => setDeleteTarget(activity)}
            />
          ))}
        </ul>
      )}
      <WidgetPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(widget) => void addPractice(widget)}
      />
      <AiAddDialog
        api={api}
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        onAccept={(item) => void addAiDraft(item)}
        onError={onError}
      />

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
    </div>
  </div>
);
```

Step 2. The loading branch (currently lines 180–195) stays unchanged.

Step 3. Do NOT touch `move`, `persistOrder`, `addActivity`, `addPractice`, `addAiDraft`, `removeActivity`, `FlowAdvancedPanel`, `RewardsCardsPanel`, or the health effect.

**Test — `OutlineView.test.tsx`:** add:

```tsx
it('renders a left rail with course meta, tip, and advanced accordions', async () => {
  const user = userEvent.setup();
  render(wrap(<OutlineView api={makeApi()} onEdit={() => {}} onError={() => {}} />));
  await screen.findByText('Intro');
  const aside = screen.getByRole('complementary');
  expect(within(aside).getByText('Test')).toBeInTheDocument();
  expect(
    within(aside).getByText('Drag to reorder, or use the menu to move rows.'),
  ).toBeInTheDocument();
  await user.click(within(aside).getByRole('button', { name: /learning path/i }));
  expect(
    await within(aside).findByText('Learners go through activities in outline order.'),
  ).toBeInTheDocument();
});
```

All existing tests must keep passing. Note the health strip keeps its C2 tests (position-agnostic text queries) and the strip is now inside the rail.

### Task 8 — C3 verification & commit

```bash
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/dev-server exec tsc --noEmit -p tsconfig.json
pnpm exec prettier --check "apps/dev-server/src/studio/**/*.{ts,tsx}"
```

Fix any failures, then:

```bash
git add -A && git commit -m "feat(dev-server): outline left rail — course meta, health, advanced panels, tip"
```

**C3 exit criteria:** `OutlineView` has exactly one `aside` (role `complementary`) on `lg` beside the spine; course title, health strip, Advanced accordions, and the drag tip live in the rail; the Add menu header is sticky; everything stacks below `lg`.

---

## 5. PR C4 — Theme QA pass

**Outcome:** Light / Dark / Zen verified for the Phase A/B/C surfaces; only contrast/token mistakes fixed. No new palette.

### Task 9 — Automated token guard

Run this and confirm there are NO matches in `apps/dev-server/src/studio`:

```bash
rg -n '#[0-9a-fA-F]{3,8}\b|rgb\(|rgba\(|hsl\(' apps/dev-server/src/studio --glob '*.tsx' --glob '*.ts'
```

Baseline today: zero matches. If this phase introduced any, replace them with tokens before continuing.

### Task 10 — Manual Light / Dark / Zen matrix

Run the Studio:

```bash
pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js dev ./examples/hello-world
```

Temporarily probe each theme by setting `themeId` on the Creator wrapper at `apps/dev-server/src/DevApp.tsx:467` (`<RuntimeThemeProvider>`), reload, inspect, then REVERT (do not commit the probe):

- Light: `themeId="lumina-scholastica"` (default — no change needed)
- Dark: `themeId="nocturnal"`
- Zen: `themeId="zen"`

For each theme, walk this checklist and note pass/fail in the PR description:

| Surface      | Check                                                                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| StudioChrome | brand wordmark readable; active nav `bg-primary/10 text-primary` distinguishable; Share CTA visible                                            |
| Home         | PageHeader text; selected template `border-primary bg-primary/5 shadow-raised` vs unselected; disabled Use template                            |
| Outline      | rail title; health strip (`text-success` / `text-error` icons + count text); row hover `bg-surface-container-low`; Advanced accordion triggers |
| Editors      | coaching checklist icons (`text-success` vs `text-on-surface-variant`); Back header; `text-h1`                                                 |
| Share        | success banner `border-success bg-success/10`; ready-check icons                                                                               |

Fix ONLY contrast/token mistakes you find (e.g. swap a too-dim `text-on-surface-variant` for `text-on-surface`). Do not introduce new colors.

Record the matrix results in the PR description. If you made fixes, commit them:

```bash
git add -A && git commit -m "fix(dev-server): theme contrast fixes from Light/Dark/Zen QA"
```

If no fixes were needed, skip the commit.

---

## 6. Final integration pass

Run the WHOLE gate before pushing:

```bash
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/dev-server exec tsc --noEmit -p tsconfig.json
pnpm exec prettier --check "apps/dev-server/src/studio/**/*.{ts,tsx}"
pnpm exec prettier --check "apps/dev-server/src/index.css"
pnpm --filter @open-edu/i18n exec vitest run src/i18n-keys.test.ts
pnpm lint:hardcoded-strings
```

Manual smoke (optional but recommended):

```bash
pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js dev ./examples/hello-world
```

Verify: template card settles on select; reordering a row settles and keeps keyboard focus; Outline shows count + Ready/Review + Share in the left rail; Advanced panels are accordions in the rail; Share shows the success banner after export; all surfaces read cleanly in Light/Dark/Zen.

---

## 7. Out of scope / follow-ups (do NOT implement here)

- HTML5 drag-reorder on Outline (keyboard-first per parent plan; drag is a follow-up — `outline.dragHint` already covers the tip copy).
- Course "settings" entry in the rail (`outline.courseSettings` key exists but there is no settings view; do NOT create one).
- Lesson Write/Preview tabs (deferred per parent open question).
- Additional motion (e.g. animated reorder-settle on drag) — the budget is the three spec motions only.
- Share "celebration" beyond the subtle status banner (no confetti/noise).

## 8. PR checklist before submitting

- [ ] Up to 4 commits: C1 motion, C2 health+Share, C3 rail, and (only if needed) C4 theme fixes; each separately testable
- [ ] `pnpm --filter @open-edu/dev-server test` green
- [ ] `tsc --noEmit` green
- [ ] Prettier green on changed files + `index.css`
- [ ] `i18n-keys.test.ts` green
- [ ] No new dependencies
- [ ] No new i18n keys; no `#hex`/`rgb()`/inline `style` added
- [ ] No hardcoded user-facing English in touched `.tsx` files
- [ ] Reduced-motion guard covers `.studio-select-settle` and `.studio-row-enter`
- [ ] Theme QA matrix recorded in PR description (Task 10)
