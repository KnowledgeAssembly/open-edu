# Learner App — Visual DNA Alignment Spec

> **Status:** Draft
> **Date:** 2026-07-04
> **Stage:** 5 — Product Design
> **Depends on:** Stage 3 (Visual DNA), Stage 4 (Design System)

---

## Purpose

This spec defines how the Learner App (`apps/learner/`) aligns with the Visual DNA elements:

- **Open Module** — Orbital cluster indicator for learning units
- **Assembly Flow** — Dashed path pattern for textures and dividers
- **Silhouette Assembly** — Diverse figure illustrations for human moments

---

## Architecture: Component Composition

Following the principle of **"assembly over hierarchy"**, Visual DNA decoration uses pattern components in the design system that wrap runtime components.

| Layer             | Package                   | Responsibility                                         |
| ----------------- | ------------------------- | ------------------------------------------------------ |
| **Runtime**       | `@open-edu/runtime`       | Behavior components (CourseCard, BundleOverview)       |
| **Design System** | `@open-edu/design-system` | Visual DNA patterns (CourseCardWithModule, EmptyState) |
| **Learner App**   | `apps/learner`            | Composition, data fetching, navigation                 |

### Pattern: CourseCardWithModule

```tsx
// packages/design-system/src/patterns/CourseCardWithModule.tsx
import { OpenModule } from '../primitives/open-module.js';

export interface CourseCardWithModuleProps {
  progress: ProgressSnapshot | null;
  badgeCount?: number;
  children: React.ReactNode;
}

export function CourseCardWithModule({
  progress,
  badgeCount = 0,
  children,
}: CourseCardWithModuleProps): JSX.Element {
  const satellites = getProgressSatellites(progress, badgeCount);

  return (
    <div className="relative">
      <OpenModule
        size="sm"
        satellites={satellites}
        className="absolute right-2 top-2"
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

function getProgressSatellites(progress: ProgressSnapshot | null, badgeCount: number): number {
  if (badgeCount > 0) return 6;
  if (!progress) return 2;
  if (progress.isCompleted) return 5;
  if (progress.visitedNodes.length > 0) return 3 + Math.min(progress.visitedNodes.length, 2);
  return 2;
}
```

### Usage in Learner App

```tsx
// apps/learner/src/CatalogPage.tsx
import { CourseCardWithModule } from '@open-edu/design-system';
import { CourseCard } from '@open-edu/runtime';

<CourseCardWithModule
  progress={progress[pkg.manifest.id]}
  badgeCount={badgeCounts[pkg.manifest.id]}
>
  <CourseCard
    manifest={pkg.manifest}
    nodeCount={pkg.nodeCount}
    badgeCount={pkg.availableBadges}
    onStart={() => onStartCourse(pkg.rootDir)}
  />
</CourseCardWithModule>;
```

---

## Current State Audit

### Pages

| Page                 | File                       | Visual DNA | Notes                                          |
| -------------------- | -------------------------- | ---------- | ---------------------------------------------- |
| HomePage             | `HomePage.tsx`             | ❌ None    | Plain text stats, standard buttons             |
| CatalogPage          | `CatalogPage.tsx`          | ❌ None    | CourseCard from runtime, no orbital indicators |
| BundleOverviewPage   | `BundleOverviewPage.tsx`   | ❌ None    | Uses BundleOverview from runtime               |
| CourseRuntime        | `CourseRuntime.tsx`        | ❌ None    | Content delivery, no decorative elements       |
| ProgressDashboard    | `ProgressDashboard.tsx`    | ❌ None    | Stats display, no visual patterns              |
| SettingsPage         | `SettingsPage.tsx`         | ❌ None    | Form UI, no visual elements                    |
| CollectionBinderPage | `CollectionBinderPage.tsx` | ❌ None    | Recognition engine integration                 |

### Components

| Component      | File                                               | Visual DNA     | Notes                               |
| -------------- | -------------------------------------------------- | -------------- | ----------------------------------- |
| CourseCard     | `packages/runtime/src/learning/CourseCard.tsx`     | ❌ None        | Standard card, no orbital indicator |
| BundleOverview | `packages/runtime/src/learning/BundleOverview.tsx` | ❌ None        | Module list, no visual patterns     |
| ProgressRing   | `packages/runtime/src/components/ProgressRing.tsx` | ❌ None        | SVG ring, could use Open Module     |
| Pipili         | `apps/learner/src/components/Pipili.tsx`           | ✅ Uses Pipili | Companion character present         |

---

## Visual DNA Application Plan

### 1. Open Module — Orbital Cluster

**Purpose:** Visually indicate learning units (courses, modules, badges) with the orbital cluster pattern.

