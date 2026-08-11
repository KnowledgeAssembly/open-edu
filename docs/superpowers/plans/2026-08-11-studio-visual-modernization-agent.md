# Studio Visual Modernization — Agent Execution Plan (deepseek-4-flash)

> **For the implementing agent.** This is a turn-key, prescriptive plan. It resolves the open questions
> from the design spec, pre-decides all ambiguous choices, lists every file, every i18n key, every test
> change, and the exact verification loop. Follow it in order. Do NOT improvise new features, new
> dependencies, or new design-system changes. When a step is marked **[STRETCH]**, do it only if the
> mandatory steps for that phase are green.
>
> - Design spec: `docs/superpowers/specs/2026-08-10-studio-visual-modernization-design.md`
> - Phase plan: `docs/superpowers/plans/2026-08-10-studio-visual-modernization.md`
> - Repo rules: `AGENTS.md` (read it). This plan already encodes AGENTS.md constraints.

---

## 0. Environment & non-negotiables

### 0.1 What you will touch (only this)

| Area                               | Files                                                                                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Studio chrome                      | `apps/dev-server/src/studio/components/StudioTopBar.tsx` → rename to `StudioChrome.tsx`                                                 |
| Studio shell                       | `apps/dev-server/src/studio/StudioApp.tsx`                                                                                              |
| Home                               | `apps/dev-server/src/studio/components/HomeView.tsx`, new `HomeTemplateGallery.tsx`                                                     |
| Outline                            | `apps/dev-server/src/studio/components/OutlineView.tsx`, new `OutlineActivityRow.tsx`, `AddActivityMenu.tsx`, `EditorCoachingPanel.tsx` |
| Editors                            | `LessonActivityEditor.tsx`, `QuizActivityEditor.tsx`, `PracticeActivityEditor.tsx`, `ActivityEditorRouter.tsx`                          |
| Preview                            | `apps/dev-server/src/studio/CreatorPreview.tsx`                                                                                         |
| Developer                          | `apps/dev-server/src/DevApp.tsx`, new `apps/dev-server/src/components/DeveloperToolbar.tsx`                                             |
| Library / Share / AI review / Unit | `LibraryView.tsx`, `ShareView.tsx`, `AiReviewView.tsx`, `UnitBuilderView.tsx`                                                           |
| i18n                               | `packages/i18n/locales/en/studio.json` (additive only)                                                                                  |
| CSS                                | `apps/dev-server/src/index.css` (add motion utilities), regenerate `apps/dev-server/src/tailwind.css`                                   |
| Tests                              | Co-located `*.test.tsx` under `apps/dev-server/src/**`                                                                                  |

**Do NOT modify:** `packages/design-system/**`, `packages/runtime/**`, `studioApi.ts`, `vite.config.ts`,
`editor/EditorShell.tsx`, any package format or schema, or any file outside `apps/dev-server/src/**`
and `packages/i18n/locales/en/studio.json` and `apps/dev-server/src/index.css`.

### 0.2 Hard rules (from AGENTS.md)

1. **Tokens only.** All colors/spacing/radius via `--oe-*` Tailwind classes (`bg-surface`,
   `text-on-surface`, `border-outline-variant`, `bg-surface-container-low`, `text-primary`, …).
   Never hardcode hex/rgb, never `text-amber-400`-style palette classes. Never `style={{}}` except
   dynamic sizing / `var(--oe-*)`.
2. **i18n always.** Every user-facing string via `t('studio.<key>')` with the key added to
   `packages/i18n/locales/en/studio.json` in the **same commit** as the code using it. No hardcoded
   English in Creator chrome/views/toolbars.
3. **Design system only.** Import primitives/patterns from `@open-edu/design-system`
   (`cn`, `Button`, `Badge`, `EmptyState`, `Dialog*`, `Input`, `Textarea`, `Tabs`, `Select`,
   `Switch`, `RadioGroup`, `Tooltip*`, `DropdownMenu*`, `Accordion*`, `Breadcrumb`, `Skeleton`,
   `Spinner`, `PageHeader`, `OpenEduLogo`, `useReducedMotion`). They all exist in
   `packages/design-system/src/index.ts` — verify before writing local Radix wrappers.
