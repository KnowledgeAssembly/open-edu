# OpenEdu Notepad MVP — Implementation Plan

Status: Ready for execution
Spec: [/docs/notebook_mvp_spec.md](./notebook_mvp_spec.md)
Target agent: any single-session agent (e.g. deepseek-4-flash).
Repository: monorepo root `/Users/sarthakpatnaik/Code/open-edu`.

> **Read this entire file before writing any code.** Every section contains
> repo-specific conventions an agent WILL get wrong if it improvises. Cross-reference
> `AGENTS.md` for repo-wide rules (schemas-as-truth, i18n, a11y, token-only colors,
> conventional commits, one story per PR).

---

## 0. Pre-flight (every session, every story)

```bash
pnpm install                 # idempotent — re-runs after dep changes only
pnpm --filter @open-edu/learner dev   # start learner app on :4001 (Story 1+ verification)
```

Per-story verification commands (run before claiming done):

```bash
pnpm --filter @open-edu/storage typecheck && pnpm --filter @open-edu/storage test
pnpm --filter @open-edu/learner typecheck && pnpm --filter @open-edu/learner test
pnpm --filter @open-edu/learner lint
pnpm --filter @open-edu/learner exec prettier --check "src/**/*.{ts,tsx}"
```

Full-suite before opening a PR:

```bash
pnpm typecheck && pnpm test && pnpm lint && pnpm format:check
```

Commit messages use `feat(notes): ...`, `feat(storage): ...`, `test(notes): ...`,
from `AGENTS.md` rule #6. **One story per PR** (`AGENTS.md` rule #7).

---

## 1. Architecture summary (do not deviate)

The Notepad MVP is implemented as **a new domain inside the existing
`@open-edu/storage` package** (IndexedDB via the `idb` lib — see
`packages/storage/package.json:23`) plus **a set of components and pages inside
`apps/learner`** that hook into:

- the existing right-sidebar `notepad` tab (`apps/learner/src/CourseRightSidebar.tsx:78-110`) for **Lesson Notes** (Feature 1), and
- a new top-level `notes` view added to the router (`apps/learner/src/AppShell.tsx`) for the **Notes Dashboard**, **Note Editor**, and **Search** screens (Features 2,5,3,6).

### Why not SQLite WASM + OPFS as the spec "prefers"?

The repo already standardises on `idb` (IndexedDB) for all persistence — see
`packages/storage/src/db.ts` and the `NAMESPACES` of `db.createProgressStore`.
Adding `sql.js`/`absurd-sql`/OPFS workers would require: a new dep, Vite worker
config, PWA-core service changes, and a parallel DB to maintain. The spec explicitly
allows **Fallback: IndexedDB** (lines 470-473). The MVP leverages the existing,
tested `idb` infrastructure. SQLite WASM is deferred (out-of-scope for this plan).

### Why `MiniSearch` for search?

The learner app already uses MiniSearch + the `search-indexes` IDB store for course
content search (`apps/learner/src/searchService.ts`, `apps/learner/package.json`
`"minisearch": "^7.2.0"`). The Notes Search (Feature 6) reuses the same pattern with
a **separate in-memory index** scoped to notes (do **not** reuse the course search
`saveSearchIndex`/`getSearchIndex` — that store is keyed by `locale`; a separate
in-memory `MiniSearch` instance scoped to notes avoids cross-talk; persistence of
the notes index is **not required** for the MVP — see Story 7).

### Package / file layout to be created

```
packages/storage/src/
  db.ts                      # MODIFIED: bump DB_VERSION 2 -> 3, add 'notes' & 'note-tags' stores
  note-store.ts              # NEW: CRUD + bulk getAll + search helpers
  note-store.test.ts         # NEW

apps/learner/src/
  notesStorage.ts            # NEW: error-tolerant wrappers (mirrors cardsStorage.ts)
  notesStorage.test.ts       # NEW
  notesService.ts            # NEW: MiniSearch index build/query helpers for notes
  notesService.test.ts       # NEW
  notes/
    types.ts                 # NEW: re-export of Note from @open-edu/storage + local UI types
    NoteEditor.tsx           # NEW: Markdown editor (CodeMirror) — Feature 3
    Notepanel.tsx            # NEW: Lesson-Notes inline panel used inside CourseRightSidebar — Feature 1
    NotesDashboardPage.tsx   # NEW: /notes screen — Feature 5
    NotesSearchPanel.tsx     # NEW: search box + results — Feature 6
    NoteRow.tsx             # NEW: list row (favorite star, delete, title, snippet, tags)
    ExportDialog.tsx        # NEW: single/all .md + .json export — Feature 9
    TagFilterBar.tsx        # NEW: Feature 7
    useDebouncedAutosave.ts # NEW: Feature 4
    __tests__/
      NoteEditor.test.tsx
      Notepanel.test.tsx
      NotesDashboardPage.test.tsx
      NotesSearchPanel.test.tsx
      NoteRow.test.tsx
      ExportDialog.test.tsx
      TagFilterBar.test.tsx
      useDebouncedAutosave.test.ts
      *.a11y.test.tsx        # one per component, axe-core

packages/i18n/locales/en/
  notes.json                 # NEW: every user-visible string in this feature

apps/learner/src/
  i18n-dictionaries.ts       # MODIFIED: import notesEn, add to `en` map
  AppShell.tsx               # MODIFIED: add 'notes' + 'note-editor' AppView variants, nav item, switch block, back nav
  AppShell.test.tsx          # EXTEND: cover notes route + nav

tests/e2e/
  notes.spec.ts              # NEW: smoke E2E (Playwright, chromium only)
```

> **All** new TS/React files must compile under `pnpm --filter @open-edu/learner typecheck`
> and pass `pnpm --filter @open-edu/learner lint`. The lint step
> `pnpm lint:hardcoded-strings` (script `scripts/lint-no-hardcoded-strings.mjs`,
> `SCAN_ROOTS` includes `apps/learner/src`) will fail on any JSX literal text
> that lacks a nearby `t(` call — **every** user-facing string goes in
> `packages/i18n/locales/en/notes.json` and is read via `t('notes.<key>')`.

