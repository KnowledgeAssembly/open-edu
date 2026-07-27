# OEP Install → Catalog Integration

## Problem

Installing an OEP package writes course data to IndexedDB, but the catalog page reads from a static build-time virtual module (`virtual:edu-data`). These two data stores are completely disconnected. OEP-installed courses are effectively orphaned — they only appear in `StorageSettingsPage` for deletion.

## Requirements

1. OEP-installed courses appear in the main catalog grid alongside built-in courses
2. They are fully launchable via CourseRuntime
3. They have an "Installed" badge on their card
4. The catalog refreshes after each successful install
5. Delete from catalog card for OEP-installed courses

## Architecture (4 Parts)

### Part 1: OEP Reader Enhancement

**File:** `packages/oep-distribution/src/oep-reader.ts`

Extract `workflow.json`, `rewards.json`, `cards.json` from the archive alongside nodes and assets. These are optional (courses may not have all).

**New `OepExtraction` fields** (`packages/oep-distribution/src/types.ts`):

```typescript
workflow?: Record<string, unknown>;
rewards?: Record<string, unknown>;
cards?: Record<string, unknown>;
```

### Part 2: Storage Expansion

**File:** `packages/storage/src/db.ts`

Add optional fields to `StoredCourse`:

```typescript
workflow?: Record<string, unknown>;
rewards?: Record<string, unknown>;
cards?: Record<string, unknown>;
```

**File:** `packages/oep-distribution/src/install-coordinator.ts`

Store workflow/rewards/cards in the `StoredCourseRecord` during install.

### Part 3: Adapter Layer

**New file:** `apps/learner/src/oepAdapters.ts`

Two adapter functions:

- `storedCourseToPackageSummary(course: StoredCourse): PackageSummary` — Parse manifest via `PackageManifestSchema`, count nodes, count badge triggers from rewards, synthetic `rootDir`
- `storedCourseToLoadedPackage(course: StoredCourse): LoadedPackage` — Parse manifest, convert nodes to `LoadedNode[]` (parse content via `ContentNodeSchema`), parse workflow/rewards/cards via Zod schemas, set assetPaths

### Part 4: UI Integration

**New hook:** `apps/learner/src/hooks/useInstalledCourses.ts`

- Loads IndexedDB courses on mount via `listCourses()`
- Returns `{ installedCourses, refresh }` for re-fetching after install/delete

**CatalogPage changes:**

- Accept `installedCourses` prop
- Convert each `StoredCourse` → `PackageSummary` via adapter, merge into `packages` (dedup by id, prefer IndexedDB version)
- After install succeeds, call `refresh()`
- Add "Installed" badge on OEP course cards (check `rootDir.startsWith('oep://')`)
- Add delete button on OEP cards (calls `deleteCourse()` then `refresh()`)

**AppShell changes:**

- Use `useInstalledCourses` hook
- Merge installed courses into `packageEntries` map via `storedCourseToLoadedPackage`
- Pass merged list to CatalogPage

**CourseRuntime:** No changes — receives `LoadedPackage` from AppShell, which now includes OEP-converted packages.

## Files Modified

| File                                                   | Change                                        |
| ------------------------------------------------------ | --------------------------------------------- |
| `packages/oep-distribution/src/types.ts`               | Add workflow/rewards/cards to OepExtraction   |
| `packages/oep-distribution/src/oep-reader.ts`          | Extract workflow/rewards/cards from archive   |
| `packages/oep-distribution/src/install-coordinator.ts` | Store workflow/rewards/cards in course record |
| `packages/storage/src/db.ts`                           | Add workflow/rewards/cards to StoredCourse    |
| `apps/learner/src/oepAdapters.ts`                      | NEW — adapter functions                       |
| `apps/learner/src/hooks/useInstalledCourses.ts`        | NEW — hook for IndexedDB courses              |
| `apps/learner/src/CatalogPage.tsx`                     | Merge installed courses, badge, delete        |
| `apps/learner/src/AppShell.tsx`                        | Use hook, merge into packageEntries           |