#### 1.1 Course Card Open Module

**Pattern Component:** `CourseCardWithModule` (design-system)
**Wraps:** `CourseCard` (runtime)

**Variants:**
| State | Satellites | Orbit | Use |
|-------|-----------|-------|-----|
| Not started | 2 | Visible | Shows "room to grow" |
| In progress | 3–4 | Visible | Progress indicated |
| Complete | 5 | Visible | Filled but still has gaps |
| Badge earned | 6 | Visible + glow | Celebration state |

**Satellite Logic:**

```tsx
function getProgressSatellites(progress: ProgressSnapshot | null, badgeCount: number): number {
  if (badgeCount > 0) return 6;
  if (!progress) return 2;
  if (progress.isCompleted) return 5;
  if (progress.visitedNodes.length > 0) return 3 + Math.min(progress.visitedNodes.length, 2);
  return 2;
}
```

**Implementation:**

```tsx
import { CourseCardWithModule } from '@open-edu/design-system';
import { CourseCard } from '@open-edu/runtime';

<CourseCardWithModule
  progress={progress[pkg.manifest.id]}
  badgeCount={badgeCounts[pkg.manifest.id]}
>
  <CourseCard
    manifest={pkg.manifest}
    nodeCount={pkg.nodeCount}
    badgeCount={pkg.availableBadges}
    onStart={() => onStartCourse(pkg.rootDir)}
  />
</CourseCardWithModule>;
```

#### 1.2 Bundle Module Indicator

**Location:** `BundleOverview.tsx` — module status indicators

**Replace:** Lock/unlock icons with Open Module variants

| Status      | Visual                     |
| ----------- | -------------------------- |
| Locked      | 2 satellites, 30% opacity  |
| Unlocked    | 3 satellites, 50% opacity  |
| In progress | 4 satellites, 70% opacity  |
| Complete    | 5 satellites, 100% opacity |

#### 1.3 Badge Display

**Location:** `BadgeToast.tsx`, `ProgressDashboard.tsx` — badge collection

**Implementation:**

- Each badge gets a mini Open Module (size: 40×40px)
- Satellite count indicates badge tier (bronze: 2, silver: 3, gold: 4)
- Orbit color matches badge tier color

#### 1.4 Empty States

**Location:** Any page with empty content areas

**Implementation:**

- Large Open Module (size: lg, 180×180px) centered
- 2 satellites (incomplete state)
- Accompanied by encouraging text: "This module is ready for you"

---

### 2. Assembly Flow — Pattern Language

**Purpose:** Add calm visual texture to backgrounds, dividers, and decorative areas.

#### 2.1 Hero Section Background

**Location:** `HomePage.tsx` — top section behind welcome text

**Implementation:**

```tsx
import { AssemblyFlow } from '@open-edu/design-system';

<div className="relative">
  <AssemblyFlow density="minimal" className="absolute inset-0 opacity-10" aria-hidden="true" />
  <div className="relative z-10">
    <h1>Welcome to OpenEdu</h1>
    {/* ... */}
  </div>
</div>;
```

#### 2.2 Section Dividers

**Location:** Between sections on `CatalogPage.tsx`, `ProgressDashboard.tsx`

**Implementation:**

```tsx
<div className="my-xl">
  <AssemblyFlow density="minimal" className="h-8 w-full opacity-15" aria-hidden="true" />
</div>
```

#### 2.3 Sidebar Texture

**Location:** `AppShell.tsx` — sidebar background

**Implementation:**

- Assembly Flow pattern at 5% opacity
- Density: dense (7–9 nodes)
- Animated: false (static background)

#### 2.4 Card Decorations

**Location:** `CatalogPage.tsx` — empty card slots, loading states

**Implementation:**

- Assembly Flow at 8% opacity behind loading skeletons
- Density: medium (4–5 nodes)

---

### 3. Silhouette Assembly — Illustration Language

**Purpose:** Humanize the experience with diverse figure illustrations.

#### 3.1 Empty State Illustrations

**Location:** Any page with empty content

**Examples:**

- "No courses found" → 2 figures looking at empty orbit
- "No badges yet" → 1 figure with reaching gesture
- "No progress" → 3 figures walking forward

**Implementation:**

```tsx
import { SilhouetteGroup } from '@open-edu/design-system';

<div className="py-xl flex flex-col items-center">
  <SilhouetteGroup
    figures={[
      { proportion: 'tall', palette: 1 },
      { proportion: 'med', palette: 3 },
      { proportion: 'short', palette: 2 },
    ]}
    className="mb-lg"
  />
  <p className="text-on-surface-variant">Start your learning journey</p>
</div>;
```

