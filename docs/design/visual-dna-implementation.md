# Visual DNA Implementation Plan

> _Epic 33: Bridge the Visual DNA from HTML prototypes into living React components_

---

## Overview

The [Design & Design System Review](../design_review_report.md) identified a widening gap between the richness of brainstorm prototypes and the relative plainness of implemented pages. The token system, theme architecture, and key primitives (`AssemblyFlow`, `OpenModule`, `CourseCardWithModule`, `Pipili`) prove the design language _can_ be expressed in React. This plan encodes the remaining Visual DNA into composable components and applies them consistently.

### Dependency on Epic 32 (Design Token Refresh v2)

| Story                             | Depends on Epic 32? | Notes                                                |
| --------------------------------- | ------------------- | ---------------------------------------------------- |
| 33.1 – PageHeader                 | No                  | Uses existing tokens + Assembly Flow                 |
| 33.2 – Typography Audit           | ✅ Yes (32.1, 32.2) | Must run after token/typography values are finalized |
| 33.3 – HeroSection Editorial      | No                  | Uses existing components                             |
| 33.4 – Bundle Card Visual DNA     | No                  | Uses existing OpenModule/CourseCardWithModule        |
| 33.5 – StatsSummary               | No                  | New component, no token dependency                   |
| 33.6 – OpenModule progress prop   | No                  | Additive prop to existing component                  |
| 33.7 – Color audit & body-reading | ✅ Yes (32.1)       | Color audit must run after token refresh             |
| 33.8 – Visual DNA animations      | No                  | CSS keyframes + Tailwind config                      |
| 33.9 – Sidebar & Settings polish  | No                  | Opacity/class tweaks only                            |

If Epic 32 is not yet complete, stories 33.2 and 33.7 must be deferred. All others can proceed immediately.

---

## Story Breakdown

### Story 33.1 — Create `<PageHeader>` component

**Priority:** P1 (High Impact, Low Effort)

**Design spec:** Every prototype (Catalog, Progress, Bundle Overview) uses a consistent page header:

- Rounded `bg-surface-container` card
- `linear-gradient(135deg, #f5f3f0 0%, #ede9e3 100%)` background
- `AssemblyFlow` watermark (`absolute inset-0 opacity-[0.06]`)
- Eyebrow label: `<span className="text-label-caps text-primary">`
- `<h1 className="text-h1 font-display text-on-surface">` + optional subtitle
- Bottom margin: `mb-xl`

**Files to create:**

- `packages/design-system/src/patterns/PageHeader.tsx`

**Component API:**

```tsx
export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}
```

**Files to modify (apply component):**

- `apps/learner/src/CatalogPage.tsx` — Replace bare `<h1>` with `<PageHeader eyebrow="Catalog" title="Course Catalog" />`
- `apps/learner/src/ProgressDashboard.tsx` — Replace bare `<h1>` with `<PageHeader eyebrow="Progress" title="My Progress" />`
- `apps/learner/src/SettingsPage.tsx` — Replace bare `<h1>` with `<PageHeader eyebrow="Settings" title="Settings" />`

> **Note — Out of scope for this story:**
> `CollectionBinderPage.tsx` and `BundleOverviewPage.tsx` both delegate their heading markup entirely to runtime components (`CollectionBinder` and `BundleOverview` from `@open-edu/runtime`). There is no local `<h1>` in either page file to replace. Applying PageHeader to those surfaces requires a separate runtime-focused story.

**Files to update (exports):**

- `packages/design-system/src/index.ts` — Export `PageHeader` and `PageHeaderProps`

**Tests to add:**

- `packages/design-system/src/patterns/__tests__/PageHeader.test.tsx` — Test:
  - Renders title text
  - Renders eyebrow when provided
  - Renders subtitle when provided
  - `aria-hidden="true"` on AssemblyFlow SVG
  - Has `data-testid="page-header"`

**Verification:** `pnpm --filter @open-edu/design-system test && pnpm --filter @open-edu/learner test && pnpm lint && pnpm typecheck`

---

### Story 33.2 — Typography token normalization audit

**Priority:** P1 (High Impact, Low Effort)

**Dependency:** Epic 32.1 (color palette) and Epic 32.2 (typography refinement) must be complete first.

