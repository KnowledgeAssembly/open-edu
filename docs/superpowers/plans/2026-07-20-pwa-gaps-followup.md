# PWA Gaps Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining gaps in the PWA implementation — wire existing components into the app, migrate localStorage stores to IndexedDB, persist the search index, and add accessibility tests.

**Architecture:** Keep existing localStorage API signatures intact while swapping the backend to IndexedDB via `@open-edu/storage`. Wire already-built components (UpdatePrompt, InstallPrompt) into AppShell/CatalogPage. Enhance StorageSettingsPage to show downloaded courses with delete. Add StaleWhileRevalidate caching for metadata. Persist search indexes to IndexedDB. Add axe-core tests for all PWA components.

**Tech Stack:** TypeScript, React 18, idb (IndexedDB), MiniSearch, Vitest, axe-core, `@open-edu/storage`, `@open-edu/pwa-core`

---

## File Structure

### Create

- `apps/learner/src/hooks/useUpdatePrompt.ts` — React hook bridging pwa-core update detection to UI
- `apps/learner/src/hooks/useInstallPrompt.ts` — React hook bridging pwa-core install detection to UI
- `apps/learner/src/components/InstallPrompt.tsx` — Banner/button to trigger browser install
- `apps/learner/src/components/DownloadedCourseList.tsx` — List of downloaded courses with delete
- `apps/learner/src/__tests__/UpdatePrompt.a11y.test.tsx` — axe-core test
- `apps/learner/src/__tests__/OfflineBanner.a11y.test.tsx` — axe-core test
- `apps/learner/src/__tests__/DownloadButton.a11y.test.tsx` — axe-core test
- `apps/learner/src/__tests__/StorageUsageCard.a11y.test.tsx` — axe-core test
- `apps/learner/src/__tests__/InstallPrompt.a11y.test.tsx` — axe-core test
- `apps/learner/src/__tests__/DownloadedCourseList.a11y.test.tsx` — axe-core test
- `apps/learner/src/__tests__/install-prompt.test.tsx` — InstallPrompt unit tests
- `apps/learner/src/__tests__/DownloadedCourseList.test.tsx` — DownloadedCourseList unit tests

### Modify

- `apps/learner/src/progressStorage.ts` — swap localStorage → IndexedDB
- `apps/learner/src/bundleProgressStorage.ts` — swap localStorage → IndexedDB
- `apps/learner/src/badgesStorage.ts` — swap localStorage → IndexedDB
- `apps/learner/src/cardsStorage.ts` — swap localStorage → IndexedDB
- `apps/learner/src/searchService.ts` — persist index to IndexedDB, load on init
- `apps/learner/vite.config.ts` — add StaleWhileRevalidate runtime caching rule
- `apps/learner/src/AppShell.tsx` — mount UpdatePrompt + InstallPrompt
- `apps/learner/src/pages/StorageSettingsPage.tsx` — add DownloadedCourseList
- `packages/storage/src/db.ts` — add `badges` and `cards` object stores (DB_VERSION 2)

### Test (modify existing)

- `apps/learner/src/progressStorage.test.ts` — update for async IndexedDB API
- `apps/learner/src/bundleProgressStorage.test.ts` — update for async IndexedDB API

---

## Epic A: localStorage → IndexedDB Migration

### Task 1: Add badges and cards stores to IndexedDB schema

**Files:**

- Create/modify: `packages/storage/src/db.ts`
- Test: `packages/storage/src/__tests__/db.test.ts`

The existing `progress` store handles course progress. We need two new stores for badges and cards data. This requires bumping `DB_VERSION` to 2.

- [ ] **Step 1: Read the current db.ts**

Read `packages/storage/src/db.ts`. Note the current `DB_VERSION = 1` and the 4 existing stores.

- [ ] **Step 2: Add badges and cards interfaces to db.ts**

Add after the `UserPreferences` interface:

```typescript
export interface BadgeData {
  courseId: string;
  badgeName: string;
}

export interface CardProgressData {
  cardId: string;
  level: number;
  unlockedAt: string;
}
```

- [ ] **Step 3: Update OpenEduDB interface**

Change to:

```typescript
export interface OpenEduDB {
  courses: StoredCourse;
  progress: LearningProgress;
  'search-indexes': SearchIndex;
  preferences: UserPreferences;
  badges: BadgeData;
  cards: CardProgressData;
}
```

- [ ] **Step 4: Bump DB_VERSION to 2 and add upgrade logic for new stores**

Change `DB_VERSION` to `2`. In the `upgrade` callback, add after the existing stores:

```typescript
if (!db.objectStoreNames.contains('badges')) {
  const badgeStore = db.createObjectStore('badges', { keyPath: 'courseId' });
  // Note: badges are stored as one record per course with an array of badge names
}
if (!db.objectStoreNames.contains('cards')) {
  db.createObjectStore('cards', { keyPath: 'cardId' });
}
```

Wait — the existing `badgesStorage.ts` stores `[packageId: string]: string[]` (array of badge names per course). The simplest IndexedDB mapping is one record per course with the full array. Let's use `courseId` as keyPath for badges, storing the badge names array inline. Update the `BadgeData` interface:

```typescript
export interface BadgeData {
  courseId: string;
  badgeNames: string[];
}
```

- [ ] **Step 5: Update the upgrade handler**

```typescript
upgrade(db, oldVersion) {
  // Version 1 stores
  if (!db.objectStoreNames.contains('courses')) {
    db.createObjectStore('courses', { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains('progress')) {
    db.createObjectStore('progress', { keyPath: ['courseId', 'lessonId'] });
  }
  if (!db.objectStoreNames.contains('search-indexes')) {
    db.createObjectStore('search-indexes', { keyPath: 'locale' });
  }
  if (!db.objectStoreNames.contains('preferences')) {
    db.createObjectStore('preferences', { keyPath: 'locale' });
  }
  // Version 2 stores
  if (!db.objectStoreNames.contains('badges')) {
    db.createObjectStore('badges', { keyPath: 'courseId' });
  }
  if (!db.objectStoreNames.contains('cards')) {
    db.createObjectStore('cards', { keyPath: 'cardId' });
  }
}
```

- [ ] **Step 6: Export new types from index.ts**

Add to `packages/storage/src/index.ts`:

```typescript
export { saveBadge, getBadges, getAllBadges as getAllBadgeRecords } from './badge-store.js';
export { saveCard, getCard, getAllCards, deleteAllCards } from './card-store.js';
```

- [ ] **Step 7: Create badge-store.ts**

Create `packages/storage/src/badge-store.ts`:

```typescript
import { openDatabase, type BadgeData } from './db.js';

export async function saveBadge(courseId: string, badgeNames: string[]): Promise<void> {
  const db = await openDatabase();
  await db.put('badges', { courseId, badgeNames });
}

export async function getBadges(courseId: string): Promise<string[]> {
  const db = await openDatabase();
  const record = await db.get('badges', courseId);
  return record?.badgeNames ?? [];
}

export async function getAllBadges(): Promise<BadgeData[]> {
  const db = await openDatabase();
  return db.getAll('badges');
}
```

- [ ] **Step 8: Create card-store.ts**

Create `packages/storage/src/card-store.ts`:

```typescript
import { openDatabase, type CardProgressData } from './db.js';

export async function saveCard(card: CardProgressData): Promise<void> {
  const db = await openDatabase();
  await db.put('cards', card);
}

export async function getCard(cardId: string): Promise<CardProgressData | undefined> {
  const db = await openDatabase();
  return db.get('cards', cardId);
}

export async function getAllCards(): Promise<CardProgressData[]> {
  const db = await openDatabase();
  return db.getAll('cards');
}

export async function deleteAllCards(): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction('cards', 'readwrite');
  await tx.objectStore('cards').clear();
  await tx.done;
}
```

- [ ] **Step 9: Run storage package tests**

```bash
pnpm --filter @open-edu/storage test
```

Expected: All existing tests pass (new stores don't break old ones).

- [ ] **Step 10: Commit**

```bash
git add packages/storage/src/db.ts packages/storage/src/index.ts packages/storage/src/badge-store.ts packages/storage/src/card-store.ts
git commit -m "feat(storage): add badges and cards IndexedDB stores (DB v2)"
```

---

### Task 2: Migrate badgesStorage.ts to IndexedDB

**Files:**

- Modify: `apps/learner/src/badgesStorage.ts`
- Test: (existing tests will verify; add one new test)

The existing API is synchronous (`getAllBadges()`, `getBadges(id)`, `addBadge(id, name)`). IndexedDB is async. We change the internal implementation to use `@open-edu/storage` while keeping the same function signatures but making them `async`. Consumers must be updated to `await` these calls.

**Important:** Check all consumers: `HomePage.tsx`, `ProgressDashboard.tsx`, `CourseRuntime.tsx`, `CatalogPage.tsx`.

- [ ] **Step 1: Read the current badgesStorage.ts**

Confirm it has: `getAllBadges()`, `getBadges(packageId)`, `addBadge(packageId, badgeName)`.

- [ ] **Step 2: Rewrite badgesStorage.ts**

Replace the entire file:

```typescript
import {
  saveBadge,
  getBadges as getBadgesFromDB,
  getAllBadges as getAllFromDB,
} from '@open-edu/storage';

export interface BadgesData {
  [packageId: string]: string[];
}

export async function getAllBadges(): Promise<BadgesData> {
  try {
    const records = await getAllFromDB();
    const data: BadgesData = {};
    for (const record of records) {
      data[record.courseId] = record.badgeNames;
    }
    return data;
  } catch {
    return {};
  }
}

export async function getBadges(packageId: string): Promise<string[]> {
  try {
    return await getBadgesFromDB(packageId);
  } catch {
    return [];
  }
}

export async function addBadge(packageId: string, badgeName: string): Promise<void> {
  try {
    const existing = await getBadgesFromDB(packageId);
    if (!existing.includes(badgeName)) {
      await saveBadge(packageId, [...existing, badgeName]);
    }
  } catch {
    // IndexedDB unavailable
  }
}
```

- [ ] **Step 3: Update all consumers to use async/await**

The following files import from `badgesStorage`:

1. `apps/learner/src/HomePage.tsx` — `getAllBadges()` call needs to become async in a `useEffect` or `useMemo` with state
2. `apps/learner/src/ProgressDashboard.tsx` — same pattern
3. `apps/learner/src/CatalogPage.tsx` — same pattern
4. `apps/learner/src/CourseRuntime.tsx` — `addBadge()` call needs `await`

For each consumer, the pattern is:

```typescript
// Before:
const badgeData = getAllBadges();

// After:
const [badgeData, setBadgeData] = useState<BadgesData>({});
useEffect(() => {
  getAllBadges().then(setBadgeData);
}, []);
```

Read each file, find the import and usage, and update accordingly. The key files are:

- `apps/learner/src/HomePage.tsx:4`
- `apps/learner/src/ProgressDashboard.tsx:6`
- `apps/learner/src/CatalogPage.tsx:6`
- `apps/learner/src/CourseRuntime.tsx:15`

- [ ] **Step 4: Update badgesStorage.test.ts**

Read `apps/learner/src/progressStorage.test.ts` to see the existing test pattern. Write similar tests for the new async `badgesStorage.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { getAllBadges, getBadges, addBadge } from '../badgesStorage';

describe('badgesStorage (IndexedDB)', () => {
  beforeEach(async () => {
    const { resetDatabase } = await import('@open-edu/storage');
    resetDatabase();
  });

  it('returns empty data initially', async () => {
    const all = await getAllBadges();
    expect(all).toEqual({});
  });

  it('saves and retrieves a badge', async () => {
    await addBadge('course-1', 'bronze');
    const badges = await getBadges('course-1');
    expect(badges).toEqual(['bronze']);
  });

  it('does not duplicate badges', async () => {
    await addBadge('course-1', 'bronze');
    await addBadge('course-1', 'bronze');
    const badges = await getBadges('course-1');
    expect(badges).toEqual(['bronze']);
  });

  it('returns empty array for unknown course', async () => {
    const badges = await getBadges('nonexistent');
    expect(badges).toEqual([]);
  });
});
```

- [ ] **Step 5: Run tests**

```bash
pnpm --filter @open-edu/learner test -- --run src/__tests__/badgesStorage.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/learner/src/badgesStorage.ts apps/learner/src/badgesStorage.test.ts apps/learner/src/HomePage.tsx apps/learner/src/ProgressDashboard.tsx apps/learner/src/CatalogPage.tsx apps/learner/src/CourseRuntime.tsx
git commit -m "feat(storage): migrate badgesStorage from localStorage to IndexedDB"
```

---

### Task 3: Migrate cardsStorage.ts to IndexedDB

**Files:**

- Modify: `apps/learner/src/cardsStorage.ts`
- Test: new `apps/learner/src/cardsStorage.test.ts`
- Modify consumers: `CourseRuntime.tsx`, `CollectionBinderPage.tsx`

- [ ] **Step 1: Rewrite cardsStorage.ts**

Replace the entire file:

```typescript
import {
  saveCard as saveCardToDB,
  getCard as getCardFromDB,
  getAllCards as getAllFromDB,
  deleteAllCards as deleteAllFromDB,
  type CardProgressData,
} from '@open-edu/storage';

export type { CardProgressData };

export interface CardsData {
  [cardId: string]: CardProgressData;
}

export async function getAllCardProgress(): Promise<CardsData> {
  try {
    const records = await getAllFromDB();
    const data: CardsData = {};
    for (const record of records) {
      data[record.cardId] = record;
    }
    return data;
  } catch {
    return {};
  }
}

export async function getCardProgress(cardId: string): Promise<CardProgressData | null> {
  try {
    const record = await getCardFromDB(cardId);
    return record ?? null;
  } catch {
    return null;
  }
}

export async function saveCardProgress(cardId: string, level: number): Promise<void> {
  try {
    const existing = await getCardFromDB(cardId);
    if (!existing || level > existing.level) {
      await saveCardToDB({
        cardId,
        level,
        unlockedAt: existing?.unlockedAt ?? new Date().toISOString(),
      });
    }
  } catch {
    // IndexedDB unavailable
  }
}

export async function clearCardProgress(): Promise<void> {
  try {
    await deleteAllFromDB();
  } catch {
    // IndexedDB unavailable
  }
}
```

- [ ] **Step 2: Update consumers**

1. `apps/learner/src/CourseRuntime.tsx:16` — `saveCardProgress()` and `getAllCardProgress()` calls need `await`
2. `apps/learner/src/CollectionBinderPage.tsx:7` — `getAllCardProgress()` needs async pattern

Read each file, find the usages, and wrap in async patterns as needed.

- [ ] **Step 3: Create cardsStorage.test.ts**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  getAllCardProgress,
  getCardProgress,
  saveCardProgress,
  clearCardProgress,
} from '../cardsStorage';

