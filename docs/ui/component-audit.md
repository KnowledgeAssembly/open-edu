# Component Audit — OpenEdu vs Carbon Design System

**Date:** 2026-06-28
**Auditor:** AI Agent (Phase 1 of Carbon Adoption Plan)
**Scope:** All UI components across the monorepo

---

## 1. Carbon Component Reference

Carbon v11 React components catalog (from carbondesignsystem.com):

| Carbon Component   | OpenEdu Equivalent                                   | Status                  |
| ------------------ | ---------------------------------------------------- | ----------------------- |
| Accordion          | —                                                    | **Missing**             |
| AI Label           | —                                                    | **Missing**             |
| Breadcrumb         | TopAppBar breadcrumbs (inline)                       | **Needs extraction**    |
| Button             | `button.tsx` (learner/ui) + `ThemedButton` (widgets) | **Duplicate exists**    |
| Checkbox           | —                                                    | **Missing**             |
| Code Snippet       | —                                                    | **Missing**             |
| Contained List     | —                                                    | **Missing**             |
| Content Switcher   | —                                                    | **Missing**             |
| Data Table         | —                                                    | **Missing**             |
| Date Picker        | —                                                    | **Missing**             |
| Dropdown           | `Select` (learner/ui)                                | **Exists**              |
| File Uploader      | —                                                    | **Missing**             |
| Form               | —                                                    | **Missing**             |
| Inline Loading     | `Spinner`                                            | **Missing**             |
| Link               | —                                                    | **Missing**             |
| List               | —                                                    | **Missing**             |
| Loading            | `Spinner`                                            | **Missing**             |
| Menu               | —                                                    | **Missing**             |
| Modal              | `Dialog` (learner/ui)                                | **Exists**              |
| Multiselect        | —                                                    | **Missing**             |
| Notification       | —                                                    | **Missing**             |
| Number Input       | —                                                    | **Missing**             |
| Pagination         | —                                                    | **Missing**             |
| Popover            | —                                                    | **Missing**             |
| Progress Bar       | `ProgressBar` (layout) + `Progress` (learner/ui)     | **Overlap**             |
| Progress Indicator | —                                                    | **Missing**             |
| Radio Button       | QuizRenderer uses native radio                       | **Missing (primitive)** |
| Search             | —                                                    | **Missing**             |
| Select             | `Select` (learner/ui)                                | **Exists**              |
| Skeleton           | —                                                    | **Missing**             |
| Slider             | —                                                    | **Missing**             |
| Structured List    | —                                                    | **Missing**             |
| Tabs               | `Tabs` (learner/ui)                                  | **Exists**              |
| Tag                | `Badge` (learner/ui)                                 | **Partial**             |
| Text Input         | `Input` (learner/ui)                                 | **Exists**              |
| Text Area          | ReflectionRenderer uses textarea                     | **Missing (primitive)** |
| Tile               | `Card` (learner/ui)                                  | **Partial**             |
| Toggle             | `Switch` (learner/ui)                                | **Exists**              |
| Toggletip          | —                                                    | **Missing**             |
| Toolbar            | —                                                    | **Missing**             |
| Tooltip            | `Tooltip` (learner/ui)                               | **Exists**              |
| Tree View          | `CourseTree` (layout)                                | **Needs extraction**    |
| UI Shell           | `SideNav` + `TopAppBar`                              | **Partial**             |

---

## 2. Complete Component Inventory

### Layer 1: Primitives (`apps/learner/src/components/ui/`) — 10 components

