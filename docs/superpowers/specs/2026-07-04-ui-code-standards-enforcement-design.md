# UI Code Standards Enforcement for AI Agents

**Date:** 2026-07-04
**Status:** Draft
**Author:** opencode (AI agent)

---

## 1. Problem Statement

The Open-Edu codebase has **3 conflicting styling patterns** across 50+ component files:

| Pattern                | Count                                                     | Description                                                                       |
| ---------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| A: shadcn/ui           | ~22 (design-system primitives)                            | Tailwind + `cn()` + `cva` (3 of 22) + Radix primitives + `forwardRef`             |
| B: Tailwind + CSS vars | ~30+ (runtime + design-system patterns)                   | Tailwind utilities referencing `--oe-*` variables directly, no `cva`/`forwardRef` |
| C: Inline styles       | ~22 occurrences across 4 runtime + 18 design-system files | `style={{ }}` with hardcoded or semi-hardcoded values                             |

**Gaps that agents exploit:**

1. **No inline style lint rule** — agents freely add `style={{ color: 'red' }}`. Audit found 4 inline styles in runtime + ~18 files in design-system.
2. **No Tailwind class validation** — agents use non-existent utilities or hardcoded palette colors (`text-amber-400`, `fill-amber-400`, `stroke-amber-400` in `Card.tsx`, `CardUnlockedToast.tsx`, `ProgressRing.tsx`)
3. **No `--oe-*` token enforcement** — hardcoded hex values and palette colors appear in components (e.g., `Card.tsx` uses `from-emerald-500/20 to-emerald-600/10` gradient classes)
4. **No class ordering** — Tailwind classes appear in random order across files; `prettier-plugin-tailwindcss` is not installed
5. **Dev-server CSS staleness** — agents add Tailwind classes but forget to regenerate `apps/dev-server/src/tailwind.css`
6. **No responsive design rules** — inconsistent breakpoint usage
7. **No component API conventions** — runtime components don't use `forwardRef` or `cva`; only 3 of 22 design-system primitives use `cva`
8. **`AGENTS.md` has zero UI-specific guidance** — only mentions axe-core accessibility; also incorrectly states "4-theme system" (codebase has 6 themes)

**Impact:** New components introduced by agents drift from the design system, break theme consistency, and require manual review to catch violations that automated tooling should prevent.

---

## 2. Design Goals

1. **Automated enforcement** — Violations caught by linters, not human review
2. **Agent-friendly** — Rules are clear, machine-readable, and produce actionable error messages
3. **Incremental adoption** — Existing violations are documented as tech debt, not blockers
4. **Zero false positives** — Allowlist dynamic sizing patterns that are legitimately inline
5. **Single source of truth** — `AGENTS.md` + `COMPONENT_GUIDE.md` define the standard; linters enforce it

---

## 3. Enforcement Architecture

### 3.1 Layer 1: ESLint Rules (automated, blocks PRs)

#### 3.1.1 Inline Style Detection

**Plugin:** Custom grep-based CI check (not a full AST rule — simpler to maintain).

**Mechanism:**

- A script `scripts/lint-no-inline-styles.mjs` scans `packages/runtime/src/**/*.tsx` and `packages/design-system/src/**/*.tsx`
- Matches `style={{` patterns and flags them
- **False positive mitigation:** Exclude test files (`.test.tsx`), story files (`.stories.tsx`), and `.d.ts` files from scan results
- Allowlist for known-safe patterns:
  - `style={{ width: size, height: size }}` — dynamic sizing props
  - `style={{ backgroundColor: getMasteryColor(` — token-returning functions
  - `style={{ minHeight:` in `WidgetCanvas` — dynamic layout
  - `RuntimeThemeProvider` — sets CSS variables on `documentElement`
- Runs in CI via `pnpm lint` and optionally as a pre-commit hook
- Exit code 1 on violations (non-blocking warning initially, blocking after migration period)

**Error message format:**

```
❌ Inline style detected in packages/runtime/src/components/Foo.tsx:14
   Use Tailwind utility classes with --oe-* tokens instead.
   See docs/COMPONENT_GUIDE.md#styling-patterns for allowed exceptions.
```

#### 3.1.2 Hardcoded Color Detection

**Plugin:** `eslint-plugin-no-hardcoded-colors` (custom or via `eslint-plugin-css`)

**Mechanism:**