4. **No new dependencies.** No drag-and-drop lib, no motion lib. Keyboard-first reorder. CSS motion only.
5. **Tests.** Every new/changed component: rendering + interaction + axe tests (extend
   `studio-a11y.test.tsx`). Never ship without tests.
6. **No emoji**, no debug logs, no `console.log`, no dead code.
7. **Commits.** Conventional, scoped, one story per commit:
   `feat(dev-server): modernize Studio chrome`, `test(dev-server): update outline tests`, etc.
8. **Formatting.** Run `pnpm format` before finishing (Tailwind class order is automated).

### 0.3 Verification loop (run after each phase)

```bash
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/dev-server typecheck
pnpm lint:hardcoded-strings          # warn mode is fine; no NEW hardcoded strings in touched files
pnpm format:check
```

**Always regenerate dev-server Tailwind CSS after any class change in `apps/dev-server/src`:**

```bash
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css
```

Manual smoke (after all phases): `pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js dev ./examples/hello-world`

---

## 1. Locked decisions (do not revisit)

| Open question (spec §16)              | Decision locked here                                                                                                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Disabled vs hidden nav when no course | **Disabled + tooltip** (`studio.nav.needsCourse`).                                                                                                                               |
| Mode control placement                | **Keep the existing `Switch` ModeToggle**, restyled muted/compact, always visible. Preserves `role="switch"` + tests.                                                            |
| Lesson Markdown preview               | **Defer.** Do not build Write\|Preview tabs. Just drop `font-mono` from the Textarea.                                                                                            |
| Outline left rail                     | **Defer.** Advanced panels stay as accordions below the spine. Left rail is `[STRETCH]` C3.                                                                                      |
| Drag-and-drop                         | **Keyboard-first.** Move up/down via overflow menu. Native HTML5 drag is `[STRETCH]` only.                                                                                       |
| Template preview                      | Out of scope.                                                                                                                                                                    |
| Brand lockup                          | `OpenEduLogo variant="symbol" size="sm"` + text `OpenEdu Studio` (so the literal text `OpenEdu Studio` stays in the DOM — existing tests depend on it).                          |
| Active nav style                      | `aria-current="page"` + `bg-primary/10 text-primary` (ghost button otherwise).                                                                                                   |
| Breadcrumb                            | Local sub-component inside `StudioChrome.tsx` (do not use DS `Breadcrumb` — it renders `<a href>`). Parent crumb = button, current crumb = plain span, separators `aria-hidden`. |
| Page titles                           | `PageHeader` on Home/Library/Share/AI-review/Unit-builder. Editors get a compact header (Back + `text-h1`), not the hero `PageHeader`.                                           |
| Save success                          | Button state + `role="status"` region (aria-live polite). No layout jump.                                                                                                        |

---

## 2. i18n additions (add ALL of these to `packages/i18n/locales/en/studio.json`, flat keys)