#### 3.2 Learning Together Moments

**Location:** `HomePage.tsx`, `ProgressDashboard.tsx` — social/community sections

**Implementation:**

- Group of 5 figures (3–5 proportions, 3+ colors)
- Positioned near "learning together" or "community" messaging
- Subtle animation on hover (figures shift slightly)

#### 3.3 Onboarding Flow

**Location:** First-time user experience (if implemented)

**Implementation:**

- Single figure (med proportion, palette 1) as guide
- Progresses through steps with figure gesturing
- Final step: group of figures celebrating

#### 3.4 Achievement Celebrations

**Location:** `BadgeToast.tsx`, `CourseExitWarningDialog.tsx`

**Implementation:**

- 3–5 figures in celebration pose
- Confetti or glow effect around figures
- Brief animation (1–2 seconds)

---

## Color Token Mapping

### Open Module Colors

| Element     | Token                      | Usage                         |
| ----------- | -------------------------- | ----------------------------- |
| Core        | `--oe-color-primary`       | Central circle                |
| Satellites  | `--oe-color-primary-light` | Orbiting circles, 70% opacity |
| Orbit       | `--oe-color-primary`       | Dashed ring, 18% opacity      |
| Active ring | `--oe-color-primary`       | 2px solid ring on selection   |

### Assembly Flow Colors

| Element       | Token                      | Usage                      |
| ------------- | -------------------------- | -------------------------- |
| Path          | `--oe-color-primary`       | Dashed stroke, 15% opacity |
| Primary nodes | `--oe-color-primary`       | 60% of nodes               |
| Accent nodes  | `--oe-color-accent`        | 30% of nodes               |
| Light nodes   | `--oe-color-primary-light` | 10% of nodes               |

### Silhouette Assembly Colors

| Palette | Token                      | Usage        |
| ------- | -------------------------- | ------------ |
| c1      | `--oe-color-primary`       | Purple       |
| c2      | `--oe-color-accent`        | Teal         |
| c3      | `--oe-color-tertiary`      | Amber        |
| c4      | `--oe-color-primary-light` | Light Purple |
| c5      | `--oe-color-success`       | Green        |

---

## Implementation Phases

### Phase 1: CourseCardWithModule Pattern (Priority: High)

**Goal:** Create the pattern component in design system and integrate into Learner App.

**Stories:**

1. Create `CourseCardWithModule` pattern component in design-system
2. Create `getProgressSatellites` utility function
3. Add Storybook stories for all states (not started, in progress, complete, badge earned)
4. Write unit tests for satellite count logic
5. Integrate into CatalogPage (Continue Learning shelf + course grid)
6. Integrate into BundleOverviewPage (bundle cards)

**Files to create:**

- `packages/design-system/src/patterns/CourseCardWithModule.tsx`
- `packages/design-system/src/patterns/__tests__/CourseCardWithModule.test.tsx`
- `packages/design-system/src/patterns/CourseCardWithModule.stories.tsx`

**Files to modify:**

- `packages/design-system/src/index.ts` — export new pattern
- `apps/learner/src/CatalogPage.tsx` — use CourseCardWithModule
- `apps/learner/src/BundleOverviewPage.tsx` — use CourseCardWithModule

### Phase 2: Empty States (Priority: High)

**Stories:**

1. Create EmptyState component with Open Module + SilhouetteGroup
2. Add to CatalogPage (no courses)
3. Add to ProgressDashboard (no progress)
4. Add to BadgeToast (no badges)
5. Write tests and stories

**Files to create:**

- `packages/design-system/src/patterns/EmptyState.tsx`
- `packages/design-system/src/patterns/__tests__/EmptyState.test.tsx`
- `packages/design-system/src/patterns/EmptyState.stories.tsx`

**Files to modify:**

- `apps/learner/src/CatalogPage.tsx`
- `apps/learner/src/ProgressDashboard.tsx`
- `apps/learner/src/BadgeToast.tsx`

### Phase 3: Section Dividers (Priority: Medium)

**Stories:**

1. Add AssemblyFlow to HomePage hero background
2. Add AssemblyFlow dividers between sections
3. Add AssemblyFlow texture to AppShell sidebar
4. Write tests and stories

**Files to modify:**

- `apps/learner/src/HomePage.tsx`
- `apps/learner/src/CatalogPage.tsx`
- `apps/learner/src/AppShell.tsx`

### Phase 4: Bundle Module Indicators (Priority: Medium)

**Goal:** Create a pattern component for bundle module status indicators.

**Stories:**

1. Create `BundleModuleIndicator` pattern component
2. Replace lock/unlock icons with Open Module variants
3. Add satellite count based on module status
4. Write tests for status-to-satellite mapping
5. Write stories for all module states