| #   | Component | File           | Radix?         | cva? | Ref? | displayName? | Tests? | a11y Score                     |
| --- | --------- | -------------- | -------------- | ---- | ---- | ------------ | ------ | ------------------------------ |
| 1   | Button    | `button.tsx`   | Slot           | Yes  | Yes  | Yes          | No     | Good (focus-visible, disabled) |
| 2   | Card      | `card.tsx`     | No             | No   | Yes  | Yes          | No     | Basic (native HTML)            |
| 3   | Badge     | `badge.tsx`    | No             | Yes  | Yes  | Yes          | No     | Basic (focus ring)             |
| 4   | Input     | `input.tsx`    | No             | No   | Yes  | Yes          | No     | Good (focus-visible, disabled) |
| 5   | Dialog    | `dialog.tsx`   | Radix Dialog   | No   | Yes  | Yes          | No     | Excellent (Radix built-in)     |
| 6   | Select    | `select.tsx`   | Radix Select   | No   | Yes  | Yes          | No     | Excellent (Radix built-in)     |
| 7   | Progress  | `progress.tsx` | Radix Progress | No   | Yes  | Yes          | No     | Excellent (Radix built-in)     |
| 8   | Tabs      | `tabs.tsx`     | Radix Tabs     | No   | Yes  | Yes          | No     | Excellent (Radix built-in)     |
| 9   | Switch    | `switch.tsx`   | Radix Switch   | No   | Yes  | Yes          | No     | Excellent (Radix built-in)     |
| 10  | Tooltip   | `tooltip.tsx`  | Radix Tooltip  | No   | Yes  | Yes          | No     | Excellent (Radix built-in)     |

**Pattern:** shadcn-style — Tailwind classes using `@/lib/utils` `cn()`, CSS vars mapped through `--oe-*` via tailwind config.

### Layer 2: Runtime Components (`packages/runtime/src/components/`) — 12 components + 1 hook

| #   | Component           | File                      | Styling                | Tests? | a11y Score                          | Notes                                             |
| --- | ------------------- | ------------------------- | ---------------------- | ------ | ----------------------------------- | ------------------------------------------------- |
| 1   | AICallout           | `AICallout.tsx`           | Inline `--oe-*` vars   | No     | Basic (role=complementary)          |                                                   |
| 2   | BundleOverview      | `BundleOverview.tsx`      | Tailwind `--oe-*` vars | Yes    | Good (aria-progressbar, aria-label) | Includes internal StatusBadge + ModuleProgressBar |
| 3   | CompletionScreen    | `CompletionScreen.tsx`    | Tailwind `--oe-*` vars | Yes    | Basic (aria-hidden confetti)        | Uses emoji for badges/stats                       |
| 4   | CourseCard          | `CourseCard.tsx`          | Tailwind `--oe-*` vars | Yes    | Good (aria-label)                   | Uses ProgressBar from layout                      |
| 5   | CourseOutline       | `CourseOutline.tsx`       | Tailwind `--oe-*` vars | Yes    | Basic                               | Wraps Sidebar                                     |
| 6   | FontLoader          | `FontLoader.tsx`          | —                      | No     | N/A                                 | Injects `<link>` tags                             |
| 7   | ProgressBadge       | `ProgressBadge.tsx`       | Tailwind `--oe-*` vars | Yes    | Basic (inline text)                 | 3 states                                          |
| 8   | ReadingRuler        | `ReadingRuler.tsx`        | Inline CSS             | No     | Good (aria-hidden)                  | Fixed overlay                                     |
| 9   | SkillSummary        | `SkillSummary.tsx`        | Inline + Tailwind      | Yes    | Good (role=region, aria-label)      |                                                   |
| 10  | ThemeSelector       | `ThemeSelector.tsx`       | **100% inline styles** | No     | Basic (aria-haspopup, role=listbox) | **Outlier — no Tailwind**                         |
| 11  | WidgetCanvas        | `WidgetCanvas.tsx`        | —                      | Yes    | N/A                                 | Widget wrapper                                    |
| 12  | WidgetErrorFallback | `WidgetErrorFallback.tsx` | —                      | Yes    | N/A                                 | Error boundary                                    |
| —   | useThemePreference  | `useThemePreference.ts`   | —                      | No     | N/A                                 | Hook                                              |

**Pattern inconsistency:** Mixed styling approaches. Some use inline `style` objects with `--oe-*` CSS vars, others use Tailwind classes. No consistent component pattern.

