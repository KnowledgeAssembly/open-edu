# Gap Analysis: UX Prototypes vs. Current Implementation

> **Date:** 2026-07-06
> **Scope:** Home page, Progress Dashboard, Bundle Overview, Collection Binder

---

## 1. Home Page

### Prototype: `home-variant-c.html`

### Current: `apps/learner/src/HomePage.tsx` + `patterns/HeroSection.tsx`

| #   | Feature                                                             | Prototype                                            | Current                                                                                        | Gap                                                                        |
| --- | ------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | Hero editorial layout (text + OpenModule illustration side by side) | ✅                                                   | ✅ `variant="editorial" showIllustration` renders text + `OpenModule size="lg" satellites={6}` | ✅ MATCH                                                                   |
| 2   | Assembly Flow SVG background in hero                                | ✅                                                   | ✅ via `AssemblyFlow density="dense"` in `HeroSection`                                         | ✅ MATCH                                                                   |
| 3   | "Welcome back, Learner" heading                                     | ✅                                                   | ✅                                                                                             | ✅ MATCH                                                                   |
| 4   | "Continue where you left off..." paragraph                          | ✅                                                   | ✅                                                                                             | ✅ MATCH                                                                   |
| 5   | "Begin Learning" primary CTA button                                 | ✅ Distinct "Begin Learning" + Pipili wave icon      | ❌ Only "Browse Courses" button                                                                | ❌ **MISSING** — need a dedicated "Begin Learning" button with Pipili icon |
| 6   | Pipili wave animation next to CTA                                   | ✅ Animated Pipili with wave keyframes               | ❌ Not in HomePage; Pipili is in `AppShell` as floating mascot                                 | ❌ **MISMATCH** — HomePage inline Pipili not present                       |
| 7   | "— assembled from parts —" decorative label                         | ✅ Bottom-center of hero overlay                     | ❌ Not present                                                                                 | ❌ **MISSING**                                                             |
| 8   | Stats cards with OpenModule SVG icons                               | ✅ Each stat card renders an `OpenModule` SVG icon   | ⚠️ Uses Lucide icons (`BookOpen`, `TrendingUp`, `Trophy`)                                      | ⚠️ **VISUAL MISMATCH** — should use `OpenModule` component for consistency |
| 9   | Stats cards with `orbit-float` staggered animation                  | ✅ 3 cards with animation delays 0s, 0.5s, 1s        | ⚠️ `StatsSummary` has `animated` prop but it's not passed                                      | ⚠️ **EASY FIX** — pass `animated` to `StatsSummary`                        |
| 10  | Stats card styling (border, rounded-xl, background)                 | ✅ border + rounded-xl + bg-surface-container-lowest | ⚠️ Uses `bg-surface-container` (no border)                                                     | ⚠️ **VISUAL GAP** — lacks border and lighter background                    |
| 11  | Silhouette Assembly section break                                   | ✅ Silhouette figures as decorative section marker   | ❌ Uses `SectionDivider` (Assembly Flow) instead                                               | ❌ **MISSING** — Silhouette figures not used as section markers            |
| 12  | CTA section with Assembly Flow decorative card border               | ✅ Custom border with Assembly Flow path decoration  | ❌ Basic bordered `<div>` with no Assembly Flow decoration                                     | ❌ **MISSING**                                                             |
| 13  | Bottom Assembly Flow closure with animated dash                     | ✅ Animated Assembly Flow dashes                     | ❌ Not present                                                                                 | ❌ **MISSING**                                                             |
| 14  | "Browse Courses", "View Progress", "Settings" CTA buttons           | ✅                                                   | ✅                                                                                             | ✅ MATCH                                                                   |

**Home Page Gap Severity:** 5 missing features, 3 visual mismatches

---

## 2. Progress Dashboard

### Prototype: `progress.html`

### Current: `apps/learner/src/ProgressDashboard.tsx`