- Scans JSX `className` strings for hardcoded Tailwind palette colors
- Blocks patterns: `text-amber-400`, `bg-emerald-500/20`, `border-red-600`, `fill-gray-500`, `stroke-blue-300`
- Allows: `text-primary`, `bg-surface-container`, `border-outline-variant` (all token-mapped)
- Allows: `text-white`, `text-black` (only if truly needed for contrast on specific backgrounds — documented exception)

**Error message format:**

```
❌ Hardcoded color 'text-amber-400' in Card.tsx:42
   Use a --oe-* token class like 'text-primary', 'text-tertiary', or 'text-on-surface-variant'.
   See docs/COMPONENT_GUIDE.md#color-tokens for the full token reference.
```

#### 3.1.3 Tailwind Class Validation

**Plugin:** `eslint-plugin-tailwindcss` (compatible with Tailwind v3.4.x — the project uses `tailwindcss@^3.4`)

> **Note:** The project uses Tailwind CSS v3.4.19, not v4. The `eslint-plugin-tailwindcss` v3.x series is the correct version. Do not install the v4 beta which targets Tailwind v4's different class system.

**Configuration** (`.eslintrc.json` extension):

```json
{
  "plugins": ["tailwindcss"],
  "extends": ["plugin:tailwindcss/recommended"],
  "rules": {
    "tailwindcss/classnames-order": "warn",
    "tailwindcss/enforces-shorthand": "warn",
    "tailwindcss/migration-from-tailwind-2": "error",
    "tailwindcss/no-arbitrary-value": "off",
    "tailwindcss/no-contradicting-classname": "error",
    "tailwindcss/no-custom-classname": "warn"
  }
}
```

### 3.2 Layer 2: Prettier Plugin (automated, formats on save)

**Plugin:** `prettier-plugin-tailwindcss` (not currently installed — must be added)

**Configuration** (`.prettierrc` extension):

```json
{
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindFunctions": ["cn", "cva", "clsx"],
  "tailwindAttributes": ["className"]
}
```

**Effect:** On every save/commit, Tailwind classes are automatically sorted into the recommended order:

```css
/* Before */
<div className="p-md bg-surface text-on-surface rounded-lg flex items-center">
/* After */
<div className="flex items-center rounded-lg bg-surface p-md text-on-surface">
```

### 3.3 Layer 3: Stylelint (automated, catches CSS violations)

**Config:** `.stylelintrc.json` (new file at repo root)

```json
{
  "extends": ["stylelint-config-standard", "stylelint-config-tailwindcss"],
  "rules": {
    "declaration-property-value-disallowed-list": {
      "color": ["/^#[0-9a-fA-F]{3,8}$/"],
      "background-color": ["/^#[0-9a-fA-F]{3,8}$/"],
      "border-color": ["/^#[0-9a-fA-F]{3,8}$/"]
    },
    "selector-class-pattern": null,
    "no-descending-specificity": null,
    "custom-property-pattern": "^oe-"
  }
}
```

**Scope:** Runs on:

- `apps/learner/src/**/*.css` (minimal — only `@tailwind` directives + autoprefixer)
- `apps/dev-server/src/*.css` (only `src/index.css` + pre-generated `src/tailwind.css`)
- `packages/design-system/src/**/*.css` (none exist — styling is in `.tsx` via Tailwind)
- Any `.css` files in the repo

**Effectiveness note:** Stylelint on CSS files has low yield in this codebase since almost all styling is in `.tsx` Tailwind classes, not hand-written CSS. The primary value is catching hex colors in the rare CSS files and ensuring custom properties follow `--oe-*` naming.

**Does NOT run on:** Tailwind utility classes in `.tsx` files (covered by `eslint-plugin-tailwindcss`).

### 3.4 Layer 4: Dev-Server CSS Staleness Check

**Script:** `scripts/check-tailwind-css.mjs`

**Mechanism:**

1. Extract all Tailwind class names from `packages/runtime/src/**/*.tsx` using regex
2. Read `apps/dev-server/src/tailwind.css` and check that all extracted classes appear in the output
3. If any class is missing, warn (and optionally fail CI):

```
⚠️  Dev-server Tailwind CSS is stale.
   Missing classes: text-primary-container, bg-surface-dim
   Run: pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css
```

**Integration:** Runs as part of `pnpm lint` and in CI pipeline.

### 3.5 Layer 5: Pre-Commit Hooks