---

## 2. Domain & schema (Story 1)

Files: `packages/storage/src/db.ts`, `packages/storage/src/note-store.ts`,
`packages/storage/src/note-store.test.ts`, `packages/storage/src/index.ts`.

### 2.1 Storage upgrade (db.ts)

Following the existing pattern in `db.ts` (lines 46-83):

```ts
// db.ts changes:
export const DB_VERSION = 3; // was 2

export interface NoteRecord {
  id: string;
  title: string;
  content: string;
  favorite: boolean;
  createdAt: string; // ISO 8601, matches progress.ts pattern
  updatedAt: string;
  courseId?: string;
  lessonId?: string;
}

export interface NoteTagRecord {
  // denormalised tag list per note
  noteId: string;
  tag: string; // lowercased, no leading '#'
  // keyPath: ['noteId', 'tag']
}

export interface OpenEduDB {
  // ... existing stores unchanged ...
  notes: NoteRecord; // keyPath: 'id'
  'note-tags': NoteTagRecord; // keyPath: ['noteId', 'tag']
}
```

Inside `openDatabase()`'s `upgrade(db)` block, append (after the `cards` block):

```ts
if (!db.objectStoreNames.contains('notes')) {
  db.createObjectStore('notes', { keyPath: 'id' });
}
if (!db.objectStoreNames.contains('note-tags')) {
  db.createObjectStore('note-tags', { keyPath: ['noteId', 'tag'] });
}
```

**Design rationale:** spec section "Suggested Database Schema" (lines 486-515)
proposes 3 tables (`notes`, `tags`, `note_tags`). On IndexedDB we prefer a single
`note-tags` store with composite key `['noteId','tag']` — that completes the MVP
needs (add/remove tag, filter by tag) without an extra `tags` master table. Tag
uniqueness is enforced by the composite key. The full `Note` data model returned
to the UI packs `tags: string[]` into the `NoteRecord.content` consumer view via a
`note-store.ts` join helper — see 2.3.

### Export the new types & functions from `packages/storage/src/index.ts`:

```ts
export { type NoteRecord, type NoteTagRecord } from './db.js';
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
} from './note-store.js';
```

### 2.3 `note-store.ts` API contract (FULL implementation contract)

The implementing agent must produce these exact exported async functions so the
UI team and tests can call them by name:

```ts
import { openDB } from 'idb';
import { openDatabase, type NoteRecord, type NoteTagRecord, type OpenEduDB } from './db.js';

// Notes CRUD --------------------------------------------------------------
export async function saveNote(note: NoteRecord): Promise<void>;
// put — overwrites if same id. Used for create, rename, content edit, favorite.
// Validates: id/title/content non-empty, ISO timestamps.

export async function getNote(id: string): Promise<NoteRecord | undefined>;
export async function listNotes(opts?: {
  courseId?: string;
  lessonId?: string;
  favoriteOnly?: boolean;
}): Promise<NoteRecord[]>;
// returns notes ordered by `updatedAt` DESC.
// when `favoriteOnly`, filter favorite === true.
// when `courseId`/`lessonId` provided, filter on those (lessonId implies courseId).

export async function deleteNote(id: string): Promise<void>;
// MUST also delete all matching rows from 'note-tags' in the same transaction.

export async function bulkPutNotes(notes: NoteRecord[]): Promise<void>;
// single transaction, used by Story 9 (All notes export re-import not required,
// but is used for bulk update during export-snapshot feature later).

export async function deleteNotesByLesson(courseId: string, lessonId: string): Promise<void>;
// housekeeping for when a downloaded course is removed (not strictly required by MVP).

// Favorites --------------------------------------------------------------
export async function setNoteFavorite(id: string, favorite: boolean): Promise<void>;
// get then put; if note missing, no-op (don't throw).

// Tags --------------------------------------------------------------------
export async function getNoteTags(noteId: string): Promise<string[]>;
// returns [] if missing. Reads all 'note-tags' rows with the given `noteId`.
// Use index: create with `store.createIndex('byNoteId', 'noteId')` in upgrade.

export async function addNoteTag(noteId: string, tag: string): Promise<void>;
export async function removeNoteTag(noteId: string, tag: string): Promise<void>;
// Normalises `tag`: trim, lowercase, strip leading '#', reject empty/<0 length
// after normalisation, throw `new Error('Invalid tag')` (caught by UI layer).
// Insert duplicates are skipped (idempotent — composite key dedups).

export async function listAllTags(): Promise<string[]>;
// returns sorted unique tag names by scanning 'note-tags' store.
```

Add **one** IDB index in `db.ts` upgrade block (after creating `'note-tags'`):

```ts
const tagStore = db.createObjectStore('note-tags', { keyPath: ['noteId', 'tag'] });
tagStore.createIndex('byNoteId', 'noteId', { unique: false });
```

> ⚠ The agent must NOT create further stores — adding `tags` master is out of scope.
> Tags are derived (`listAllTags` scans `note-tags`).

### 2.4 Tests for `note-store.ts`

File: `packages/storage/src/note-store.test.ts`. Follow the existing pattern in
`packages/storage/src/*-store.test.ts` and `vitest.config.ts` (already imports
`fake-indexeddb/auto` via `src/__tests__/setup.ts`). Cover:

- `saveNote` + `getNote` round-trip.
- `listNotes` orders by `updatedAt` DESC.
- `listNotes({ courseId })` filters; `listNotes({ favoriteOnly })` filters.
- `deleteNote` removes the note AND its tags.
- `setNoteFavorite` toggles; no-op on missing id.
- `addNoteTag`/`removeNoteTag`: idempotent, normalises `#Important` → `important`,
  rejects empty after trim.