**Audit scope:** All pages in `apps/learner/src/` and patterns in `packages/design-system/src/patterns/`.

**Rules:**
| Do Not Use | Use Instead |
|---|---|
| `text-2xl font-semibold` | `text-h2 font-display` |
| `text-lg` (on headings) | `text-h4 font-display` |
| `font-bold` (with `text-h1`/`text-h2` etc.) | Remove — h1/h2 already have weight built in |
| `font-title` | `font-display` (or `font-title` if that's the token) |
| `text-muted-foreground` | `text-on-surface-variant` |
| `text-amber-600`, `text-blue-500`, etc. | Design token equivalent |

**Files to modify:**

- `apps/learner/src/SettingsPage.tsx` L41, L52: `text-2xl font-semibold leading-none tracking-tight` → `text-h2 font-display`
- `apps/learner/src/CatalogPage.tsx` L115: `text-h1 font-display text-on-surface mb-lg font-bold` → `text-h1 font-display text-on-surface mb-lg` (remove redundant `font-bold`)
- `apps/learner/src/CatalogPage.tsx` L120: `text-h2 font-display text-on-surface font-bold` → `text-h2 font-display text-on-surface`
- `apps/learner/src/CatalogPage.tsx` L154: same fix
- `apps/learner/src/ProgressDashboard.tsx` L81: `text-h1 font-display text-on-surface mb-lg font-bold` → `text-h1 font-display text-on-surface mb-lg`
- `apps/learner/src/ProgressDashboard.tsx` L112: `text-h2 font-title text-on-surface` → `text-h2 font-display text-on-surface`
- `apps/learner/src/HomePage.tsx` L35: `text-h1 font-display text-on-surface mb-sm font-bold` → `text-h1 font-display text-on-surface mb-sm`
- `apps/learner/src/CatalogPage.tsx` L172: `CardTitle className="truncate text-lg"` → review if this should use a token class
- `apps/learner/src/SettingsPage.tsx` L59, L62, L90, L104: `text-muted-foreground` → `text-on-surface-variant`
- `apps/learner/src/CatalogPage.tsx` L179, L189: `text-muted-foreground` → `text-on-surface-variant`
- `apps/learner/src/BadgeToast.tsx` L85: `text-amber-600` → find design token equivalent or use `text-tertiary`

**Verification:** `pnpm --filter @open-edu/learner test && pnpm lint && pnpm typecheck`

---

### Story 33.3 — Upgrade `HeroSection` with editorial variant

**Priority:** P1 (High Impact, Low Effort)

**Design spec:** The Home Page prototype (`home-variant-c.html`) uses:

- Large gradient background (same as page header — already in HeroSection)
- Assembly Flow watermark (already in HeroSection)
- Large Open Module (`size="lg"`) as a right-side illustration
- Display-size typography (`text-display-lg` — 40px)
- Larger padding for hero presence

**Changes to `packages/design-system/src/patterns/HeroSection.tsx`:**

**Fix 1 — Token violation in existing code:** The current `HeroSection` hardcodes gradient hex values. Replace before adding the new variant:

```tsx
// Before (token violation):
style={{ background: 'linear-gradient(135deg, #f5f3f0 0%, #ede9e3 100%)' }}

// After (CSS variable tokens):
style={{ background: 'linear-gradient(135deg, var(--oe-color-surface-container-low) 0%, var(--oe-color-surface-container) 100%)' }}
```

**Fix 2 — Add `variant` prop:**

- `variant="default"` — current behavior (gradient + AssemblyFlow + padding `px-10 py-12`)
- `variant="editorial"` — larger padding `px-12 py-16`, optional `illustration` slot via `children` arrangement, large Open Module rendered on the right side

New prop interface:

```tsx
export interface HeroSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'editorial';
  showIllustration?: boolean;
}
```

When `variant="editorial"` and `showIllustration=true`, render a two-column layout:

- Left: children (heading + body)
- Right: `<OpenModule size="lg" satellites={6} />` (absolute positioned or flex)

**Changes to `apps/learner/src/HomePage.tsx`:**

```tsx
<HeroSection variant="editorial" showIllustration className="mb-xl">
  <h1 className="text-display-lg font-display text-on-surface">Welcome back, Learner</h1>
  <p className="text-body-reading text-on-surface-variant mt-md max-w-prose">
    Continue where you left off, or explore new courses in the catalog.
  </p>
</HeroSection>
```

Remove `font-bold` from h1 (display-lg already has weight 700).

**Tests to add (or modify):**

- `packages/design-system/src/patterns/__tests__/HeroSection.test.tsx` — Test:
  - Renders default variant with expected padding
  - Renders editorial variant
  - Editorial with `showIllustration` renders OpenModule SVG
  - AssemblyFlow has `aria-hidden="true"`

**Verification:** `pnpm --filter @open-edu/design-system test && pnpm --filter @open-edu/learner test && pnpm lint && pnpm typecheck`

---

### Story 33.4 — Bundle cards with Visual DNA

**Priority:** P1 (High Impact, Low Effort)

**Current state:** `CatalogPage.tsx` renders bundle cards using generic shadcn `Card` with `Badge variant="secondary"`, `CardTitle`, `CardDescription`, `Progress`. No Open Module, no Visual DNA.

**Design spec (from `catalog.html` prototype):** Bundle cards use the same card shell as course cards. The Open Module encodes bundle-level progress:

- Completed modules / total modules → satellite count (2–6)
- Section divider uses full Assembly Flow SVG

**Changes to `apps/learner/src/CatalogPage.tsx`:**

Replace the generic `<Card>` block (lines 161–195) with a new `BundleCardWithModule` pattern:

```tsx
// Calculate bundle-level satellites
const totalModules = bundle.moduleCount;
const completedModules = prog
  ? Object.values(prog.moduleStatuses).filter((s) => s === 'completed').length
  : 0;
const percent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
const satellites =
  percent === 0 ? 2 : percent >= 100 ? 6 : 3 + Math.min(Math.floor((percent / 100) * 3), 3);
```

Wrap the card with an OpenModule indicator:

```tsx
<div className="relative">
  <div className="absolute right-4 top-4 z-10">
    <OpenModule size="xs" satellites={satellites} aria-hidden="true" />
  </div>
  <Card className="cursor-pointer transition-shadow hover:shadow-md" ...>
    ...existing content...
  </Card>
</div>
```

Or, better — create a shared wrapper component or adapt `CourseCardWithModule` to also work for bundles.

**Recommended approach:** Add a `BundleCardWithModule` component to `packages/design-system/src/patterns/` that mirrors `CourseCardWithModule` but accepts bundle progress data.

**Files to create:**

- `packages/design-system/src/patterns/BundleCardWithModule.tsx`

**Component API:**

```tsx
export interface BundleCardWithModuleProps {
  completedModules: number;
  totalModules: number;
  children: React.ReactNode;
}
```

**Files to update (exports):**

- `packages/design-system/src/index.ts` — Export `BundleCardWithModule`

**Files to modify:**

- `apps/learner/src/CatalogPage.tsx` — Use `BundleCardWithModule` wrapping the bundle `<Card>`

**Tests to add:**

- `packages/design-system/src/patterns/__tests__/BundleCardWithModule.test.tsx` — Test:
  - `getBundleSatellites(0, 5)` returns 2 (not started)
  - `getBundleSatellites(5, 5)` returns 6 (complete)
  - `getBundleSatellites(2, 5)` returns 4 (in progress)
  - Renders OpenModule with `aria-hidden="true"`
  - Renders children

**Verification:** `pnpm --filter @open-edu/design-system test && pnpm --filter @open-edu/learner test && pnpm lint && pnpm typecheck`

---

### Story 33.5 — Create `<StatsSummary>` component

**Priority:** P2 (Design Completeness)

**Design spec:** Progress Dashboard prototype has a `grid grid-cols-3` stats row with color-coded numbers. This pattern appears across Home, Progress, and Bundle Overview pages.

**Files to create:**

- `packages/design-system/src/patterns/StatsSummary.tsx`

**Component API:**

```tsx
export interface StatsSummaryItem {
  value: number;
  label: string;
  color?: 'primary' | 'success' | 'tertiary';
  icon?: React.ReactNode;
}

export interface StatsSummaryProps extends React.HTMLAttributes<HTMLDivElement> {
  items: StatsSummaryItem[];
  columns?: 2 | 3 | 4;
}
```

Default `color` mapping:

- `primary` → `text-primary`
- `success` → `text-success` (or `text-tertiary`)
- `tertiary` → `text-tertiary`

**Files to update (exports):**

- `packages/design-system/src/index.ts` — Export `StatsSummary`, `StatsSummaryItem`, `StatsSummaryProps`

**Files to modify:**

- `apps/learner/src/HomePage.tsx` — Replace inline circle-SVG stat row (lines 43–68) with:

```tsx
<StatsSummary
  items={[
    { value: totalUnits, label: 'learning units', icon: <BookOpen className="h-4 w-4" /> },
    { value: inProgressCount, label: 'in progress', icon: <TrendingUp className="h-4 w-4" /> },
    { value: badgeCount, label: 'badges earned', icon: <Trophy className="h-4 w-4" /> },
  ]}
/>
```

- `apps/learner/src/ProgressDashboard.tsx` — Add summary stats row above the course list (count of in-progress, completed, and badge total)

> **Icon responsibility:** `StatsSummary` accepts `React.ReactNode` for the `icon` prop — it does not import or reference Lucide icons directly. The learner app (consumer) is responsible for supplying icons. The design system component stays icon-library-agnostic.

**Tests to add:**

- `packages/design-system/src/patterns/__tests__/StatsSummary.test.tsx` — Test:
  - Renders all items
  - Each item shows value and label
  - Correct color class applied based on `color` prop
  - Renders icon when provided
  - Defaults to 3 columns

**Verification:** `pnpm --filter @open-edu/design-system test && pnpm --filter @open-edu/learner test && pnpm lint && pnpm typecheck`

---

### Story 33.6 — Add `progress` prop to `OpenModule`

**Priority:** P2 (Design Completeness)

**Current state:** `OpenModule` accepts `satellites` (2–6) directly. `CourseCardWithModule` computes satellite count from progress data. There is no `progress` prop that maps 0–100% to satellite count.

**Changes to `packages/design-system/src/primitives/open-module.tsx`:**

Add a `progress` prop (0–100) that maps to satellite count:

```tsx
export interface OpenModuleProps {
  size?: OpenModuleSize;
  satellites?: number; // explicit override (takes priority)
  progress?: number; // 0-100, auto-computes satellites
  state?: OpenModuleState;
}
```

Mapping:
| Progress Range | Satellites |
|---|---|
| 0% | 2 |
| 1–33% | 3 |
| 34–66% | 4 |
| 67–99% | 5 |
| 100% | 6 |

When both `satellites` and `progress` are provided, `satellites` takes priority (backward compatible).

**Files to modify:**

- `packages/design-system/src/primitives/open-module.tsx` — Add `progress` prop and a pure helper function `progressToSatellites(progress: number): number` to compute satellite count. Do **not** use `useMemo` — this is a pure numeric mapping with negligible cost; a plain derived variable is sufficient and simpler.

**Tests to add:**

- `packages/design-system/src/primitives/__tests__/open-module.test.tsx` — Add test cases:
  - `progress={0}` renders 2 satellites
  - `progress={50}` renders 4 satellites
  - `progress={100}` renders 6 satellites
  - `satellites={5}` overrides `progress={100}` (backward compat)
  - `progress={-1}` clamps to 0
  - `progress={150}` clamps to 100

**Verification:** `pnpm --filter @open-edu/design-system test && pnpm lint && pnpm typecheck`

---

### Story 33.7 — Color token audit & body-reading refinement

**Priority:** P2 (Design Completeness)

**Dependency:** Epic 32.1 (color palette refresh) must be complete first.

**Tasks:**

1. **Verify primary color:** Confirm `--oe-color-primary` resolves to `#5d4a8a` (warm violet, per Volume II) and not `#6d28d9` (Tailwind violet-700).
   - Read `packages/runtime/src/themes/lumina-scholastica.ts` — verify `primary: '#5d4a8a'`
   - Read other theme files to confirm they don't override primary to an unintended value

2. **Surface container audit:** Verify the gradient used in PageHeader (`#f5f3f0 → #ede9e3`) matches `surface-container-low → surface-container`. Update if needed after Epic 32.1.

3. **Add `font-body-reading` to reading content in course steps:**
   - Search for `<p>` and `<div>` elements in course step renderers that contain narrative text
   - Ensure they use `text-body-reading font-body-reading` class
   - Check `packages/runtime/src/` for narrative/paragraph rendering (markdown output)

4. **Proto files audit:** Update Visual DNA prototype HTML files to use CSS variable references (`var(--oe-color-primary)`) rather than hardcoded hex values (this is low priority — cosmetic only).

**Files to inspect/verify:**

- `packages/runtime/src/themes/lumina-scholastica.ts` — Primary token value
- `packages/runtime/src/themes/nocturnal.ts` — Primary token value
- `packages/runtime/src/themes/zen.ts` — Primary token value
- `packages/runtime/src/renderers/` — Content renderers for body-reading application

**Verification:** `pnpm test` (full suite). All pass.

---

### Story 33.8 — Visual DNA motion animations

**Priority:** P3 (Motion & Polish)

**Design spec:** The brainstorm prototypes define:

- `orbit-float` — gentle floating animation for stat cards (translateY oscillation)
- `silhouette-breath` — opacity pulse on silhouette figures
- `dash-flow` — animated stroke-dashoffset on Assembly Flow paths (already partially implemented)
- `pipili-wave` — Pipili rocking animation

**Implementation plan:**

1. **Add keyframes to `packages/design-system/src/index.css`:**

> **Note — `dash-flow` already exists.** `AssemblyFlow` injects `dash-flow` via an inline `<style>` tag inside its SVG `<defs>` block. Do **not** add it here again — duplicate keyframe definitions will cause conflicts. Only add the new keyframes below.

```css
@keyframes orbit-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

@keyframes pipili-wave {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-3deg);
  }
  75% {
    transform: rotate(3deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .animate-orbit-float {
    animation: none !important;
  }
  .animate-pipili-wave {
    animation: none !important;
  }
}
```

> **Note — `silhouette-breath` already exists.** `SilhouetteAssembly` already defines `@keyframes silhouette-breath` and already accepts an `animated` prop. No changes needed to that component or its keyframe. Verify the existing implementation matches the spec and move on.

2. **Add Tailwind utilities in `packages/design-system/src/tokens/tailwind.ts`:**

```ts
export const tailwindAnimationExtensions: Record<string, string> = {
  'orbit-float': 'orbit-float 3s ease-in-out infinite',
  'pipili-wave': 'pipili-wave 2s ease-in-out infinite',
};
```

3. **Wire the new token export** — `packages/design-system/src/tokens/index.ts` already re-exports everything from `tailwind.ts` via `export * from './tailwind.js'`, so no change needed there. The new export will be picked up automatically.

4. **Wire into Tailwind configs** — The new animation classes won't be generated until the consuming apps add them to their Tailwind config:

```ts
// apps/learner/tailwind.config.ts  (add to theme.extend)
import { tailwindAnimationExtensions } from '@open-edu/design-system/tokens';
// ...
animation: {
  ...tailwindAnimationExtensions,
  'accordion-down': 'accordion-down 0.2s ease-out',
  'accordion-up': 'accordion-up 0.2s ease-out',
},
```

Same pattern must be applied to `apps/dev-server/tailwind.config.js`.

5. **Apply animations:**

- `dash-flow` — Already fully implemented in `AssemblyFlow`. No changes needed. ✅
- `silhouette-breath` — Already fully implemented in `SilhouetteAssembly` via `animated` prop. Verify only. ✅
- `orbit-float` — Add to `StatsSummary` items via optional `animated` prop
- `pipili-wave` — Add to `Pipili` component as opt-in via `animated` prop

**Files to modify:**

- `packages/design-system/src/index.css` — Add `orbit-float` and `pipili-wave` keyframes only (not `dash-flow`, not `silhouette-breath`)
- `packages/design-system/src/tokens/tailwind.ts` — Add `tailwindAnimationExtensions` export
- `apps/learner/tailwind.config.ts` — Import and apply `tailwindAnimationExtensions` to `theme.extend.animation`
- `apps/dev-server/tailwind.config.js` — Same as above
- `packages/design-system/src/primitives/pipili.tsx` — Add `animated` prop with `pipili-wave` class application
- `packages/design-system/src/patterns/StatsSummary.tsx` — Add `animated` prop with `orbit-float` class application

**Tests to add:**

- Tests that verify animation classes are applied when `animated={true}`
- Tests that verify `prefers-reduced-motion` is respected (JSDOM limitation — verify the CSS media query exists in the component)

**Verification:** `pnpm --filter @open-edu/design-system test && pnpm lint && pnpm typecheck`

---

### Story 33.9 — Sidebar AssemblyFlow refinement & Settings polish

**Priority:** P3 (Motion & Polish)

**Tasks:**

1. **Sidebar AssemblyFlow opacity increase:**
   - Files: `apps/learner/src/AppShell.tsx` lines 315, 374
   - Change `opacity-5` → `opacity-[0.08]` in both locations (the CourseStepWrapper and AppLayout sidebar)

2. **Visual separator between logo and nav zones in sidebar:**
   - Check `AppSidebar` component in `packages/design-system/src/patterns/AppSidebar.tsx`
   - Add a subtle divider after the logo: `border-b border-outline-variant/40` or similar

3. **Settings Page heading styles normalization** (if not already done in Story 33.2):
   - `apps/learner/src/SettingsPage.tsx` L41, L52: `text-2xl font-semibold leading-none tracking-tight` → `text-h2 font-display`
   - Replace `text-muted-foreground` → `text-on-surface-variant` (lines 59, 62, 90, 104)

**Files to modify:**

- `apps/learner/src/AppShell.tsx` — Opacity: `opacity-5` → `opacity-[0.08]` (two locations)
- `packages/design-system/src/patterns/AppSidebar.tsx` — Add visual separator
- `apps/learner/src/SettingsPage.tsx` — Heading normalization

**Tests to verify:**

- `apps/learner/src/AppShell.test.tsx` — Ensure existing tests still pass
- `packages/design-system/src/patterns/__tests__/AppSidebar.test.tsx` — Ensure existing tests still pass

**Verification:** `pnpm --filter @open-edu/design-system test && pnpm --filter @open-edu/learner test && pnpm lint && pnpm typecheck`

---

## Visual DNA Adoption Tracking

After all stories are complete:

| Element                            | Component                              | Used In                                                         |
| ---------------------------------- | -------------------------------------- | --------------------------------------------------------------- |
| Page Header (gradient + watermark) | `PageHeader` ✅                        | Catalog, Progress, Settings, Bundle Overview, Collection Binder |
| Open Module (orbital cluster)      | `OpenModule` with `progress` prop ✅   | Course cards, Bundle cards, StatsSummary                        |
| Assembly Flow (dashed path)        | `AssemblyFlow` + `animated` ✅         | Sidebar, PageHeader, HeroSection, SectionDivider                |
| Silhouette Assembly (figures)      | `SilhouetteAssembly` + `animated` ✅   | Empty states, animated variant                                  |
| Section Divider                    | `SectionDivider` ✅                    | Catalog, Home                                                   |
| Hero Editorial Layout              | `HeroSection` `variant="editorial"` ✅ | Home Page                                                       |
| Stats Summary Row                  | `StatsSummary` ✅                      | Home, Progress Dashboard                                        |
| Pipili                             | `Pipili` + `animated` ✅               | Non-course views                                                |
| Typography                         | All token-based ✅                     | All pages — no raw Tailwind utilities                           |

---

## Verification Checklist

Before marking this epic complete:

- [ ] `pnpm test` — All tests pass
- [ ] `pnpm lint` — No lint errors
- [ ] `pnpm typecheck` — TypeScript compiles cleanly
- [ ] `pnpm format:check` — Prettier formatting is correct
- [ ] All new components have `data-testid` attributes
- [ ] All new SVG elements have `aria-hidden="true"`
- [ ] All `prefers-reduced-motion` queries are respected in animations
- [ ] Every page in the Learner App has a PageHeader component
- [ ] No raw Tailwind text utility classes (`text-2xl`, `text-lg`, `font-bold` with h1/h2) remain in page components
- [ ] Bundle cards use OpenModule encoding
- [ ] HomePage hero uses editorial variant with OpenModule illustration
- [ ] StatsSummary used in HomePage (and optionally Progress)
