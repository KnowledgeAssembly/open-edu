# Card Component Inconsistencies — Design Spec

## Problem

The monorepo has five card-related inconsistencies that create maintenance overhead, naming confusion, and unnecessary duplication of styling patterns across the learner app and design-system package.

## Changes

### 1. ProgressCard — new component in `design-system/src/learning`

**Problem:** `ProgressDashboard.tsx` renders cards as hand-rolled `<div>` elements with inline Tailwind classes (`bg-surface-container-lowest border-outline-variant p-md rounded-xl border ...`), duplicating what the `Card` primitive already provides.

**Solution:** Create `ProgressCard` in `packages/design-system/src/learning/ProgressCard.tsx` that composes the `Card` primitive and preserves the exact current visual output.

**Props:**

```ts
interface ProgressCardProps {
  title: string;
  status: 'in-progress' | 'completed';
  currentSteps: number;
  totalSteps: number;
  percent: number;
  lastTitle: string;
  lastStudied: string;
  badgeCount: number;
  onContinue: () => void;
  onReview?: () => void;
}
```

**Implementation:**

- Uses a structured `<div>` (not `Card` primitive) to preserve exact current styling: `bg-surface-container-lowest border-outline-variant rounded-xl border`. Card's default tokens (`bg-card`, `rounded-lg`) don't match, and the horizontal layout with `BundleModuleIndicator` doesn't fit `CardHeader`/`CardContent` slots.
- Left-aligns `BundleModuleIndicator` via `flex flex-row` layout exactly matching current ProgressDashboard
- Shows `Badge variant="secondary"` with "Completed" for completed status, `Button` with "Continue" for in-progress
- Displays step count, last title, last studied time, badge count, and progress bar
- Completed cards get `opacity-80` as currently done

**Location:** `packages/design-system/src/learning/ProgressCard.tsx`
**Export:** Added to `packages/design-system/src/index.ts`

### 2. BundleCard — new component in `design-system/src/learning`

**Problem:** CatalogPage builds bundle cards inline using `BundleCardWithModule` wrapper + base `Card` primitive + hand-crafted header/content. No reusable `BundleCard` component exists, unlike `CourseCard`.

**Solution:** Create `BundleCard` in `packages/design-system/src/learning/BundleCard.tsx`.

**Props:**

```ts
interface BundleCardProps {
  title: string;
  description?: string;
  moduleCount: number;
  activityCount: number;
  completedModules: number;
  totalModules: number;
  isStarted: boolean;
  onStart: () => void;
}
```

**Implementation:**

- Uses `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` structure
- Shows Bundle badge, title, description, module/activity counts, progress bar when started
- Same visual output as current inline implementation in CatalogPage

**Location:** `packages/design-system/src/learning/BundleCard.tsx`
**Export:** Added to `packages/design-system/src/index.ts`

### 3. BundleOverview — use Card for module items

**Problem:** `BundleOverview` renders module items as styled `<li>` elements (`border-outline-variant p-md rounded-xl border ...`) instead of using the `Card` primitive.

**Solution:** Replace the `<li>` element's direct styling by wrapping content in `<Card>`. Keep the `<li>` element for list semantics.

**Implementation:**

```tsx
// Before:
<li className="border-outline-variant p-md rounded-xl border ...">
  {/* content */}
</li>

// After:
<li className="list-none">
  <Card className="[&]:p-md rounded-xl [&]:bg-surface-container-lowest">
    {/* content — same as before */}
  </Card>
</li>
```

The `Card` already provides `border`, `rounded-lg`, and `shadow-sm`. The module items currently use `rounded-xl` and no shadow, so we override via `className`. The `bg-surface-container-lowest` and padding carry over from Card.

### 4. Rename runtime `Card` → `KnowledgeCard`

**Problem:** `@open-edu/design-system` exports `Card` (a generic container primitive) and `@open-edu/runtime` exports `Card` (a domain-specific recognition/achievement card). These are completely different components with the same export name, creating confusion for consumers.

**Solution:** Rename the runtime component from `Card` to `KnowledgeCard` throughout the runtime package. Also rename related re-exports: `CardGrid` → `KnowledgeCardGrid`, `CardViewer` → `KnowledgeCardViewer`, `CardUnlockedToast` → `KnowledgeCardUnlockedToast`.

**Files affected (in `packages/runtime/src/`):**

- `components/Card.tsx` → renamed to `components/KnowledgeCard.tsx`, component renamed
- `components/CardGrid.tsx` → renamed to `components/KnowledgeCardGrid.tsx`, component renamed
- `components/CardViewer.tsx` → renamed to `components/KnowledgeCardViewer.tsx`, component renamed
- `components/CardUnlockedToast.tsx` → renamed to `components/KnowledgeCardUnlockedToast.tsx`, component renamed
- `index.ts` — update all export names
- Update internal imports between these files

**Consumers to update:**

- `apps/learner/src/CollectionBinderPage.tsx` (imports `Card`, `CardGrid`, `CardViewer`, `CardUnlockedToast` from `@open-edu/runtime`)
- Any other files importing these from `@open-edu/runtime`

### 5. CourseCard — no change

As agreed, CourseCard stays as a semantic `<article>` with its own styling. It does not compose the `Card` primitive because its layout (banner image area, inline progress, floating badges, action button, OpenModule overlay) does not map cleanly to `CardHeader`/`CardContent` slots, and forcing it would alter its visual appearance.

## File Change Summary

| File                                                                  | Action                                                |
| --------------------------------------------------------------------- | ----------------------------------------------------- |
| `packages/design-system/src/learning/ProgressCard.tsx`                | **Create** — new component                            |
| `packages/design-system/src/learning/BundleCard.tsx`                  | **Create** — new component                            |
| `packages/design-system/src/index.ts`                                 | **Edit** — add exports for ProgressCard, BundleCard   |
| `packages/design-system/src/learning/BundleOverview.tsx`              | **Edit** — wrap module items in Card                  |
| `packages/runtime/src/components/Card.tsx`                            | **Rename** → `KnowledgeCard.tsx`                      |
| `packages/runtime/src/components/CardGrid.tsx`                        | **Rename** → `KnowledgeCardGrid.tsx`                  |
| `packages/runtime/src/components/CardViewer.tsx`                      | **Rename** → `KnowledgeCardViewer.tsx`                |
| `packages/runtime/src/components/CardUnlockedToast.tsx`               | **Rename** → `KnowledgeCardUnlockedToast.tsx`         |
| `packages/runtime/src/index.ts`                                       | **Edit** — update export names                        |
| `packages/runtime/src/components/ProgressRing.tsx`                    | **Edit** — update import if it imports Card           |
| `apps/learner/src/ProgressDashboard.tsx`                              | **Edit** — replace hand-rolled div with ProgressCard  |
| `apps/learner/src/CatalogPage.tsx`                                    | **Edit** — replace inline bundle card with BundleCard |
| `apps/learner/src/CollectionBinderPage.tsx`                           | **Edit** — update imports for renamed components      |
| `packages/design-system/src/learning/__tests__/ProgressCard.test.tsx` | **Create** — new tests                                |
| `packages/design-system/src/learning/__tests__/BundleCard.test.tsx`   | **Create** — new tests                                |
| `packages/runtime/src/components/__tests__/KnowledgeCard.test.tsx`    | **Rename** from Card.test.tsx                         |
| `packages/runtime/src/components/__tests__/CardGrid.test.tsx`         | **Rename** → KnowledgeCardGrid.test.tsx               |
| `packages/runtime/src/components/__tests__/CardViewer.test.tsx`       | **Rename** → KnowledgeCardViewer.test.tsx             |
