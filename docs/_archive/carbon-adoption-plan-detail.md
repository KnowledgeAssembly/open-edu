# IBM Carbon Adoption — Detailed Implementation Plan

Based on `docs/ibm_carbon.md` and current project audit (June 2026).

## Current State Summary

| Area                                                            | Status                                                                       |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `packages/design-system/`                                       | **Does not exist**                                                           |
| `docs/ui/component-audit.md`                                    | **Does not exist**                                                           |
| Theme system (4 themes, 55+ colors, typography, spacing, radii) | **Exists** in `packages/runtime/src/themes/`                                 |
| Theme provider + `--oe-*` CSS var flattening                    | **Exists** in `packages/runtime/src/theme.tsx`                               |
| Tailwind configs mapping `--oe-*` vars                          | **Exists** in both learner & dev-server                                      |
| shadcn-style primitives (Button, Card, Dialog, etc.)            | **Exist** in `apps/learner/src/components/ui/` (10 components)               |
| Runtime components (ThemeSelector, CourseCard, etc.)            | **Exist** in `packages/runtime/src/components/` (use inline `--oe-*` styles) |
| Layout components (LayoutShell, TopAppBar, SideNav, etc.)       | **Exist** in `packages/runtime/src/layout/`                                  |
| Accessibility package                                           | **Exists** in `packages/accessibility/`                                      |
| AI components                                                   | AICallout exists, no full AI UI suite                                        |
| Educational components (Quiz, ProgressBadge, etc.)              | Partial — in renderers & components                                          |
| Widget system                                                   | **Exists** in `packages/widgets/`                                            |

---

## Phase 1 — Study & Audit

### Objective

Understand mapping between current UI and Carbon. Produce a component inventory.

### Stories

#### S1.1 Study Carbon Design System

- Review Carbon's component library, design principles, accessibility guidelines, design tokens, layout (2× grid), spacing (8px scale), typography (type scale)
- Document Carbon equivalents for every existing component
- Reference: https://carbondesignsystem.com/

#### S1.2 Audit Current Components

- Produce `docs/ui/component-audit.md`
- Catalog: `apps/learner/src/components/ui/` (10 primitives), `packages/runtime/src/components/` (12 components), `packages/runtime/src/layout/` (7 components), `packages/widgets/src/` (14 widgets)
- For each component document:
  - Name, location, props, variants
  - Carbon equivalent (or "OpenEdu-specific")
  - Accessibility status
  - Theme compatibility
  - Duplication notes (e.g., `WidgetThemedButton` vs `Button`)
  - Migration priority (High/Medium/Low)
- Identify missing Carbon-equivalent components

#### S1.3 Identify Gaps

- Primitives missing: Textarea, Radio, Accordion, Popover, Menu, Drawer, Breadcrumb, Tag, Skeleton, Spinner, EmptyState, Notification
- Navigation missing: Breadcrumbs component, Command Palette, Search, MobileNavigation
- Accessibility gaps: audit each component against WCAG 2.1 AA
- ThemeSelector is outlier (inline styles vs shadcn pattern)
- Duplicate button: `packages/widgets/src/themed-button.tsx` duplicates `apps/learner/src/components/ui/button.tsx`

**Deliverable:** `docs/ui/component-audit.md`

---

## Phase 2 — Design Tokens → `packages/design-system/`

### Objective

Create `packages/design-system/` as the single source of truth for all UI tokens.

### Stories

#### S2.1 Scaffold Package

```bash
mkdir -p packages/design-system/src/tokens
# package.json: @open-edu/design-system (public, react peer dep)
# tsconfig.json: extends ../../tsconfig.base.json
```

Entry structure:

```
packages/design-system/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Re-exports everything
│   ├── tokens/
│   │   ├── index.ts
│   │   ├── colors.ts         # Semantic + base palette (Carbon-inspired naming)
│   │   ├── spacing.ts        # Carbon 8px scale (2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64)
│   │   ├── typography.ts     # Carbon type scale (fluid type, 13 steps)
│   │   ├── radius.ts         # Border radius scale
│   │   ├── elevation.ts      # Shadow scale (flat→deep)
│   │   ├── motion.ts         # Duration + easing tokens
│   │   ├── breakpoints.ts    # Responsive breakpoints
│   │   └── z-index.ts        # Z-index scale
│   ├── primitives/
│   ├── patterns/
│   ├── learning/
│   ├── ai/
│   ├── hooks/
│   └── icons/
```

#### S2.2 Define Token Files

**`colors.ts`** — Define both base palette and semantic tokens:

- Carbon-inspired palette (reduced from 55 to ~30 well-named tokens)
- Semantic aliases: `bg`, `fg`, `surface`, `border`, `accent`, `success`, `warning`, `danger`, `info`
- Keep `--oe-*` CSS var naming for backward compatibility
- Export as typed objects + CSS variable string helpers

**`spacing.ts`** — Carbon 8px grid:

- `2xs: '2px'`, `xs: '4px'`, `sm: '8px'`, `md: '12px'`, `lg: '16px'`, `xl: '24px'`, `2xl: '32px'`, `3xl: '40px'`, `4xl: '48px'`, `5xl: '64px'`

**`typography.ts`** — Carbon type scale (inspired):

