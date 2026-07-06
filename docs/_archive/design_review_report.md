# OpenEdu Design & Design System Review

> _"Good design is not discovered by accident. It is assembled through thoughtful iteration."_  
> — DESIGN_PROCESS.md

---

## Executive Summary

This report evaluates the **current Learner App implementation** against the **design philosophy** (DESIGN_PROCESS.md, AI_CONTEXT.md), the **prototype explorations** (brainstorm/), and the **Visual DNA** established in Stage 3. The project has made genuine progress — the token infrastructure, theme system, Visual DNA primitives, and key components are real and working. But there is a widening gap between the richness of the brainstorm prototypes and the relative plainness of the implemented pages. That gap is the central finding of this review.

---

## 1. The Design Pyramid — Where Are We?

The process defines a strict ordering:

```
Philosophy → Design Language → Visual DNA → Design System → UX → Engineering
```

| Layer               | Status               | Notes                                                                                                                                                                             |
| ------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Philosophy**      | ✅ Complete          | Well-documented in Volume I                                                                                                                                                       |
| **Design Language** | ✅ Complete          | Volume II defined                                                                                                                                                                 |
| **Visual DNA**      | ✅ Prototyped        | Open Module, Assembly Flow, Silhouette Assembly — all defined in `visual-dna/04-refined-system.html`                                                                              |
| **Design System**   | 🟡 Partial           | Token system is solid (`@open-edu/design-system`). Components exist (Button, Card, etc.) but Visual DNA is **not yet encoded** into the component library as reusable primitives. |
| **UX / Product**    | 🔴 Behind prototypes | Learner App pages exist but feel like scaffolding compared to what the brainstorm prototypes already demonstrated.                                                                |
| **Engineering**     | 🟡 Functional        | App runs, routing works, state managed correctly. But pages lack Visual DNA expression.                                                                                           |

**Core finding: The Visual DNA lives only in HTML prototypes, not yet in the React design system.**

---

## 2. Prototype vs. Implementation — Page-by-Page Gap Analysis

### 2.1 Home Page

**Prototype (`home-variant-c.html`)**

- Asymmetric editorial hero with `linear-gradient` background + Assembly Flow SVG watermark
- Large Open Module (lg, 5 sats) as a right-side visual focal point
- Silhouette Assembly figures used as a section-break motif
- Stats rendered as floating orbital cards with staggered `orbit-float` animation
- CTA section with Assembly Flow as a subtle border pattern
- Animated dashed path at the bottom as a visual closure
- Typography uses `display-lg` (40px) for the hero headline with `Source Serif 4` for body text

**Implementation (`HomePage.tsx`)**

- Flat `HeroSection` component with plain text, no background treatment
- Stats as a simple flex row with filled circle SVGs (identical 20×20 circles for all three — no Visual DNA)
- `SectionDivider` component (good — but minimal usage)
- CTA: a bordered box with three plain buttons
- No Open Module, no Silhouette Assembly, no editorial hierarchy

> [!CAUTION]
> The Home Page is the highest-visibility surface in the app. The gap between what was prototyped and what is built is the largest of any page.

---

### 2.2 Catalog Page

**Prototype (`catalog.html`)**

- Page header is a rounded `surface-container` card with Assembly Flow watermark background
- Eyebrow label ("Catalog") with `text-label` uppercase treatment above the `h1`
- Course cards feature the Open Module (48×48) as a corner decoration showing progress state (2 sats = not started, 4 sats + brighter = in progress, 6 sats filled = complete)
- Bundle cards use the same language — the Open Module becomes the progress encoding
- Section dividers are the full Assembly Flow SVG with visible nodes
- Filter chips are pill-shaped with clear visual distinction

**Implementation (`CatalogPage.tsx`)**

- No page header visual treatment — plain `h1` text with no hero/gradient
- Course cards do use `CourseCardWithModule` ✅ (good) — this is the most implemented Visual DNA surface
- Bundle cards use a generic shadcn `Card` — no Open Module, no Visual DNA language
- `SectionDivider` used between sections ✅ — good
- Filter chips and sort controls are functional but have no visual character

