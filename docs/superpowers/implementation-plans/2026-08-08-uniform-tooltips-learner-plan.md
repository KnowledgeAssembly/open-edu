# Uniform Popover-Style Tooltips in the Learner App — Implementation Plan

**Date:** 2026-08-08
**Status:** Ready for implementation
**Scope:** `@open-edu/design-system` + `@open-edu/learner`

---

## 1. Goal

Make every button/menu hint in the learner app use **one** tooltip mechanism — the design-system Radix `Tooltip` primitive, exactly like the "Ask Pipili" header button. Eliminate native `title=` attribute tooltips and add tooltips to icon-only buttons that currently have none.

**Reference implementation (copy this look/behavior):** `apps/learner/src/ai/PipiliHeaderButton.tsx:38-64`. The styling already lives in `packages/design-system/src/primitives/tooltip.tsx:17` (`bg-popover`, border, `rounded-md`, shadow, fade/zoom animation) — the "popover" look the user wants everywhere.

### Why this is inconsistent today (analysis summary)

| Mechanism                             | Where                                                                                                                 | Result                                                                                      |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| DS Radix `Tooltip` primitive          | Only `PipiliHeaderButton.tsx`                                                                                         | The styled popover tooltip the user likes                                                   |
| Native `title=` attribute             | `TopAppBar.tsx:148`, `AppSidebar.tsx:128,182`, `HintControls.tsx:51`                                                  | Browser-default gray, ~1s-delayed, unstyled tooltip (the "Accessibility settings" mismatch) |
| No tooltip (icon-only + `aria-label`) | `CourseRightSidebar.tsx:88,114`, `CompanionPanel.tsx:89`, `NoteRow.tsx`, `NoteEditor.tsx`, `SettingsPage.tsx:104,113` | No hint affordance at all                                                                   |

Root cause: no shared standard. Each component picked its own mechanism.

---

## 2. The Standard Pattern (use everywhere)

Every component that needs a tooltip wraps its **own** `<TooltipProvider delayDuration={300}>` locally. This matches the existing `PipiliHeaderButton` convention, keeps each component self-contained (works in learner, design-system, dev-server, and standalone unit tests), and requires **zero test-scaffolding changes** to existing render helpers.

```tsx
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@open-edu/design-system';
// or from '../primitives/tooltip.js' inside the design-system package

<TooltipProvider delayDuration={300}>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button aria-label={...}>…icon…</Button>
    </TooltipTrigger>
    <TooltipContent side="bottom">{labelText}</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

Rules:

1. **Tooltip text must equal the button's `aria-label`** (screen-reader name and visual hint match).
2. **Keep the existing `aria-label`** — never remove it. Remove any existing `title=` attribute on the same element.
3. Placement:
   - Header buttons: `side="bottom" align="end"` (Pipili's exact config).
   - Collapsed left-sidebar items: `side="right"`.
   - Right-sidebar / collapsed right-rail buttons: `side="left"`.
   - Inline icon buttons (notes, settings): `side="top"`.
4. Tooltips open on keyboard focus automatically (Radix default) — no extra wiring.
5. **Known caveat:** Radix tooltips do not open for a **disabled** trigger. In `AppSidebar`, collapsed `status: 'future'` step buttons are disabled — the tooltip won't open for those, but their `aria-label` already provides the accessible name. Do not work around this.
6. Imports come from `@open-edu/design-system` in the learner app and from `../primitives/tooltip.js` inside the design-system package. Never import the Radix package directly.

---

## 3. Work Breakdown

### Task A — `packages/design-system/src/patterns/TopAppBar.tsx` (the visible "Accessibility settings" mismatch)

**Step A.1 — Add import.** With the existing imports at the top of the file, add:

```tsx
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../primitives/tooltip.js';
```

**Step A.2 — Wrap the a11y button (lines 141–165).** Wrap the `<Button>` in the standard pattern and **delete the `title="Accessibility settings"` attribute** (currently line 148). Keep `ref={triggerRef}`, `onClick`, `aria-label="Accessibility settings"`, `aria-expanded`, `data-testid="top-appbar-a11y"`, and `className={headerIconButtonClasses}`. Tooltip content:

```tsx
<TooltipContent side="bottom" align="end">
  Accessibility settings
