# Multithemed UI — Design Spec

**Date:** 2026-06-25
**Status:** Approved

## Overview

Enhance the learner app with a multithemed UI supporting 4 design themes (High Focus, Lumina Scholastica, OpenEdu Nocturnal, Sylvan Workspace) using CSS custom properties + Tailwind CSS. Users switch themes via a settings panel, with preference persisted to localStorage.

## Architecture Decisions

| Decision         | Choice                                                | Rationale                                                                                                                       |
| ---------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Theming approach | CSS Variable-First (Tailwind + CSS Custom Properties) | Clean separation — one component markup, any theme. Runtime theme switching is a variable swap. Fits existing `--oe-*` pattern. |
| Theme scope      | 4 main themes only                                    | One theme per `docs/design/themes/*/DESIGN.md`. Lumina's sub-variants are future work.                                          |
| Page scope       | Existing pages + all 5 prototype layouts              | CatalogPage, CourseHomePage, LessonPage, AssessmentPage, CodePage, ProgressPage.                                                |
| Theme switching  | Settings panel + localStorage                         | Theme selector popover in TopAppBar, persisted to `oe-theme-preference`.                                                        |
| Styling engine   | Tailwind CSS 3.x + PostCSS                            | Already listed in tech stack. Utility classes reference CSS variables for theme-agnostic components.                            |

## Token System

### Color Tokens (45)

All 4 DESIGN.md themes use the same color role names (Material Design 3-style). These become `--oe-color-*` CSS variables:

```
surface, surface-dim, surface-bright,
surface-container-lowest, surface-container-low, surface-container,
surface-container-high, surface-container-highest,
on-surface, on-surface-variant,
outline, outline-variant,
surface-tint,
primary, on-primary, primary-container, on-primary-container,
secondary, on-secondary, secondary-container, on-secondary-container,
tertiary, on-tertiary, tertiary-container, on-tertiary-container,
error, on-error, error-container, on-error-container,
primary-fixed, primary-fixed-dim, on-primary-fixed, on-primary-fixed-variant,
secondary-fixed, secondary-fixed-dim, on-secondary-fixed, on-secondary-fixed-variant,
tertiary-fixed, tertiary-fixed-dim, on-tertiary-fixed, on-tertiary-fixed-variant,
background, on-background,
surface-variant,
inverse-surface, inverse-on-surface, inverse-primary
```

### Typography Tokens (9 canonical roles)

Each theme maps its specific role names to these canonical roles:

| Token                   | Purpose              | Example mappings                                                 |
| ----------------------- | -------------------- | ---------------------------------------------------------------- |
| `--oe-font-display`     | Hero titles          | display-lg (Lumina, Nocturnal), headline-lg (High Focus, Sylvan) |
| `--oe-font-headline-lg` | H1/page titles       | headline-lg, h1                                                  |
| `--oe-font-headline-md` | H2/section titles    | headline-md, h2                                                  |
| `--oe-font-title`       | Card titles          | title-md, h2                                                     |
| `--oe-font-body-lg`     | Reading/content body | body-reading, body-lg                                            |
| `--oe-font-body-md`     | UI body text         | body-ui, body-md                                                 |
| `--oe-font-label`       | Labels/metadata      | label-caps, label-md, label-sm                                   |
| `--oe-font-caption`     | Small print          | caption                                                          |
| `--oe-font-mono`        | Code/monospace       | mono, label-md (JetBrains Mono)                                  |

Each token value is a CSS shorthand: `fontFamily fontSize fontWeight lineHeight letterSpacing`.

### Spacing Tokens (10)

```
--oe-space-base (8px), --oe-space-xs (4px), --oe-space-sm (12-16px),
--oe-space-md (24px), --oe-space-lg (40px), --oe-space-xl (64px),
--oe-space-gutter (20-24px), --oe-space-margin-desktop (64px),
--oe-space-margin-mobile (20px), --oe-space-container-max (800-1200px)
```

### Radius Tokens (6)

```
--oe-radius-sm, --oe-radius-DEFAULT, --oe-radius-md,
--oe-radius-lg, --oe-radius-xl, --oe-radius-full (9999px)
```

## Theme Definition Files

Live in `packages/runtime/src/themes/`:

```
themes/
├── types.ts                  # ThemeDefinition, TypographyToken, SpacingTokens, RadiiTokens
├── high-focus.ts             # Extracted from docs/design/themes/high_focus/DESIGN.md
├── lumina-scholastica.ts     # Extracted from docs/design/themes/lumina_scholastica/DESIGN.md
├── nocturnal.ts              # Extracted from docs/design/themes/openedu_nocturnal/DESIGN.md
├── sylvan-workspace.ts       # Extracted from docs/design/themes/sylvan_workspace/DESIGN.md
└── index.ts                  # ThemeRegistry: Record<string, ThemeDefinition>, getTheme()
```

Each theme module exports a `ThemeDefinition` with the full token set as typed values (not yet CSS variables — the provider does that conversion).

## Runtime Architecture

### RuntimeThemeProvider (refactored)