| #   | Feature                                               | Prototype                                                                         | Current                                                             | Gap                                                            |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | Page header with gradient + Assembly Flow bg          | ✅                                                                                | ✅ via `PageHeader` component                                       | ✅ MATCH                                                       |
| 2   | "Progress" eyebrow + "My Progress" title              | ✅                                                                                | ✅                                                                  | ✅ MATCH                                                       |
| 3   | "Track your learning journey..." subtitle             | ✅                                                                                | ❌ No subtitle on PageHeader                                        | ❌ **MISSING**                                                 |
| 4   | Stats summary row (in progress, completed, badges)    | ✅ 3-column with color-coded values                                               | ✅ `StatsSummary` with 3 items                                      | ✅ MATCH                                                       |
| 5   | Color-coded stat values (primary/success/tertiary)    | ✅ in-progress=primary, completed=success, badges=tertiary                        | ⚠️ Uses `color` prop on `StatsSummaryItem` — should work but verify | ⚠️ **VERIFY** — `StatsSummary` supports `color` prop           |
| 6   | Assembly Flow section divider between stats and cards | ✅ SVG Assembly Flow divider                                                      | ❌ No divider rendered                                              | ❌ **MISSING**                                                 |
| 7   | OpenModule icon on each course card with satellites   | ✅ Progress card left region shows OpenModule (4 or 5 satellites based on status) | ❌ Card uses `Card` component with no OpenModule                    | ❌ **MISSING** — cards lack visual satellite indicator         |
| 8   | Percentage label overlay on OpenModule icon           | ✅ e.g. "42%" over the icon                                                       | ❌ Percentage shown separately as `percent%` text on right          | ❌ **MISMATCH** — percentage should overlay on the module icon |
| 9   | Primary border-2 on in-progress cards                 | ✅ `border-2 border-primary`                                                      | ❌ Cards use `border-l-success border-l-4` for completed only       | ❌ **MISSING**                                                 |
| 10  | In-progress: "Continue" button (primary)              | ✅                                                                                | ✅                                                                  | ✅ MATCH                                                       |
| 11  | Completed: "Completed" badge + "Review" button        | ✅ Both shown                                                                     | ⚠️ Shows "Completed" badge but no "Review" button                   | ⚠️ **MISSING**                                                 |
| 12  | Metadata row: step count, last studied, time, badges  | ✅ 4 items inline                                                                 | ✅ Most fields present                                              | ✅ MATCH (with minor formatting differences)                   |
| 13  | Sorted: in-progress first by recency, then completed  | ✅ in-progress shown before completed                                             | ⚠️ Sorted by recency with completed at bottom (effective match)     | ⚠️ **MINOR** — functionally equivalent                         |
| 14  | Empty state with Silhouette figures                   | ✅ Silhouette Assembly decorative figures                                         | ✅ `EmptyState` with `variant="no-progress"` renders Silhouettes    | ✅ MATCH                                                       |
| 15  | Pipili mascot fixed bottom-right                      | ✅                                                                                | ⚠️ Present in `AppShell` globally for non-course views              | ⚠️ **ALREADY EXISTS** — AppShell handles this                  |

**Progress Dashboard Gap Severity:** 5 missing features, 3 visual mismatches

---

## 3. Bundle Overview Page

### Prototype: `bundle-overview.html`

### Current: `packages/design-system/src/learning/BundleOverview.tsx`