**Tools:** `husky` + `lint-staged` (not currently set up — neither package is installed)

**Configuration** (`package.json` additions):

```json
{
  "husky": {
    "pre-commit": "lint-staged"
  },
  "lint-staged": {
    "packages/runtime/src/**/*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "packages/design-system/src/**/*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{css}": ["stylelint --fix", "prettier --write"],
    "*.json": ["prettier --write"]
  }
}
```

**Effect:** Every commit automatically:

1. Runs ESLint (including tailwindcss plugin + inline style check) on staged `.ts/.tsx` files
2. Runs Prettier (including Tailwind class sorting) on all staged files
3. Runs Stylelint on staged `.css` files
4. Blocks commit if any rule fails

---

## 4. Token Usage Standards

### 4.1 The Golden Rule

**Never use hardcoded colors. Always use `--oe-*` design tokens via Tailwind utility classes.**

### 4.2 Color Token Reference

| Semantic Role        | Tailwind Class                                      | CSS Variable                   |
| -------------------- | --------------------------------------------------- | ------------------------------ |
| Primary action       | `bg-primary`, `text-primary`                        | `--oe-color-primary`           |
| Primary container    | `bg-primary-container`, `text-on-primary-container` | `--oe-color-primary-container` |
| Secondary            | `bg-secondary`, `text-secondary`                    | `--oe-color-secondary`         |
| Tertiary             | `bg-tertiary`, `text-tertiary`                      | `--oe-color-tertiary`          |
| Surface (background) | `bg-surface`, `text-on-surface`                     | `--oe-color-surface`           |
| Surface variant      | `bg-surface-variant`, `text-on-surface-variant`     | `--oe-color-surface-variant`   |
| Surface container    | `bg-surface-container`                              | `--oe-color-surface-container` |
| Error/destructive    | `bg-error`, `text-error`                            | `--oe-color-error`             |
| Outline/border       | `border-outline-variant`                            | `--oe-color-outline-variant`   |
| Success              | `bg-success`, `text-success`                        | `--oe-color-success`           |
| Muted/subtle         | `bg-muted`, `text-muted-foreground`                 | shadcn aliases to `--oe-*`     |

### 4.3 Prohibited Patterns

```tsx
// ❌ HARDCODED — breaks across themes
<div className="text-amber-400">Star</div>
<div className="bg-emerald-500/20">Card</div>
<div style={{ color: '#6b7280' }}>Label</div>
<div className="border-gray-300">Border</div>

// ✅ TOKEN-BASED — adapts to all 6 themes
<div className="text-tertiary">Star</div>
<div className="bg-success/20">Card</div>
<div className="text-on-surface-variant">Label</div>
<div className="border-outline-variant">Border</div>
```

### 4.4 Allowed Inline Style Exceptions

| Pattern                   | Reason                       | Example                                               |
| ------------------------- | ---------------------------- | ----------------------------------------------------- |
| Dynamic sizing from props | Cannot be Tailwind classes   | `style={{ width: size, height: size }}`               |
| CSS variable references   | Returns `var(--oe-*)` values | `style={{ backgroundColor: getMasteryColor(level) }}` |
| Runtime provider          | Sets CSS variables on root   | `RuntimeThemeProvider`                                |
| Theme swatch previews     | Hex for visual preview only  | `ThemeSelector` color dots                            |

All other inline styles must be migrated to Tailwind utility classes.

### 4.5 Spacing and Radius Tokens

| Token           | Tailwind Class                 | Use For                             |
| --------------- | ------------------------------ | ----------------------------------- |
| `xs` (4px)      | `p-xs`, `gap-xs`, `rounded-sm` | Tight spacing, small radius         |
| `sm` (8-12px)   | `p-sm`, `gap-sm`, `rounded`    | Compact UI elements                 |
| `md` (12-24px)  | `p-md`, `gap-md`, `rounded-md` | Default spacing, medium radius      |
| `lg` (24-40px)  | `p-lg`, `gap-lg`, `rounded-lg` | Generous spacing, large radius      |
| `xl` (40-64px)  | `p-xl`, `gap-xl`, `rounded-xl` | Section spacing, extra-large radius |
| `full` (9999px) | `rounded-full`                 | Pills, circles                      |

**Note:** Theme-specific values are defined in each theme's `SpacingTokens` and `RadiiTokens`. The Tailwind config maps these via `--oe-space-*` and `--oe-radius-*` CSS variables. Agents should use the Tailwind class names, not the underlying pixel values.