---

### 2.3 Progress Dashboard

**Prototype (`progress.html`)**

- Consistent page header with Assembly Flow watermark (same pattern as Catalog)
- Summary stats grid (3 columns): In Progress / Completed / Badges — with color-coded numbers (primary, success, tertiary)
- Progress cards use **large Open Module (80×80)** with satellite count encoding the progress
- Satellite count animates from 2 to 5 as progress increases (conceptual)
- Cards have `border-2 border-primary` for active courses, `border-success` for completed
- Completion badge shown with full satellite Open Module (all satellites lit)
- Pipili figure with breathing animation at the bottom

**Implementation (`ProgressDashboard.tsx`)**

- Page heading only — no header visual treatment
- No summary stats grid
- Progress cards are `Card` + `CardContent` with a horizontal layout — functional but no Open Module visual encoding
- Completion state shown with a `border-l-success border-l-4` left border (not in design system vocabulary)
- Uses `CheckCircle2` from Lucide — not an OpenEdu-native affordance
- No Pipili character visible in this page

---

### 2.4 Settings Page

**Prototype:** No dedicated Settings prototype exists.

**Implementation (`SettingsPage.tsx`)**

- Functional and well-structured
- Uses `Card` + `CardHeader` pattern correctly
- Heading hierarchy is inconsistent: `h2` inside `CardHeader` uses raw Tailwind utility classes (`text-2xl font-semibold`) rather than design tokens (`text-h2 font-display`)
- ThemeSelector integration is good
- Font size control is clear

> [!NOTE]
> Settings is the lowest priority page for Visual DNA expression — functional correctness here is appropriate for the MVP.

---

### 2.5 App Shell / Layout

**Current (`AppShell.tsx`)**

- `AssemblyFlow` is used as a background pattern in the sidebar ✅ — this is exactly correct
- `AppSidebar` with logo, nav items, and course step list — functional
- `TopAppBar` with breadcrumbs and accessibility controls — solid
- `Pipili` character rendered on non-course views ✅ — contextual mood states implemented
- Course exit warning dialog — well thought out

**What's missing**

- The sidebar's Assembly Flow is at `opacity-5` — almost invisible. The prototype uses `opacity-5` to `opacity-8` which is still subtle but more present
- No visual separation between the logo zone and nav zone in the sidebar
- The `TopAppBar` has no Visual DNA expression (no Assembly Flow treatment at any point)

---

## 3. Design System — Component Analysis

### 3.1 What Works Well

| Component / Token                       | Status         | Notes                                                        |
| --------------------------------------- | -------------- | ------------------------------------------------------------ |
| `--oe-*` CSS token system               | ✅ Solid       | Full color, spacing, radius, font tokens                     |
| `RuntimeThemeProvider` (Light/Dark/Zen) | ✅ Working     | 3-theme system implemented                                   |
| `AssemblyFlow` component                | ✅ Exists      | Used in sidebar correctly                                    |
| `SectionDivider`                        | ✅ Exists      | Used correctly in Catalog and Home                           |
| `OpenEduLogo`                           | ✅ Exists      | Symbol + lockup variants                                     |
| `CourseCardWithModule`                  | ✅ Exists      | Open Module in course cards — the best Visual DNA expression |
| `EmptyState`                            | ✅ Exists      | Uses silhouette figures and Open Module                      |
| `HeroSection`                           | ✅ Exists      | But too plain — needs gradient + Assembly Flow background    |
| `Button`, `Card`, `Badge`, `Progress`   | ✅ Functional  | Standard shadcn/ui, properly tokenized                       |
| Pipili                                  | ✅ Implemented | With mood states — good                                      |

### 3.2 Critical Gaps

#### Gap 1 — Page Header Pattern is Missing

Every prototype has a consistent **page header** component:

- Rounded surface-container card
- `linear-gradient` background (`#f7f4f0 → #f2eee9`)
- Assembly Flow SVG watermark (absolute positioned, `opacity-6`)
- Eyebrow label (uppercase `text-label text-primary`)
- `h1` + subtitle

This pattern is used in: Catalog, Progress, Collection Binder, Bundle Overview — but it **does not exist** as a design system component. Each page currently renders a bare `h1`.

**Recommendation:** Create a `<PageHeader>` component in `@open-edu/design-system`.

---

#### Gap 2 — Open Module Doesn't Encode State

The Visual DNA specification says Open Module satellite count encodes meaning:

- 2 satellites = not started
- 3–4 satellites = in progress
- 5–6 satellites = complete / full

In the current implementation, `CourseCardWithModule` exists but the satellite count is static. The progress-encoding behavior from the prototypes is not implemented.

**Recommendation:** Make `OpenModule` accept a `progress` prop (0–1 or 0–100) that drives satellite count and opacity dynamically.

---

#### Gap 3 — The `HeroSection` Component Lacks Visual DNA

`HeroSection` in `HomePage.tsx` wraps a heading and body text in a plain container. The prototype uses:

- Gradient background
- Assembly Flow SVG watermark
- Large Open Module right-side illustration
- Display-size typography (40px vs the 28px h1 currently used)

**Recommendation:** Redesign `HeroSection` to accept a `variant` prop:

- `default` — current plain version
- `editorial` — gradient + Assembly Flow + optional Open Module illustration

---

#### Gap 4 — No Summary Stats Component

The Progress Dashboard prototype has a `grid grid-cols-3` stats row with color-coded numbers. This pattern (N + label, colored by semantic category) appears across Home, Progress, and Bundle Overview pages. It is not a shared component.

**Recommendation:** Create `<StatsSummary items={[{value, label, color}]} />`.

---

#### Gap 5 — Typography Token Inconsistency

The prototypes use a careful type scale:

- `display-lg` (40px, Inter) — hero headlines
- `h1` (28px, Inter, weight 650)
- `body-reading` (18px, Source Serif 4) — narrative content
- `caption` (13px) — metadata, labels

The implementation mixes token-based classes with raw Tailwind utilities. Examples:

- `SettingsPage.tsx` L42: `text-2xl font-semibold` — should be `text-h2 font-display`
- `ProgressDashboard.tsx` L112: `text-h2 font-title` — `font-title` is not in the token system
- `CatalogPage.tsx` L115: `text-h1 font-display text-on-surface mb-lg font-bold` — bold is double-applied (h1 already has weight 650 built in)

**Recommendation:** Audit and normalize all text classes to use design token utilities only.

---

#### Gap 6 — Bundle Cards Have No Visual DNA

In `CatalogPage.tsx`, bundle cards use a generic shadcn `Card` with `CardHeader`/`CardContent`. They have:

- A `Badge` saying "Bundle" (shadcn badge with `variant="secondary"`)
- `CardTitle` + `CardDescription`
- A `Progress` bar and completion count

They have no Open Module, no Visual DNA treatment. The prototype demonstrates that Bundle cards should use the **same card shell** as course cards, with the Open Module encoding the bundle-level progress (e.g., completed modules / total modules → satellite count).

**Recommendation:** Replace the generic `Card` bundle rendering with `CourseCardWithModule` adapted for bundles.

---

#### Gap 7 — Color Token Drift Between Prototypes and Implementation

The prototypes use a slightly warmer primary palette:

- Primary: `#5d4a8a` (warm violet)
- Primary-light: `#7c6bb0`

The Visual DNA `04-refined-system.html` uses:

- Primary: `#6d28d9` (more saturated)
- Primary-light: `#8b5cf6`

The implementation defers to `--oe-color-primary` (token). The actual value of `--oe-color-primary` needs to be verified against the intended Visual DNA palette. If the token resolves to `#6d28d9`, that is a divergence from the warmer `#5d4a8a` direction used in all the more-refined brainstorm prototypes.

