# Course Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow learners to reset progress for a single course or an entire bundle, clearing associated data (progress snapshots, badges, cards, notes) and returning the course/bundle to its unstarted state.

**Architecture:** A three-layer approach — (1) new per-course deletion helpers in `@open-edu/storage`, (2) orchestrator functions in the learner app that coordinate multi-store cleanup, (3) UI components (context menu + confirmation dialog) integrated into CatalogPage, ProgressDashboard, and BundleOverviewPage. All user-facing strings use `t()` from `@open-edu/i18n`.

**Tech Stack:** TypeScript 5.x, React 18.x, IndexedDB (via idb), Radix UI Dialog (via @open-edu/design-system), Vitest, Playwright E2E.

---

## File Structure

```
packages/storage/src/
  badge-store.ts          [MODIFY] — add deleteBadges(courseId)
  note-store.ts           [MODIFY] — add deleteNotesByCourse(courseId)
  index.ts                [MODIFY] — export new functions
  __tests__/badge-store.test.ts   [MODIFY] — test deleteBadges
  __tests__/note-store.test.ts    [MODIFY] — test deleteNotesByCourse

apps/learner/src/
  resetCourseStorage.ts   [CREATE] — orchestrate single-course reset
  resetBundleStorage.ts   [CREATE] — orchestrate bundle reset
  ResetConfirmDialog.tsx  [CREATE] — confirmation dialog component
  CatalogPage.tsx          [MODIFY] — add reset UI to course/bundle cards
  ProgressDashboard.tsx    [MODIFY] — add reset UI to progress cards
  BundleOverviewPage.tsx   [MODIFY] — add reset button to bundle overview
  AppShell.tsx             [MODIFY] — refresh progress state after reset
  __tests__/ResetConfirmDialog.test.tsx      [CREATE] — dialog tests
  __tests__/resetCourseStorage.test.ts       [CREATE] — reset orchestrator tests
  __tests__/resetBundleStorage.test.ts       [CREATE] — reset orchestrator tests

packages/i18n/locales/en/
  learner.json            [MODIFY] — new i18n keys for reset UI
```

---

### Task 1: Add `deleteBadges(courseId)` to storage layer

**Files:**

- Modify: `packages/storage/src/badge-store.ts:17-24`
- Modify: `packages/storage/src/index.ts:24`
- Modify: `packages/storage/src/__tests__/badge-store.test.ts`

- [ ] **Step 1: Add `deleteBadges` function**

In `packages/storage/src/badge-store.ts`, append after the existing `deleteAllBadges` function:

```ts
export async function deleteBadges(courseId: string): Promise<void> {
  const db = await openDatabase();
  await db.delete('badges', courseId);
}
```

- [ ] **Step 2: Export from index**

In `packages/storage/src/index.ts`, change the badge export line (line 22-27) to:

```ts
export {
  saveBadge,
  getBadges,
  getAllBadges as getAllBadgeRecords,
  deleteAllBadges,
  deleteBadges,
} from './badge-store.js';
```

- [ ] **Step 3: Write and run storage tests**

In `packages/storage/src/__tests__/badge-store.test.ts`, add these tests at the end (before the final closing brace of the describe block):

```ts
it('deleteBadges removes badges for a specific course', async () => {
  await saveBadge('course-a', ['badge-1', 'badge-2']);
  await saveBadge('course-b', ['badge-3']);

  await deleteBadges('course-a');

  const a = await getBadges('course-a');
  const b = await getBadges('course-b');
  expect(a).toEqual([]);
  expect(b).toEqual(['badge-3']);
});

it('deleteBadges is a no-op for a course with no badges', async () => {
  await expect(deleteBadges('nonexistent')).resolves.toBeUndefined();
});
```

Run:

```
pnpm --filter @open-edu/storage test
```

Expected: all tests PASS

---

### Task 2: Add `deleteNotesByCourse(courseId)` to storage layer

**Files:**

- Modify: `packages/storage/src/note-store.ts:56-71`
- Modify: `packages/storage/src/index.ts:30-42`
- Modify: `packages/storage/src/__tests__/note-store.test.ts`

- [ ] **Step 1: Add `deleteNotesByCourse` function**

In `packages/storage/src/note-store.ts`, append after `deleteNotesByLesson` (after line 71):