---

## 5. Component Development Standard

### 5.1 Mandatory Pattern: shadcn/ui (Pattern A)

All new components in `packages/runtime/src/` and `packages/design-system/src/` MUST follow Pattern A:

```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@open-edu/design-system';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground border-transparent',
        secondary: 'bg-secondary text-secondary-foreground border-transparent',
        destructive: 'bg-error text-on-error border-transparent',
        outline: 'text-on-surface',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
  },
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
```

### 5.2 File Structure

```
packages/design-system/src/primitives/
  badge/
    Badge.tsx          # Component implementation
    badge.test.tsx     # Unit + a11y tests
    index.ts           # Named export
    badge.stories.tsx  # Storybook stories (optional)
```

### 5.3 Required Elements

| Element            | Requirement                           | Why                                         |
| ------------------ | ------------------------------------- | ------------------------------------------- |
| `React.forwardRef` | Required for all leaf components      | Enables ref forwarding for composition      |
| `displayName`      | Required for all components           | Debugging in React DevTools                 |
| `cn()`             | Required for class composition        | Merges Tailwind classes, resolves conflicts |
| `cva`              | Required for variant-based components | Type-safe variant definitions               |
| `export interface` | Required for all prop types           | Type safety, IDE support                    |
| Named export       | Required (no default exports)         | Consistent imports, tree-shaking            |

### 5.4 Prop Conventions

| Prop             | Convention                          | Example                                     |
| ---------------- | ----------------------------------- | ------------------------------------------- |
| Content/data     | `manifest` or `node` (from schemas) | `<QuizRenderer manifest={node} />`          |
| Callbacks        | `on` prefix                         | `onComplete`, `onNavigate`, `onSelect`      |
| Boolean flags    | `is`/`has` prefix                   | `isActive`, `hasError`, `isLoading`         |
| Styling override | `className`                         | Always last in prop list, merged via `cn()` |
| Children         | `children`                          | Standard React pattern                      |

### 5.5 Accessibility Requirements

1. All interactive components must use Radix UI primitives (which provide ARIA attributes)
2. All components must pass `axe-core` audit (existing rule)
3. Use semantic HTML (`<nav>`, `<main>`, `<article>`, `<section>`)
4. All images must have `alt` text
5. All interactive elements must be keyboard-accessible
6. Use `aria-label` or `aria-labelledby` for icon-only buttons

### 5.6 Testing Requirements

Every component must have:

1. **Rendering test:** Renders without crashing, displays expected content
2. **Interaction test:** User interactions (click, type, keyboard) produce expected results
3. **Accessibility test:** Passes `axe-core` audit via `packages/design-system/src/test-utils/a11y.tsx` (the `checkAccessibility()` helper)
4. **Theme test:** Renders correctly across all 6 themes (optional but recommended)

> **Note:** The `test-utils` directory exists at `packages/design-system/src/test-utils/a11y.tsx` but is **not currently exported** from the package's `exports` map. Phase 1 must add `"./test-utils": "./src/test-utils/*.ts"` to `packages/design-system/package.json` exports.

Test file location: Co-located with component (`badge.test.tsx`).

---

## 6. Documentation Deliverables

### 6.1 `AGENTS.md` Additions

Add a new section **"UI Coding Standards"** after "Development Rules". Also fix the existing AGENTS.md reference from "4-theme system" to "6-theme system" (the codebase has 6 themes: high-focus, lumina-scholastica, nocturnal, sylvan-workspace, zen, forest).

```markdown
## UI Coding Standards

1. **Styling:** Use Tailwind utility classes + `cn()` from `@open-edu/design-system`. Never use inline `style={{}}` except for dynamic sizing props.
2. **Tokens:** All colors via `--oe-*` tokens through Tailwind classes. Never hardcode hex/rgb values or use non-token Tailwind palette colors (e.g., `text-amber-400`).
3. **Components:** Follow shadcn/ui pattern — `forwardRef`, `displayName`, `cva` for variants, named exports.
4. **Primitives:** Use Radix UI primitives from `@open-edu/design-system` (Button, Dialog, Select, etc.).
5. **Class ordering:** Tailwind classes in recommended order (automated by `prettier-plugin-tailwindcss`).
6. **Responsive:** Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) with mobile-first approach.
7. **Accessibility:** Every component must pass axe-core. Use semantic HTML, ARIA attributes, keyboard navigation.
8. **Testing:** Every component needs rendering + interaction + a11y tests.
9. **Dev-server CSS:** After adding/changing Tailwind classes in `packages/runtime/src/`, regenerate: `pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css`
10. **Exceptions:** Inline styles are allowed only for: dynamic sizing from props, CSS variable references (`var(--oe-*)`), and the RuntimeThemeProvider.
```