### Layer 3: Layout Components (`packages/runtime/src/layout/`) — 7 components

| #   | Component    | File               | Styling                | Tests? | a11y Score                                              | Notes                             |
| --- | ------------ | ------------------ | ---------------------- | ------ | ------------------------------------------------------- | --------------------------------- |
| 1   | LayoutShell  | `LayoutShell.tsx`  | Tailwind               | Yes    | Good (aria-live)                                        | Main course layout                |
| 2   | TopAppBar    | `TopAppBar.tsx`    | **100% inline styles** | No     | Good (aria-label, aria-expanded, focus trap)            | Breadcrumbs + a11y panel + avatar |
| 3   | SideNav      | `SideNav.tsx`      | **100% inline styles** | No     | Good (aria-current, aria-label)                         | Tab navigation + course tree      |
| 4   | Sidebar      | `Sidebar.tsx`      | Inline + Tailwind      | Yes    | Basic                                                   | Legacy — needs replacement audit  |
| 5   | CourseTree   | `CourseTree.tsx`   | **100% inline styles** | No     | Good (aria-expanded, aria-current)                      | Expandable module/lesson tree     |
| 6   | AITutorPanel | `AITutorPanel.tsx` | **100% inline styles** | No     | Good (role=tablist, role=tab, aria-selected, aria-live) | Chat + notes + highlights         |
| 7   | ProgressBar  | `ProgressBar.tsx`  | Tailwind               | Yes    | Good (role=progressbar, aria-valuenow/min/max)          | Accessible                        |

**Pattern inconsistency:** 4 of 7 layout components use 100% inline styles — no Tailwind, no consistent pattern.

### Layer 4: Renderers (`packages/runtime/src/renderers/`) — 6 components

| #   | Component           | File                      | Styling             | Tests? | a11y Score                                    | Notes                             |
| --- | ------------------- | ------------------------- | ------------------- | ------ | --------------------------------------------- | --------------------------------- |
| 1   | NodeRenderer        | `NodeRenderer.tsx`        | —                   | Yes    | N/A                                           | Delegation only                   |
| 2   | MarkdownRenderer    | `MarkdownRenderer.tsx`    | Tailwind            | Yes    | Excellent (slug IDs, img alt, external links) | remark/rehype pipeline            |
| 3   | QuizRenderer        | `QuizRenderer.tsx`        | Tailwind + CSS vars | Yes    | Good (radiogroup, FocusTrap, aria-live)       | Uses FocusTrap from accessibility |
| 4   | ReflectionRenderer  | `ReflectionRenderer.tsx`  | Tailwind + CSS vars | Yes    | Good (aria-describedby, aria-live, useId)     |                                   |
| 5   | WidgetRenderer      | `WidgetRenderer.tsx`      | —                   | Yes    | N/A                                           | Delegation only                   |
| 6   | PlaceholderRenderer | `PlaceholderRenderer.tsx` | —                   | No     | N/A                                           | Fallback                          |

### Layer 5: Widget Components (`packages/widgets/src/`) — 14 widgets + 1 button + 1 hook

| #    | Component                                                                                                                                                                                | File                | Styling                | Tests? | Notes                   |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------- | ------ | ----------------------- |
| —    | ThemedButton                                                                                                                                                                             | `themed-button.tsx` | Tailwind `--oe-*` vars | Yes    | **DUPLICATE of Button** |
| 1-14 | ChartReader, ClockTime, DragDrop, FillBlank, FractionVisual, GridArea, Matching, MeasurementScale, MultipleChoice, PlaceValueChart, RealWorld, Sequencing, StoryQuestion, VisualCounting | `builtins/*/`       | —                      | Varies | Widget-specific         |

### Duplicate Detected

**ThemedButton** (`packages/widgets/src/themed-button.tsx`) duplicates **Button** (`apps/learner/src/components/ui/button.tsx`).