```tsx
<RuntimeThemeProvider themeId="nocturnal">{children}</RuntimeThemeProvider>
```

- Accepts `themeId` prop (default `'lumina-scholastica'`).
- Looks up `ThemeDefinition` from registry.
- Flattens all tokens to `Record<string, string>` of CSS variable values.
- Renders a wrapper `<div data-theme={themeId}>` with inline `style` containing all `--oe-*` variables.
- Provides theme metadata via React context (accessible via `useTheme()`).

### FontLoader

- Rendered inside `RuntimeThemeProvider`.
- On theme change, computes the set of unique Google Font families needed.
- Injects/updates `<link>` tags in `<head>` for the active theme's fonts.
- Removes unused font links on theme switch.
- Font families per theme:
  - High Focus: Atkinson Hyperlegible Next, JetBrains Mono
  - Lumina Scholastica: Inter, Source Serif 4, JetBrains Mono
  - Nocturnal: Inter
  - Sylvan Workspace: Source Serif 4, Literata, Hanken Grotesk

### useThemePreference Hook

```ts
function useThemePreference(): [ThemeId, (id: ThemeId) => void];
```

- Reads initial value from `localStorage.getItem('oe-theme-preference')`.
- Falls back to `'lumina-scholastica'`.
- `setTheme` persists to localStorage and updates React state.
- Theme change triggers `RuntimeThemeProvider` re-render with new CSS variables.

## Tailwind Integration

### Configuration

`tailwind.config.ts` in `apps/learner`:

```ts
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../packages/runtime/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'var(--oe-color-surface)',
        'on-surface': 'var(--oe-color-on-surface)',
        primary: 'var(--oe-color-primary)',
        // ... all 45 color tokens
      },
      fontFamily: {
        display: 'var(--oe-font-display-family)',
        body: 'var(--oe-font-body-md-family)',
        mono: 'var(--oe-font-mono-family)',
      },
      spacing: {
        base: 'var(--oe-space-base)',
        gutter: 'var(--oe-space-gutter)',
        'container-max': 'var(--oe-space-container-max)',
      },
      borderRadius: {
        DEFAULT: 'var(--oe-radius-DEFAULT)',
        lg: 'var(--oe-radius-lg)',
        xl: 'var(--oe-radius-xl)',
        full: 'var(--oe-radius-full)',
      },
    },
  },
};
```

### PostCSS

Standard `postcss.config.js` with `tailwindcss` and `autoprefixer` plugins.

### CSS Entry Point

`apps/learner/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Imported in `main.tsx`.

## Page & Component Structure

### App Shell (App.tsx)

```
App
└── RuntimeThemeProvider (themeId from useThemePreference)
    ├── FontLoader
    ├── TopAppBar (breadcrumbs, theme toggle, accessibility controls)
    └── {activePage}
        ├── CatalogPage
        ├── CourseHomePage
        ├── LessonPage
        ├── AssessmentPage
        ├── CodePage
        └── ProgressPage