```json
"breadcrumbs.label": "Breadcrumb",
"nav.needsCourse": "Open or create a course first",
"nav.moreMenu": "More",
"home.emptyRecentDescription": "Start from a template or import a course folder to see it here.",
"home.templatesHint": "Pick a template, then choose Use template below.",
"outline.add": "Add",
"outline.addMenuLabel": "Add activity",
"outline.rowMenu": "Activity actions for {{title}}",
"outline.emptyDescription": "Add a lesson, quiz, or practice to build your course.",
"outline.loading": "Loading outline",
"outline.healthCount": "{{count}} activities",
"outline.healthReady": "Ready to share",
"outline.healthNotReady": "Review ready check",
"outline.dragHint": "Drag to reorder, or use the menu to move rows.",
"preview.exit": "Exit preview",
"editor.heading.lesson": "Edit lesson",
"editor.heading.quiz": "Edit quiz",
"editor.heading.practice": "Edit practice",
"editor.coaching.title": "Quality checklist",
"editor.coaching.tipsTitle": "Tips",
"editor.coaching.lesson.addHeading": "Add a clear heading so learners know the topic.",
"editor.coaching.lesson.oneIdea": "Aim for one idea per lesson — keep it short.",
"editor.coaching.lesson.headingPresent": "Has a clear heading",
"editor.coaching.lesson.headingMissing": "Needs a heading",
"editor.coaching.quiz.hasCorrect": "A correct answer is selected",
"editor.coaching.quiz.noCorrect": "Choose the correct answer",
"editor.coaching.quiz.minOptions": "At least two answers",
"editor.coaching.quiz.questionTip": "Keep the question short and specific.",
"editor.coaching.practice.valid": "Practice settings are valid",
"editor.coaching.practice.fix": "Fix the highlighted settings",
"share.ready": "Ready",
"share.notReady": "Needs attention",
"share.fixBeforeExport": "Fix the ready-check items to enable export.",
"share.exportSuccess": "Exported {{fileName}}",
"share.exportSuccessLede": "Send this file to students, or copy the instructions below.",
"developer.editPackage": "Edit Package",
"developer.resetProgress": "Reset Progress",
"developer.bundleOverview": "Bundle Overview",
"developer.toolsLabel": "Developer tools",
"developer.selectModule": "Select module",
"library.emptyDescription": "Import a course folder that already contains an OpenEdu package, or combine courses into a unit.",
"ai.checking": "Checking availability"
```

Reuse existing keys: `studio.nav.library` ("My courses"), `studio.nav.home`, `studio.nav.outline`,
`studio.nav.preview`, `studio.nav.share`, `studio.nav.editActivity`, `studio.nav.backToOutline`,
`studio.ai.item.addTitle` ("AI draft"), `studio.brand.name`, `studio.brand.subtitle`,
`studio.outline.kind.*`, `studio.editor.save` / `saved` / `cancel`, `studio.mode.*`.

---

## 3. Phase A — Chrome, Home, Preview, Developer toolbar, empty/loading

> PR1 (A1+A4), PR2 (A2), PR3 (A3). Commit after each green checkpoint.

### A1. StudioChrome

1. **Rename** `apps/dev-server/src/studio/components/StudioTopBar.tsx` → `StudioChrome.tsx`.
   - `export function StudioChrome({ mode, onModeChange, onNavigate, courseTitle, view, minimal = false, activityLabel }: ...)`.
   - Props: keep `mode`, `onModeChange`, `onNavigate`, `courseTitle?`, `view`; add `minimal?: boolean`, `activityLabel?: string`.
   - Delete `StudioTopBar.tsx`. Update the one import in `StudioApp.tsx`.
2. **Brand** (left): `OpenEduLogo variant="symbol" size="sm"` (aria-hidden via its `role="img"`) +
   `<span className="text-on-surface font-semibold">{t('studio.brand.name')}</span>` +
   optional muted `{t('studio.brand.subtitle')}` on `md+`.
3. **Breadcrumbs** (local, hidden on `view==='home'`): items built from `view`, `courseTitle`, `activityLabel`:
   - Home → (none)
   - Library → `Home` (button) / `My courses` (span)
   - Outline → `Home` (button) / `{courseTitle}` (span) / `Outline` (span)
   - Preview → `Home` / `{courseTitle}` / `Preview`
   - Share → `Home` / `{courseTitle}` / `Share`
   - edit-activity → `Home` / `{courseTitle}` / `{activityLabel ?? t('studio.nav.editActivity')}` (span)
   - Container: `<nav aria-label={t('studio.breadcrumbs.label')}>`; separator `ChevronRight` (`aria-hidden="true"`).
4. **Nav** (right of breadcrumbs, hidden when `minimal`): `Button variant="ghost" size="sm"` for
   Library (`studio.nav.library`), Outline, Preview. Active (when `view === 'outline'` / `'preview'` /
   `'library'`): add `aria-current="page"` and `className="bg-primary/10 text-primary"`.
5. **Disabled + tooltip**: Outline/Preview/Share get `disabled` when `!courseTitle`. Wrap disabled
   buttons in `<TooltipProvider><Tooltip><TooltipTrigger asChild><span tabIndex={0}>…</span></TooltipTrigger>
<TooltipContent>{t('studio.nav.needsCourse')}</TooltipContent></Tooltip></TooltipProvider>`.
   (Radix tooltips do not fire on native disabled buttons — the span wrapper is the standard pattern.)