- Both have 4 variants (primary/secondary/outline/ghost — 2 more in Button)
- Both have 3 sizes
- ThemedButton lacks `asChild`, lacks `cn()`, lacks `cva`, uses string concatenation instead
- ThemedButton uses `--oe-*` CSS var class names directly; Button uses shadcn CSS var names
- **Resolution:** Deprecate ThemedButton, replace with Button from design-system

---

## 3. Missing Components vs Carbon

### High Priority (used in Carbon, needed for OpenEdu parity)

| Component     | Carbon Equivalent      | Rationale                                                 |
| ------------- | ---------------------- | --------------------------------------------------------- |
| Textarea      | Text Input > Text Area | ReflectionRenderer uses inline textarea — needs primitive |
| Radio Group   | Radio Button           | QuizRenderer uses native radio — needs primitive          |
| Accordion     | Accordion              | Expandable sections, course outline                       |
| Popover       | Popover                | Used by ThemeSelector (currently custom inline)           |
| Dropdown Menu | Menu                   | Context menus, user menu                                  |
| Breadcrumb    | Breadcrumb             | TopAppBar has inline breadcrumbs — needs extraction       |
| Tag           | Tag                    | Different from Badge — used for metadata                  |
| Skeleton      | Skeleton               | Loading placeholders throughout                           |
| Spinner       | Loading                | Loading states                                            |
| Notification  | Notification           | Toast/alerts system                                       |
| Drawer        | —                      | Mobile nav / side panel                                   |

### Medium Priority

| Component       | Carbon Equivalent | Rationale                                  |
| --------------- | ----------------- | ------------------------------------------ |
| Separator       | —                 | Already using borders/divs                 |
| ScrollArea      | —                 | Custom scroll containers                   |
| Toggle          | Toggle            | Different from Switch (button-like toggle) |
| Slider          | Slider            | Settings, progress scrubbing               |
| Command Palette | —                 | Global search (Ctrl+K)                     |
| Table           | Data Table        | Tabular content display                    |
| Empty State     | —                 | Empty state for lists, search results      |
| Toggletip       | Toggletip         | Info/help tooltips                         |
| Toolbar         | Toolbar           | Action toolbar for content editing         |

### Low Priority

| Component        | Carbon Equivalent | Rationale               |
| ---------------- | ----------------- | ----------------------- |
| Code Snippet     | Code Snippet      | Code display in lessons |
| Content Switcher | Content Switcher  | View mode switch        |
| Date Picker      | Date Picker       | Scheduling features     |
| File Uploader    | File Uploader     | Content authoring       |
| Form             | Form              | Form layout             |
| List             | List              | Content lists           |
| Multiselect      | Multiselect       | Advanced filtering      |
| Number Input     | Number Input      | Numeric input           |
| Pagination       | Pagination        | List pagination         |
| Search           | Search            | Content search          |
| Structured List  | Structured List   | Data display            |

---

## 4. Accessibility Gaps

### Current State

- **Excellent:** Radix-based components (Dialog, Select, Progress, Tabs, Switch, Tooltip) — WAI-ARIA compliant
- **Good:** MarkdownRenderer (slug IDs, alt text, external links), ProgressBar (proper ARIA), BundleOverview (aria-progressbar), SkillsSummary (role=region), SideNav (aria-current), CourseTree (aria-expanded), QuizRenderer (radiogroup, FocusTrap)
- **Basic:** Button, Card, Badge, Input (focus-visible only), AICallout (role=complementary)
- **Not assessed:** WidgetCanvas, WidgetErrorFallback, FontLoader

### Gaps Identified

1. **No color contrast audit** — Theme colors not verified against WCAG 2.1 AA
2. **No reduced-motion support** — `prefers-reduced-motion` not respected anywhere (CompletionScreen confetti, animations)
3. **No keyboard navigation tests** — All Radix components inherit it, but no formal verification
4. **ThemeSelector is inaccessible** — Custom inline popover without proper keyboard navigation, focus management, or screen reader support (`aria-haspopup="dialog"` on a button that opens a listbox)
5. **TopAppBar a11y panel** — Custom panel, keyboard navigation works but using `div` with `onKeyDown` instead of proper `Escape` handling pattern
6. **No axe-core integration** in component tests — `AxeValidator` exists but isn't used in tests
7. **No screen reader testing documentation**
8. **No high-contrast mode testing**
9. **Confetti animation** (`CompletionScreen`) — no `prefers-reduced-motion` check