- `getNoteTags` + `listAllTags` returns unique sorted.
- DB upgrade path: open db at `DB_VERSION=3` from a fresh `fake-indexeddb` then
  assert `db.objectStoreNames` contains `'notes'` and `'note-tags'` and the index
  `byNoteId` exists.

Run: `pnpm --filter @open-edu/storage test`.

**Done criteria Story 1:** all above tests green; `pnpm --filter @open-edu/storage typecheck`
passes; `note-store.ts` exports wired in `packages/storage/src/index.ts`.

---

## 3. i18n namespace (Story 2)

### 3.1 Create `packages/i18n/locales/en/notes.json`

Keys the implementing agent MUST define (replace English placeholder text with
the listed values):

```json
{
  "nav.notes": "Notes",
  "dashboard.title": "Notes",
  "dashboard.subtitle": "Capture insights while you learn.",
  "dashboard.section.recent": "Recent Notes",
  "dashboard.section.favorites": "Favorites",
  "dashboard.section.tags": "Tags",
  "dashboard.empty.title": "No notes yet",
  "dashboard.empty.body": "Notes you write in a lesson or on this page will appear here.",
  "dashboard.create": "New note",
  "dashboard.delete.confirm": "Delete this note? This cannot be undone.",
  "row.open": "Open note",
  "row.favorite.add": "Mark as favorite",
  "row.favorite.remove": "Remove favorite",
  "row.delete": "Delete note",
  "row.snippet.empty": "No additional text",
  "editor.title.placeholder": "Untitled note",
  "editor.body.placeholder": "Start writing…",
  "editor.body.label": "Note body",
  "editor.save.saving": "Saving…",
  "editor.save.saved": "Saved",
  "editor.save.failed": "Save failed",
  "editor.delete": "Delete",
  "editor.export": "Export",
  "editor.tags.label": "Tags",
  "editor.tags.add": "Add tag",
  "editor.tags.placeholder": "Add a tag",
  "editor.tags.remove": "Remove tag",
  "editor.course.label": "Course",
  "editor.lesson.label": "Lesson",
  "panel.title": "My Notes",
  "panel.empty": "You haven't written notes for this lesson yet.",
  "panel.open_in_dashboard": "Open in Notes",
  "search.placeholder": "Search notes",
  "search.label": "Search notes",
  "search.no_results": "No matches. Try a different word.",
  "search.results.aria": "{{count}} results",
  "search.snippet.empty": "No preview available",
  "export.title": "Export notes",
  "export.markdown": "Markdown (.md)",
  "export.json": "JSON (.json)",
  "export.single": "Export this note",
  "export.all": "Export all notes",
  "export.cancel": "Cancel",
  "tag.filter.title": "Filter by tag",
  "tag.filter.clear": "Clear filter",
  "tag.aria.list": "Tags for this note",
  "tag.aria.filter": "Available tags"
}
```

> Keep key names stable — the component code references them verbatim.

### 3.2 Wire it into `apps/learner/src/i18n-dictionaries.ts`

```ts
import notesEn from '@open-edu/i18n/locales/en/notes.json';

export const dictionaries: Record<string, Record<string, Record<string, string>>> = {
  en: {
    runtime: runtimeEn as Record<string, string>,
    learner: learnerEn as Record<string, string>,
    widgets: widgetsEn as Record<string, string>,
    schemas: schemasEn as Record<string, string>,
    notes: notesEn as Record<string, string>, // ADD
  },
};
```

**Do NOT add `notes` to `packages/i18n/src/namespaces.ts` `NAMESPACES` tuple** —
`NAMESPACES` is only used by the CLI extractor for source annotation; runtime
loaders (`apps/learner/src/i18n-dictionaries.ts`) are independent. (Verify by reading
`packages/i18n/src/namespaces.ts` — apps register whatever they pass in `dictionaries`.)
However, the lint script `scripts/lint-no-hardcoded-strings.mjs` does not enforce
namespace membership; it only scans JSX literals. Adding to `NAMESPACES` is allowed
but not required. Leave the tuple as-is to avoid touching the i18n package; the
`notes` namespace loads fine because `I18nProvider` simply calls
`engine.loadNamespace(namespace, localeKey, data)` for each entry of the
`dictionaries` map (`packages/i18n/src/context.tsx`).

### 3.3 Usage pattern in components

```tsx
import { useTranslation } from '@open-edu/i18n';
const { t } = useTranslation();
<button>{t('notes.dashboard.create')}</button>
<p>{t('notes.search.results.aria', { count: results.length })}</p>
```

### 3.4 Story 2 acceptance

- `notes.json` present & valid JSON.
- `i18n-dictionaries.ts` updated; `pnpm --filter @open-edu/learner typecheck` passes.
- Unit test `apps/learner/src/notes/__tests__/i18n-keys.test.ts` (NEW, tiny)
  imports `notesEn` and asserts each key listed in 3.1 exists and is non-empty.

---

## 4. Storage access layer in the learner app (Story 3)

`@open-edu/storage` access must be wrapped because IndexedDB can be unavailable
(Safari private mode, SSR); follow the existing pattern in
`apps/learner/src/cardsStorage.ts`. Read that file first — mirror its try/catch
shape.

File: `apps/learner/src/notesStorage.ts`

Export (all async, all null/[] tolerant):

```ts
import {
  saveNote, getNote, listNotes, deleteNote, setNoteFavorite,
  addNoteTag, removeNoteTag, getNoteTags, listAllTags,
  deleteNotesByLesson, type NoteRecord,
} from '@open-edu/storage';

export type { NoteRecord } from '@open-edu/storage';

export async function safeSaveNote(n: NoteRecord): Promise<boolean> { /* try/catch, return false on error */ }
export async function safeGetNote(id: string): Promise<NoteRecord | null> { ... }
export async function safeListNotes(opts?: { courseId?: string; lessonId?: string; favoriteOnly?: boolean }): Promise<NoteRecord[]> { ... }
export async function safeDeleteNote(id: string): Promise<boolean> { ... }
export async function safeSetFavorite(id: string, fav: boolean): Promise<boolean> { ... }
export async function safeAddNoteTag(id: string, tag: string): Promise<boolean> { ... }
export async function safeRemoveNoteTag(id: string, tag: string): Promise<boolean> { ... }
export async function safeGetNoteTags(id: string): Promise<string[]> { ... }
export async function safeListAllTags(): Promise<string[]> { ... }
export async function safeDeleteNotesForLesson(courseId: string, lessonId: string): Promise<boolean> { ... }
export function newNoteId(): string { return `note_${crypto.randomUUID()}`; }
export function nowIso(): string { return new Date().toISOString(); }
```