6. **Primary CTA**: `Button variant="default" size="sm" onClick={() => onNavigate('share')}` →
   `{t('studio.nav.share')}`. Hidden when `minimal`.
7. **Mode**: keep `<ModeToggle mode={mode} onChange={onModeChange} />` at far right; give it muted,
   compact styling (no structural change — it must keep `role="switch"` / `aria-label="Studio mode"`).
8. **Mobile `< md`**: hide breadcrumbs and nav labels, show a `DropdownMenu` overflow button labelled
   `t('studio.nav.moreMenu')` containing Library/Outline/Preview/Mode. Keep Share visible. (Use `hidden md:flex`
   - a `md:hidden` overflow menu; tests run at default jsdom width, so the desktop nav must remain in the DOM —
     build both, toggle with Tailwind classes.)
9. **`StudioApp.tsx`**:
   - Replace `<StudioTopBar …>` usage with `<StudioChrome … view={view} courseTitle={courseTitle} …>`.
   - Bundle-unsupported branch: render `<StudioChrome minimal … />` (no nav/Share; keep brand + mode).
   - Pass `activityLabel` on `edit-activity` if trivially available, else omit.
   - Wrap `<main>` content in `<div key={view} className="studio-view-enter min-h-0 flex-1">` (see A4 motion class).
10. **Tests**: new `StudioChrome.test.tsx` (render brand text `OpenEdu Studio`; active `aria-current`;
    disabled + tooltip with `courseTitle={undefined}`; Share click; mode change; `minimal` hides nav;
    axe). Update `StudioApp.test.tsx` — see §6 matrix.

### A2. Home start composition

1. `HomeView.tsx`: replace the hand-rolled h1/p header with `PageHeader title={t('studio.home.title')} subtitle={t('studio.home.lede')}`.
2. **Continue strip** (only when `courseTitle`): a single borderless row — course title + `Open this course`
   (`studio.home.openCurrentCourse`) button. No `Card`.
3. **Templates** → new `HomeTemplateGallery.tsx`:
   - `STUDIO_TEMPLATES.map(...)` renders a selectable card: `<button type="button" aria-pressed={selected} className={cn('border text-left', selected ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface')}>` with title + description.
   - One shared primary `Use template` button (`studio.home.useTemplate`) **below the grid**, disabled until a template is selected; clicking it sets `pendingTemplateId` (reuse the existing overwrite `Dialog`).
   - Keep the existing overwrite-confirm flow and keys.
   - Move `AiStartPanel` below templates as a secondary band (kicker label optional — skip).
4. **Recent**: quiet list; when empty render `EmptyState heading={t('studio.home.emptyRecent')} description={t('studio.home.emptyRecentDescription')}` with a `My courses` text action (`onOpenLibrary`). Keep `<ul>` for the populated case.
5. **Tests**: new `HomeTemplateGallery.test.tsx` (selection via `aria-pressed`, Use disabled→enabled, confirm dialog, cancel, error path). Update `HomeView.test.tsx` and `StudioApp.test.tsx` `useTemplateAndConfirm` helper — see §6.

### A3. Preview bar + Developer toolbar

1. `CreatorPreview.tsx`: add prop `onExit?: () => void`. In the thin top bar add a leading
   `Button variant="outline" size="sm"` labelled `t('studio.preview.exit')` (calls `onExit`); keep
   Reset. No floating FABs (there are none here today — keep it that way).
