# Tailwind CSS Standards

Standards for writing Tailwind CSS in the Open-Edu design system.

## Class Ordering

Class ordering is **automated** by `prettier-plugin-tailwindcss`. Run `pnpm format` before committing.

The plugin uses the official Tailwind class order (recommended order):

1. Layout/positioning (`flex`, `grid`, `relative`, `absolute`)
2. Display (`block`, `inline-flex`, `hidden`)
3. Sizing (`w-`, `h-`, `max-w-`)
4. Spacing (`p-`, `m-`, `gap-`)
5. Typography (`text-`, `font-`, `leading-`)
6. Visual (`bg-`, `border-`, `rounded-`, `shadow-`)
7. Effects (`opacity-`, `transition-`, `transform-`)
8. Interactive (`cursor-`, `focus-`, `hover:`)

**Note:** `motion-safe:` and `motion-reduce:` prefixes should be placed after all standard utilities and before state variants.

## Token Reference — `--oe-*` to Tailwind

All `--oe-*` CSS variables are mapped to Tailwind utility classes via the design system's token extensions (see `packages/design-system/src/tokens/tailwind.ts`).

### Colors

| CSS Variable                           | Tailwind Class                                           | Description             |
| -------------------------------------- | -------------------------------------------------------- | ----------------------- |
| `--oe-color-surface`                   | `bg-surface` / `text-surface`                            | Base surface background |
| `--oe-color-surface-dim`               | `bg-surface-dim`                                         | Dimmed surface          |
| `--oe-color-surface-bright`            | `bg-surface-bright`                                      | Bright surface          |
| `--oe-color-surface-container-lowest`  | `bg-surface-container-lowest`                            | Card backgrounds        |
| `--oe-color-surface-container-low`     | `bg-surface-container-low`                               | Low container           |
| `--oe-color-surface-container`         | `bg-surface-container`                                   | Mid container           |
| `--oe-color-surface-container-high`    | `bg-surface-container-high`                              | High container          |
| `--oe-color-surface-container-highest` | `bg-surface-container-highest`                           | Highest container       |
| `--oe-color-on-surface`                | `text-on-surface` (also `text-foreground`)               | Primary text            |
| `--oe-color-on-surface-variant`        | `text-on-surface-variant` (also `text-muted-foreground`) | Secondary text          |
| `--oe-color-outline`                   | `border-outline`                                         | Strong borders          |
| `--oe-color-outline-variant`           | `border-outline-variant` (also `border-border`)          | Subtle borders          |
| `--oe-color-primary`                   | `bg-primary` / `text-primary` / `ring-primary`           | Primary accent          |
| `--oe-color-on-primary`                | `text-on-primary` (also `text-primary-foreground`)       | Text on primary         |
| `--oe-color-primary-container`         | `bg-primary-container`                                   | Primary container fill  |
| `--oe-color-on-primary-container`      | `text-on-primary-container`                              | Text on container       |
| `--oe-color-secondary`                 | `bg-secondary` / `text-secondary`                        | Secondary accent        |
| `--oe-color-tertiary`                  | `bg-tertiary` / `text-tertiary`                          | Tertiary accent (gold)  |
| `--oe-color-error`                     | `bg-destructive` / `text-destructive` / `bg-error`       | Error/destructive       |
| `--oe-color-success`                   | `bg-success` / `text-success`                            | Success                 |
| `--oe-color-background`                | `bg-background`                                          | Page background         |

### Typography

| CSS Variable                           | Tailwind Class                     | Description            |
| -------------------------------------- | ---------------------------------- | ---------------------- |
| `--oe-font-productive-heading-size`    | `text-h1`                          | Page titles (28px)     |
| `--oe-font-productive-subheading-size` | `text-h2`                          | Section headers (24px) |
| `--oe-font-productive-heading3-size`   | `text-h3`                          | Sub-sections (20px)    |
| `--oe-font-productive-heading4-size`   | `text-h4`                          | (18px)                 |
| `--oe-font-productive-heading5-size`   | `text-h5`                          | Step titles (16px)     |
| `--oe-font-productive-heading6-size`   | `text-h6`                          | (14px)                 |
| `--oe-font-productive-body-size`       | `text-body-ui`                     | UI body text (14px)    |
| `--oe-font-expressive-body-size`       | `text-body-reading`                | Reading content (18px) |
| `--oe-font-productive-label-size`      | `text-label-caps`                  | Labels/badges (11px)   |
| `--oe-font-productive-caption-size`    | `text-caption`                     | Captions (13px)        |
| `--oe-font-productive-code-size`       | `text-mono`                        | Code/monospace (13px)  |
| `--oe-font-expressive-display-family`  | `font-display` / `font-display-lg` | Serif display          |
| `--oe-font-productive-heading-family`  | `font-headline-lg`                 | Sans heading           |

### Spacing