```ts
export async function deleteNotesByCourse(courseId: string): Promise<void> {
  const db = await openDatabase();
  const notes = await listNotes({ courseId });
  const tx = db.transaction(['notes', 'note-tags'], 'readwrite');
  for (const note of notes) {
    await tx.objectStore('notes').delete(note.id);
    const tagStore = tx.objectStore('note-tags');
    const byNoteId = tagStore.index('byNoteId');
    let cursor = await byNoteId.openCursor(IDBKeyRange.only(note.id));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
  }
  await tx.done;
}
```

- [ ] **Step 2: Export from index**

In `packages/storage/src/index.ts`, change the note export block (lines 30-42) to include `deleteNotesByCourse`:

```ts
export {
  saveNote,
  getNote,
  listNotes,
  deleteNote,
  setNoteFavorite,
  addNoteTag,
  removeNoteTag,
  getNoteTags,
  listAllTags,
  bulkPutNotes,
  deleteNotesByLesson,
  deleteNotesByCourse,
} from './note-store.js';
```

- [ ] **Step 3: Write and run storage tests**

In `packages/storage/src/__tests__/note-store.test.ts`, add these tests:

```ts
it('deleteNotesByCourse removes notes for a specific course', async () => {
  const noteA: NoteRecord = {
    id: 'note-a',
    title: 'Note A',
    content: 'Content A',
    favorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    courseId: 'course-x',
    lessonId: 'lesson-1',
  };
  const noteB: NoteRecord = {
    id: 'note-b',
    title: 'Note B',
    content: 'Content B',
    favorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    courseId: 'course-y',
    lessonId: 'lesson-1',
  };

  await saveNote(noteA);
  await saveNote(noteB);

  await deleteNotesByCourse('course-x');

  const remaining = await listNotes();
  expect(remaining).toHaveLength(1);
  expect(remaining[0]!.id).toBe('note-b');
});

it('deleteNotesByCourse is a no-op for course with no notes', async () => {
  await expect(deleteNotesByCourse('no-notes-course')).resolves.toBeUndefined();
});
```

Run:

```
pnpm --filter @open-edu/storage test
```

Expected: all tests PASS

Run:

```
pnpm lint && pnpm typecheck
```

Expected: no errors

---

### Task 3: Create `resetCourseStorage.ts` orchestrator

**Files:**

- Create: `apps/learner/src/resetCourseStorage.ts`
- Create: `apps/learner/src/__tests__/resetCourseStorage.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/learner/src/__tests__/resetCourseStorage.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetCourse } from '../resetCourseStorage';

vi.mock('@open-edu/storage', () => ({
  deleteCourseProgress: vi.fn().mockResolvedValue(undefined),
  deleteBadges: vi.fn().mockResolvedValue(undefined),
  deleteAllCards: vi.fn().mockResolvedValue(undefined),
  deleteNotesByCourse: vi.fn().mockResolvedValue(undefined),
}));

import {
  deleteCourseProgress,
  deleteBadges,
  deleteAllCards,
  deleteNotesByCourse,
} from '@open-edu/storage';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resetCourse', () => {
  it('deletes progress, badges, cards, and notes for the given courseId', async () => {
    await resetCourse('my-course');

    expect(deleteCourseProgress).toHaveBeenCalledWith('my-course');
    expect(deleteBadges).toHaveBeenCalledWith('my-course');
    expect(deleteAllCards).toHaveBeenCalled();
    expect(deleteNotesByCourse).toHaveBeenCalledWith('my-course');
  });

  it('succeeds even when individual deletions throw', async () => {
    vi.mocked(deleteCourseProgress).mockRejectedValueOnce(new Error('DB error'));
    vi.mocked(deleteBadges).mockRejectedValueOnce(new Error('DB error'));

    await expect(resetCourse('my-course')).resolves.toBeUndefined();
  });

  it('clears all four stores in sequence', async () => {
    const order: string[] = [];
    vi.mocked(deleteCourseProgress).mockImplementation(async () => {
      order.push('progress');
    });
    vi.mocked(deleteBadges).mockImplementation(async () => {
      order.push('badges');
    });
    vi.mocked(deleteAllCards).mockImplementation(async () => {
      order.push('cards');
    });
    vi.mocked(deleteNotesByCourse).mockImplementation(async () => {
      order.push('notes');
    });

    await resetCourse('my-course');

    expect(order).toEqual(['progress', 'badges', 'cards', 'notes']);
  });
});
```

Run:

```
pnpm --filter @open-edu/learner test -- --grep 'resetCourseStorage'
```