Tests (`apps/learner/src/notesStorage.test.ts`): mock `@open-edu/storage` with
`vi.mock` and assert each `safe*` returns falsy / [] / null when underlying throws.

---

## 5. Lesson-Notes panel (Feature 1, Story 4)

### 5.1 Wire into `apps/learner/src/CourseRightSidebar.tsx`

Replace the placeholder `TabsContent value="notepad"` block (lines 103-110)
with `<NotePanel courseId={courseIdProp} lessonId={lessonIdProp} />`.

`CourseRightSidebar` currently has **no access** to course/lesson context — the
component receives none. The implementing agent must read context:
`CourseRightSidebar` is rendered by `AppShell.tsx` (around line 581) **only in
`course` view**; the surrounding `<CourseRuntime>`/`<AppLayout>` exposes
`useRuntimeOptional()` (see `AppShell.tsx:384` which does this). The agent should:

1. Inside `CourseRightSidebar.tsx`, call `const runtime = useRuntimeOptional();`
   and read `runtime?.courseId` + `runtime?.currentNodeId` from `RuntimeContext`
   (verify exact names by reading `packages/runtime/src/context/RuntimeContext.tsx`
   before using them). Fallback to `''` when absent.
2. Pass those into `<NotePanel courseId lessonId />`.

If context access is fragile, an alternative is to add optional props to
`CourseRightSidebar` and have `AppShell.tsx` read runtime state and pass them
down. Either approach is acceptable; pick the simpler one.

### 5.2 `apps/learner/src/notes/NotePanel.tsx` (the Lesson Notes Panel — Screen 1)

Responsibilities:

- On mount: `safeListNotes({ courseId, lessonId })` → show last updated note or
  create one (title `''`, content `''`) if none.
- Render a `<NoteEditor note={note} compact />` (compact mode shrinks toolbar; see Story 6).
- Save: `<NoteEditor>` itself does the debounced autosave — `NotePanel` only
  seeds it with courseId/lessonId.
- Header row: title "My Notes" (`t('notes.panel.title')`), subtitle
  "Open in Notes" button → `handleNavigate({ view: 'notes' })`. The component
  receives `onOpenInNotes: () => void` via prop (the App-level `handleNavigate`
  passed in). Do not call `useNavigate` here — `AppShell` already owns navigate.

Layout: `flex flex-col gap-md p-md min-h-0 flex-1`. Use `Textarea`-like styling
with Tailwind tokens only (`bg-surface text-on-surface border-outline-variant`).

### 5.3 Tests

`apps/learner/src/notes/__tests__/NotePanel.test.tsx` — RTL render; mock
`notesStorage` with `vi.mock`; assert placeholder text uses `t('notes.panel.empty')`
on first load; assert that typing triggers debounced save after debounce window.
Assert `<NotePanel>` lives inside the `notepad` tab via integration in
`apps/learner/src/__tests__/CourseRightSidebar.test.tsx` (NEW — or extend an
existing file if present; if not present, create it).

`apps/learner/src/notes/__tests__/NotePanel.a11y.test.tsx` — wrap in
`<RuntimeThemeProvider themeId="lumina-scholastica"><FontSizeProvider>` and run axe.

---

## 6. Note Editor + autosave (Feature 3 + 4, Story 5)

### 6.1 Library: **CodeMirror 6**

The spec lists CodeMirror or TipTap (Markdown mode) as preferred. **Use CodeMirror 6**
because it has no React-DOM layout side-effects and renders inside the existing
Tailwind flow without an inner React portal. Add deps to `apps/learner/package.json`:

```jsonc
"@uiw/react-codemirror": "^4.21.0",
"@codemirror/lang-markdown": "^6.2.0",
"@codemirror/view": "^6.0.0"
```

(Confirm `pnpm install` succeeds; if version not found, use the latest 4.x of
`@uiw/react-codemirror` and matching 6.x of core packages.)

> Do **NOT** add a rich-text toolbar — violates the UX principle "avoid complex
> toolbars" (spec lines 372-384). The editor is plain Markdown source with
> optional inline formatting keymap.

### 6.2 `apps/learner/src/notes/NoteEditor.tsx` props

```ts
interface NoteEditorProps {
  initial: NoteRecord;
  compact?: boolean; // true when shown in the lesson right-sidebar
  onSaved?: (n: NoteRecord) => void;
  onDeleted?: (id: string) => void;
}
```

Behaviour:

- Two top inputs: title (`<Input>`) + tags (`<TagFilterBar>` editing variant, Story 8).
- Markdown body: `<CodeMirror value={content} onChange={...} extensions={[markdown()]} />`
  inside a `flex-1 overflow-auto` container with `font-mono text-body-ui`.
- The Markdown subset supported (spec Feature 3, lines 110-127) is enforced only
  by **rendering** in the search/dashboard snippets — the editor itself does not
  sanitize input; that's intentional MVP scope (do NOT add a Markdown lint pass).
- Save status indicator chip (`saved | saving | failed`) shown top-right with
  `aria-live="polite"` wrapping via `useLiveRegion()` from `@open-edu/accessibility`
  (see `packages/accessibility/src/live-region.tsx`) when status changes. Status
  messages: `notes.editor.save.saving/saved/failed`.