**Files to create:**

- `packages/design-system/src/patterns/BundleModuleIndicator.tsx`
- `packages/design-system/src/patterns/__tests__/BundleModuleIndicator.test.tsx`
- `packages/design-system/src/patterns/BundleModuleIndicator.stories.tsx`

**Files to modify:**

- `packages/design-system/src/index.ts` — export new pattern
- `packages/runtime/src/learning/BundleOverview.tsx` — use BundleModuleIndicator

### Phase 5: Social/Learning Together (Priority: Low)

**Stories:**

1. Add SilhouetteGroup to HomePage community section
2. Add SilhouetteGroup to ProgressDashboard stats
3. Add celebration animations to BadgeToast
4. Write tests and stories

**Files to modify:**

- `apps/learner/src/HomePage.tsx`
- `apps/learner/src/ProgressDashboard.tsx`
- `apps/learner/src/BadgeToast.tsx`

---

## Acceptance Criteria

### Visual Consistency

- [ ] All course cards use Open Module indicator
- [ ] All empty states include Open Module + SilhouetteGroup
- [ ] All section dividers use AssemblyFlow pattern
- [ ] All bundle modules use Open Module status indicators
- [ ] All color tokens match Visual DNA spec

### Accessibility

- [ ] All decorative elements have `aria-hidden="true"`
- [ ] All animations respect `prefers-reduced-motion`
- [ ] All color contrasts meet WCAG AA (4.5:1 for text)
- [ ] axe-core reports 0 violations

### Performance

- [ ] Open Module renders in < 5ms
- [ ] AssemblyFlow does not cause layout shift
- [ ] SilhouetteGroup images are optimized

### Tests

- [ ] Unit tests for all satellite count logic
- [ ] Unit tests for all status-to-visual mappings
- [ ] Storybook stories for all variants
- [ ] Visual regression tests for key screens

---

## Open Questions

1. **AssemblyFlow performance:** Should we use CSS-only or SVG for decorative backgrounds? CSS is lighter but SVG gives more control.

2. **SilhouetteGroup sizing:** How small can SilhouetteGroup go before proportions are lost? Minimum container size?

3. **Animation timing:** Should Open Module hover animation be consistent across all instances or vary by context?

4. **Pattern component naming:** Should we prefix pattern components with "Visual" (e.g., `VisualCourseCard`) or keep them unprefixed?

---

## Decisions Made

| Question             | Decision                               | Rationale                                                                      |
| -------------------- | -------------------------------------- | ------------------------------------------------------------------------------ |
| CourseCard ownership | **Pattern component in design-system** | Keeps runtime generic, follows "assembly over hierarchy", reusable across apps |

---

## References

- Visual DNA spec: `docs/superpowers/specs/2026-07-03-visual-dna-design.md`
- Design system primitives: `packages/design-system/src/primitives/`
- Design system patterns: `packages/design-system/src/patterns/`
- Open Module component: `packages/design-system/src/primitives/open-module.tsx`
- Assembly Flow component: `packages/design-system/src/primitives/assembly-flow.tsx`
- Silhouette Assembly component: `packages/design-system/src/primitives/silhouette-assembly.tsx`
- Runtime CourseCard: `packages/runtime/src/learning/CourseCard.tsx`
- Runtime BundleOverview: `packages/runtime/src/learning/BundleOverview.tsx`

---

## Appendix: Pattern Component Architecture

### Why Pattern Components?

The Visual DNA alignment uses **pattern components** in the design system rather than modifying runtime components directly. This follows the project's philosophy:

1. **Assembly over hierarchy** — Patterns compose primitives with runtime components
2. **Separation of concerns** — Runtime handles behavior, design-system handles visual DNA
3. **Reusability** — Any app can use the same patterns
4. **Customization** — Apps can create their own patterns if needed

### Pattern Component Structure

```
packages/design-system/src/patterns/
├── CourseCardWithModule.tsx      # Open Module + CourseCard
├── BundleModuleIndicator.tsx    # Open Module + Bundle modules
├── EmptyState.tsx               # Open Module + SilhouetteGroup
├── SectionDivider.tsx           # AssemblyFlow divider
├── __tests__/
│   ├── CourseCardWithModule.test.tsx
│   ├── BundleModuleIndicator.test.tsx
│   ├── EmptyState.test.tsx
│   └── SectionDivider.test.tsx
└── *.stories.tsx
```

### Data Flow

```
Learner App (data fetching, navigation)
    ↓ passes props
Pattern Component (visual DNA decoration)
    ↓ wraps
Runtime Component (behavior, interaction)
```