2. `StudioApp.tsx` preview case: pass `onExit={() => handleNavigate('outline')}`.
3. `DevApp.tsx`:
   - **Remove both** `fixed bottom-4 right-96 …` clusters (BundleDevApp line ~259 and SinglePackageDeveloperApp line ~436).
   - New component `apps/dev-server/src/components/DeveloperToolbar.tsx`:
     - Props: `mode`, `onModeChange`, `onEdit?`, `onReset`, `onOverview?`, `bundle?` boolean.
     - Renders a quiet toolbar row (no fixed positioning): optional "Developer tools" chip
       (`t('studio.developer.toolsLabel')`), `Edit Package` (`developer.editPackage`), `Reset Progress`
       (`developer.resetProgress`), `Bundle Overview` (`developer.bundleOverview`, bundle only), ModeToggle.
   - `SinglePackageDeveloperApp`: replace the fixed cluster with `<DeveloperToolbar mode={mode} onModeChange={onModeChange} onEdit={handleEditorToggle} onReset={handleReset} />` rendered above `LayoutShell` (inside the scrollable column, as a header-adjacent row).
   - `BundleDevApp`: replace the header "Edit Package" button + fixed Reset cluster with the toolbar (keep the module `Select`; give it `aria-label={t('studio.developer.selectModule')}`).
   - Keep `ModeToggle` `tabIndex={-1}` behavior as-is (tests rely on switch).
   - Hardcoded "Select module" aria-label → i18n key.
4. **Tests**: new `DeveloperToolbar.test.tsx` (actions call handlers; no `fixed` class nodes).
   Update `DevApp.test.tsx` only if a selector breaks (see §6). Extend `CreatorPreview.test.tsx` with an
   Exit-preview case.

### A4. Loading & empty polish (shared)

1. `OutlineView.tsx`: replace `return <p className="p-6 text-sm">…</p>` with a few `Skeleton` rows
   (container `aria-busy`, `aria-label={t('studio.outline.loading')}`).
2. `LibraryView.tsx` / `AiStartPanel.tsx` / `ShareView.tsx`: replace bare `…` loaders with `Spinner`
   (label via `aria-label`) or `Skeleton`.
3. Empty states: Home (A2), Outline (`outline.empty` + new `outline.emptyDescription`), Library
   (`library.empty` + new `library.emptyDescription`) — supply real `description` + CTA. Remove all
   `description=""`.
4. **Motion utility** in `apps/dev-server/src/index.css` (add at bottom):
   ```css
   .studio-view-enter {
     animation: studio-view-enter 160ms cubic-bezier(0, 0, 0.15, 1) both;
   }
   .studio-row-enter {
     animation: studio-row-enter 150ms cubic-bezier(0, 0, 0.15, 1) both;
   }
   @keyframes studio-view-enter {
     from {
       opacity: 0;
       transform: translateY(6px);
     }
     to {
       opacity: 1;
       transform: translateY(0);
     }
   }
   @keyframes studio-row-enter {
     from {
       opacity: 0;
       transform: translateY(4px);
     }
     to {
       opacity: 1;
       transform: translateY(0);
     }
   }
   @media (prefers-reduced-motion: reduce) {
     .studio-view-enter,
     .studio-row-enter {
       animation: none;
     }
   }
   ```
   Regenerate `tailwind.css` afterwards (0.3).

**Phase A exit gate:** `pnpm --filter @open-edu/dev-server test` green, typecheck green,
`studio-a11y.test.tsx` extended with StudioChrome + HomeView passes axe.

---

## 4. Phase B — Outline spine, editor coaching, PageHeader consistency

> PR4 (B1), PR5 (B2+B3).

### B1. Outline spine

1. New `OutlineActivityRow.tsx`:
   - Props: `activity`, `index`, `count`, `saving`, `onEdit(path)`, `onMove(index, delta)`, `onDelete(activity)`.
   - `<li className="… flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-primary/5 studio-row-enter">`.
   - Drag handle icon (`GripVertical`, `aria-hidden`) — hover/focus-visible only (`opacity-0 group-hover:opacity-100`).
   - Kind `Badge variant="outline"` + title (`truncate text-sm font-medium`) inside a clickable region
     (button) that calls `onEdit(activity.path)`. Whole row clickable except handle/menu.
   - `DropdownMenu` overflow (trigger icon `MoreHorizontal`, `aria-label={t('studio.outline.rowMenu', { title })}`):
     **Edit** (`nav.editActivity`), **Move up** (`outline.moveUp`, disabled at index 0), **Move down**
     (`outline.moveDown`, disabled at last), **Delete** (`outline.delete`, `text-error` on item).
     Menu items call the same handlers as today's arrow/trash buttons.