- Delete button (trash icon) opens a confirm dialog using the `Dialog` primitive
  from `@open-edu/design-system/primitives/dialog.tsx`; on confirm, call
  `safeDeleteNote(id)` → `onDeleted?.(id)`.
- Export button opens `<ExportDialog note={note} />` (Story 9).

### 6.3 `useDebouncedAutosave` hook (Feature 4)

File: `apps/learner/src/notes/useDebouncedAutosave.ts`

Contract:

```ts
export type SaveStatus = 'saved' | 'saving' | 'failed' | 'idle';
export function useDebouncedAutosave(
  note: NoteRecord,
  save: (n: NoteRecord) => Promise<boolean>,
  opts?: { debounceMs?: number }, // default 1500 ms
): { status: SaveStatus; flush: () => Promise<void>; setStatus };
```

Implementation rules:

- On every `note.content`/`note.title`/`note.tags` mutation (the parent holds the
  state via `useState`/`useReducer`), call `setStatus('saving')` and reset a
  `setTimeout` of `debounceMs` (default 1500). On fire, set `updatedAt = nowIso()`,
  call `save(note)`, set `status = result ? 'saved' : 'failed'`.
- On unmount, `flush()` (call any pending timeout synchronously, await save).
  Use `useEffect` cleanup to ensure no data loss on navigation.
- Do NOT save when `note.title === '' && note.content === ''` (skip empty notes).
- Expose `flush()` for parent usage (used before navigation/`onDeleted`).

### 6.4 Tests

`useDebouncedAutosave.test.ts` — use `vi.useFakeTimers()`; simulate changes;
advance timers by 1500ms; assert save called once; assert `flush` saves pending;
assert `''` empty note never saves.

`NoteEditor.test.tsx` — render provider-wrapped; type title; assert save called
after debounce; assert Dialog opens on delete; assert decline of confirm keeps
note.

`NoteEditor.a11y.test.tsx` — axe has no violations; check that the save-status
chip is in an `aria-live` region (axe passes — the role is allowed).

---

## 7. Notes Dashboard + routing (Feature 2 + 5, Story 6)

### 7.1 Router changes in `apps/learner/src/AppShell.tsx`

Add two new variants to the `AppView` discriminated union (around lines 56-64):

```ts
| { view: 'notes' }
| { view: 'note-editor'; noteId: string }
```

Update `viewToPath` (lines 66-88): add cases

```ts
case 'notes': return '/notes';
case 'note-editor': return `/notes/${view.noteId}`;
```

Update `pathToView` (lines ~90-110): add

```ts
if (main === 'notes') return { view: 'notes' };
if (main.startsWith('notes/')) return { view: 'note-editor', noteId: main.slice('notes/'.length) };
```

(Confirm exact segment-extraction style by reading the existing `course` case —
use the same `main.split('/')` approach.)

Add a sidebar nav item in `navItems` (lines 345-351); place between `progress`
and `collection`:

```ts
{ id: 'notes', label: t('learner.nav.notes'), icon: <StickyNote className="h-5 w-5" /> },
```

…and import `StickyNote` from `lucide-react` near the existing Lucide imports
at the top of `AppShell.tsx`.

Add `learner.nav.notes` = `"Notes"` to `packages/i18n/locales/en/learner.json`
under the `nav` sub-object (mirrors `nav.home`, `nav.catalog`, …). Use this key
for the sidebar item, NOT `notes.nav.notes`.

Add `'notes'` case to `handleNavAction` switch (lines 360-381):

```ts
case 'notes': handleNavigate({ view: 'notes' }); break;
```

Add render blocks (alongside lines 526-574):

```tsx
{
  view.view === 'notes' && <NotesDashboardPage onNavigate={handleNavigate} />;
}
{
  view.view === 'note-editor' && view.noteId && (
    <NotesDashboardPage activeNoteId={view.noteId} onNavigate={handleNavigate} />
  );
}
```

(Or render a dedicated `<NoteEditorPage>` — either works. Reusing the dashboard
layout as host with a `<Drawer>`/Respond dialog editor is simpler; pick the one
that minimises new top-level components. Recommended: dedicated
`NoteEditorPage.tsx` that renders `<NoteEditor/>` full-screen; cleaner routing.)

Recommended, final:

```tsx
{
  view.view === 'notes' && <NotesDashboardPage onNavigate={handleNavigate} />;
}
{
  view.view === 'note-editor' && view.noteId && (
    <NoteEditorPage noteId={view.noteId} onNavigate={handleNavigate} />
  );
}
```

Create `apps/learner/src/notes/NoteEditorPage.tsx` as a thin wrapper that loads
the note via `safeGetNote` then renders `<NoteEditor initial={note} onDeleted={() => onNavigate({view:'notes'})} />`.

Back navigation handled in `AppShell` via existing `useBlocker`/back-button pattern.

### 7.2 `NotesDashboardPage.tsx` (Screen 2 — Dashboard)

Layout following `DashboardLayout` from `@open-edu/design-system` (read
`packages/design-system/src/patterns/DashboardLayout.tsx` before writing):

- Header: `<PageHeader>` (design-system pattern) showing
  `t('notes.dashboard.title')` + subtitle `t('notes.dashboard.subtitle')` +
  primary button `t('notes.dashboard.create')` (Lucide `Plus` icon).
- Top: `<NotesSearchPanel onOpenNote={(id)=>onNavigate({view:'note-editor',noteId:id})} />` (Feature 6, see Story 8).
- Sections in order:
  1. **Recent Notes** — `safeListNotes()` top 6 (excluding favorite-duplicates).
     Render `<NoteRow/>` each.
  2. **Favorites** — `safeListNotes({ favoriteOnly: true })`, top 10.
  3. **Tags** — `<TagFilterBar>` selecting active tag (Feature 7); below it
     list notes whose tags include the selected tag.
- Empty state: `<EmptyState>` (design-system pattern) with title/body from i18n.
- Every list `data-testid="notes-recent-list"`, `notes-favorites-list`, `notes-tags-list`.