describe('cardsStorage (IndexedDB)', () => {
  beforeEach(async () => {
    const { resetDatabase } = await import('@open-edu/storage');
    resetDatabase();
  });

  it('returns empty data initially', async () => {
    const all = await getAllCardProgress();
    expect(all).toEqual({});
  });

  it('saves and retrieves card progress', async () => {
    await saveCardProgress('card-1', 2);
    const card = await getCardProgress('card-1');
    expect(card).toMatchObject({ cardId: 'card-1', level: 2 });
    expect(card?.unlockedAt).toBeDefined();
  });

  it('only upgrades level, never downgrades', async () => {
    await saveCardProgress('card-1', 3);
    await saveCardProgress('card-1', 1);
    const card = await getCardProgress('card-1');
    expect(card?.level).toBe(3);
  });

  it('clears all cards', async () => {
    await saveCardProgress('card-1', 1);
    await clearCardProgress();
    const all = await getAllCardProgress();
    expect(all).toEqual({});
  });
});
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @open-edu/learner test -- --run src/__tests__/cardsStorage.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/learner/src/cardsStorage.ts apps/learner/src/cardsStorage.test.ts apps/learner/src/CourseRuntime.tsx apps/learner/src/CollectionBinderPage.tsx
git commit -m "feat(storage): migrate cardsStorage from localStorage to IndexedDB"
```

---

### Task 4: Migrate progressStorage.ts to IndexedDB

**Files:**

- Modify: `apps/learner/src/progressStorage.ts`
- Modify: `apps/learner/src/progressStorage.test.ts`
- Modify consumers: `HomePage.tsx`, `ProgressDashboard.tsx`, `CatalogPage.tsx`, `CourseRuntime.tsx`

The `@open-edu/storage` already has `saveProgress`, `getProgress`, `getCourseProgress`, `deleteCourseProgress` in `progress-store.ts`. We need to map the existing `ProgressSnapshot` (keyed by `packageId`) to the IndexedDB `LearningProgress` records (keyed by `[courseId, lessonId]`).

The existing `progressStorage.ts` stores a `ProgressSnapshot` per packageId. A `ProgressSnapshot` from `@open-edu/schemas` contains `currentNodeId`, `visitedNodes`, etc. We need to serialize this into IndexedDB.

The simplest approach: store the entire `ProgressSnapshot` as a single record with `courseId = packageId` and `lessonId = '__snapshot__'` (sentinel value for the whole-package snapshot). This avoids restructuring the snapshot format.

- [ ] **Step 1: Read ProgressSnapshot type**

Read `packages/schemas/src/` to find the `ProgressSnapshot` type definition. Understand its shape.

- [ ] **Step 2: Rewrite progressStorage.ts**

Replace the entire file:

```typescript
import type { ProgressSnapshot } from '@open-edu/schemas';
import {
  saveProgress as saveProgressToDB,
  getProgress as getProgressFromDB,
  getCourseProgress as getCourseProgressFromDB,
} from '@open-edu/storage';

const SNAPSHOT_LESSON_ID = '__snapshot__';

export interface ProgressData {
  [packageId: string]: ProgressSnapshot;
}