</TooltipContent>
```

**Step A.3 — Leave the inline a11y panel (lines 166–204) and everything else untouched.** Leave the course-title span `title={courseTitle}` (line 89) as-is — it is a truncated-text affordance on a non-interactive span (intentional exception, not a button/menu).

### Task B — `packages/design-system/src/patterns/AppSidebar.tsx` (collapsed rail uses native `title=`)

**Step B.1 — Add the same Tooltip import** from `../primitives/tooltip.js`.

**Step B.2 — Nav items (lines 112–134).** Replace `title={!expanded ? item.label : undefined}` (line 128) with:

- `aria-label={!expanded ? item.label : undefined}` on the `Button` (adds the accessible name the collapsed icon currently lacks).
- When `!expanded`, wrap the `Button` in the standard pattern with `side="right"` and content `{item.label}`. When expanded, render the plain `Button` (label text is visible; no tooltip needed). Suggested structure:

```tsx
{
  items.map((item) => {
    const isActive = item.id === currentItemId;
    const navButton = (
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        size={expanded ? 'sm' : 'icon'}
        className={cn(
          'gap-2 transition-colors',
          !isActive && 'hover:bg-surface-variant/30 hover:text-on-surface text-on-surface-variant',
          expanded ? 'w-full justify-start' : 'w-full justify-center',
        )}
        onClick={() => onNavigate(item.id)}
        aria-current={isActive ? 'page' : undefined}
        data-testid={`appsidebar-nav-${item.id}`}
        aria-label={!expanded ? item.label : undefined}
      >
        <span className="shrink-0">{item.icon}</span>
        {expanded && <span className="truncate">{item.label}</span>}
      </Button>
    );
    return !expanded ? (
      <TooltipProvider key={item.id} delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{navButton}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : (
      navButton
    );
  });
}
```

**Step B.3 — Step items (lines 166–201).** Replace `title={!expanded ? step.label : undefined}` (line 182) with a `side="right"` Tooltip when collapsed. The `aria-label` already exists (line 180) — keep it. Follow the same conditional-wrapper structure as B.2.

**Step B.4 — Collapse toggle (lines 226–235).** Wrap the `<button>` in the standard pattern, `side="right"`, content `{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}` — the same strings as its existing `aria-label` (line 229).

### Task C — `apps/learner/src/CourseRightSidebar.tsx` (icon buttons with no tooltip)

**Step C.1 — Add import.** Add `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` to the existing `@open-edu/design-system` import (line 2).

**Step C.2 — Open-sidebar chevron (lines 84–91).** Wrap the `<Button>` in the standard pattern, `side="left"`, content `{t('learner.right_sidebar.open')}`. Key already exists at `packages/i18n/locales/en/learner.json:132`.

**Step C.3 — Close chevron (lines 110–117).** Wrap in the standard pattern, `side="left"`, content `{t('learner.right_sidebar.close')}`. Key exists at `learner.json:133`.

### Task D — `apps/learner/src/ai/CompanionPanel.tsx` (close X, no tooltip)

Wrap the close `<Button>` (lines 84–92) in the standard pattern, `side="left"`, content `{t('learner.right_sidebar.close')}`. Add the Tooltip imports to the existing `@open-edu/design-system` import.

### Task E — `apps/learner/src/notes/NoteRow.tsx` (star + trash, no tooltip)

Wrap both icon buttons in the standard pattern, `side="top"`:

- Favorite star (lines 87–98): content `{t('notes.row.favorite.add')}` or `{t('notes.row.favorite.remove')}` depending on `note.favorite` — mirror the existing ternary `aria-label` at lines 91–93.
- Delete trash (lines 99–105): content `{t('notes.row.delete')}`.

Both are plain `<button>` elements (not design-system `Button`) — `TooltipTrigger asChild` works with them the same way.

### Task F — `apps/learner/src/notes/NoteEditor.tsx` (export + delete, no tooltip)

Wrap both icon `<Button>`s in the standard pattern, `side="top"`:

- Export (lines 108–116): content `{t('notes.editor.export')}`.
- Delete (lines 117–124): content `{t('notes.editor.delete')}`.

### Task G — `apps/learner/src/SettingsPage.tsx` (A-/A+ font buttons, no tooltip)

Wrap both `<Button>`s (lines 100–107 and 109–116) in the standard pattern, `side="top"`:

- Decrease: content `{t('learner.settings.aa_decrease_font_aria')}`.
- Increase: content `{t('learner.settings.aa_increase_font_aria')}`.

### Task H — `apps/learner/src/ai/HintControls.tsx` (redundant native `title=`)

- Delete line 51 (`title={t(HINT_DESCRIPTION_KEYS[level])}`) — the button text already displays the same string, so the native tooltip is redundant.
- Delete the now-unused `HINT_DESCRIPTION_KEYS` const (lines 21–26) to avoid dead code.
- Do **not** add a Tooltip here.

### Task I — Delete dead shim (cleanup)

Delete `apps/learner/src/components/ui/tooltip.tsx` (a re-export that nothing imports). Before deleting, verify with:

```bash
rg -n "ui/tooltip|components/ui/tooltip" apps/learner/src --type ts --type tsx
```

Only delete if there are no matches.

### Task J — i18n

**No new locale keys are required.** Every tooltip string already exists:

| Key                                                                | File:line                                       |
| ------------------------------------------------------------------ | ----------------------------------------------- |
| `learner.right_sidebar.open` / `.close`                            | `packages/i18n/locales/en/learner.json:132-133` |
| `learner.settings.aa_decrease_font_aria` / `aa_increase_font_aria` | `learner.json:28-29`                            |
| `notes.row.favorite.add` / `.remove` / `notes.row.delete`          | `packages/i18n/locales/en/notes.json:13-15`     |
| `notes.editor.export` / `.delete`                                  | `notes.json:23-24`                              |

**Known pre-existing limitation (do not fix in this story):** `TopAppBar` and `AppSidebar` live in `@open-edu/design-system`, which does **not** depend on `@open-edu/i18n` (verified in `packages/design-system/package.json` — its `dependencies` have no i18n entry). Their strings ("Accessibility settings", "Collapse sidebar", "Expand sidebar") remain hardcoded, exactly as they are today. All learner-app components use `t()`.

---

## 4. Tests

### Update — `packages/design-system/src/patterns/__tests__/TopAppBar.test.tsx`

Replace the test at lines 48–53 ("a11y controls button has correct aria-label and title"):

```tsx
it('a11y controls button has correct aria-label and shows a tooltip on focus', async () => {
  renderWithProvider(<TopAppBar showA11yControls />);
  const btn = screen.getByTestId('top-appbar-a11y');
  expect(btn.getAttribute('aria-label')).toBe('Accessibility settings');
  expect(btn.hasAttribute('title')).toBe(false);
  fireEvent.focus(btn);
  const tooltip = await screen.findByRole('tooltip');
  expect(tooltip).toHaveTextContent('Accessibility settings');
});
```

No other TopAppBar tests change. The component provides its own `TooltipProvider`, so the existing `checkAccessibility` test (line 116) and all click-based panel tests keep passing.

### Add — `packages/design-system/src/patterns/__tests__/AppSidebar.test.tsx`

Inside the existing `describe('collapsed rail', ...)` block (starts line 185), add:

```tsx
it('shows a tooltip with the label when collapsed', async () => {
  render(<AppSidebar items={navItems} currentItemId="home" onNavigate={() => {}} collapsed />);
  fireEvent.focus(screen.getByTestId('appsidebar-nav-home'));
  expect(await screen.findByRole('tooltip')).toHaveTextContent('Home');
});
```

Existing AppSidebar tests assert text, `aria-label`, and classes — not `title` — so they keep passing unchanged.

### Add — learner-app tests (one per touched component)

Use the same pattern as the existing `apps/learner/src/ai/__tests__/PipiliHeaderButton.test.tsx:29-34` (`fireEvent.focus` the button, then `await screen.findByRole('tooltip')` and assert its text).

| File                                        | Target button                    | Asserted tooltip text |
| ------------------------------------------- | -------------------------------- | --------------------- |
| `src/__tests__/CourseRightSidebar.test.tsx` | open chevron (`Open sidebar`)    | `Open sidebar`        |
| `src/ai/__tests__/CompanionPanel.test.tsx`  | close button (`Close sidebar`)   | `Close sidebar`       |
| `src/notes/__tests__/NoteRow.test.tsx`      | delete button (`Delete note`)    | `Delete note`         |
| `src/notes/__tests__/NoteEditor.test.tsx`   | export button (`Export`)         | `Export`              |
| `src/SettingsPage.test.tsx`                 | A- button (`Decrease font size`) | `Decrease font size`  |

Existing a11y tests (`*.a11y.test.tsx` / `checkAccessibility`) require **no changes**: each component carries its own `TooltipProvider`, a closed Radix tooltip renders nothing into the DOM, and existing `aria-label`s are preserved.

---

## 5. Verification

Run in this order:

```bash
pnpm --filter @open-edu/design-system test     # design-system suite (TopAppBar, AppSidebar)
pnpm --filter @open-edu/learner test           # learner suite (Pipili, right sidebar, notes, settings)
pnpm lint                                       # includes lint:hardcoded-strings
pnpm typecheck
pnpm format:check                               # run `pnpm format` first if it complains
pnpm test                                       # full monorepo suite
```

Notes:

- The design-system package's `main` points at `./src/index.ts` (verified), so **no rebuild is required** for tests.
- If Tailwind classes change in design-system components consumed by the dev-server, regenerate `apps/dev-server/src/tailwind.css` per AGENTS.md. Verify whether it is needed with `rg -n "TopAppBar|AppSidebar" apps/dev-server/src` — currently no matches, so likely unnecessary.
- Manual check: `pnpm --filter @open-edu/learner dev` → hover/focus the "Accessibility settings" header button and confirm it now renders the styled popover tooltip exactly like "Ask Pipili".

---

## 6. AGENTS.md Compliance Checklist

- [ ] **Tests:** every touched component gets/keeps Vitest tests (Section 4).
- [ ] **i18n:** all learner strings via `t()` with existing keys; no hardcoded strings introduced.
- [ ] **Accessibility:** `aria-label` preserved everywhere; native `title` removed from controls; tooltips open on focus; axe audits unaffected.
- [ ] **Styling:** Tailwind classes + `cn()` only; tooltip styling comes from the existing DS primitive (no new classes, no `style={{}}`).
- [ ] **Self-contained packages:** design-system components carry their own `TooltipProvider`; no cross-package imports added.
- [ ] **No dead code:** `HINT_DESCRIPTION_KEYS` removed; unused `ui/tooltip.tsx` shim deleted.
- [ ] **Conventional commits** (one story per PR), e.g.:
  - `feat(design-system): replace native title tooltips with Radix Tooltip in TopAppBar and AppSidebar`
  - `feat(learner): add uniform popover tooltips to icon-only buttons`

---

## 7. Out of Scope / Intentional Exceptions

- `TopAppBar` course-title span `title=` (truncated-text affordance on a non-interactive element, not a control).
- `TextSelectionToolbar` (buttons already show inline text labels on desktop).
- `PipiliChat` stop/retry buttons (have visible text labels).
- `DownloadButton` / `DownloadedCourseList` remove buttons (have visible text labels).
- Disabled collapsed step items in `AppSidebar` (Radix limitation; `aria-label` already covers them).
- Design-system package has no i18n dependency (pre-existing, not introduced by this story).