### 6.2 `docs/COMPONENT_GUIDE.md` (new file)

Authoritative component development guide covering:

- Pattern A (shadcn/ui) with full code examples
- File structure and naming conventions
- Prop conventions and TypeScript patterns
- Token usage rules (color, spacing, radius, typography)
- Inline style exceptions (with examples)
- Testing patterns with `@open-edu/design-system/test-utils`
- Common anti-patterns and how to fix them
- Migration guide for Pattern B/C components

### 6.3 `docs/ui/tailwind-standards.md` (new file)

Tailwind-specific standards:

- Class ordering rules (link to Prettier plugin)
- Token reference table (all `--oe-*` tokens mapped to Tailwind classes)
- Responsive design patterns (mobile-first breakpoints)
- Animation/transition standards (`motion-safe:` prefix, `--oe-motion-*` tokens)
- Common mistakes and fixes

### 6.4 `docs/ui/token-reference.md` (new file)

Complete reference of all design tokens:

- Color tokens with semantic roles and Tailwind class mappings
- Spacing tokens with pixel values per theme
- Radius tokens with pixel values per theme
- Typography tokens (font families, sizes, weights)
- Motion tokens (durations, easings)
- Sizing tokens (icons, heights, widths)
- Elevation tokens (box shadows)
- Z-index scale

---

## 7. Migration Plan

### Phase 1: Tooling Setup (this spec)

- Install `eslint-plugin-tailwindcss` (v3.x, compatible with Tailwind v3.4), `eslint-plugin-jsx-a11y`, `prettier-plugin-tailwindcss`, `stylelint`, `stylelint-config-standard`, `stylelint-config-tailwindcss`, `husky`, `lint-staged`
- Configure rules (non-blocking initially)
- Add `"./test-utils": "./src/test-utils/*.ts"` to `packages/design-system/package.json` exports
- Implement `token()` utility in `@open-edu/design-system/tokens`
- Create documentation files
- Fix `AGENTS.md` theme count (4 → 6) and add UI coding standards

### Phase 2: Baseline Audit

- Run all new linters against the codebase
- Generate a violation report (audit baseline: ~22 inline style occurrences across 4 runtime + 18 design-system files; ~3 runtime files with hardcoded Tailwind palette colors; ~30+ story files with `text-gray-500` patterns)
- Prioritize by component usage frequency and theme impact
- **Proposed order:** Runtime components first (affect learner UX) → Design-system production code → Story files

### Phase 3: Component Migration (stories in PLAN.md)

- Migrate Pattern C components (inline styles) to Pattern A
- Migrate Pattern B components (Tailwind + CSS vars) to Pattern A
- Remove hardcoded colors from all components
- Estimated: 8-12 stories, each migrating 2-3 components

### Phase 4: Enforcement Tightening

- Make inline style rule blocking (CI fails)
- Make hardcoded color rule blocking (CI fails)
- Add pre-commit hooks
- Remove temporary allowlists

### Phase 5: Ongoing

- All new components follow Pattern A (enforced by lint + review)
- Design token additions go through `@open-edu/design-system` (single source of truth)
- Theme selector swatch data derived from theme definitions (no hardcoded hex)

---

## 8. Risk Assessment

| Risk                                                             | Mitigation                                                                                    |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `eslint-plugin-tailwindcss` false positives on custom classes    | Use `no-custom-classname: "warn"` initially, allowlist known custom classes                   |
| `prettier-plugin-tailwindcss` conflicts with existing formatting | Run once on full codebase before enabling pre-commit hook                                     |
| `stylelint` too aggressive on CSS files                          | Start with `stylelint-config-standard`, add rules incrementally                               |
| Inline style CI check blocks existing PRs                        | Make non-blocking (warning) for 2 weeks, then blocking                                        |
| Agent ignores lint rules                                         | Lint rules are the enforcement; documentation is guidance. If lint passes, code is compliant. |
| New token additions break existing components                    | All token changes go through `@open-edu/design-system` with backward-compatible aliases       |