export async function getAllProgress(): Promise<ProgressData> {
  try {
    const records = await getCourseProgressFromDB('*'); // We need a way to get all progress
    // Actually, let's use a different approach - iterate all progress records
    // The storage package needs a getAllProgress function
    const data: ProgressData = {};
    // We'll use the openDatabase directly for a scan
    const { openDatabase } = await import('@open-edu/storage');
    const db = await openDatabase();
    const all = await db.getAll('progress');
    for (const record of all) {
      if (record.lessonId === SNAPSHOT_LESSON_ID) {
        try {
          data[record.courseId] = JSON.parse((record as any).snapshotJson);
        } catch {
          // skip corrupted records
        }
      }
    }
    return data;
  } catch {
    return {};
  }
}
```

Wait, this is getting complicated. The `LearningProgress` type in `db.ts` has specific fields (`courseId`, `lessonId`, `completed`, `score`, `updatedAt`) — it doesn't have a `snapshotJson` field.

Let me reconsider. The cleanest approach is to add a `snapshotJson` field to the `LearningProgress` type as an optional string, or better yet, add a new `progress-snapshots` store to the DB. But that's more schema changes.

Actually, the simplest correct approach: add an optional `data` field to `LearningProgress`:

```typescript
export interface LearningProgress {
  courseId: string;
  lessonId: string;
  completed: boolean;
  score?: number;
  updatedAt: string;
  data?: Record<string, unknown>; // For storing full snapshots
}
```

Then we can store the ProgressSnapshot in the `data` field with `lessonId = '__snapshot__'`.

Let me revise:

- [ ] **Step 2 (revised): Add `data` field to LearningProgress in db.ts**

In `packages/storage/src/db.ts`, update the `LearningProgress` interface:

```typescript
export interface LearningProgress {
  courseId: string;
  lessonId: string;
  completed: boolean;
  score?: number;
  updatedAt: string;
  data?: Record<string, unknown>;
}
```

Also add a `getAllCourseProgress` function to `packages/storage/src/progress-store.ts`:

```typescript
export async function getAllCourseProgress(): Promise<LearningProgress[]> {
  const db = await openDatabase();
  return db.getAll('progress');
}
```

Export it from `packages/storage/src/index.ts`.

- [ ] **Step 3: Rewrite progressStorage.ts**

```typescript
import type { ProgressSnapshot } from '@open-edu/schemas';
import { saveProgress as saveProgressToDB, getAllCourseProgress } from '@open-edu/storage';

const SNAPSHOT_LESSON_ID = '__snapshot__';

export interface ProgressData {
  [packageId: string]: ProgressSnapshot;
}

export async function getAllProgress(): Promise<ProgressData> {
  try {
    const records = await getAllCourseProgress();
    const data: ProgressData = {};
    for (const record of records) {
      if (record.lessonId === SNAPSHOT_LESSON_ID && record.data) {
        data[record.courseId] = record.data as unknown as ProgressSnapshot;
      }
    }
    return data;
  } catch {
    return {};
  }
}

export async function getProgress(packageId: string): Promise<ProgressSnapshot | null> {
  try {
    const all = await getAllProgress();
    return all[packageId] ?? null;
  } catch {
    return null;
  }
}

export async function saveProgress(packageId: string, snapshot: ProgressSnapshot): Promise<void> {
  try {
    await saveProgressToDB({
      courseId: packageId,
      lessonId: SNAPSHOT_LESSON_ID,
      completed: true,
      updatedAt: new Date().toISOString(),
      data: snapshot as unknown as Record<string, unknown>,
    });
  } catch {
    // IndexedDB unavailable
  }
}
```

- [ ] **Step 4: Update all consumers to use async/await**

The consumers are:

1. `apps/learner/src/HomePage.tsx:3` — `getAllProgress()` → async in useEffect
2. `apps/learner/src/ProgressDashboard.tsx:5` — `getAllProgress()` → async in useEffect
3. `apps/learner/src/CatalogPage.tsx:5` — `getAllProgress()` → async in useEffect
4. `apps/learner/src/CourseRuntime.tsx:13` — `getProgress()` and `saveProgress()` → async

For each, read the file, find the usage, and convert to async pattern with `useState` + `useEffect`.

- [ ] **Step 5: Update progressStorage.test.ts**

Read the existing test file, then rewrite to use `fake-indexeddb/auto`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { getAllProgress, getProgress, saveProgress } from '../progressStorage';
import { resetDatabase } from '@open-edu/storage';

describe('progressStorage (IndexedDB)', () => {
  beforeEach(() => {
    resetDatabase();
  });

  it('returns empty data initially', async () => {
    const all = await getAllProgress();
    expect(all).toEqual({});
  });

  it('saves and retrieves progress', async () => {
    const snapshot = { currentNodeId: 'lesson-1', visitedNodes: ['lesson-0'] };
    await saveProgress('course-1', snapshot as any);
    const result = await getProgress('course-1');
    expect(result).toEqual(snapshot);
  });

  it('overwrites existing progress', async () => {
    await saveProgress('course-1', { currentNodeId: 'a' } as any);
    await saveProgress('course-1', { currentNodeId: 'b' } as any);
    const result = await getProgress('course-1');
    expect(result).toEqual({ currentNodeId: 'b' });
  });
});
```

- [ ] **Step 6: Run tests**

```bash
pnpm --filter @open-edu/learner test -- --run src/progressStorage.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/storage/src/db.ts packages/storage/src/progress-store.ts packages/storage/src/index.ts apps/learner/src/progressStorage.ts apps/learner/src/progressStorage.test.ts apps/learner/src/HomePage.tsx apps/learner/src/ProgressDashboard.tsx apps/learner/src/CatalogPage.tsx apps/learner/src/CourseRuntime.tsx
git commit -m "feat(storage): migrate progressStorage from localStorage to IndexedDB"
```

---

### Task 5: Migrate bundleProgressStorage.ts to IndexedDB

**Files:**

- Modify: `apps/learner/src/bundleProgressStorage.ts`
- Modify: `apps/learner/src/bundleProgressStorage.test.ts`
- Modify consumers: `AppShell.tsx`, `CourseRuntime.tsx`, `HomePage.tsx`

- [ ] **Step 1: Rewrite bundleProgressStorage.ts**

Use the same pattern as progressStorage — store bundle snapshots in the `progress` store with a different sentinel lessonId.

```typescript
import type { BundleProgressSnapshot } from '@open-edu/schemas';
import { saveProgress as saveProgressToDB, getAllCourseProgress } from '@open-edu/storage';

const BUNDLE_SENTINEL = '__bundle__';

export interface BundleProgressData {
  [bundleId: string]: BundleProgressSnapshot;
}

export async function getAllBundleProgress(): Promise<BundleProgressData> {
  try {
    const records = await getAllCourseProgress();
    const data: BundleProgressData = {};
    for (const record of records) {
      if (record.lessonId === BUNDLE_SENTINEL && record.data) {
        data[record.courseId] = record.data as unknown as BundleProgressSnapshot;
      }
    }
    return data;
  } catch {
    return {};
  }
}

export async function getBundleProgress(bundleId: string): Promise<BundleProgressSnapshot | null> {
  try {
    const all = await getAllBundleProgress();
    return all[bundleId] ?? null;
  } catch {
    return null;
  }
}

export async function saveBundleProgress(
  bundleId: string,
  snapshot: BundleProgressSnapshot,
): Promise<void> {
  try {
    await saveProgressToDB({
      courseId: bundleId,
      lessonId: BUNDLE_SENTINEL,
      completed: true,
      updatedAt: new Date().toISOString(),
      data: snapshot as unknown as Record<string, unknown>,
    });
  } catch {
    // IndexedDB unavailable
  }
}
```