| #   | Feature                                                               | Prototype                                          | Current                                                              | Gap                                                                   |
| --- | --------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | "Back to Catalog" link                                                | ✅                                                 | ✅ `Button variant="link"`                                           | ✅ MATCH                                                              |
| 2   | Page header with gradient + Assembly Flow                             | ✅                                                 | ✅ via `PageHeader` component                                        | ✅ MATCH                                                              |
| 3   | "Bundle" chip badge + "Learning Path" label in header                 | ✅ `bg-primary-container` chip + "Learning Path"   | ❌ No eyebrow/badge passed to `PageHeader`                           | ❌ **MISSING**                                                        |
| 4   | Overall Progress bar with module count + activity count               | ✅ "3 of 5 modules" + "28 of 45 activities"        | ✅ `OverallProgressBar` shows activities count                       | ✅ MATCH (module count not shown)                                     |
| 5   | Assembly Flow section divider                                         | ✅ SVG Assembly Flow                               | ❌ No divider                                                        | ❌ **MISSING**                                                        |
| 6   | Module cards with OpenModule + satellite count per status             | ✅ `BundleModuleIndicator` exists (2-5 satellites) | ⚠️ `BundleModuleIndicator` is used, which renders `OpenModule`       | ✅ MATCH via `BundleModuleIndicator`                                  |
| 7   | Percentage overlay on module card icon for in-progress                | ✅ e.g. "60%" next to icon                         | ✅ `BundleModuleIndicator` shows `completionPercent` for in-progress | ✅ MATCH                                                              |
| 8   | Chapter code badge (CH 1, CH 2, etc.)                                 | ✅                                                 | ✅ `mod.chapterCode` rendered                                        | ✅ MATCH                                                              |
| 9   | Module title                                                          | ✅                                                 | ✅                                                                   | ✅ MATCH                                                              |
| 10  | Module description                                                    | ✅                                                 | ✅ Description shown in prototype body                               | ⚠️ Current doesn't show description in card body (only in PageHeader) |
| 11  | Progress bar for non-locked modules                                   | ✅                                                 | ✅                                                                   | ✅ MATCH                                                              |
| 12  | Border-2 primary for in-progress modules                              | ✅                                                 | ❌ No special border styling for in-progress                         | ❌ **MISSING**                                                        |
| 13  | "Start" button for unlocked modules                                   | ✅                                                 | ✅                                                                   | ✅ MATCH                                                              |
| 14  | "Continue" button for in-progress                                     | ✅                                                 | ✅                                                                   | ✅ MATCH                                                              |
| 15  | "Completed" checkmark for completed                                   | ✅                                                 | ✅                                                                   | ✅ MATCH                                                              |
| 16  | Duration for unlocked modules (~45 min · 8 activities)                | ✅                                                 | ⚠️ Shows `estimatedDuration` in minutes                              | ⚠️ **MINOR GAP** — doesn't show activity count alongside duration     |
| 17  | Prerequisite label for locked modules                                 | ✅ "Complete Geometry Fundamentals first"          | ✅ `prerequisiteLabel` in data model                                 | ✅ MATCH                                                              |
| 18  | Opacity reduction for non-active modules (unlocked: 60%, locked: 40%) | ✅ `opacity-60` / `opacity-40`                     | ✅ `opacity-60` for locked                                           | ✅ MATCH                                                              |
| 19  | Pipili mascot                                                         | ✅                                                 | ⚠️ Handled by AppShell globally                                      | ⚠️ Already exists                                                     |

**Bundle Overview Gap Severity:** 3 missing features, 2 minor gaps

---

## 4. Collection Binder Page

### Prototype: `collection-binder.html`

### Current: `apps/learner/src/CollectionBinderPage.tsx` + `runtime/Card.tsx` + `runtime/CardGrid.tsx` + `runtime/ProgressRing.tsx`