> [!IMPORTANT]
> Verify that `--oe-color-primary` resolves to `#5d4a8a` (warm violet, from Volume II) and not `#6d28d9` (Tailwind violet-700). The brainstorm prototypes consistently converged on the warmer tone.

---

## 4. Visual DNA — Adoption Status

| Element                            | Defined In                      | In Design System                 | In App            |
| ---------------------------------- | ------------------------------- | -------------------------------- | ----------------- |
| Open Module (orbital cluster)      | `04-refined-system.html`        | `CourseCardWithModule` (partial) | Course cards only |
| Assembly Flow (dashed path)        | `02-pattern-language.html`      | `AssemblyFlow` component ✅      | Sidebar only      |
| Silhouette Assembly (figures)      | `04-refined-system.html`        | `EmptyState` (partial)           | Empty states only |
| Section Divider (Assembly Flow)    | `03-section-dividers.html`      | `SectionDivider` ✅              | Catalog + Home    |
| Page Header (gradient + watermark) | `catalog.html`, `progress.html` | ❌ Missing                       | Nowhere           |
| Hero Editorial Layout              | `home-variant-c.html`           | `HeroSection` (incomplete)       | Home — plain      |
| Pipili character                   | `home-variant-c.html`           | `Pipili` ✅                      | Non-course views  |

---

## 5. Interaction & Motion Gaps

The brainstorm prototypes defined several micro-animations:

- `orbit-float` — stat cards gently floating
- `silhouette-breath` — opacity pulse on silhouette figures
- `dash-flow` — animated stroke-dashoffset on Assembly Flow paths
- `pipili-wave` — Pipili rocking animation

Current implementation:

- `@keyframes accordion-down/up` exist (shadcn/radix)
- `tailwindcss-animate` plugin installed
- **None of the Visual DNA animations are implemented** in the Tailwind config or components

> [!NOTE]
> These are low priority for MVP, but `dash-flow` on `AssemblyFlow` and `orbit-float` on stat cards would have high visual impact for minimal engineering effort.

---

## 6. Recommended Improvements — Prioritized

### Priority 1 — High Impact, Low Effort

1. **Create `<PageHeader>` component** with gradient background + Assembly Flow watermark. Apply to Catalog, Progress, Bundle Overview, Collection Binder, Settings. This alone will make every page feel distinctly OpenEdu.

2. **Fix typography inconsistencies.** Audit all pages for raw Tailwind utilities in text classes. Normalize to `text-h1 font-display`, `text-body-reading font-body-reading`, `text-caption`, etc.

3. **Upgrade `HeroSection`** with the editorial variant — gradient + Assembly Flow + large Open Module. Apply only to Home Page.

4. **Upgrade Bundle Cards** to use Visual DNA (Open Module encoding bundle completion progress).

### Priority 2 — Design Completeness

5. **Add `StatsSummary` component.** Shared across Home, Progress, Bundle Overview.

6. **Make Open Module progress-driven.** Satellite count (2–6) reflects completion percentage. This makes the Open Module semantically meaningful rather than decorative.

7. **Add `font-body-reading` ("Source Serif 4")** to reading content in course steps. Currently only `Inter` is consistently used even for narrative paragraphs.

8. **Color token audit.** Confirm `--oe-color-primary` matches `#5d4a8a` (warm violet). Update Visual DNA files to use CSS variable references rather than hardcoded hex values.

### Priority 3 — Motion & Polish

9. **Add `dash-flow` animation** to `AssemblyFlow` component (opt-in via `animated` prop, respects `prefers-reduced-motion`).

10. **Add `orbit-float` animation** to stat card variants.

11. **Sidebar refinement** — slightly increase Assembly Flow opacity to `opacity-[0.08]` from `opacity-5`. Add visual separator between logo and nav zones.

12. **Settings Page** — normalize heading styles to design tokens.

---

## 7. Design System Architecture Recommendations

### 7.1 Component Naming & Structure

The current mix of:

- shadcn/ui primitives (`Card`, `Badge`, `Button`, `Select`)
- OpenEdu Visual DNA components (`AssemblyFlow`, `CourseCardWithModule`, `SectionDivider`)
- Lucide icons (not in Visual DNA spec)

…creates an inconsistent vocabulary. The design system should have a clearer two-tier structure:

| Tier           | Components                                                                                               | Source of truth                                         |
| -------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Foundation** | Design tokens, `cn()` utility                                                                            | `@open-edu/design-system/tokens`                        |
| **Primitives** | Button, Card, Badge, Input, Select, Dialog                                                               | shadcn/ui (implementation choice, not design authority) |
| **Visual DNA** | `OpenModule`, `AssemblyFlow`, `SectionDivider`, `SilhouetteGroup`, `PageHeader`, `HeroSection`, `Pipili` | OpenEdu-native, derived from Visual DNA specification   |
| **Composite**  | `CourseCardWithModule`, `StatsSummary`, `EmptyState`                                                     | OpenEdu-native, composed from above                     |

### 7.2 Figma → Code Token Pipeline

Currently there's no evidence of a Figma Library connected to the token system. The prototypes define values inline (hex colors, px sizes). These should flow:

```
Figma Design System → design tokens JSON → CSS variables → Tailwind extensions → components
```

The current CSS token system (`--oe-*`) is a good foundation. The missing piece is the Figma Library that governs updates to those tokens.

### 7.3 The `text-muted-foreground` Problem

`text-muted-foreground` (shadcn's semantic class) and `text-on-surface-variant` (OpenEdu token) are used interchangeably in the codebase. Both map to the same CSS variable, but this creates conceptual confusion — developers don't know which vocabulary to use. **Choose one: prefer `text-on-surface-variant`** as it is OpenEdu-native.

---

## 8. Process Alignment Check

Against the AI_CONTEXT.md review checklist:

| Question                                     | Answer                                                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Consistent with Volume I (Philosophy)?       | ✅ — "calm, modular, open" is present in the architecture                                                                      |
| Consistent with Volume II (Design Language)? | 🟡 — Token system is correct; components are not fully aligned                                                                 |
| Does it improve learning?                    | 🟡 — Functionally yes; experientially, the sparseness of the current pages creates less motivation than the prototypes suggest |
| Does it reduce cognitive effort?             | 🟡 — Layout is clear; but lack of visual hierarchy on Home/Progress makes scanning harder                                      |
| Is it accessible?                            | 🟡 — `aria-hidden` used on decorative SVGs ✅; some heading hierarchy issues                                                   |
| Is it reusable?                              | 🟡 — Good token system; but page-level patterns (PageHeader) are duplicated                                                    |
| Is it implementation-independent?            | 🔴 — Open Module spec exists only as hard-coded SVG in HTML files, not as a composable React primitive                         |
| Is it appropriate for the MVP?               | ✅ — Scope is right; the gaps identified are real but addressable                                                              |

---

## 9. Conclusion

The OpenEdu design infrastructure is **well-conceived and partially executed**. The token system, theme architecture, and key primitives (`AssemblyFlow`, `CourseCardWithModule`, `Pipili`) prove the design language can be implemented in React. The prototypes show what the pages _should feel like_ — and they feel meaningfully more alive than the current implementation.

The path forward is clear:

1. **Bridge the Visual DNA into the design system** — `PageHeader`, `OpenModule` as a dynamic primitive, `StatsSummary`, enhanced `HeroSection`.
2. **Apply those components consistently** to all Learner App pages.
3. **Normalize the token vocabulary** and eliminate raw Tailwind utilities in component markup.
4. **Verify the primary color token** against the settled Visual DNA palette.

The bones are correct. The design system is architected correctly. What is missing is the final translation of the Visual DNA from HTML prototypes into living React components — and their consistent application across every page of the Learner App.

> _"Every experience should feel assembled with intention."_  
> — DESIGN_PROCESS.md