```

### Page Descriptions

| Page               | Source Prototype                | Key Elements                                                                                       |
| ------------------ | ------------------------------- | -------------------------------------------------------------------------------------------------- |
| **CatalogPage**    | home.html (course grid section) | Grid of CourseCards with progress, "Start Course" CTA                                              |
| **CourseHomePage** | home.html                       | SideNav, TopAppBar, progress banner, bento grid (learning path + module list), AI insights callout |
| **LessonPage**     | lesson.html                     | Three-panel: SideNav + Content canvas (reader) + AITutorPanel. Reading ruler, breadcrumbs          |
| **AssessmentPage** | assessment.html                 | Minimalist header with progress bar, question text, radio options, prev/next, hint callout         |
| **CodePage**       | code.html                       | SideNav + code-focused content + AITutorPanel. Dark theme default                                  |
| **ProgressPage**   | progress.html                   | SideNav + dashboard: completion %, radar chart, activity list, AI recommendations                  |

### New Reusable Components (in `@open-edu/runtime`)

| Component           | Description                                                                       |
| ------------------- | --------------------------------------------------------------------------------- |
| `SideNav`           | 260px fixed left nav with course structure tree, collapsible on mobile            |
| `TopAppBar`         | Sticky header with breadcrumbs, ThemeSelector, accessibility toggles, user avatar |
| `ThemeSelector`     | Popover with 4 theme preview cards. Calls `setTheme()` on selection               |
| `FontLoader`        | Injects Google Fonts `<link>` tags for active theme                               |
| `ModuleCard`        | Module list item with icon, title, duration, progress bar                         |
| `LearningPath`      | Vertical timeline of completed/active/locked modules                              |
| `AICallout`         | Bordered insight box with icon                                                    |
| `AITutorPanel`      | Right sidebar (320px) with chat interface                                         |
| `CourseTree`        | Expandable module/lesson tree in SideNav                                          |
| `QuizOption`        | Radio option with active/selected/hover states                                    |
| `ProgressDashboard` | Bento grid with stats, radar chart, activity timeline                             |
| `ReadingRuler`      | Togglable horizontal focus band overlay                                           |

### Existing Components to Refactor

Convert from inline styles to Tailwind semantic classes:

- `CourseCard` — currently inline styles
- `CompletionScreen` — currently inline styles
- `ProgressBadge` — currently inline styles
- `ProgressBar` — currently inline styles
- `Sidebar` — currently inline styles (replaced by new `SideNav`)
- `LayoutShell` — currently inline styles (replaced by page-specific layouts)
- `QuizRenderer` — currently inline styles with `color-mix()`
- `ReflectionRenderer` — currently inline styles
- `PlaceholderRenderer` — currently inline styles

## Implementation Phases

### Phase 1: Token Foundation

- Define `ThemeDefinition` types
- Write 4 theme modules from DESIGN.md YAML frontmatter
- Build theme registry
- Expand default `RUNTIME_THEME`
- Unit tests for token completeness and hex validation

### Phase 2: Tailwind Integration

- Add `tailwindcss`, `postcss`, `autoprefixer` to learner
- Create `tailwind.config.ts`, `postcss.config.js`, `index.css`
- Wire CSS to `main.tsx`
- Verify build with zero visual change

### Phase 3: Theme Provider & Loader

- Refactor `RuntimeThemeProvider` for full token sets
- Build `FontLoader`
- Build `useThemePreference` hook
- Update `App.tsx`
- Tests for provider, hook, font loader

### Phase 4: Theme Selector

- Build `ThemeSelector` popover
- Integrate into `TopAppBar`
- Wire to `useThemePreference`
- Instant theme switching (CSS var swap, no reload)

### Phase 5: Layout Shell Components

- Build `SideNav`, `TopAppBar`, `AITutorPanel`, `CourseTree`, `ReadingRuler`, `AICallout`
- All with Tailwind semantic classes
- Unit tests + axe-core a11y per component

### Phase 6: Pages

- Build/refactor all 6 pages matching prototype layouts
- Wire into App navigation
- Tests per page (render, interaction, a11y)

### Phase 7: Refactor Existing Components

- Convert remaining components from inline styles to Tailwind
- Remove dead inline style code
- No visual regression verification

### Phase 8: Polish & Verification

- Full test suite: `pnpm test`, `pnpm lint`, `pnpm typecheck`
- axe-core audit on all pages × all 4 themes
- Theme persistence across reload
- Responsive breakpoint testing
- E2E: theme switch → navigate → verify

## Theme-Specific Behaviors

Each theme has unique characteristics defined in its DESIGN.md that affect component rendering:

| Theme                  | Unique Behaviors                                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **High Focus**         | 2px solid borders on all interactive elements, no shadows, aggressive 4px focus outlines, 24px checkboxes, no ghost buttons. `body-lg` line-height increased to 2.0. Linear progress bars only (no circular). |
| **Lumina Scholastica** | Three-panel architecture. Dual-typeface (Inter UI + Source Serif 4 reading). Subtle shadows on elevated surfaces. Ghost buttons for sidebar. 200ms ease-out transitions.                                      |
| **Nocturnal**          | Dark-only. Glassmorphism nav elements. Active state glows (`box-shadow` with primary color at 20%). Gradient progress bars (primary → secondary). No item separators in lists.                                |
| **Sylvan Workspace**   | Organic warmth. Bottom-border inputs (not full outline). "Branching" tree lines for nested lists. Transparent cards with 1px sage borders. Progress bars as "growing vines" (solid green on pale sage track). |

These are implemented via conditional rendering or CSS variable-driven styles (e.g., `box-shadow: var(--oe-elevation-card)` resolves to different values per theme).

## Dependencies

New devDependencies for `apps/learner`:

- `tailwindcss` ^3.4
- `postcss` ^8.4
- `autoprefixer` ^10.4

No new runtime dependencies.

## Risks & Mitigations

| Risk                                                  | Mitigation                                                                                                                                      |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| CSS variable performance with 60+ tokens              | Tokens are set once on a wrapper div, not recomputed. Modern browsers handle this efficiently.                                                  |
| Tailwind + CSS variable JIT limitations               | All color tokens are always in bundle (not tree-shaken). Acceptable trade-off for runtime theme switching.                                      |
| Google Fonts loading flash (FOUT)                     | `FontLoader` uses `<link rel="preconnect">` + `font-display: swap`. Flash is brief and acceptable per design.                                   |
| Components with hardcoded colors break in some themes | Enforce via ESLint rule: no hardcoded hex colors in component files. All colors must reference `--oe-*` variables or Tailwind semantic classes. |

## Success Criteria

- [ ] All 4 themes render correctly across all 6 pages
- [ ] Theme switching is instant (no page reload, no flash)
- [ ] Theme preference survives page reload and browser restart
- [ ] All existing tests pass, new tests cover theme token validation and component rendering
- [ ] axe-core passes on every page in every theme
- [ ] No hardcoded colors remain in any component file
- [ ] `pnpm typecheck` passes with no errors
- [ ] `pnpm lint` passes with no errors
