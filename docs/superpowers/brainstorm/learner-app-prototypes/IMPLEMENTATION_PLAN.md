# Implementation Plan: UX Prototype Alignment

**Based on:** Gap Analysis (`GAP_ANALYSIS.md`)  
**Priority:** P0 = core visual identity, P1 = decorative/motion, P2 = token compliance  
**Effort:** S = <1hr, M = 1-3hr, L = 3-8hr

---

## Story 1: Home Page — Editorial Canvas Alignment

**Priority:** P0 | **Effort:** M | **Files:** `apps/learner/src/HomePage.tsx`, `packages/design-system/src/patterns/StatsSummary.tsx`

### Tasks

| #   | Task                                                          | Gap Ref | Effort | Details                                                                                                                                                                                |
| --- | ------------------------------------------------------------- | ------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | Add "Begin Learning" primary CTA button with Pipili animation | Home-5  | S      | Add a primary `Button` labeled "Begin Learning" alongside a small `Pipili` component with animated wave above the existing button row. Wrap in a flex container.                       |
| 1.2 | Add "— assembled from parts —" decorative label               | Home-7  | S      | Add an absolutely-positioned `span` with `text-caption text-on-surface-variant opacity-50` centered at bottom of the hero section.                                                     |
| 1.3 | Replace Lucide stat icons with `OpenModule` component         | Home-8  | S      | Change `StatsSummaryItem.icon` from Lucide icons to `<OpenModule size="xs" satellites={3} />` for each stat.                                                                           |
| 1.4 | Pass `animated` prop to `StatsSummary`                        | Home-9  | S      | Add `animated` prop to `StatsSummary` in HomePage.                                                                                                                                     |
| 1.5 | Add border + lighter background to stat cards                 | Home-10 | S      | Update `StatsSummary.tsx` card container classes to include `border border-outline-variant bg-surface-container-lowest` (instead of just `bg-surface-container`).                      |
| 1.6 | Replace `SectionDivider` with Silhouette Assembly marker      | Home-11 | S      | Replace `SectionDivider` with a `SilhouetteGroup` div containing 3 silhouette figures between stat section and CTA section.                                                            |
| 1.7 | Add Assembly Flow decorative border to CTA section            | Home-12 | M      | Wrap the CTA `<div>` in a relative container and add an `AssemblyFlow density="dense"` SVG overlay. Use `border-2` with `border-color` approach mimicking the prototype's `color-mix`. |
| 1.8 | Add animated Assembly Flow bottom closure                     | Home-13 | S      | Add an `AssemblyFlow density="dense" animated` SVG at the bottom of the page.                                                                                                          |

---

## Story 2: Progress Dashboard — Course Card Visual Alignment

**Priority:** P0 | **Effort:** M | **Files:** `apps/learner/src/ProgressDashboard.tsx`

### Tasks

| #   | Task                                                        | Gap Ref | Effort | Details                                                                                                                                                                                                                                                                              |
| --- | ----------------------------------------------------------- | ------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2.1 | Add subtitle to PageHeader                                  | Prog-3  | S      | Add `subtitle="Track your learning journey across all courses."` to the `PageHeader`.                                                                                                                                                                                                |
| 2.2 | Add Assembly Flow section divider after stats               | Prog-6  | S      | Insert `<SectionDivider density="minimal" />` between `StatsSummary` and the card list.                                                                                                                                                                                              |
| 2.3 | Restructure course cards to include `BundleModuleIndicator` | Prog-7  | M      | Refactor the card rendering to use a horizontal flex layout with `BundleModuleIndicator` (which renders `OpenModule` with satellites) on the left, course info in the center, and action on the right. Replace the current `Card` + `CardContent` pattern with a custom flex layout. |
| 2.4 | Show percentage label on the OpenModule icon                | Prog-8  | S      | `BundleModuleIndicator` already shows percentage for in-progress. Ensure it's positioned as an overlay. If not, add inline percentage text next to the icon.                                                                                                                         |
| 2.5 | Apply `border-2 border-primary` to in-progress cards        | Prog-9  | S      | When `snap.isCompleted === false`, use `border-2 border-primary` instead of current border.                                                                                                                                                                                          |
| 2.6 | Add "Review" button for completed courses                   | Prog-11 | S      | For completed courses, show "Review" secondary/outline button alongside the "Completed" badge.                                                                                                                                                                                       |

---

## Story 3: Bundle Overview — Module Card Polish

**Priority:** P0 | **Effort:** S | **Files:** `packages/design-system/src/learning/BundleOverview.tsx`

### Tasks