| CSS Variable               | Tailwind Class                    | Description               |
| -------------------------- | --------------------------------- | ------------------------- |
| `--oe-space-xs`            | `p-xs` / `m-xs` / `gap-xs`        | 4px                       |
| `--oe-space-sm`            | `p-sm` / `m-sm` / `gap-sm`        | 8px                       |
| `--oe-space-md`            | `p-md` / `m-md` / `gap-md`        | 12px                      |
| `--oe-space-lg`            | `p-lg` / `m-lg` / `gap-lg`        | 16px                      |
| `--oe-space-xl`            | `p-xl` / `m-xl` / `gap-xl`        | 24px                      |
| `--oe-space-2xl`           | (not mapped)                      | 32px                      |
| `--oe-space-base`          | `p-base` / `m-base`               | Base spacing              |
| `--oe-space-container-max` | `max-w-container-max`             | Max content width (720px) |
| `--oe-space-panel-nav`     | `w-panel-nav` / `max-w-panel-nav` | Nav panel (240px)         |
| `--oe-reading-width`       | `max-w-reading`                   | Reading width (68ch)      |

### Radius

| CSS Variable          | Tailwind Class                | Description        |
| --------------------- | ----------------------------- | ------------------ |
| `--oe-radius-DEFAULT` | `rounded` / `rounded-default` | Default (6px)      |
| `--oe-radius-sm`      | `rounded-sm`                  | Small (2px)        |
| `--oe-radius-md`      | `rounded-md`                  | Medium (8px)       |
| `--oe-radius-lg`      | `rounded-lg`                  | Large (10px)       |
| `--oe-radius-xl`      | `rounded-xl`                  | Extra large (12px) |
| `--oe-radius-full`    | `rounded-full`                | Full (9999px)      |

### Elevation

| CSS Variable             | Tailwind Class             | Description      |
| ------------------------ | -------------------------- | ---------------- |
| `--oe-elevation-flat`    | `shadow-elevation-flat`    | No shadow        |
| `--oe-elevation-raised`  | `shadow-elevation-raised`  | Subtle raised    |
| `--oe-elevation-overlay` | `shadow-elevation-overlay` | Overlay/dropdown |
| `--oe-elevation-modal`   | `shadow-elevation-modal`   | Modal/dialog     |
| `--oe-elevation-sticky`  | `shadow-elevation-sticky`  | Sticky header    |

### Motion

| CSS Variable                     | Tailwind Class    | Description   |
| -------------------------------- | ----------------- | ------------- |
| `--oe-motion-duration-fast`      | `duration-fast`   | 100ms         |
| `--oe-motion-duration-normal`    | `duration-normal` | 200ms         |
| `--oe-motion-duration-slow`      | `duration-slow`   | 300ms         |
| `--oe-motion-easing-ease-in-out` | `ease-in-out`     | Standard      |
| `--oe-motion-easing-ease-out`    | `ease-out`        | Snappier exit |
| `--oe-motion-easing-ease-in`     | `ease-in`         | Entrance      |

## Responsive Design

Use **mobile-first** breakpoints. Always start with the base (mobile) class, then add `sm:`, `md:`, `lg:` overrides.

| Breakpoint | Min Width | Usage                        |
| ---------- | --------- | ---------------------------- |
| (none)     | 0         | Base mobile styles           |
| `sm:`      | 640px     | Large phones / small tablets |
| `md:`      | 768px     | Tablets                      |
| `lg:`      | 1024px    | Desktop                      |
| `xl:`      | 1280px    | Wide desktop                 |

```tsx
{/* Mobile-first: single column → two columns on tablet → three on desktop */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
```

For layout context tokens, use the semantic spacing classes:

```tsx
<div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
```

## Animation & Transitions

All animations must respect user motion preferences. Use the `motion-safe:` prefix:

```tsx
<div className="motion-safe:transition-all motion-safe:duration-300">
```

The `motionSafe()` utility in `packages/design-system/src/tokens/motion.ts` generates the `@media (prefers-reduced-motion: no-preference)` wrapper for CSS-in-JS.

The design system also supports a runtime Reduced Motion toggle via `--oe-reduced-motion: reduce` on the document element:

```tsx
style={{ '--oe-reduced-motion': reduced ? 'reduce' : 'unset' } as React.CSSProperties}
```

Standard animation pattern for interactive elements:

```tsx
className={cn(
  'motion-safe:transition-colors motion-safe:duration-fast',
  'hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary',
)}
```

## Common Mistakes & Fixes

| Mistake                       | Why it's wrong                                       | Fix                                                     |
| ----------------------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| `text-amber-400`              | Hardcoded Tailwind palette, breaks theme             | Use `text-tertiary` or `text-on-surface-variant`        |
| `bg-gray-100`                 | Non-token gray, breaks dark mode                     | Use `bg-surface-container-low`                          |
| `rounded` without prefix      | Relies on default radius (4px in vanilla TW)         | Use `rounded-md` (8px) or `rounded-lg` (10px)           |
| `duration-200`                | Vanilla TW duration, ignores motion tokens           | Use `duration-normal`                                   |
| No `motion-safe:`             | Animations run even when user prefers reduced motion | Wrap all animations with `motion-safe:`                 |
| `style={{ marginLeft: 8 }}`   | Inline px, not a token                               | Use `ml-sm` or `ml-md`                                  |
| Missing `sm:` base            | Desktop-first approach                               | Always start mobile-first: `grid-cols-1 md:grid-cols-2` |
| `!important` in utility class | Breaks Tailwind specificity                          | Use `cn()` ordering instead                             |

After adding or changing Tailwind classes in `packages/runtime/src/`, regenerate the dev-server CSS:

```bash
pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css
```