---

## 5. Theme Inconsistencies

### Current State

- **4 themes exist** with full `--oe-*` CSS variable coverage
- **Tailwind config maps** all `--oe-*` vars to Tailwind utilities
- **ThemeSelector** can switch between all 4 themes

### Inconsistencies

1. **Missing CSS variable references** — several components use hardcoded fallback values in inline styles:
   - `var(--oe-color-primary, #2563eb)` — fallback doesn't match any theme (should be `#6750a4`)
   - `var(--oe-color-fg, #1a1a1a)` — no `--oe-color-fg` var exists (it's `--oe-color-on-surface`)
   - `var(--oe-color-success, #16a34a)` — hardcoded
   - `var(--oe-color-border, #e5e7eb)` — hardcoded
2. **Multiple fallback values differ** — `--oe-radius` is used with different fallbacks (`8px` vs `6px`)
3. **Hardcoded colors** — CompletionScreen uses hardcoded `#ff6b6b`, `#ffd93d`, etc. for confetti
4. **Emoji usage** — Badge icons, status indicators use emoji instead of themed icons

### Components Using Hardcoded Values (need token migration)

- `ThemeSelector.tsx` — 7 fallback values
- `TopAppBar.tsx` — 8 fallback values
- `SideNav.tsx` — 7 fallback values
- `CourseTree.tsx` — 4 fallback values
- `AITutorPanel.tsx` — 10 fallback values
- `AICallout.tsx` — 4 fallback values
- `ReadingRuler.tsx` — Hardcoded yellow color
- `SkillSummary.tsx` — Hardcoded `#6b7280`
- `CompletionScreen.tsx` — Hardcoded confetti colors + emoji

---

## 6. Styling Pattern Audit

### 3 Distinct Styling Patterns Found

**Pattern A: shadcn-style** (apps/learner/src/components/ui/)

- Tailwind utility classes
- `cn()` from `clsx` + `tailwind-merge`
- CSS var references through Tailwind shadcn layer (`bg-primary`, `text-foreground`)
- Radix primitives

**Pattern B: Tailwind + direct CSS vars** (runtime components/layouts)

- Tailwind classes like `bg-primary-container`, `text-on-surface`
- Direct `--oe-*` CSS var references via Tailwind config
- No `cn()` utility — uses template literals

**Pattern C: Inline styles + CSS vars** (legacy runtime components)

- React `CSSProperties` objects
- `var(--oe-color-*, <fallback>)` pattern
- No Tailwind, no component composition

### Distribution

| Pattern             | Component Count | Locations                                                                                                               |
| ------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| A — shadcn          | 10              | `apps/learner/src/components/ui/`                                                                                       |
| B — Tailwind direct | 8               | BundleOverview, CompletionScreen, CourseCard, CourseOutline, LayoutShell, ProgressBar, QuizRenderer, ReflectionRenderer |
| C — Inline styles   | 8               | ThemeSelector, TopAppBar, SideNav, CourseTree, AITutorPanel, AICallout, ReadingRuler, SkillSummary                      |

**Recommendation:** All new components follow Pattern A (shadcn). Existing Pattern C components migrate to Pattern A during Phases 6-9.

---

## 7. Carbon Equivalence Map

| OpenEdu Component      | Carbon Equivalent | Migration Action                                  |
| ---------------------- | ----------------- | ------------------------------------------------- |
| Button (learner/ui)    | Button            | Move to design-system                             |
| ThemedButton (widgets) | Button            | **Deprecate** — replace with Button               |
| Card (learner/ui)      | Tile              | Move to design-system                             |
| Badge (learner/ui)     | Tag               | Move to design-system (note: different semantics) |
| Input (learner/ui)     | Text Input        | Move to design-system                             |
| Dialog (learner/ui)    | Modal             | Move to design-system                             |
| Select (learner/ui)    | Dropdown          | Move to design-system                             |
| Progress (learner/ui)  | Progress Bar      | Move to design-system (merge with ProgressBar)    |
| Tabs (learner/ui)      | Tabs              | Move to design-system                             |
| Switch (learner/ui)    | Toggle            | Move to design-system                             |
| Tooltip (learner/ui)   | Tooltip           | Move to design-system                             |
| ThemeSelector          | —                 | Refactor: use Popover + Card from design-system   |
| TopAppBar              | UI Shell Header   | Extract breadcrumb primitive                      |
| SideNav                | UI Shell SideNav  | Move to design-system                             |
| CourseTree             | Tree View         | Move to design-system                             |
| AITutorPanel           | —                 | OpenEdu-specific (AI)                             |
| ProgressBar            | Progress Bar      | Merge with Progress primitive                     |
| QuizRenderer           | —                 | OpenEdu-specific (educational)                    |
| ReflectionRenderer     | —                 | OpenEdu-specific (educational)                    |
| BundleOverview         | —                 | OpenEdu-specific (educational)                    |
| CompletionScreen       | —                 | OpenEdu-specific (educational)                    |
| CourseCard             | —                 | OpenEdu-specific (educational)                    |
| SkillSummary           | —                 | OpenEdu-specific (educational)                    |

---

## 8. Summary Statistics

| Metric                                               | Count                                                                                                    |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Total components audited                             | 35 (10 primitives + 12 runtime + 7 layout + 6 renderers)                                                 |
| Missing Carbon-equivalent components (high priority) | 11 (Textarea, Radio, Accordion, Popover, Menu, Breadcrumb, Tag, Skeleton, Spinner, Notification, Drawer) |
| Missing Carbon-equivalent components (medium)        | 10                                                                                                       |
| Missing Carbon-equivalent components (low)           | 10                                                                                                       |
| Total missing primitives                             | 31                                                                                                       |
| Duplicate components                                 | 1 (ThemedButton)                                                                                         |
| Components with tests                                | 20 of 35 (57%)                                                                                           |
| Components using Radix primitives                    | 6 (Dialog, Select, Progress, Tabs, Switch, Tooltip)                                                      |
| Components using cva variants                        | 3 (Button, Badge, badgeVariants)                                                                         |
| Components using inline styles (need migration)      | 8 (ThemeSelector, TopAppBar, SideNav, CourseTree, AITutorPanel, AICallout, ReadingRuler, SkillSummary)   |
| Components with hardcoded color fallbacks            | 9                                                                                                        |
| Accessibility gaps found                             | 9                                                                                                        |
| Theme inconsistencies found                          | 5                                                                                                        |

---

## 9. Migration Priority Matrix

### Phase 2 (Immediate — Token Package)

- Create `packages/design-system/` with token files
- Extract all hardcoded values from inline styles

### Phase 6 (Primitives)

- Move 10 existing primitives from learner/ui → design-system
- Build 11 high-priority missing primitives
- Deprecate ThemedButton

### Phase 7 (Navigation)

- Extract TopAppBar breadcrumbs → Breadcrumb primitive
- Move SideNav, CourseTree → design-system/patterns
- Build Command Palette, Search, MobileNavigation

### Phase 8 (Educational)

- Move BundleOverview, CompletionScreen, CourseCard, CourseOutline, ProgressBadge, SkillSummary → design-system/learning
- Build missing educational components

### Phase 9 (AI)

- Move AITutorPanel, AICallout → design-system/ai
- Build full AI chat suite

### Phase 10 (Accessibility)

- Add axe-core tests to all components
- Fix 9 identified a11y gaps
- Add `prefers-reduced-motion` support
- Fix ThemeSelector accessibility