| #   | Task                                                       | Gap Ref   | Effort | Details                                                                                                                      |
| --- | ---------------------------------------------------------- | --------- | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | Add "Bundle" chip + "Learning Path" label to header        | Bundle-3  | S      | Pass `eyebrow` as a fragment: `<><span className="...">Bundle</span> Learning Path</>` to the `PageHeader`.                  |
| 3.2 | Add Assembly Flow section divider after overall progress   | Bundle-5  | S      | Insert `<SectionDivider density="minimal" />` between the Overall Progress section and the module list.                      |
| 3.3 | Add `border-2 border-primary` for in-progress module cards | Bundle-12 | S      | In the module card `cn()` call, add `border-2 border-primary` when `mod.status === 'in_progress'`, keep `border` for others. |
| 3.4 | Show activity count alongside duration on unlocked modules | Bundle-16 | S      | On unlocked modules, also show `{nodeCount} activities` alongside `~{estimatedDuration} min`.                                |

---

## Story 4: Collection Binder — Stats Row & Visual Polish

**Priority:** P0 | **Effort:** S | **Files:** `apps/learner/src/CollectionBinderPage.tsx`

### Tasks

| #   | Task                                               | Gap Ref | Effort | Details                                                                                                                                                                                                                     |
| --- | -------------------------------------------------- | ------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 | Add collection stats row                           | Coll-4  | S      | Add a `StatsSummary` with 3 items: unlocked count (value: unlockedCount, color: primary), total cards (value: totalCount, color: default), categories (value: uniqueCategories, color: tertiary). Place after `PageHeader`. |
| 4.2 | Add Assembly Flow section divider                  | Coll-5  | S      | Insert `<SectionDivider density="minimal" />` between stats row and shelf sections.                                                                                                                                         |
| 4.3 | Fix ProgressRing to use primary color consistently | Coll-8  | S      | In `ProgressRing.tsx`, change the color logic to always use `stroke-primary` instead of conditional green/amber/red. Add a `color` prop for customization if needed.                                                        |

---

## Story 5: Token Compliance — Card Gradient Refactor

**Priority:** P2 | **Effort:** S | **Files:** `packages/runtime/src/components/Card.tsx`

### Tasks

| #   | Task                                                        | Gap Ref | Effort | Details                                                                                                                                                                                                                                       |
| --- | ----------------------------------------------------------- | ------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.1 | Replace Tailwind color names with `--oe-*` token references | XCut-5  | S      | In `Card.tsx`, replace `from-emerald-500/20`, `from-indigo-500/20`, etc. with `from-[var(--oe-color-primary)]/20` or similar token-based gradients. The current implementation uses Tailwind palette colors which violates AGENTS.md rule #2. |

---

## Story 6: Cross-Cutting Assembly Flow Dividers

**Priority:** P1 | **Effort:** S | **Files:** Multiple (see tasks)

### Tasks

| #   | Task                                                                  | Gap Ref | Effort | Details                                                                                                                                        |
| --- | --------------------------------------------------------------------- | ------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 6.1 | Ensure `SectionDivider` with `density="minimal"` is used consistently | XCut-3  | S      | Audit all 4 pages and add `SectionDivider` between major sections where missing (Progress page, Bundle Overview page, Collection Binder page). |

---

## Story 7: Animated Assembly Flow Decorations (Home Page)

**Priority:** P1 | **Effort:** S | **Files:** `apps/learner/src/HomePage.tsx`

### Tasks

| #   | Task                                                        | Gap Ref | Effort | Details                                                   |
| --- | ----------------------------------------------------------- | ------- | ------ | --------------------------------------------------------- |
| 7.1 | Add bottom animated `AssemblyFlow density="dense" animated` | Home-13 | S      | Already in Story 1.8. Ensure the animated prop is passed. |

---

## Execution Order

```
Story 1 (Home Page) ——— P0 ——— 🟢 Start here (highest visual impact)
       │
Story 2 (Progress) ——— P0 ——— 🟢 Second (course card visual identity)
       │
Story 3 (Bundle Overview) ——— P0 ——— 🟢 Third (visual polish, small effort)
       │
Story 4 (Collection Binder) ——— P0 ——— 🟢 Fourth (stats row, quick wins)
       │
Story 6 (Cross-cutting dividers) ——— P1 ——— 🟡 Standalone, do anytime
       │
Story 5 (Token compliance) ——— P2 ——— 🔵 Low urgency, after visual alignment
```

---

## Effort Summary

| Story                                | Priority | Effort      | Tasks        |
| ------------------------------------ | -------- | ----------- | ------------ |
| 1. Home Page — Editorial Canvas      | P0       | M           | 8 tasks      |
| 2. Progress Dashboard — Card Visuals | P0       | M           | 6 tasks      |
| 3. Bundle Overview — Polish          | P0       | S           | 4 tasks      |
| 4. Collection Binder — Stats Row     | P0       | S           | 3 tasks      |
| 5. Token Compliance — Card Gradients | P2       | S           | 1 task       |
| 6. Cross-Cutting Dividers            | P1       | S           | 1 task       |
| **TOTAL**                            |          | **~8-16hr** | **23 tasks** |