- 13 steps: `caption-01`, `caption-02`, `label-01`, `body-compact-01`, `body-01`, `body-02`, `heading-compact-01`, `heading-01`, `heading-02`, `heading-03`, `heading-04`, `heading-05`, `heading-06`
- Each: `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `fontFamily`

**`radius.ts`**, **`elevation.ts`**, **`motion.ts`**, **`breakpoints.ts`**, **`z-index.ts`** — Standardized scales.

#### S2.3 Wire Tokens into Theme System

- `packages/runtime` should import from `@open-edu/design-system` (not duplicate tokens)
- Or: have `@open-edu/design-system` be the upstream source that `packages/runtime/src/themes/` references
- Theme definitions (lumina-scholastica, etc.) reference token keys, not hardcoded values

#### S2.4 Wire Tokens into Tailwind Configs

- Replace hardcoded `tailwind.config.ts` / `tailwind.config.js` color/font/spacing/radius maps with imports from `@open-edu/design-system/tokens`
- Both learner and dev-server configs become thin wrappers

### Migration Rule

**Nothing changes visually in this phase.** Tokens are extracted and centralized; existing values are preserved exactly.

---

## Phase 3 — Theme Engine Refinement

### Objective

The theme engine already exists. This phase refines it to use the new token system and adds missing features.

### Stories

#### S3.1 Refactor Theme Definitions to Use Tokens

- `packages/runtime/src/themes/*.ts` should import base palette + semantic colors from `@open-edu/design-system/tokens`
- Theme definitions become overrides on top of the base token set

#### S3.2 Add CSS Variable Generation to design-system

- `@open-edu/design-system` exports a `flattenTheme()` utility (mirrors current one in `theme.tsx`)
- All `--oe-*` CSS var generation lives in design-system, consumed by runtime

#### S3.3 Ensure Zen, Forest, High Focus Themes Ready

- Currently 4 themes exist: lumina-scholastica, high-focus, nocturnal, sylvan-workspace
- Add Zen (minimalist), Forest (nature-inspired) as light variants, ensure they use token system
- Future: user-defined themes via token overrides

---

## Phase 4 — Typography Refinement

### Objective

Carbon-inspired typography while preserving OpenEdu brand fonts.

### Stories

#### S4.1 Define Carbon-Inspired Type Scale

Carbon uses 13-step type scale with `heading-01` through `heading-06` and `body-01`, `body-02`, etc. Map to OpenEdu's existing roles:

```
Carbon         → OpenEdu
heading-06     → display
heading-05     → headlineLg
heading-04     → headlineMd
heading-03     → title
heading-02     → (new: subtitle)
heading-01     → (new: heading-sm)
body-02        → bodyLg
body-01        → bodyMd
caption-01     → caption
label-01       → label
code-01        → mono
```

#### S4.2 Add Reading Width Utility

- `max-width: 66ch` for optimal reading in content areas
- Tailwind utility class or token: `max-w-reading`

#### S4.3 Apply New Scale to All Components

- Update Tailwind `fontSize` config
- No visual changes — only structure of the scale

---

## Phase 5 — Layout System

### Objective

Reusable layout components that cover every page in the app. Current layouts in `packages/runtime/src/layout/` already exist; this phase formalizes them into the design system.

### Stories

#### S5.1 Audit Existing Layouts

Current layouts:

- `LayoutShell.tsx` — Course header + node renderer + footer
- `TopAppBar.tsx` — Sticky header with breadcrumbs, a11y, theme
- `SideNav.tsx` — Fixed left navigation (260px wide)
- `Sidebar.tsx` — Legacy sidebar (replacement candidate)
- `CourseTree.tsx` — Expandable module/lesson tree
- `AITutorPanel.tsx` — Right sidebar AI chat
- `ProgressBar.tsx` — Accessible progress bar

#### S5.2 Add Missing Layouts

- **AppLayout** — Root layout: TopAppBar + content area
- **ThreePanelLayout** — SideNav | content | AITutorPanel (current course view)
- **CourseViewerLayout** — CourseTree sidebar + node renderer
- **SplitView** — Two-column resizable
- **SettingsLayout** — Left nav + right content
- **DashboardLayout** — Card grid for progress dashboard

#### S5.3 Move Layouts to design-system

- Extract common layout components from `packages/runtime/src/layout/` to `packages/design-system/src/patterns/`
- Runtime re-exports from design-system

#### S5.4 Implement Carbon Grid

- Carbon uses 2× CSS Grid with 16-column layout
- Implement a `<Grid>` and `<Column>` component or utility classes
- Responsive: 4 columns mobile, 8 tablet, 16 desktop

---

## Phase 6 — Primitive Components

### Objective

Complete primitive component library. Currently 10 exist in `apps/learner/src/components/ui/`. Need to expand and move to `packages/design-system`.

### Stories

#### S6.1 Extract Existing Primitives

Move from `apps/learner/src/components/ui/` → `packages/design-system/src/primitives/`:

- Button, Card, Badge, Input, Dialog, Select, Progress, Tabs, Switch, Tooltip

Each component:

- Uses Radix UI primitive (already done for Dialog, Select, Progress, Tabs, Switch, Tooltip)
- Uses tokens from `@open-edu/design-system/tokens`
- Uses cva for variants
- Supports `asChild` where appropriate (Slots)
- Exports TypeScript types
- Has proper `displayName`
- ForwardRef support

**Do NOT duplicate.** Button moves to design-system; runtime and learner both import from there.

#### S6.2 Add Missing Primitives

Priority order (high → low):

1. **Textarea** — Wraps native `<textarea>`, consistent with Input styling
2. **Radio Group** — `@radix-ui/react-radio-group`
3. **Accordion** — `@radix-ui/react-accordion`
4. **Popover** — `@radix-ui/react-popover` (used by ThemeSelector)
5. **Dropdown Menu** — `@radix-ui/react-dropdown-menu`
6. **Drawer** — Side panel (custom or `vaul`)
7. **Breadcrumb** — Navigation breadcrumb list
8. **Tag** — Inline label/tag (carbon-inspired)
9. **Skeleton** — Loading placeholder
10. **Spinner** — Loading indicator
11. **Empty State** — Empty state with icon + message + action
12. **Notification** — Toast notification system (`sonner` or Radix Toast)
13. **Slider** — `@radix-ui/react-slider`
14. **Separator** — `@radix-ui/react-separator`
15. **Toggle** — `@radix-ui/react-toggle`
16. **ScrollArea** — `@radix-ui/react-scroll-area`
17. **Command** — Command palette primitive (`cmdk`)
18. **Table** — Data table component

#### S6.3 Deprecate Duplicates

- `packages/widgets/src/themed-button.tsx` → replace with `Button` from design-system
- `packages/runtime/src/components/ThemeSelector.tsx` inline styles → use design-system Popover + Card + Button

### Standards (apply to all primitives)

- Tailwind classes via `cn()` utility
- cva for variants
- Radix primitives for accessibility where available
- `--oe-*` CSS vars (via Tailwind config) for all visual properties
- No hardcoded colors, spacing, or radii
- Forward refs
- `displayName` set
- PropTypes exported

---

## Phase 7 — Navigation

### Objective

Formalize navigation system. Partial exists (SideNav, TopAppBar, CourseTree).

### Stories

#### S7.1 Move Navigation to design-system

- `SideNav` → `packages/design-system/src/patterns/SideNav.tsx`
- `TopAppBar` → `packages/design-system/src/patterns/TopAppBar.tsx`
- `CourseTree` → `packages/design-system/src/patterns/CourseTree.tsx`
- `Breadcrumb` primitive (from Phase 6) used by TopAppBar

#### S7.2 Add Navigation Features

- **Command Palette** — `Ctrl+K` global search using `cmdk`
- **Context Menu** — `@radix-ui/react-context-menu`
- **Search** — Search input with results overlay
- **Mobile Navigation** — Bottom nav or hamburger drawer for mobile
- **Keyboard Navigation** — Arrow keys, shortcuts across all nav components

#### S7.3 Update Learner App Pages

- `HomePage`, `CatalogPage`, `SettingsPage`, `ProgressDashboard` each wrap a layout + nav from design-system
- `CourseRuntime` uses ThreePanelLayout

---

## Phase 8 — Educational Components

### Objective

OpenEdu-specific components that encode learning domain semantics. These live in `packages/design-system/src/learning/`.

### Stories

#### S8.1 Move & Refactor Existing Educational Components

From `packages/runtime/src/components/` to `packages/design-system/src/learning/`:

- `BundleOverview` → Syllabus-style multi-module overview
- `CompletionScreen` → End-of-course summary
- `CourseCard` → Catalog card
- `CourseOutline` → Collapsible outline
- `ProgressBadge` → Inline progress indicator
- `SkillSummary` → Skill mastery display

#### S8.2 Build New Educational Components

- **Lesson** — Single lesson content wrapper (uses markdown renderer)
- **Module** — Module with lesson list + progress
- **ConceptCard** — Card highlighting one concept
- **DefinitionBlock** — Term + definition display
- **ExampleBlock** — Example with syntax highlighting
- **Exercise** — Interactive exercise wrapper
- **Quiz** — Quiz component (replaces current QuizRenderer in renderers)
- **Flashcard** — Flippable card with front/back
- **Hint** — Expandable hint
- **Reflection** — Open-ended reflection prompt
- **Summary** — Auto-generated or manual summary block
- **LearningObjective** — Objective card with status
- **PrerequisiteLink** — Prerequisite indicator
- **ProgressTimeline** — Timeline of completed/upcoming items
- **KnowledgeGraphNode** — Node in concept graph

#### S8.3 Replace Renderers

- `packages/runtime/src/renderers/QuizRenderer.tsx` → uses `Quiz` from design-system
- `packages/runtime/src/renderers/ReflectionRenderer.tsx` → uses `Reflection` from design-system

---

## Phase 9 — AI Components

### Objective

Reusable AI interaction components.

### Stories

#### S9.1 Move & Refactor Existing AI Components

- `AICallout` → `packages/design-system/src/ai/AICallout.tsx`
- `AITutorPanel` → `packages/design-system/src/ai/AITutorPanel.tsx`

#### S9.2 Build Missing AI Components

- **AIChat** — Full chat interface (message list + input + suggestions)
- **TutorMessage** — Tutor message bubble with avatar
- **ThinkingIndicator** — Animated "thinking" dots
- **Citation** — Inline source citation
- **ReferenceCard** — Reference/source card
- **SuggestedQuestions** — Clickable question chips
- **ExplainButton** — Triggers AI explanation
- **SimplifyButton** — Triggers simplification
- **GenerateExample** — Example generation trigger
- **GenerateQuiz** — Quiz generation trigger
- **GenerateFlashcards** — Flashcard generation trigger
- **ConversationHistory** — Sidebar with past conversation items

---

## Phase 10 — Accessibility Pass

### Objective

Every component passes WCAG 2.1 AA. Leverage existing `packages/accessibility/` package.

### Stories

#### S10.1 Audit Each Component Against WCAG Checklist

For every component in design-system:

- [ ] Keyboard navigation (Tab, Enter, Escape, Arrow keys)
- [ ] Screen reader labels (aria-label, aria-labelledby)
- [ ] ARIA roles/attributes correct per WAI-ARIA
- [ ] Color contrast ≥ 4.5:1 (normal text), ≥ 3:1 (large text)
- [ ] Focus indicators visible (3px outline, not removed)
- [ ] `prefers-reduced-motion` respected
- [ ] Autism mode compatibility (reduced sensory input)
- [ ] High contrast mode compatibility
- [ ] Reading ruler support (existing ReadingRuler component)
- [ ] Large text support (200% zoom no loss of functionality)
- [ ] Touch targets ≥ 44×44px (mobile)

#### S10.2 Automation

- Integrate `packages/accessibility/src/validator/AxeValidator.tsx` into component tests
- Vitest + axe-core: every component gets basic a11y test

#### S10.3 Gate

- Add accessibility check to PR checklist
- No component merges without a11y review sign-off

---

## Phase 11 — Documentation

### Objective

Every component documented in a consistent format.

### Stories

#### S11.1 Documentation Template

Every component gets a `.mdx` or `.md` file in `docs/`:

```
docs/components/
├── primitives/
│   ├── button.md
│   ├── card.md
│   └── ...
├── patterns/
│   ├── app-layout.md
│   └── ...
├── learning/
│   ├── lesson.md
│   └── ...
└── ai/
    ├── ai-chat.md
    └── ...
```

Template for each:

````markdown
# ComponentName

**Purpose:** One-sentence description.

## Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |

## Variants

List visual variants with examples.

## Accessibility

- Keyboard: ...
- ARIA: ...
- Screen reader: ...

## Examples

```tsx
<ComponentName ... />
```
````

## Do

- ...

## Don't

- ...

## Theme Support

- Light: ✓
- Dark: ✓
- High Focus: ✓

```

#### S11.2 Generate Docs Site
- Integrate with existing `apps/docs/` (Docusaurus)
- Design system docs under `docs/components/` sidebar
- Auto-generate prop tables from TypeScript types

#### S11.3 Storybook (Optional — Future)
- Consider Storybook for interactive component previews
- Each story = one variant

---

## Dependencies Between Phases

```

Phase 1 (Audit) ──► Phase 2 (Tokens) ──► Phase 3 (Theme) ──► Phase 4 (Typography)
│
▼
Phase 5 (Layouts)
│
▼
Phase 6 (Primitives)
│
┌───────┴───────┐
▼ ▼
Phase 7 (Nav) Phase 8 (Educational)
│ │
└───────┬───────┘
▼
Phase 9 (AI)
│
▼
Phase 10 (Accessibility)
│
▼
Phase 11 (Documentation)

```

Phases 1–6 must be sequential. Phases 7, 8, 9 can run in parallel after Phase 6. Phase 10 starts after 7–9 and runs in parallel with Phase 11.

---

## File Migration Map

### Phase 2 — New Files
```

packages/design-system/
├── package.json
├── tsconfig.json
├── src/index.ts
├── src/tokens/index.ts
├── src/tokens/colors.ts
├── src/tokens/spacing.ts
├── src/tokens/typography.ts
├── src/tokens/radius.ts
├── src/tokens/elevation.ts
├── src/tokens/motion.ts
├── src/tokens/breakpoints.ts
├── src/tokens/z-index.ts

```

### Phase 6 — Moved Files (handled in story S6.1)
```

apps/learner/src/components/ui/
├── button.tsx → packages/design-system/src/primitives/button.tsx
├── card.tsx → packages/design-system/src/primitives/card.tsx
├── badge.tsx → packages/design-system/src/primitives/badge.tsx
├── input.tsx → packages/design-system/src/primitives/input.tsx
├── dialog.tsx → packages/design-system/src/primitives/dialog.tsx
├── select.tsx → packages/design-system/src/primitives/select.tsx
├── progress.tsx → packages/design-system/src/primitives/progress.tsx
├── tabs.tsx → packages/design-system/src/primitives/tabs.tsx
├── switch.tsx → packages/design-system/src/primitives/switch.tsx
├── tooltip.tsx → packages/design-system/src/primitives/tooltip.tsx

```

### Phase 6 — New Files
```

packages/design-system/src/primitives/
├── textarea.tsx
├── radio-group.tsx
├── accordion.tsx
├── popover.tsx
├── dropdown-menu.tsx
├── drawer.tsx
├── breadcrumb.tsx
├── tag.tsx
├── skeleton.tsx
├── spinner.tsx
├── empty-state.tsx
├── notification.tsx
├── slider.tsx
├── separator.tsx
├── toggle.tsx
├── scroll-area.tsx
├── command.tsx
├── table.tsx

```

### Phase 6 — Deprecated Files
```

packages/widgets/src/themed-button.tsx → replace with Button from design-system

```

### Phase 7 — Moved Files
```

packages/runtime/src/layout/
├── LayoutShell.tsx → packages/design-system/src/patterns/LayoutShell.tsx
├── TopAppBar.tsx → packages/design-system/src/patterns/TopAppBar.tsx
├── SideNav.tsx → packages/design-system/src/patterns/SideNav.tsx
├── CourseTree.tsx → packages/design-system/src/patterns/CourseTree.tsx

```

### Phase 8 — Moved Files
```

packages/runtime/src/components/
├── BundleOverview.tsx → packages/design-system/src/learning/BundleOverview.tsx
├── CompletionScreen.tsx → packages/design-system/src/learning/CompletionScreen.tsx
├── CourseCard.tsx → packages/design-system/src/learning/CourseCard.tsx
├── CourseOutline.tsx → packages/design-system/src/learning/CourseOutline.tsx
├── ProgressBadge.tsx → packages/design-system/src/learning/ProgressBadge.tsx
├── SkillSummary.tsx → packages/design-system/src/learning/SkillSummary.tsx

```

### Phase 9 — Moved Files
```

packages/runtime/src/components/AICallout.tsx → packages/design-system/src/ai/AICallout.tsx
packages/runtime/src/layout/AITutorPanel.tsx → packages/design-system/src/ai/AITutorPanel.tsx

```

---

## Migration Strategy (per component)

For every component migration across all phases:

1. **Create in design-system first** under `packages/design-system/src/`
2. **Export from design-system's `index.ts`**
3. **Update original location to re-export** from design-system (backward compat)
4. **Update all imports** across the monorepo to point to `@open-edu/design-system`
5. **Delete original file** only after all consumers updated
6. **Run full test suite** to confirm nothing broken

This ensures the app works at every step.

---

## Test Strategy

- Every component in design-system must have a Vitest test file
- Tests cover: rendering, variants, accessibility (axe-core), theme support
- Use `@testing-library/react` for component tests
- Run: `pnpm --filter @open-edu/design-system test`
- Run full suite after each phase: `pnpm test`

## Verification

After each phase:
- `pnpm build` — all packages build
- `pnpm test` — all tests pass
- `pnpm lint` — no lint errors
- `pnpm typecheck` — TypeScript compiles
- `pnpm format:check` — formatting ok
- Learner app dev server runs at `localhost:4001`
- Dev server runs at `localhost:4002`
- No visual regressions in any of the 4 themes
```