### 7.3 `NoteRow.tsx`

Props:

```ts
interface NoteRowProps {
  note: NoteRecord;
  tags: string[];
  onOpen: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}
```

Render:

- Row is a `<button>` (focus ring via Tailwind `focus-visible:ring-2 ring-primary`)
  to open — entire row clickable.
- Inside: title (h3 `text-h3`), snippet (first 120 chars of content plaintext,
  ellipsised — `notes.row.snippet.empty` when blank), tag `<Tag>` chips, course/lesson
  label when present.
- Right side: favorite star button (`Star` from lucide, solid when favorite),
  delete button (with confirm dialog inline — smallest possible: a `Dialog` with
  cancel/delete buttons).

Tests: `NoteRow.test.tsx` (RTL + user click handlers mock); `NoteRow.a11y.test.tsx`
(axe: row must be focusable but not nested-button inside another button — if
needed, lift the open-button to wrap only the title, not the action buttons.

> **a11y gotcha:** nesting `<button>` inside a clickable row `<button>` causes
> axe violations. Render the row as `<li role="button" tabIndex={0}>` with a
> keyboard `onKeyDown` Enter/Space handler, and the action buttons as siblings.
> **Verify axe passes** before commit.

---

## 8. Notes search (Feature 6, Story 7)

### 8.1 `apps/learner/src/notesService.ts`

Mirror `apps/learner/src/searchService.ts` exactly:

```ts
import MiniSearch from 'minisearch';
import type { NoteRecord } from './notesStorage';

export interface NoteSearchDocument {
  id: string;
  title: string;
  content: string;
  courseId?: string;
  lessonId?: string;
  tags?: string[];
}

export interface NoteSearchResult {
  id: string;
  title: string;
  snippet: string;
  courseId?: string;
  lessonId?: string;
}

let cache: MiniSearch | null = null;

export function buildNotesIndex(notes: NoteSearchDocument[]): MiniSearch {
  /* new MiniSearch({ fields: ['title','content','tags'], storeFields: ['title','content','courseId','lessonId'] }); index.addAll; cache = index; return */
}

export async function rebuildNotesIndex(): Promise<MiniSearch> {
  const notes = await safeListNotes();
  const docs = await Promise.all(
    notes.map(async (n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      courseId: n.courseId,
      lessonId: n.lessonId,
      tags: await safeGetNoteTags(n.id),
    })),
  );
  return buildNotesIndex(docs);
}

export function queryNotes(index: MiniSearch, q: string, limit = 20): NoteSearchResult[] {
  if (!q.trim()) return [];
  const hits = index.search(q, { prefix: true, fuzzy: 0.2 });
  return hits.slice(0, limit).map((h) => {
    const r = h as unknown as {
      id: string;
      title: string;
      content: string;
      courseId?: string;
      lessonId?: string;
    };
    return {
      id: r.id,
      title: r.title || '',
      snippet: makeSnippet(r.content || '', q),
      courseId: r.courseId,
      lessonId: r.lessonId,
    };
  });
}

export function makeSnippet(content: string, query: string, pad = 80): string {
  const i = content.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return content.slice(0, pad).trim();
  const start = Math.max(0, i - pad / 2);
  return (start > 0 ? '…' : '') + content.slice(start, start + pad).trim() + '…';
}
```

The index lives in-memory and is rebuilt on dashboard mount and after each save.
Do **not** persist it — MVP only; spec requires "Instant search + Works offline",
both satisfied while the in-memory index is loaded. Persistence deferred.

### 8.2 `NotesSearchPanel.tsx`

- `<label>` with `t('notes.search.label')` (`sr-only`), an `<Input>` with
  `placeholder={t('notes.search.placeholder')}`, `aria-controls="notes-search-results"`,
  `aria-expanded`.
- Results region `id="notes-search-results" role="listbox"`; each result a
  `role="option"` button showing title + snippet + course/lesson label per spec
  (lines 209-218). On click → `onOpenNote(id)`.
- Debounce query input 200ms; on each fire, `queryNotes(index, q)` and announce
  result count via `useLiveRegion()` (`announce(t('notes.search.results.aria', {count}))`).
- Empty result message `t('notes.search.no_results')`.

Tests: `NotesSearchPanel.test.tsx` + `.a11y.test.tsx`; mock index; assert
announcements, keyboard nav (arrow down into result list — use
`useKeyboardNavigation` from `@open-edu/accessibility` if it fits, else simple
custom handler; if not, keep Tab navigation, simpler).

---

## 9. Tags (Feature 7, Story 8)

### 9.1 `TagFilterBar.tsx` — two modes

```ts
interface TagFilterBarProps {
  mode: 'edit' | 'filter';
  noteId?: string; // required when mode='edit'
  activeTag?: string; // required when mode='filter'
  onActiveTagChange?: (tag: string | null) => void;
}
```

**`edit` mode** (used in `NoteEditor`):

- Renders existing tags for `noteId` as chips with a small `×` button (calls
  `safeRemoveNoteTag`).
- An `<Input>` (`t('notes.editor.tags.placeholder')`) where Enter adds a new tag
  via `safeAddNoteTag`. Normalise: trim/lowercase/strip `#`.
- New chip appended after successful save. Use `aria-label={t('notes.editor.tags.add')}`
  on input + `aria-live="polite"` region announcing add/remove.

**`filter` mode** (used on the dashboard):

- Renders `safeListAllTags()` as toggle chips. Selecting sets `activeTag`.
- Only one tag selectable at a time for the MVP (spec: "Filter by tag", singular —
  no nested tagn or multi-select).
- Shows a clear-chip when `activeTag != null` labelled `t('notes.tag.filter.clear')`.

Tests: `TagFilterBar.test.tsx` covers both modes; mocks storage. Assert the
`add` reject-empty case. `TagFilterBar.a11y.test.tsx` axe-clean.

### 9.2 Tag invalidation

When `<NotesDashboardPage>` re-mounts or after `safeAddNoteTag`/`removeNoteTag`,
re-fetch `safeListAllTags()` and pass into `<TagFilterBar mode='filter'>`.

---

## 10. Favorites (Feature 8, Story 6 continuation)

Handled in `NoteRow` (Story 6) — favorite toggle button. Spec only requires
★ / ☆; implement with `Star` lucide icon filled/unfilled + `aria-pressed="true|false"`.
Announce via `useLiveRegion`.

No dedicated store addition is needed — `setNoteFavorite` (Story 1) handles it.

---

## 11. Export (Feature 9, Story 9)

### 11.1 `ExportDialog.tsx`

Open via `Dialog` primitive. Inside:

- Radio group (`RadioGroup` from `@open-edu/design-system`) options:
  - `t('notes.export.single')` / `t('notes.export.all')`
- Format radio: `t('notes.export.markdown')` / `t('notes.export.json')`
- Confirm button calls the chosen path then closes.

When `single` + `.md`: produce:

```md
# {title}

{content}

---

_course: {courseId ?? '-'} lesson: {lessonId ?? '-'}_
_created: {createdAt} updated: {updatedAt}_
_tags: {tags.join(', ')}_
```

When `single` + `.json`: serialize the `NoteRecord`+`tags[]` object.

When `all` + `.md`: concatenate all notes separated by `\n\n---\n\n` with the same
template. When `all` + `.json`: an array.

Download: create a `Blob`, use `URL.createObjectURL` + a hidden anchor click.
**Filename:** note title slugged (or `all-notes`) + extension.

### 11.2 Tests

`ExportDialog.test.tsx` — mock `safeListNotes` & `safeGetNoteTags`; assert
file content & Blob type for each (single/all × md/json); assert download anchor
triggered (mock `URL.createObjectURL` + anchor.click). Accessibility test in
`ExportDialog.a11y.test.tsx` (axe on dialog open).

---

## 12. Standalone note create/rename/delete (Feature 2, Story 10)

Already partially covered:

- **Create**: dashboard "New note" button calls
  `const id = newNoteId(); const note = { id, title:'', content:'', favorite:false, createdAt:nowIso(), updatedAt:nowIso() }; await safeSaveNote(note); onNavigate({view:'note-editor', noteId:id});`
- **Rename**: the `<NoteEditor>` title `<Input>` updates the note state and the
  autosave hook persists. No separate rename API required.
- **Delete**: existing `<NoteEditor>` delete button + `<NoteRow>` delete button.
- **Search**: covered.

No new files for Story 10; verification = the dashboard "New note" button test
in `NotesDashboardPage.test.tsx` calling the above flow and asserting
`onNavigate` receives `{view:'note-editor', noteId: '<uuid>'}`.

---

## 13. E2E test (Story 11)

File: `tests/e2e/notes.spec.ts`.

Use the conventions from existing `tests/e2e/learner-experience.spec.ts`:

- `LEARNER_URL = 'http://localhost:4001'`,
- selectors via `[data-testid="..."]`.
- The learner dev server auto-starts (playwright.config.ts `webServer`).

Cases (chromium-only, sequential):

1. Navigate to Notes via sidebar; assert `data-testid="notes-page"` visible.
2. Click "New note"; assert URL has `/notes/<id>`.
3. Type "Photosynthesis is amazing" into body; reload page; assert content persisted.
4. Open dashboard; assert the note appears in Recent.
5. Type into search box; assert result appears; click; assert editor opens.
6. Toggle favorite; reload; assert appears in Favorites section.
7. Add tag `revision`; reload; assert Tags section shows it.
8. Export single note as Markdown; assert download triggered (mock via
   `page.on('download')` — Playwright supports this directly).
9. Delete note; confirm dialog; assert removed from list.

Run: `pnpm test:e2e -- notes`.

---

## 14. Story-by-story order (recommended PR sequence)

Each story is a single PR (per AGENTS.md rule #7). Stories 1-3 are foundational.
Stories 4-9 can be partially parallelised by separate agents, but 6-9 all depend
on 5 (the editor). Suggested serial:

| #   | Title                               | Depends on | Files                                                                                                    |
| --- | ----------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Note schema + storage               | —          | `packages/storage/src/{db,note-store,index}.ts`, `note-store.test.ts`                                    |
| 2   | i18n namespace                      | —          | `packages/i18n/locales/en/notes.json`, `apps/learner/src/i18n-dictionaries.ts`, `i18n-keys.test.ts`      |
| 3   | Safe storage wrappers               | 1          | `apps/learner/src/{notesStorage.ts,notesStorage.test.ts}`                                                |
| 4   | Lesson-Notes panel (right-sidebar)  | 2,3        | `apps/learner/src/notes/{NotePanel.tsx,__tests__/*}` + `CourseRightSidebar.tsx`                          |
| 5   | Note Editor + autosave              | 2,3        | `packages/storage` deps; `notes/{NoteEditor.tsx,NoteEditorPage.tsx,useDebouncedAutosave.ts,__tests__/*}` |
| 6   | Notes routing + Dashboard + NoteRow | 2,3,5      | `AppShell.tsx`, `apps/learner/src/notes/{NotesDashboardPage.tsx,NoteRow.tsx}`                            |
| 7   | Notes search                        | 3,6        | `apps/learner/src/{notesService.ts} + notes/{NotesSearchPanel.tsx,__tests__/*}`                          |
| 8   | Tags UI                             | 3,6        | `apps/learner/src/notes/{TagFilterBar.tsx,__tests__/*}`                                                  |
| 9   | Export                              | 3,6        | `apps/learner/src/notes/{ExportDialog.tsx,__tests__/*}`                                                  |
| 10  | Standalone note create/delete flow  | 6,5        | test-only story; refinement to `NotesDashboardPage` create handler                                       |
| 11  | E2E                                 | 1-10       | `tests/e2e/notes.spec.ts`                                                                                |

---

## 15. UI coding standards — apply throughout (mandatory)

From `AGENTS.md` "UI Coding Standards" + Tailwind section:

1. **Tokens only.** Never hex/rgb. Use `bg-surface`, `text-on-surface`,
   `text-on-surface-variant`, `border-outline-variant`, `bg-primary-container`,
   `text-on-primary`, etc. The `--oe-*` variables are injected by
   `<RuntimeThemeProvider>` (read `packages/runtime/src/theme.tsx`).
2. **`cn()`** from `@open-edu/design-system` for conditional classes.
3. **shadcn/ui pattern:** `React.forwardRef`, `displayName`, `cva` for variants
   if any, named exports. See `packages/design-system/src/primitives/button.tsx`.
4. **Primitives:** reuse `Button`, `Input`, `Textarea`, `Dialog`, `Tabs`,
   `Tooltip`, `Badge`, `Tag`, `RadioGroup`, `EmptyState`, `PageHeader`,
   `DashboardLayout`, `Tabs`, `Drawer` from `@open-edu/design-system`. Do NOT
   reinvent.
5. **Responsive:** mobile-first (`flex flex-col md:flex-row`, etc.). Editor must
   be usable on a 360px-wide screen. Dashboard: 1-col on mobile, 2-col sm+, 3-col lg+.
6. **Accessibility:** every interactive element keyboard-reachable, visible focus
   ring (`focus-visible:ring-2 focus-visible:ring-primary`), `aria-label` on
   icon-only buttons, `aria-live` regions for save state & search results (use
   `useLiveRegion()` from `@open-edu/accessibility` — see `packages/accessibility/src/live-region.tsx`).
   No nested buttons (see the NoteRow note in §7.3).
7. **Tests per component**: rendering + interaction + a11y (axe) — three files
   minimum pattern used across the repo (see `apps/learner/src/__tests__/DownloadButton.a11y.test.tsx`).
8. **No hardcoded user strings.** The lint `pnpm lint:hardcoded-strings`
   (script `scripts/lint-no-hardcoded-strings.mjs`) scans `apps/learner/src`
   JSX text literals and fails if no `t(` is nearby. Add all strings to
   `packages/i18n/locales/en/notes.json`. (Story 2 provides the key list.)
9. **Dev-server CSS regeneration is NOT required** for these changes — the
   notepad is implemented in `apps/learner` (PostCSS), not in `packages/runtime/src`.
   If the agent accidentally touches `packages/runtime/src`, regenerate via:
   `pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css`
   (`pnpm lint:tailwind-staleness` enforces sync).
10. **Inline `style={{}}` forbidden** except dynamic sizing props or
    `var(--oe-*)` references (rule #10 AGENTS.md). Use Tailwind classes.

---

## 16. Conventional commit messages

```text
feat(storage): add notes and note-tags IDB stores (DB v3)
feat(notes): i18n namespace for notepad MVP
feat(notes): safe storage wrappers in learner app
feat(notes): lesson notes panel in course right sidebar
feat(notes): markdown editor with debounced autosave
feat(notes): notes dashboard and route wiring
feat(notes): instant notes search via MiniSearch
feat(notes): tags UI (edit + filter)
feat(notes): markdown + json export
feat(notes): standalone note create flow
test(e2e): notes smoke suite
```

---

## 17. Done — global checklist (every PR closes by completing ALL)

- [ ] `pnpm --filter @open-edu/storage test` green
- [ ] `pnpm --filter @open-edu/learner test` green
- [ ] `pnpm --filter @open-edu/learner typecheck` clean
- [ ] `pnpm --filter @open-edu/learner lint` clean (includes hardcoded-string check)
- [ ] `pnpm format:check` clean (run `pnpm format` if it fails)
- [ ] New components each ship with `.test.tsx` + `.a11y.test.tsx`
- [ ] All user strings in `notes.json`
- [ ] All colours via `--oe-*` tokens; no hex/rgb/Tailwind-palette literals
- [ ] axe-core reports 0 violations on every new component
- [ ] Spec success criteria (lines 562-578 of `docs/notebook_mvp_spec.md`) are
      manually walkable in `pnpm --filter @open-edu/learner dev`

---

## Appendix A — Map: spec feature → file

| Spec § (line range) | Feature          | Implementation file(s)                                                            |
| ------------------- | ---------------- | --------------------------------------------------------------------------------- |
| Feature 1 (55-86)   | Lesson Notes     | `notes/NotePanel.tsx`, `CourseRightSidebar.tsx` (Story 4)                         |
| Feature 2 (88-104)  | Standalone Notes | `NotesDashboardPage.tsx` create button, editor rename via autosame (Story 10, 12) |
| Feature 3 (106-148) | Markdown Editor  | `notes/NoteEditor.tsx` (CodeMirror 6, Story 5)                                    |
| Feature 4 (151-167) | Autosave         | `notes/useDebouncedAutosave.ts` (Story 5)                                         |
| Feature 5 (169-194) | Notes Dashboard  | `notes/NotesDashboardPage.tsx` (Story 6)                                          |
| Feature 6 (196-230) | Search           | `notesService.ts`, `NotesSearchPanel.tsx` (Story 7)                               |
| Feature 7 (233-251) | Tags             | `notes/TagFilterBar.tsx` (Story 8)                                                |
| Feature 8 (253-271) | Favorites        | `notes/NoteRow.tsx` star (Story 6/10)                                             |
| Feature 9 (274-292) | Export           | `notes/ExportDialog.tsx` (Story 9)                                                |

## Appendix B — Quick checklist before opening each PR

```bash
pnpm --filter @open-edu/storage typecheck
pnpm --filter @open-edu/storage test
pnpm --filter @open-edu/learner typecheck
pnpm --filter @open-edu/learner test
pnpm --filter @open-edu/learner lint
pnpm format:check
```

If `pnpm install` was needed for new deps (Story 5 CodeMirror, e.g.), commit the
updated `pnpm-lock.yaml` together with the story.