2. New `AddActivityMenu.tsx`:
   - One primary `Button variant="default"` labelled `Plus + {t('studio.outline.add')}` with
     `aria-label={t('studio.outline.addMenuLabel')}`; opens a `DropdownMenu` with items:
     Lesson → `addActivity('lesson')`, Quiz → `addActivity('quiz')`, Practice → opens `WidgetPicker`,
     `Sparkles` + `t('studio.ai.item.addTitle')` → opens `AiAddDialog`.
   - Props: the same callbacks OutlineView currently passes (lesson/quiz/practice/AI handlers).
3. `OutlineView.tsx`:
   - Replace the four add buttons with `<AddActivityMenu … />`.
   - Render rows via `OutlineActivityRow`; keep the outer `<ul>` (tests rely on `role="list"`).
   - Replace the `<details>` blocks with DS `Accordion type="single" collapsible` — two `AccordionItem`s
     ("Learning path" → `FlowAdvancedPanel`, "Rewards & cards" → `RewardsCardsPanel`) using
     `AccordionTrigger`/`AccordionContent`. Add one-line helper copy under each title
     (reuse `studio.flow.linearHelp` and `studio.rewards.empty`-adjacent copy; no new keys required).
   - Health strip (bottom of spine): row with `{t('studio.outline.healthCount', { count })}` +
     button `Ready to share`/`Review ready check` (`outline.healthReady`/`outline.healthNotReady`)
     that calls optional new prop `onOpenShare?.()`. Add `onOpenShare` to props; wire in `StudioApp` to `handleNavigate('share')`.
   - Drag `[STRETCH]`: native HTML5 — `draggable` on rows, `onDragStart` stores index, `onDragOver`
     `preventDefault`, `onDrop` reorders via existing `persistOrder`. Keyboard move up/down stays the
     primary path. Only add if B1 is fully green.
4. **Tests**: new `OutlineActivityRow.test.tsx`, `AddActivityMenu.test.tsx`; update
   `OutlineView.test.tsx` (add menu + overflow interactions) and `StudioApp.test.tsx` (accordion
   selectors, edit flows) — see §6.

### B2. Editor coaching layout

1. New `EditorCoachingPanel.tsx`:
   - Props: `title?: string` (default `t('studio.editor.coaching.title')`), `items: Array<{ id: string; labelKey: string; passed: boolean; detail?: string }>`, `tips?: string[]` (i18n keys), `className?`.
   - Renders `<aside aria-label={title}>`: `h2` title; checklist `<ul>` with `Check`/`X` lucide icons
     (token colors `text-success`/`text-error`); a "Tips" section (`studio.editor.coaching.tipsTitle`) as quiet bullets.
2. `LessonActivityEditor.tsx`:
   - Right rail: render `<EditorCoachingPanel items={[headingPresent]}` where
     `headingPresent = { labelKey: hasHeading ? 'editor.coaching.lesson.headingPresent' : 'editor.coaching.lesson.headingMissing', passed: hasHeading }`
     and `tips={['editor.coaching.lesson.addHeading', 'editor.coaching.lesson.oneIdea']}` above `<AiEditPanel>`.
   - Remove `font-mono` from the `Textarea` (keep comfortable writing surface).
   - Save success: wrap the `Saved` span in `<p role="status">` (aria-live polite). No layout jump.
3. `QuizActivityEditor.tsx`:
   - Right rail: `<EditorCoachingPanel items={[{ id:'correct', labelKey: correctIndex!==null ? 'editor.coaching.quiz.hasCorrect' : 'editor.coaching.quiz.noCorrect', passed: correctIndex!==null }, { id:'options', labelKey: 'editor.coaching.quiz.minOptions', passed: options.length>=2 }]} tips={['editor.coaching.quiz.questionTip']} />` above `<AiEditPanel>`.
   - Save success `role="status"`.