---

## 9. Success Criteria

1. **Zero hardcoded colors** in new components (enforced by `eslint-plugin-tailwindcss` + custom rule)
2. **Zero inline styles except for documented exceptions** in new components (enforced by CI check)
3. **100% Tailwind class sorting** (enforced by `prettier-plugin-tailwindcss`)
4. **All CSS files pass Stylelint** (enforced by CI)
5. **Dev-server CSS staleness check passes in CI** (enforced by staleness check script)
6. **All new components follow Pattern A** (enforced by lint + review)
7. **`AGENTS.md` updated** with UI coding standards + correct 6-theme count (completed in Phase 1)
8. **`COMPONENT_GUIDE.md` exists** and is referenced in `AGENTS.md` (completed in Phase 1)
9. **Zero `eslint-plugin-jsx-a11y` violations** in new components (enforced by CI)
10. **All new design-system components have Storybook stories** (enforced by CI: `pnpm build-storybook` succeeds)
11. **`token()` utility exported** from `@open-edu/design-system/tokens` (completed in Phase 1)

---

## 10. Resolved Questions

The following design decisions have been resolved:

1. **✅ Add `eslint-plugin-jsx-a11y`** — Yes. Add to root ESLint config in Phase 1. This provides pre-render static analysis for accessibility violations (complementing post-render axe-core checks). Configure with recommended rules, but disable `rule-no-unsafe-query-selector` (conflicts with Testing Library).

2. **✅ Require Storybook for all components** — Yes. Storybook (`@open-edu/design-system/.storybook/`) already exists with addon-a11y, addon-themes, and ~60 stories. Mandate stories for all new components in `packages/design-system/src/`. Runtime package components are excluded from this requirement (not set up with Storybook). Add a CI check: `pnpm build-storybook` must succeed on PRs.

3. **❌ Do NOT adopt CSS-in-JS** — No. The existing inline style exceptions (dynamic sizing, CSS variable references, RuntimeThemeProvider) are sufficient. If more programmatic styling is needed, expose a `token()` utility (see #4) rather than introducing a CSS-in-JS library.

4. **✅ Export a `token()` utility from `@open-edu/design-system`** — Yes. Add a `token(path: string): string` utility to `@open-edu/design-system/tokens` that returns the resolved CSS variable name (e.g., `token('color.primary')` → `'var(--oe-color-primary)'`). Export from `@open-edu/design-system/tokens`. This eliminates the need for inline styles in Canvas/SVG contexts.

---

## Appendix A: File Inventory

### New files to create:

- `scripts/lint-no-inline-styles.mjs` — Inline style CI check
- `scripts/check-tailwind-css.mjs` — Dev-server CSS staleness check
- `.stylelintrc.json` — Stylelint configuration
- `docs/COMPONENT_GUIDE.md` — Component development guide
- `docs/ui/tailwind-standards.md` — Tailwind usage standards
- `docs/ui/token-reference.md` — Complete token reference

### Files to modify:

- `package.json` (root) — Add dev dependencies + lint-staged config
- `.eslintrc.json` (root) — Add `tailwindcss`, `jsx-a11y` plugins + rules
- `packages/runtime/.eslintrc.json` — Add `jsx-a11y` plugin (browser context)
- `packages/accessibility/.eslintrc.json` — Add `jsx-a11y` plugin
- `packages/widgets/.eslintrc.json` — Add `jsx-a11y` plugin
- `apps/dev-server/.eslintrc.json` — Add `jsx-a11y` plugin
- `.prettierrc` — Add `prettier-plugin-tailwindcss`
- `AGENTS.md` — Fix theme count (4 → 6), add UI coding standards section
- `packages/design-system/package.json` — Add `./test-utils` export entry

### New dev dependencies (all root-level):

- `eslint-plugin-tailwindcss` — Tailwind class validation (v3.x, compatible with Tailwind v3.4)
- `eslint-plugin-jsx-a11y` — Pre-render accessibility linting
- `prettier-plugin-tailwindcss` — Tailwind class sorting
- `stylelint` — CSS linting
- `stylelint-config-standard` — Standard CSS rules
- `stylelint-config-tailwindcss` — Tailwind CSS support
- `husky` — Git hooks
- `lint-staged` — Run linters on staged files