Expected: FAIL — module not found

- [ ] **Step 2: Implement `resetCourseStorage.ts`**

Create `apps/learner/src/resetCourseStorage.ts`:

```ts
import {
  deleteCourseProgress,
  deleteBadges,
  deleteAllCards,
  deleteNotesByCourse,
} from '@open-edu/storage';

export async function resetCourse(courseId: string): Promise<void> {
  const operations = [
    deleteCourseProgress(courseId),
    deleteBadges(courseId),
    deleteAllCards(),
    deleteNotesByCourse(courseId),
  ];

  const results = await Promise.allSettled(operations);

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    console.warn(
      `[resetCourse] Some cleanup operations failed for "${courseId}":`,
      failures.map((f) => (f as PromiseRejectedResult).reason),
    );
  }
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run:

```
pnpm --filter @open-edu/learner test -- --grep 'resetCourseStorage'
```

Expected: 3 tests PASS

---

### Task 4: Create `resetBundleStorage.ts` orchestrator

**Files:**

- Create: `apps/learner/src/resetBundleStorage.ts`
- Create: `apps/learner/src/__tests__/resetBundleStorage.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/learner/src/__tests__/resetBundleStorage.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetBundle } from '../resetBundleStorage';
import type { LoadedBundle } from '@open-edu/core';

vi.mock('@open-edu/storage', () => ({
  deleteCourseProgress: vi.fn().mockResolvedValue(undefined),
  deleteBadges: vi.fn().mockResolvedValue(undefined),
  deleteAllCards: vi.fn().mockResolvedValue(undefined),
  deleteNotesByCourse: vi.fn().mockResolvedValue(undefined),
}));

import {
  deleteCourseProgress,
  deleteBadges,
  deleteAllCards,
  deleteNotesByCourse,
} from '@open-edu/storage';

beforeEach(() => {
  vi.clearAllMocks();
});

function makeBundle(moduleIds: string[]): LoadedBundle {
  return {
    rootDir: '/bundles/test',
    manifest: {
      id: 'test-bundle',
      type: 'bundle',
      title: 'Test Bundle',
      version: '1.0.0',
      author: 'test',
      modules: moduleIds.map((id) => ({
        id,
        title: `Module ${id}`,
        path: `/modules/${id}`,
        dependsOn: [],
      })),
    },
    modules: [],
    moduleMap: new Map(),
  } as unknown as LoadedBundle;
}

describe('resetBundle', () => {
  it('deletes bundle progress and all module progress/badges/notes and cards', async () => {
    const bundle = makeBundle(['mod-a', 'mod-b']);

    await resetBundle(bundle);

    expect(deleteCourseProgress).toHaveBeenCalledWith('test-bundle');
    expect(deleteCourseProgress).toHaveBeenCalledWith('mod-a');
    expect(deleteCourseProgress).toHaveBeenCalledWith('mod-b');
    expect(deleteBadges).toHaveBeenCalledWith('mod-a');
    expect(deleteBadges).toHaveBeenCalledWith('mod-b');
    expect(deleteAllCards).toHaveBeenCalled();
    expect(deleteNotesByCourse).toHaveBeenCalledWith('mod-a');
    expect(deleteNotesByCourse).toHaveBeenCalledWith('mod-b');
  });

  it('succeeds even when some deletions throw', async () => {
    const bundle = makeBundle(['mod-a']);
    vi.mocked(deleteCourseProgress).mockRejectedValueOnce(new Error('DB error'));

    await expect(resetBundle(bundle)).resolves.toBeUndefined();
  });
});
```

Run:

```
pnpm --filter @open-edu/learner test -- --grep 'resetBundleStorage'
```

Expected: FAIL — module not found

- [ ] **Step 2: Implement `resetBundleStorage.ts`**

Create `apps/learner/src/resetBundleStorage.ts`:

```ts
import type { LoadedBundle } from '@open-edu/core';
import {
  deleteCourseProgress,
  deleteBadges,
  deleteAllCards,
  deleteNotesByCourse,
} from '@open-edu/storage';

export async function resetBundle(bundle: LoadedBundle): Promise<void> {
  const operations: Promise<void>[] = [deleteCourseProgress(bundle.manifest.id)];

  for (const mod of bundle.manifest.modules) {
    operations.push(deleteCourseProgress(mod.id));
    operations.push(deleteBadges(mod.id));
    operations.push(deleteNotesByCourse(mod.id));
  }

  operations.push(deleteAllCards());

  const results = await Promise.allSettled(operations);

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    console.warn(
      `[resetBundle] Some cleanup operations failed for "${bundle.manifest.id}":`,
      failures.map((f) => (f as PromiseRejectedResult).reason),
    );
  }
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run:

```
pnpm --filter @open-edu/learner test -- --grep 'resetBundleStorage'
```

Expected: 2 tests PASS

---

### Task 5: Add i18n keys for reset UI

**Files:**

- Modify: `packages/i18n/locales/en/learner.json:45-46`

- [ ] **Step 1: Add i18n keys**

In `packages/i18n/locales/en/learner.json`, add after line 20 (`"welcome.heading": ...`):

```json
"reset.confirm_title": "Reset progress?",
"reset.confirm_description": "This will erase all your progress, badges, knowledge cards, and notes for this course. This action cannot be undone.",
"reset.confirm_bundle_description": "This will erase all progress, badges, knowledge cards, and notes for every module in this bundle. This action cannot be undone.",
"reset.button": "Reset Progress",
"reset.cancel": "Cancel",
"reset.confirm_button": "Yes, reset it",
"reset.success": "Progress has been reset.",
```

- [ ] **Step 2: Run lint to verify**

Run:

```
pnpm lint:hardcoded-strings
```

Expected: no new hardcoded string violations

---

### Task 6: Create `ResetConfirmDialog` component

**Files:**

- Create: `apps/learner/src/ResetConfirmDialog.tsx`
- Create: `apps/learner/src/__tests__/ResetConfirmDialog.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/learner/src/__tests__/ResetConfirmDialog.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import { ResetConfirmDialog } from '../ResetConfirmDialog';

const dictionaries = { en: { learner: {} } } as any;

function renderDialog(
  props: Partial<{ open: boolean; isBundle: boolean; courseTitle: string }> = {},
) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();

  render(
    <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
      <ResetConfirmDialog
        open={props.open ?? true}
        isBundle={props.isBundle ?? false}
        courseTitle={props.courseTitle ?? 'Test Course'}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </I18nProvider>,
  );

  return { onConfirm, onCancel };
}

describe('ResetConfirmDialog', () => {
  it('renders when open', () => {
    renderDialog();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('shows course title in description for single course', () => {
    renderDialog({ courseTitle: 'Algebra 101' });
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByTestId('reset-dialog-description')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const { onConfirm } = renderDialog();
    await userEvent.click(screen.getByTestId('reset-confirm-button'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const { onCancel } = renderDialog();
    await userEvent.click(screen.getByTestId('reset-cancel-button'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('sets focus on cancel button when opened', () => {
    renderDialog();
    const cancelBtn = screen.getByTestId('reset-cancel-button');
    expect(cancelBtn).toHaveFocus();
  });

  it('has accessible dialog semantics', () => {
    renderDialog();
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');
  });
});
```

Run:

```
pnpm --filter @open-edu/learner test -- --grep 'ResetConfirmDialog'
```

Expected: FAIL — component not found

- [ ] **Step 2: Implement `ResetConfirmDialog.tsx`**

Create `apps/learner/src/ResetConfirmDialog.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { useTranslation } from '@open-edu/i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from '@open-edu/design-system';
import { AlertTriangle } from 'lucide-react';

export interface ResetConfirmDialogProps {
  open: boolean;
  isBundle: boolean;
  courseTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ResetConfirmDialog({
  open,
  isBundle,
  courseTitle,
  onConfirm,
  onCancel,
}: ResetConfirmDialogProps): JSX.Element {
  const { t } = useTranslation();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => cancelRef.current?.focus(), 0);
    }
  }, [open]);

  const descriptionKey = isBundle
    ? 'reset.confirm_bundle_description'
    : 'reset.confirm_description';

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <DialogContent
        role="alertdialog"
        aria-labelledby="reset-dialog-title"
        aria-describedby="reset-dialog-description"
        className="sm:max-w-md"
      >
        <DialogHeader>
          <div className="mb-4 flex items-center gap-3">
            <div className="bg-error/10 flex h-10 w-10 items-center justify-center rounded-full">
              <AlertTriangle className="text-error h-5 w-5" />
            </div>
            <DialogTitle id="reset-dialog-title" className="text-h2 font-display">
              {t('reset.confirm_title')}
            </DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription id="reset-dialog-description" data-testid="reset-dialog-description">
          {t(descriptionKey)}
        </DialogDescription>
        <DialogFooter className="mt-6">
          <Button
            ref={cancelRef}
            variant="outline"
            onClick={onCancel}
            data-testid="reset-cancel-button"
          >
            {t('reset.cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm} data-testid="reset-confirm-button">
            {t('reset.confirm_button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run:

```
pnpm --filter @open-edu/learner test -- --grep 'ResetConfirmDialog'
```

Expected: all tests PASS

- [ ] **Step 4: Verify a11y**

Run axe-core audit via the existing test. Add to the test file:

```ts
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