4. `PracticeActivityEditor.tsx`: keep the `config | preview | AI` grid; add an `EditorCoachingPanel`
   to the left column with a single item `{ id:'valid', labelKey: validationErrors.length===0 ? 'editor.coaching.practice.valid' : 'editor.coaching.practice.fix', passed: validationErrors.length===0 }`.
   Keep `WidgetGuidePanel` where it is.
5. `ActivityEditorRouter.tsx`: wrap the chosen editor in a shared chrome — a header row
   (Back button `variant="ghost"` → `nav.backToOutline`, calls `onCancel ?? (() => onNavigate('outline'))` if provided, else hidden) +
   `<h1 className="text-h1">{t('editor.heading.<kind>')}</h1>` — then render the editor below. Keep the
   `kind === null` loading state (Skeleton). Do not break existing prop wiring.
6. **Tests**: new `EditorCoachingPanel.test.tsx` (pass/fail items render, tips render, axe). Update
   editor tests only where text changed (they mostly assert labels like `Lesson content` — those stay).

### B3. PageHeader consistency

Apply `PageHeader` (title + subtitle) to: `LibraryView` (title `studio.library.title`, subtitle
`studio.library.lede`), `ShareView` (`share.title`, `share.lede`), `AiReviewView` (`ai.reviewTitle`,
`ai.reviewLede`), `UnitBuilderView` (`unit.title`, `unit.lede`). Keep the heading text identical so
existing `findByText` assertions pass. In `ShareView`/`LibraryView` the workspace path line can remain
below the PageHeader as a muted caption.

**Phase B exit gate:** dev-server tests green; `studio-a11y.test.tsx` now also audits OutlineView + a
lesson editor.

---

## 5. Phase C — Motion, health, Share success, theme QA

> PR6.

### C1. Motion

- View enter: already wired via `studio-view-enter` in A1 (keyed per `view`).
- Template select settle: `transition-colors` on gallery buttons (already implied in A2 styling).
- Outline reorder settle: `studio-row-enter` on rows (B1) + `transition-colors` on hover.
- All keyframes gated by `prefers-reduced-motion` in index.css (done in A4). No JS-driven motion.

### C2. Course health + Share polish

- Outline health strip: done in B1 (gated on `onOpenShare` prop).
- `ShareView.tsx`: add status chip near the header — `Tag variant="success"`/`Tag variant="outline"`
  (`@open-edu/design-system` `Tag`, which has `success`/`outline` variants; `Badge` only has
  default/secondary/destructive/outline) with `t('studio.share.ready')`/`t('studio.share.notReady')`
  (`share.ready`/`share.notReady`) based on `ready`.
  When not ready, show `t('studio.share.fixBeforeExport')` helper under the disabled Export button.
  After export success, show a confirmation block: heading `t('studio.share.exportSuccess', { fileName })`
  - lede `share.exportSuccessLede` + the existing copy-instructions CTA, in a `role="status"` container.

### C3. Outline left rail [STRETCH]