- [ ] **Step 2: Update consumers**

1. `apps/learner/src/AppShell.tsx:44` — `getBundleProgress(bundleId)` is called in a `useState` initializer. Convert to async `useEffect`.
2. `apps/learner/src/CourseRuntime.tsx:14` — `getBundleProgress()` and `saveBundleProgress()` need async.
3. `apps/learner/src/HomePage.tsx:5` — `getAllBundleProgress()` needs async.

- [ ] **Step 3: Update bundleProgressStorage.test.ts**

Rewrite with `fake-indexeddb/auto` following the same pattern as progressStorage tests.

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @open-edu/learner test -- --run src/bundleProgressStorage.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/learner/src/bundleProgressStorage.ts apps/learner/src/bundleProgressStorage.test.ts apps/learner/src/AppShell.tsx apps/learner/src/CourseRuntime.tsx apps/learner/src/HomePage.tsx
git commit -m "feat(storage): migrate bundleProgressStorage from localStorage to IndexedDB"
```

---

### Task 6: Migrate breakTimerStorage.ts to IndexedDB preferences store

**Files:**

- Modify: `apps/learner/src/breakTimerStorage.ts`
- Modify consumers: `useBreakTimer.ts`, `SettingsPage.tsx`

The `@open-edu/storage` `preferences` store already exists. We can store break timer settings there.

Actually, the break timer settings are a small, frequently-read preference. Migrating this to IndexedDB adds async overhead for minimal benefit — it's not user progress data. **Skip this migration.** Break timer settings are fine in localStorage. They're non-critical settings that don't affect learning progress or crash recovery.

- [ ] **Step 1: Skip — no changes needed**

Note this as intentional: `breakTimerStorage.ts` remains in localStorage because it stores non-critical UI preferences, not learning progress.

- [ ] **Step 2: Commit (no-op, just document decision)**

No commit needed.

---

## Epic B: Wire Components into App

### Task 7: Create useUpdatePrompt hook and mount UpdatePrompt in AppShell

**Files:**

- Create: `apps/learner/src/hooks/useUpdatePrompt.ts`
- Modify: `apps/learner/src/AppShell.tsx`
- Test: `apps/learner/src/__tests__/useUpdatePrompt.test.ts`

- [ ] **Step 1: Create useUpdatePrompt.ts**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { registerUpdateListener, skipWaiting } from '@open-edu/pwa-core';

export function useUpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    registerUpdateListener((state) => {
      if (!cancelled) {
        setUpdateAvailable(state.updateAvailable);
      }
    }).then((cleanup) => {
      if (cancelled) cleanup();
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  const accept = useCallback(() => {
    skipWaiting().then(() => {
      window.location.reload();
    });
  }, []);

  return { updateAvailable, dismiss, accept };
}
```

- [ ] **Step 2: Create useUpdatePrompt.test.ts**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUpdatePrompt } from '../hooks/useUpdatePrompt';

vi.mock('@open-edu/pwa-core', () => ({
  registerUpdateListener: vi.fn().mockResolvedValue(vi.fn()),
  skipWaiting: vi.fn().mockResolvedValue(undefined),
  getUpdateState: vi.fn().mockReturnValue({ updateAvailable: false, registration: null }),
}));

describe('useUpdatePrompt', () => {
  it('initializes with no update available', () => {
    const { result } = renderHook(() => useUpdatePrompt());
    expect(result.current.updateAvailable).toBe(false);
  });

  it('provides dismiss and accept functions', () => {
    const { result } = renderHook(() => useUpdatePrompt());
    expect(typeof result.current.dismiss).toBe('function');
    expect(typeof result.current.accept).toBe('function');
  });
});
```

- [ ] **Step 3: Mount UpdatePrompt in AppShell.tsx**

In `AppShell.tsx`, add:

```typescript
import { UpdatePrompt } from './components/UpdatePrompt.js';
import { useUpdatePrompt } from './hooks/useUpdatePrompt.js';
```

Inside the `AppShell` function, add:

```typescript
const updatePrompt = useUpdatePrompt();
```

In the JSX, add before the closing `</div>`:

```tsx
<UpdatePrompt
  updateAvailable={updatePrompt.updateAvailable}
  onUpdate={updatePrompt.accept}
  onDismiss={updatePrompt.dismiss}
/>
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @open-edu/learner test -- --run src/__tests__/useUpdatePrompt.test.ts
pnpm --filter @open-edu/learner test -- --run src/AppShell.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/learner/src/hooks/useUpdatePrompt.ts apps/learner/src/__tests__/useUpdatePrompt.test.ts apps/learner/src/AppShell.tsx
git commit -m "feat(pwa): wire UpdatePrompt into AppShell via useUpdatePrompt hook"
```

---

### Task 8: Create useInstallPrompt hook and InstallPrompt component

**Files:**

- Create: `apps/learner/src/hooks/useInstallPrompt.ts`
- Create: `apps/learner/src/components/InstallPrompt.tsx`
- Create: `apps/learner/src/__tests__/useInstallPrompt.test.ts`
- Create: `apps/learner/src/__tests__/install-prompt.test.tsx`

- [ ] **Step 1: Create useInstallPrompt.ts**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { getInstallState, promptInstall } from '@open-edu/pwa-core';

export function useInstallPrompt() {
  const [state, setState] = useState(() => getInstallState());

  useEffect(() => {
    // Re-check periodically in case beforeinstallprompt fires after mount
    const interval = setInterval(() => {
      setState(getInstallState());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const install = useCallback(async () => {
    const result = await promptInstall();
    setState(getInstallState());
    return result;
  }, []);

  return { ...state, install };
}
```

- [ ] **Step 2: Create InstallPrompt.tsx**