| #   | Feature                                                            | Prototype                                                   | Current                                                  | Gap                    |
| --- | ------------------------------------------------------------------ | ----------------------------------------------------------- | -------------------------------------------------------- | ---------------------- |
| 1   | Page header with gradient + Assembly Flow                          | ✅                                                          | ✅ via `PageHeader`                                      | ✅ MATCH               |
| 2   | "Collection" eyebrow + "Collection Binder" title                   | ✅                                                          | ✅                                                       | ✅ MATCH               |
| 3   | "Your museum of knowledge — X / Y cards collected" subtitle        | ✅                                                          | ✅                                                       | ✅ MATCH               |
| 4   | Collection stats row (unlocked, total cards, categories)           | ✅ 3-column stats                                           | ❌ Not present                                           | ❌ **MISSING**         |
| 5   | Assembly Flow section divider                                      | ✅                                                          | ❌ Not present                                           | ❌ **MISSING**         |
| 6   | Shelf grouping by category                                         | ✅                                                          | ✅                                                       | ✅ MATCH               |
| 7   | ProgressRing per shelf (circular SVG)                              | ✅                                                          | ✅ `ProgressRing` component                              | ✅ MATCH               |
| 8   | ProgressRing color: primary stroke                                 | ✅ Uses primary color `#5d4a8a`                             | ⚠️ Uses conditional colors (green/amber/red)             | ⚠️ **VISUAL MISMATCH** |
| 9   | Category title + card count subtitle                               | ✅                                                          | ✅                                                       | ✅ MATCH               |
| 10  | Card grid: 4-column responsive                                     | ✅ grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 | ✅ `CardGrid` already uses this layout                   | ✅ MATCH               |
| 11  | Card type-specific gradients (knowledge=green, skill=indigo, etc.) | ✅                                                          | ✅ `Card.tsx` has `typeConfig` with gradients            | ✅ MATCH               |
| 12  | Card type-specific icons (BookOpen, Brain, Award, Compass)         | ✅                                                          | ✅ Each type has mapped icon                             | ✅ MATCH               |
| 13  | Star rating for card levels                                        | ✅                                                          | ✅ Stars rendered in unlocked cards                      | ✅ MATCH               |
| 14  | Locked cards: grayscale + opacity-50                               | ✅                                                          | ✅                                                       | ✅ MATCH               |
| 15  | Staggered card entrance animation                                  | ✅ `card-animate` with fadeIn keyframes                     | ✅ `StaggerReveal` component in `CardGrid`               | ✅ MATCH               |
| 16  | Card hover: scale + shadow                                         | ✅                                                          | ✅                                                       | ✅ MATCH               |
| 17  | "Unlock to discover" text on locked cards                          | ✅                                                          | ✅                                                       | ✅ MATCH               |
| 18  | Category tag + Level badge on card                                 | ✅                                                          | ✅                                                       | ✅ MATCH               |
| 19  | CardViewer dialog for details                                      | ✅ (implied)                                                | ✅ `CardViewer` modal with levels, tags, related lessons | ✅ MATCH               |
| 20  | Empty state with book icon                                         | ✅                                                          | ✅ Inline SVG empty state                                | ✅ MATCH               |

**Collection Binder Gap Severity:** 2 missing features, 1 visual mismatch

---

## 5. Cross-Cutting / Global Gaps

| #   | Feature                                                   | Prototype                                  | Current                                                         | Gap                                                              |
| --- | --------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | `OpenModule` used consistently for stats/decorative icons | ✅ All stats use OpenModule                | ❌ HomePage stats use Lucide icons                              | ❌ **MISSING**                                                   |
| 2   | `animate-orbit-float` on stats cards                      | ✅                                         | ⚠️ Prop exists on `StatsSummary` but not wired                  | ⚠️ **EASY FIX**                                                  |
| 3   | Assembly Flow section dividers between major sections     | ✅ Present on all pages                    | ⚠️ Used inconsistently                                          | ⚠️ **MISSING** on Progress + Bundle Overview + Collection Binder |
| 4   | Pipili mascot globally                                    | ✅ Fixed bottom-right on all pages         | ⚠️ Global in AppShell                                           | ⚠️ Already done                                                  |
| 5   | Color: non-token palette usage in Card gradients          | ❌ Prototype does NOT use Tailwind palette | ⚠️ Card uses `from-emerald-500/20` etc. (Tailwind named colors) | ❌ **TOKEN VIOLATION** — must use `--oe-*` tokens                |
| 6   | Decorative "— assembled from parts —" label               | ✅ On home page hero                       | ❌ Not implemented                                              | ❌ **MISSING**                                                   |

---

## Gap Summary Table

| Page                   | Missing (❌) | Visual Mismatch (⚠️) | Total Gaps |
| ---------------------- | ------------ | -------------------- | ---------- |
| **Home Page**          | 5            | 3                    | 8          |
| **Progress Dashboard** | 5            | 3                    | 8          |
| **Bundle Overview**    | 3            | 2                    | 5          |
| **Collection Binder**  | 2            | 1                    | 3          |
| **Cross-Cutting**      | 2            | 3                    | 5          |
| **TOTAL**              | **17**       | **12**               | **29**     |