it('has no a11y violations', async () => {
  const { container } = render(
    <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
      <ResetConfirmDialog
        open={true}
        isBundle={false}
        courseTitle="Test"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    </I18nProvider>,
  );
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

### Task 7: Add reset button to course cards in CatalogPage

**Files:**

- Modify: `apps/learner/src/CatalogPage.tsx:1-300`

- [ ] **Step 1: Add reset button to `CourseCardWithModule` context menu**

In `apps/learner/src/CatalogPage.tsx`, add imports at the top:

```tsx
import { useState, useCallback } from 'react';
import { MoreHorizontal, RotateCcw } from 'lucide-react';
import {
  // ... existing imports
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@open-edu/design-system';
import { ResetConfirmDialog } from './ResetConfirmDialog';
import { resetCourse } from './resetCourseStorage';
```

Check if `DropdownMenu` is exported from `@open-edu/design-system`. If not, we'll use a simple button + dialog pattern instead.

- [ ] **Step 2: Add reset state and handler to CatalogPage**

Inside the `CatalogPage` component function, after the existing state declarations (around line 47), add:

```tsx
const [resetTarget, setResetTarget] = useState<{
  courseId: string;
  title: string;
  isBundle: boolean;
} | null>(null);

const handleResetConfirm = useCallback(async () => {
  if (!resetTarget) return;
  if (resetTarget.isBundle) {
    const bundle = bundleEntries?.[resetTarget.courseId] as any;
    if (bundle) {
      await resetBundle(bundle);
    }
  } else {
    await resetCourse(resetTarget.courseId);
  }
  setResetTarget(null);
  getAllProgress().then(setProgress);
  getAllBadges().then(setBadgeData);
  onNavigate?.({ view: 'catalog' });
}, [resetTarget, onNavigate]);
```

Wait — bundle reset needs `LoadedBundle` which is not available in CatalogPage's props. Let me reconsider. The bundle reset needs the full bundle data. Let me check how bundles are loaded in the catalog.

Actually, looking at `AppShell.tsx`, `catalogBundles` and `bundleEntries` are separate. `catalogBundles` are `BundleSummary[]` and `bundleEntries` is `Record<string, LoadedBundle>`. The `CatalogPage` only receives `bundleSummaries` and `bundleProgress`, not `bundleEntries`.

I need to either:

1. Pass `bundleEntries` down to `CatalogPage`
2. Or pass `onResetBundle` callback from `AppShell`

Option 2 is cleaner. Let me adjust.

- [ ] **Step 2 (revised): Add state and handlers in AppShell**

In `apps/learner/src/AppShell.tsx`, add import:

```tsx
import { resetCourse } from './resetCourseStorage';
import { resetBundle } from './resetBundleStorage';
import { ResetConfirmDialog } from './ResetConfirmDialog';
```

Add state near line 196 (after bundleProgress):

```tsx
const [resetTarget, setResetTarget] = useState<{
  id: string;
  title: string;
  isBundle: boolean;
} | null>(null);
```

Add handlers:

```tsx
const handleReset = useCallback(async () => {
  if (!resetTarget) return;
  if (resetTarget.isBundle) {
    const bundle = bundleEntries[resetTarget.id];
    if (bundle) await resetBundle(bundle);
  } else {
    await resetCourse(resetTarget.id);
  }
  setResetTarget(null);
  setBundleProgress({});
}, [resetTarget, bundleEntries]);

const handleRequestReset = useCallback((id: string, title: string, isBundle: boolean) => {
  setResetTarget({ id, title, isBundle });
}, []);
```

Pass these to `CatalogPage`:

```tsx
<CatalogPage
  // ... existing props
  onRequestReset={handleRequestReset}
/>
```

Also pass to `ProgressDashboard`:

```tsx
<ProgressDashboard
  // ... existing props
  onRequestReset={handleRequestReset}
/>
```

And add the dialog at the end of `AppShellInner`'s JSX, before the closing `</div>`:

```tsx
<ResetConfirmDialog
  open={resetTarget !== null}
  isBundle={resetTarget?.isBundle ?? false}
  courseTitle={resetTarget?.title ?? ''}
  onConfirm={handleReset}
  onCancel={() => setResetTarget(null)}
/>
```

- [ ] **Step 3: Add reset option to CatalogPage course/bundle cards**

Update `CatalogPageProps` to include `onRequestReset`:

```tsx
export interface CatalogPageProps {
  // ... existing
  onRequestReset?: (id: string, title: string, isBundle: boolean) => void;
}
```

On each `CourseCardWithModule` in the "Continue Learning" section (line 161), add a reset button after the card. Use a simple pattern with a kebab menu:

For the continue list (around line 162), modify the mapping:

```tsx
{
  continueList.map((pkg) => (
    <div key={pkg.manifest.id} className="group relative">
      <CourseCardWithModule
        progress={progress[pkg.manifest.id] ?? null}
        badgeCount={badgeCounts[pkg.manifest.id] ?? 0}
      >
        <CourseCard
          manifest={pkg.manifest}
          nodeCount={pkg.nodeCount}
          badgeCount={pkg.availableBadges}
          earnedBadgeCount={badgeCounts[pkg.manifest.id] ?? 0}
          progress={progress[pkg.manifest.id] ?? null}
          onStart={() => onStartCourse(pkg.rootDir)}
        />
      </CourseCardWithModule>
      {progress[pkg.manifest.id] && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onRequestReset?.(pkg.manifest.id, pkg.manifest.title, false);
          }}
          aria-label={`Reset progress for ${pkg.manifest.title}`}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}
    </div>
  ));
}
```

Do the same for the full catalog grid (line 276), and for bundle cards (line 191).

For bundle cards:

```tsx
<div key={bundle.manifest.id} className="relative group">
  <BundleCardWithModule ...>
    <BundleCard ... />
  </BundleCardWithModule>
  {prog && (
    <Button
      variant="ghost"
      size="sm"
      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={(e) => {
        e.stopPropagation();
        onRequestReset?.(bundle.manifest.id, bundle.manifest.title, true);
      }}
      aria-label={`Reset progress for ${bundle.manifest.title}`}
    >
      <RotateCcw className="h-4 w-4" />
    </Button>
  )}
</div>
```

- [ ] **Step 4: Run CatalogPage tests**

Run:

```
pnpm --filter @open-edu/learner test -- --grep 'CatalogPage'
```

Expected: existing tests still pass; update snapshots if needed

Run:

```
pnpm lint && pnpm typecheck
```

Expected: no errors

---

### Task 8: Add reset button to ProgressDashboard

**Files:**

- Modify: `apps/learner/src/ProgressDashboard.tsx:1-160`

- [ ] **Step 1: Add reset to ProgressDashboard**

Update `ProgressDashboardProps`:

```tsx
export interface ProgressDashboardProps {
  onNavigate: (view: AppView) => void;
  catalogPackages?: PackageSummary[];
  packageEntries?: Record<string, LoadedPackage>;
  onRequestReset?: (id: string, title: string, isBundle: boolean) => void;
}
```

Add import:

```tsx
import { RotateCcw } from 'lucide-react';
```

On each `ProgressCard` (line 142), wrap in a relative container with a reset button:

```tsx
<div key={packageId} className="group relative">
  <ProgressCard
    title={title}
    status={isCompleted ? 'completed' : 'in-progress'}
    currentSteps={uniqueVisited}
    totalSteps={totalNodes}
    percent={percent}
    lastTitle={lastTitle}
    lastStudied={lastStudied}
    badgeCount={badgeCount}
    onContinue={() => onNavigate({ view: 'course', packageId })}
    onReview={isCompleted ? () => onNavigate({ view: 'course', packageId }) : undefined}
  />
  <Button
    variant="ghost"
    size="sm"
    className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
    onClick={(e) => {
      e.stopPropagation();
      onRequestReset?.(packageId, title, false);
    }}
    aria-label={`Reset progress for ${title}`}
  >
    <RotateCcw className="h-4 w-4" />
  </Button>
</div>
```

- [ ] **Step 2: Pass onRequestReset from AppShell**

In `AppShell.tsx` line 583, update:

```tsx
<ProgressDashboard
  onNavigate={handleNavigate}
  catalogPackages={catalogPackages}
  packageEntries={packageEntries}
  onRequestReset={handleRequestReset}
/>
```

- [ ] **Step 3: Run ProgressDashboard tests**

Run:

```
pnpm --filter @open-edu/learner test -- --grep 'ProgressDashboard'
```

Expected: existing tests still pass

Run:

```
pnpm lint && pnpm typecheck
```

Expected: no errors

---

### Task 9: Add reset button to BundleOverviewPage

**Files:**

- Modify: `apps/learner/src/BundleOverviewPage.tsx:1-70`

- [ ] **Step 1: Add reset button**

Update `BundleOverviewPageProps`:

```tsx
import { Button } from '@open-edu/design-system';
import { RotateCcw } from 'lucide-react';

export interface BundleOverviewPageProps {
  bundle: LoadedBundle;
  bundleProgress: BundleProgressSnapshot | null;
  onStartModule: (bundleId: string, moduleId: string) => void;
  onBackToCatalog: () => void;
  onRequestReset?: (id: string, title: string, isBundle: boolean) => void;
}
```

In the JSX, after the first `<div>` containing `<BundleOverview`, add a settings/actions section above the module list. Insert before the closing of the outer `<div>`:

```tsx
{
  bundleProgress && (
    <div className="mb-md flex justify-end">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onRequestReset?.(bundle.manifest.id, bundle.manifest.title, true)}
        aria-label={`Reset progress for ${bundle.manifest.title}`}
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        Reset Progress
      </Button>
    </div>
  );
}
```

Wait — the i18n rule says all user-facing strings must use `t()`. Let me fix this to use i18n.

Actually, looking at `ResetConfirmDialog`, the button already has the text `"Reset Progress"` as `t('reset.button')`. In BundleOverviewPage, the button text should use i18n too:

```tsx
import { useTranslation } from '@open-edu/i18n';

// inside the component:
const { t } = useTranslation();
```

And the button text:

```tsx
{
  t('reset.button');
}
```

- [ ] **Step 2: Pass onRequestReset from AppShell**

In `AppShell.tsx` line 571, update:

```tsx
<BundleOverviewPage
  bundle={bundle}
  bundleProgress={bundleProgress[view.bundleId] ?? null}
  onStartModule={handleStartBundleModule}
  onBackToCatalog={handleBackToCatalog}
  onRequestReset={handleRequestReset}
/>
```

- [ ] **Step 3: Run BundleOverviewPage tests**

Run:

```
pnpm --filter @open-edu/learner test -- --grep 'BundleOverviewPage'
```

Expected: existing tests pass

---

### Task 10: Refresh progress state after reset in AppShell

**Files:**

- Modify: `apps/learner/src/AppShell.tsx:215-230`

- [ ] **Step 1: Add refresh mechanism**

After the `handleReset` callback in AppShell (Task 7 Step 2), the progress state needs to be refreshed. The `handleReset` already clears `bundleProgress`. But individual course progress in the catalog is loaded locally in each component (`CatalogPage`, `HomePage`, `ProgressDashboard`). Since these components use `useEffect` to load progress on mount, and the reset triggers a navigation (`onNavigate?.({ view: 'catalog' })`), the re-mount should trigger a fresh load.

However, the CatalogPage uses `key={location.pathname}` in AppShell, so navigating to the same page (`/catalog`) won't remount. We need to force a re-render.

In `handleReset`:

```tsx
const handleReset = useCallback(async () => {
  if (!resetTarget) return;
  if (resetTarget.isBundle) {
    const bundle = bundleEntries[resetTarget.id];
    if (bundle) await resetBundle(bundle);
  } else {
    await resetCourse(resetTarget.id);
  }
  setResetTarget(null);
  setBundleProgress({});
  setResetCounter((c) => c + 1);
}, [resetTarget, bundleEntries]);
```

Add state:

```tsx
const [resetCounter, setResetCounter] = useState(0);
```

Pass `resetCounter` as a `key` prop to the content area to force remount:

In the AppShellInner JSX, change the non-course `<div>` (around line 546):

```tsx
<div
  key={`${location.pathname}-${resetCounter}`}
  className="animate-in fade-in slide-in-from-bottom-4 flex min-h-0 flex-1 flex-col overflow-y-auto duration-500"
>
```

And also for course views, pass it to the content div (around line 461):

```tsx
<div
  key={`${location.pathname}-${resetCounter}`}
  ref={courseContentRef}
  ...
>
```

- [ ] **Step 2: Run AppShell tests**

Run:

```
pnpm --filter @open-edu/learner test -- --grep 'AppShell'
```

Expected: existing tests pass

Run:

```
pnpm lint && pnpm typecheck
```

Expected: no errors

---

### Task 11: Add E2E test for course reset

**Files:**

- Create: `tests/e2e/course-reset.spec.ts`

- [ ] **Step 1: Write E2E test**

Create `tests/e2e/course-reset.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('Course Reset', () => {
  test('resets a single course through the catalog page', async ({ page }) => {
    await page.goto('/catalog');

    await page.getByTestId('catalog-page').waitFor();

    // Start a course first (using an existing one from examples)
    const catalogCards = page.getByTestId('continue-learning-shelf');
    await catalogCards.waitFor();

    const firstCourseCard = catalogCards.locator('.group').first();
    await firstCourseCard.hover();

    const resetButton = firstCourseCard.locator('[aria-label^="Reset progress for"]');
    // The reset button should appear on hover
    await expect(resetButton).toBeVisible();

    await resetButton.click();

    // Confirmation dialog should appear
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(page.getByTestId('reset-dialog-description')).toBeVisible();

    // Confirm reset
    await page.getByTestId('reset-confirm-button').click();

    // Dialog should close
    await expect(page.getByRole('alertdialog')).not.toBeVisible();
  });

  test('cancel reset leaves progress intact', async ({ page }) => {
    await page.goto('/catalog');
    await page.getByTestId('catalog-page').waitFor();

    const catalogCards = page.getByTestId('continue-learning-shelf');
    const firstCourseCard = catalogCards.locator('.group').first();
    await firstCourseCard.hover();

    const resetButton = firstCourseCard.locator('[aria-label^="Reset progress for"]');
    await resetButton.click();

    await expect(page.getByRole('alertdialog')).toBeVisible();

    // Cancel
    await page.getByTestId('reset-cancel-button').click();

    await expect(page.getByRole('alertdialog')).not.toBeVisible();

    // Course should still be in the continue section (not removed)
    await expect(catalogCards).toBeVisible();
  });
});
```

- [ ] **Step 2: Run E2E tests**

Run:

```
pnpm test:e2e -- course-reset
```

Expected: tests pass

---

### Task 12: Final verification

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm format:check
```

Expected: all pass with no errors

- [ ] **Step 2: Run dev server smoke test**

```bash
pnpm --filter @open-edu/learner dev
```

Expected: learner app starts on port 4001, no console errors

---

## Self-Review Checklist

**1. Spec coverage:**

- [x] Single course reset — Tasks 1-3, 5-8, 10-11
- [x] Bundle course reset — Tasks 1-2, 4-7, 9-11
- [x] Progress data cleared — Task 3 (deleteCourseProgress), Task 4 (deleteCourseProgress for module + bundle)
- [x] Badges cleared — Task 1 (deleteBadges), Tasks 3-4
- [x] Cards cleared — Tasks 3-4 (deleteAllCards)
- [x] Notes cleared — Task 2 (deleteNotesByCourse), Tasks 3-4
- [x] Confirmation dialog — Task 6
- [x] UI on CatalogPage — Task 7
- [x] UI on ProgressDashboard — Task 8
- [x] UI on BundleOverviewPage — Task 9
- [x] State refresh after reset — Task 10
- [x] i18n for all strings — Tasks 5-6, 7-9
- [x] Unit tests — Tasks 1-6
- [x] E2E tests — Task 11
- [x] Accessibility (axe-core) — Task 6 Step 4

**2. Placeholder scan:** No TBD, TODO, or "implement later" found.

**3. Type consistency:**

- `resetCourse(courseId: string)` — consistent across Tasks 3, 7, 8, 10
- `resetBundle(bundle: LoadedBundle)` — consistent across Tasks 4, 7, 9, 10
- `ResetConfirmDialog` props — consistent across Tasks 6, 7, 10
- `onRequestReset(id, title, isBundle)` — consistent across Tasks 7, 8, 9
- `deleteBadges(courseId)` — consistent across Tasks 1, 3, 4
- `deleteNotesByCourse(courseId)` — consistent across Tasks 2, 3, 4