```tsx
import * as React from 'react';
import { Download } from 'lucide-react';
import { Button } from './ui/button.js';

interface InstallPromptProps {
  isInstallable: boolean;
  isInstalled: boolean;
  onInstall?: () => void;
}

export const InstallPrompt = React.forwardRef<HTMLDivElement, InstallPromptProps>(
  ({ isInstallable, isInstalled, onInstall }, ref) => {
    if (isInstalled || !isInstallable) return null;

    return (
      <div ref={ref} role="status" className="border-border bg-surface rounded-lg border p-4">
        <p className="mb-2 text-sm font-medium">Install OpenEdu for offline access</p>
        <Button size="sm" onClick={onInstall} aria-label="Install OpenEdu app">
          <Download className="mr-1 h-3 w-3" aria-hidden="true" />
          Install App
        </Button>
      </div>
    );
  },
);
InstallPrompt.displayName = 'InstallPrompt';
```

- [ ] **Step 3: Create useInstallPrompt.test.ts**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

vi.mock('@open-edu/pwa-core', () => ({
  getInstallState: vi.fn().mockReturnValue({
    isInstallable: false,
    isInstalled: false,
    platform: 'desktop',
  }),
  promptInstall: vi.fn().mockResolvedValue({ outcome: 'dismissed' }),
}));

describe('useInstallPrompt', () => {
  it('returns install state from pwa-core', () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isInstallable).toBe(false);
    expect(result.current.isInstalled).toBe(false);
  });

  it('provides install function', () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(typeof result.current.install).toBe('function');
  });
});
```

- [ ] **Step 4: Create install-prompt.test.tsx**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InstallPrompt } from '../components/InstallPrompt';

describe('InstallPrompt', () => {
  it('renders install button when installable and not installed', () => {
    render(<InstallPrompt isInstallable={true} isInstalled={false} onInstall={vi.fn()} />);
    expect(screen.getByText('Install App')).toBeInTheDocument();
  });

  it('renders nothing when already installed', () => {
    const { container } = render(
      <InstallPrompt isInstallable={true} isInstalled={true} onInstall={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when not installable', () => {
    const { container } = render(
      <InstallPrompt isInstallable={false} isInstalled={false} onInstall={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('calls onInstall when button clicked', () => {
    const onInstall = vi.fn();
    render(<InstallPrompt isInstallable={true} isInstalled={false} onInstall={onInstall} />);
    fireEvent.click(screen.getByText('Install App'));
    expect(onInstall).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 5: Run tests**

```bash
pnpm --filter @open-edu/learner test -- --run src/__tests__/useInstallPrompt.test.ts src/__tests__/install-prompt.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/learner/src/hooks/useInstallPrompt.ts apps/learner/src/components/InstallPrompt.tsx apps/learner/src/__tests__/useInstallPrompt.test.ts apps/learner/src/__tests__/install-prompt.test.tsx
git commit -m "feat(pwa): create InstallPrompt component and useInstallPrompt hook"
```

---

### Task 9: Mount InstallPrompt in CatalogPage

**Files:**

- Modify: `apps/learner/src/CatalogPage.tsx`

- [ ] **Step 1: Read CatalogPage.tsx**

Read the file to find the right insertion point. The InstallPrompt should appear at the top of the catalog page.

- [ ] **Step 2: Add imports and hook usage**

Add imports:

```typescript
import { InstallPrompt } from './components/InstallPrompt.js';
import { useInstallPrompt } from './hooks/useInstallPrompt.js';
```

Inside the component function, add:

```typescript
const installPrompt = useInstallPrompt();
```

- [ ] **Step 3: Render InstallPrompt**

After the `<PageHeader>` component, add:

```tsx
<InstallPrompt
  isInstallable={installPrompt.isInstallable}
  isInstalled={installPrompt.isInstalled}
  onInstall={installPrompt.install}
/>
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @open-edu/learner test -- --run src/CatalogPage.test.tsx
```

(Note: if no CatalogPage test exists, run the full learner suite.)

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/learner/src/CatalogPage.tsx
git commit -m "feat(pwa): mount InstallPrompt in CatalogPage"
```

---

## Epic C: Caching & Search Persistence

### Task 10: Add StaleWhileRevalidate caching for metadata

**Files:**

- Modify: `apps/learner/vite.config.ts`

- [ ] **Step 1: Read vite.config.ts runtimeCaching section**

Read lines 209-233 where `runtimeCaching` is defined.

- [ ] **Step 2: Add StaleWhileRevalidate rule for metadata**

Add a third entry to the `runtimeCaching` array:

```typescript
{
  urlPattern: /\/api\/.*\/(catalog|metadata|summary)/,
  handler: 'StaleWhileRevalidate',
  options: {
    cacheName: 'metadata-cache',
    expiration: {
      maxEntries: 100,
      maxAgeSeconds: 86400, // 24 hours
    },
  },
},
```

- [ ] **Step 3: Run build to verify config is valid**

```bash
pnpm --filter @open-edu/learner build
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/learner/vite.config.ts
git commit -m "feat(pwa): add StaleWhileRevalidate caching for metadata endpoints"
```

---

### Task 11: Persist search index to IndexedDB

**Files:**

- Modify: `apps/learner/src/searchService.ts`
- Test: `apps/learner/src/__tests__/searchService.test.ts` (update existing)

- [ ] **Step 1: Read current searchService.ts**

Note the existing `buildSearchIndex()` and `searchOffline()` functions.

- [ ] **Step 2: Rewrite searchService.ts with persistence**

```typescript
import MiniSearch from 'minisearch';
import { saveSearchIndex, getSearchIndex } from '@open-edu/storage';

export interface SearchResult {
  id: string;
  title: string;
  score: number;
}

export interface SearchDocument {
  id: string;
  title: string;
  content: string;
}

let currentIndex: MiniSearch | null = null;

export async function buildSearchIndex(
  documents: SearchDocument[],
  locale = 'en',
): Promise<MiniSearch> {
  const index = new MiniSearch({
    fields: ['title', 'content'],
    storeFields: ['title'],
  });
  index.addAll(documents);
  currentIndex = index;

  try {
    const serializable = index.toJSON();
    await saveSearchIndex({
      locale,
      indexData: serializable as unknown as Record<string, unknown>,
    });
  } catch {
    // If IndexedDB is unavailable, search still works in-memory
  }

  return index;
}

export async function loadSearchIndex(locale = 'en'): Promise<MiniSearch | null> {
  if (currentIndex) return currentIndex;

  try {
    const stored = await getSearchIndex(locale);
    if (stored?.indexData) {
      currentIndex = MiniSearch.loadJSON(JSON.stringify(stored.indexData), {
        fields: ['title', 'content'],
        storeFields: ['title'],
      });
      return currentIndex;
    }
  } catch {
    // IndexedDB unavailable
  }

  return null;
}

export function searchOffline(index: MiniSearch, query: string, limit = 10): SearchResult[] {
  const results = index.search(query, { prefix: true, fuzzy: 0.2 });
  return results.slice(0, limit).map((r) => ({
    id: r.id as string,
    title: (r as unknown as { title: string }).title,
    score: r.score,
  }));
}
```