Only if everything above is green: `≥lg` two-column Outline (left `w-64` rail: course title, "Course
settings" entry, Advanced accordions, tip) collapsing to stacked below `lg`. If not attempted, leave
the accordions below the spine (already shipped in B1) and stop.

### C4. Theme QA

Manual: `pnpm --filter @open-edu/cli build && node packages/cli/dist/cli.js dev ./examples/hello-world`,
switch Light/Dark/Zen; verify chrome, active nav, selected template, outline row, coaching panel
contrast. Fix token mistakes only. Attach the QA notes to the PR.

---

## 6. Existing-test update matrix (mandatory — run `pnpm --filter @open-edu/dev-server test` and fix)

| Test                                                                            | What breaks                                                          | Fix                                                                                                                |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `StudioApp.test.tsx` `useTemplateAndConfirm` + 3 usages                         | Per-card "Use template" buttons gone                                 | Helper: `click(first template card)` → `click(button /use template/i)` → `click(/replace and continue/i)`          |
| `StudioApp.test.tsx` "opens the activity editor…" & "handleSaveDraftItems…"     | `getAllByRole('button', { name: /edit/i })` no longer direct         | Open row overflow (`aria-label` = "Activity actions for …"), then click menu item `Edit`                           |
| `StudioApp.test.tsx` "exposes the Learning path…" / "renders flow and rewards…" | `{ selector: 'summary' }` gone (Accordion triggers are `<button>`)   | Use `getByRole('button', { name: /learning path/i })` / `{ name: /rewards & cards/i }`                             |
| `HomeView.test.tsx` apply/cancel/onError template tests                         | `getAllByRole('button', { name: /use template/i })`                  | Same card-select → Use flow as above                                                                               |
| `OutlineView.test.tsx` add lesson/quiz/practice & AI-draft tests                | `Add lesson` / `Add quiz` / `Add practice` / `AI draft` buttons gone | Open `AddActivityMenu` (`/^add$/i` or `/add activity/i`), then click the item; Practice still opens `WidgetPicker` |
| `OutlineView.test.tsx` move/delete tests                                        | Move/delete now inside overflow                                      | Open `Activity actions for <title>`, then `Move intro down` / `Delete <title>`; confirm dialog unchanged           |
| `OutlineView.test.tsx` "navigates to edit"                                      | `within(list).getAllByRole('button', { name: /edit/i })`             | Open overflow → `Edit`, or click the row title button if that is the click target; assert `onEdit(path)` once      |
| `OutlineView.test.tsx` "renders empty (not spinner) via within list"            | Keep `<ul role="list">` + `<li>`                                     | No change needed if list markup kept                                                                               |
| `DevApp.test.tsx` "reset progress button in developer mode"                     | Button text stays "Reset Progress" (via i18n)                        | No change expected; verify                                                                                         |
| `DevApp.bundle.test.tsx`                                                        | switch + texts unchanged                                             | No change expected                                                                                                 |
| `CreatorPreview.test.tsx`                                                       | Reset test unchanged                                                 | Add one Exit test                                                                                                  |

When a test asserts an English string, prefer keeping the English value identical in `studio.json`
(e.g. "Reset Progress", "OpenEdu Studio", "My courses", "Learning path", "Rewards & cards") to
minimize churn. If a key's English value must change, update the test in the same commit.

---

## 7. New tests to write (summary)

| File                            | Coverage                                                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `StudioChrome.test.tsx`         | brand text, active `aria-current`, disabled+tooltip when no course, Share click, mode switch, `minimal` hides nav, breadcrumbs, axe |
| `HomeTemplateGallery.test.tsx`  | select via `aria-pressed`, single Use enabled after select, confirm/cancel/error                                                    |
| `OutlineActivityRow.test.tsx`   | badge+title render, overflow items fire Edit/Move/Delete, boundary disabled states, row click → edit                                |
| `AddActivityMenu.test.tsx`      | open menu, each item calls its handler                                                                                              |
| `EditorCoachingPanel.test.tsx`  | pass/fail items, tips, axe                                                                                                          |
| `DeveloperToolbar.test.tsx`     | buttons present + handlers, no fixed-position nodes                                                                                 |
| `studio-a11y.test.tsx` (extend) | add StudioChrome, HomeView, OutlineView, LessonActivityEditor, DeveloperToolbar axe passes                                          |

---

## 8. Final acceptance gate (definition of done)

Run all, in order:

```bash
pnpm --filter @open-edu/dev-server test          # all green (including new + updated tests)
pnpm --filter @open-edu/dev-server typecheck      # clean
pnpm lint                                         # includes hardcoded-strings, inline-styles, raw-text-scales, tailwind-staleness
pnpm format:check
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css   # regen + commit the diff
```

Manual spot-checks (Light/Dark/Zen):

- Cold open: logo + `OpenEdu Studio` visible; Share obvious; no floating buttons in Creator or Developer.
- Home first viewport = start composition (template gallery + one Use action).
- Outline: unified Add; overflow rows; keyboard Move up/down; accordion advanced panels; health strip.
- Editors: coaching checklist updates with form state; Save announces via `role="status"`.
- Preview: thin bar with Exit/Reset.
- a11y smoke (axe) green on shell + Home + Outline + one editor + Share.

Commit per phase with conventional messages. Do not force-push, do not amend shared history, do not
create PRs unless asked.