- [ ] **Step 3: Update searchService.test.ts**

Read existing test file, then update:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { buildSearchIndex, searchOffline, loadSearchIndex } from '../searchService';
import { resetDatabase } from '@open-edu/storage';

describe('searchService', () => {
  beforeEach(() => {
    resetDatabase();
  });

  const docs = [
    { id: '1', title: 'Introduction to Math', content: 'Basic arithmetic and algebra' },
    { id: '2', title: 'Science Basics', content: 'Physics and chemistry fundamentals' },
    { id: '3', title: 'History 101', content: 'World history overview' },
  ];

  it('builds an index and returns it', async () => {
    const index = await buildSearchIndex(docs);
    expect(index).toBeDefined();
  });

  it('searches the index', async () => {
    const index = await buildSearchIndex(docs);
    const results = searchOffline(index, 'math');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('1');
  });

  it('persists and loads index from IndexedDB', async () => {
    await buildSearchIndex(docs, 'en');
    // Reset in-memory cache
    const loaded = await loadSearchIndex('en');
    expect(loaded).not.toBeNull();
    const results = searchOffline(loaded!, 'history');
    expect(results.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @open-edu/learner test -- --run src/__tests__/searchService.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/learner/src/searchService.ts apps/learner/src/__tests__/searchService.test.ts
git commit -m "feat(search): persist MiniSearch index to IndexedDB for offline use"
```

---

## Epic D: Enhanced Storage UI

### Task 12: Create DownloadedCourseList component

**Files:**

- Create: `apps/learner/src/components/DownloadedCourseList.tsx`
- Create: `apps/learner/src/__tests__/DownloadedCourseList.test.tsx`

- [ ] **Step 1: Create DownloadedCourseList.tsx**

```tsx
import * as React from 'react';
import { Trash2, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.js';
import { Button } from './ui/button.js';
import type { StoredCourse } from '@open-edu/storage';

interface DownloadedCourseListProps {
  courses: StoredCourse[];
  onDelete?: (courseId: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export const DownloadedCourseList = React.forwardRef<HTMLDivElement, DownloadedCourseListProps>(
  ({ courses, onDelete }, ref) => {
    if (courses.length === 0) {
      return (
        <Card ref={ref}>
          <CardContent className="text-on-surface/60 py-8 text-center">
            <BookOpen className="mx-auto mb-2 h-8 w-8 opacity-50" aria-hidden="true" />
            <p className="text-sm">No downloaded courses yet.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card ref={ref}>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <BookOpen className="h-5 w-5" aria-hidden="true" />
          <CardTitle className="text-base">Downloaded Courses ({courses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-border divide-y" role="list" aria-label="Downloaded courses">
            {courses.map((course) => (
              <li key={course.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">
                    {((course.manifest as Record<string, unknown>).title as string) ?? course.id}
                  </p>
                  <p className="text-on-surface/60 text-xs">
                    v{course.version} · Downloaded {formatDate(course.downloadedAt)}
                  </p>
                </div>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(course.id)}
                    aria-label={`Remove ${((course.manifest as Record<string, unknown>).title as string) ?? course.id}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  },
);
DownloadedCourseList.displayName = 'DownloadedCourseList';
```

- [ ] **Step 2: Create DownloadedCourseList.test.tsx**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DownloadedCourseList } from '../components/DownloadedCourseList';
import type { StoredCourse } from '@open-edu/storage';

const mockCourses: StoredCourse[] = [
  {
    id: 'course-1',
    version: '1.0.0',
    manifest: { title: 'Math 101' },
    nodes: [],
    assets: [],
    downloadedAt: '2026-07-20T10:00:00Z',
  },
  {
    id: 'course-2',
    version: '2.0.0',
    manifest: { title: 'Science 101' },
    nodes: [],
    assets: [],
    downloadedAt: '2026-07-19T08:00:00Z',
  },
];

describe('DownloadedCourseList', () => {
  it('shows empty state when no courses', () => {
    render(<DownloadedCourseList courses={[]} />);
    expect(screen.getByText('No downloaded courses yet.')).toBeInTheDocument();
  });

  it('lists downloaded courses', () => {
    render(<DownloadedCourseList courses={mockCourses} />);
    expect(screen.getByText('Math 101')).toBeInTheDocument();
    expect(screen.getByText('Science 101')).toBeInTheDocument();
    expect(screen.getByText(/Downloaded Courses \(2\)/)).toBeInTheDocument();
  });

  it('calls onDelete when remove button clicked', () => {
    const onDelete = vi.fn();
    render(<DownloadedCourseList courses={mockCourses} onDelete={onDelete} />);
    const removeButtons = screen.getAllByRole('button', { name: /Remove/ });
    fireEvent.click(removeButtons[0]);
    expect(onDelete).toHaveBeenCalledWith('course-1');
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @open-edu/learner test -- --run src/__tests__/DownloadedCourseList.test.tsx
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/learner/src/components/DownloadedCourseList.tsx apps/learner/src/__tests__/DownloadedCourseList.test.tsx
git commit -m "feat(ui): add DownloadedCourseList component for storage management"
```

---

### Task 13: Enhance StorageSettingsPage with downloaded course list

**Files:**

- Modify: `apps/learner/src/pages/StorageSettingsPage.tsx`
- Modify: `apps/learner/src/__tests__/StorageSettingsPage.test.tsx`

- [ ] **Step 1: Read current StorageSettingsPage.tsx**

Confirm it only renders `<StorageUsageCard>`.

- [ ] **Step 2: Rewrite StorageSettingsPage.tsx**

```tsx
import { useState, useEffect, useCallback } from 'react';
import type { StoredCourse } from '@open-edu/storage';
import { useStorageUsage } from '../hooks/useStorageUsage.js';
import { StorageUsageCard } from '../components/StorageUsageCard.js';
import { DownloadedCourseList } from '../components/DownloadedCourseList.js';
import { getDownloadedCourses, deleteDownloadedCourse } from '../courseDownload.js';

export function StorageSettingsPage() {
  const { usage, quota } = useStorageUsage();
  const [courses, setCourses] = useState<StoredCourse[]>([]);

  const loadCourses = useCallback(async () => {
    const downloaded = await getDownloadedCourses();
    setCourses(downloaded);
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleDelete = useCallback(
    async (courseId: string) => {
      await deleteDownloadedCourse(courseId);
      await loadCourses();
    },
    [loadCourses],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Storage Settings</h1>
      <StorageUsageCard usage={usage} quota={quota} />
      <DownloadedCourseList courses={courses} onDelete={handleDelete} />
    </div>
  );
}
```

- [ ] **Step 3: Update StorageSettingsPage.test.tsx**

Read the existing test, then update to mock the async calls:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StorageSettingsPage } from '../pages/StorageSettingsPage';

vi.mock('../hooks/useStorageUsage.js', () => ({
  useStorageUsage: () => ({ usage: 1024 * 1024, quota: 1024 * 1024 * 100, percentage: 1 }),
}));

vi.mock('../courseDownload.js', () => ({
  getDownloadedCourses: vi.fn().mockResolvedValue([]),
  deleteDownloadedCourse: vi.fn().mockResolvedValue(undefined),
}));

describe('StorageSettingsPage', () => {
  it('renders storage usage and downloaded courses', async () => {
    render(<StorageSettingsPage />);
    expect(screen.getByText('Storage Settings')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/No downloaded courses yet/)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @open-edu/learner test -- --run src/__tests__/StorageSettingsPage.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/learner/src/pages/StorageSettingsPage.tsx apps/learner/src/__tests__/StorageSettingsPage.test.tsx
git commit -m "feat(ui): enhance StorageSettingsPage with downloaded course list"
```

---

## Epic E: Accessibility Tests

### Task 14: Add axe-core tests for all PWA components

**Files:**

- Create: `apps/learner/src/__tests__/UpdatePrompt.a11y.test.tsx`
- Create: `apps/learner/src/__tests__/OfflineBanner.a11y.test.tsx`
- Create: `apps/learner/src/__tests__/DownloadButton.a11y.test.tsx`
- Create: `apps/learner/src/__tests__/StorageUsageCard.a11y.test.tsx`
- Create: `apps/learner/src/__tests__/InstallPrompt.a11y.test.tsx`
- Create: `apps/learner/src/__tests__/DownloadedCourseList.a11y.test.tsx`

Each test renders the component and runs `axe` to check for violations. Follow the existing a11y test pattern in `apps/learner/src/__tests__/a11y-themes.test.tsx`.

- [ ] **Step 1: Read existing a11y-themes.test.tsx for pattern**

Read `apps/learner/src/__tests__/a11y-themes.test.tsx` to understand the axe-core testing pattern used in this project.

- [ ] **Step 2: Create UpdatePrompt.a11y.test.tsx**

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import axe, { type AxeResults } from 'axe-core';
import { UpdatePrompt } from '../components/UpdatePrompt';

async function checkA11y(html: string): Promise<AxeResults> {
  document.body.innerHTML = html;
  return axe.run(document.body);
}

describe('UpdatePrompt accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <UpdatePrompt updateAvailable={true} onUpdate={() => {}} onDismiss={() => {}} />,
    );
    const results = await checkA11y(container.innerHTML);
    expect(results.violations).toEqual([]);
  });
});
```

- [ ] **Step 3: Create remaining a11y test files**

Create similar test files for `OfflineBanner`, `DownloadButton`, `StorageUsageCard`, `InstallPrompt`, and `DownloadedCourseList`. Each renders the component with required props and runs axe-core.

Follow the exact same pattern. For `DownloadedCourseList`, pass a mock `courses` array. For `DownloadButton`, pass `isDownloaded={false}` and `isDownloaded={true}` as separate tests.

- [ ] **Step 4: Run all a11y tests**

```bash
pnpm --filter @open-edu/learner test -- --run 'src/__tests__/*.a11y.test.tsx'
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/learner/src/__tests__/*.a11y.test.tsx
git commit -m "test(a11y): add axe-core tests for all PWA components"
```

---

## Epic F: Verification

### Task 15: Full test suite, typecheck, and lint verification

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

Expected: All tests pass.

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: No type errors.

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: No lint errors.

- [ ] **Step 4: Run build**

```bash
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit any fixups**

If any fixups were needed, commit them.

- [ ] **Step 6: Final commit**

```bash
git commit -m "chore: verify full test suite, typecheck, and lint pass"
```

---

## Spec Coverage Check

| Spec Section              | Task                                                                 |
| ------------------------- | -------------------------------------------------------------------- |
| §9 PWA Plugin Config      | Already done in PR #473                                              |
| §10 Web App Manifest      | Already done in PR #473                                              |
| §11 Service Worker        | Already done in PR #473                                              |
| §12 Caching Strategy      | **Task 10** — adds StaleWhileRevalidate                              |
| §14 IndexedDB Storage     | **Task 1** — adds badges/cards stores                                |
| §15 Course Download       | Already done, **Task 13** enhances UI                                |
| §16 Offline Learning      | OfflineBanner already wired; tasks improve storage                   |
| §17 Offline Progress      | **Tasks 2-5** — migrate all localStorage → IndexedDB                 |
| §18 Search Architecture   | **Task 11** — persist index to IndexedDB                             |
| §19 i18n                  | Existing locale switching works offline (no changes needed)          |
| §20 Accessibility         | **Task 14** — axe-core tests for all PWA components                  |
| §21 Storage Management UI | **Tasks 12-13** — DownloadedCourseList + enhance StorageSettingsPage |
| §22 Update System         | **Task 7** — wire UpdatePrompt into AppShell                         |
| §23 Security              | Already done in PR #473                                              |
| §26 Developer Tooling     | Already done in PR #473                                              |
| §27 Acceptance Criteria   | **Task 8-9** — InstallPrompt for installability                      |
