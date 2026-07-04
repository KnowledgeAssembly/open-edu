# Design Token Reference

Complete reference of all Open-Edu design tokens. Tokens are defined in `packages/design-system/src/tokens/` and mapped to Tailwind utility classes via `tailwind.ts`.

---

## Color Tokens

| Token                     | CSS Variable                           | Tailwind Class                                      | v2 Value          |
| ------------------------- | -------------------------------------- | --------------------------------------------------- | ----------------- |
| **Surface**               |                                        |                                                     |                   |
| surface                   | `--oe-color-surface`                   | `bg-surface` / `text-surface`                       | `#fcfaf8`         |
| surface-dim               | `--oe-color-surface-dim`               | `bg-surface-dim`                                    | `#e3dfda`         |
| surface-bright            | `--oe-color-surface-bright`            | `bg-surface-bright`                                 | `#fefcf9`         |
| surface-container-lowest  | `--oe-color-surface-container-lowest`  | `bg-surface-container-lowest`                       | `#ffffff`         |
| surface-container-low     | `--oe-color-surface-container-low`     | `bg-surface-container-low`                          | `#f7f4f0`         |
| surface-container         | `--oe-color-surface-container`         | `bg-surface-container`                              | `#f2eee9`         |
| surface-container-high    | `--oe-color-surface-container-high`    | `bg-surface-container-high`                         | `#ebe7e2`         |
| surface-container-highest | `--oe-color-surface-container-highest` | `bg-surface-container-highest`                      | `#e4dfda`         |
| on-surface                | `--oe-color-on-surface`                | `text-on-surface` / `text-foreground`               | `#1f1c18`         |
| on-surface-variant        | `--oe-color-on-surface-variant`        | `text-on-surface-variant` / `text-muted-foreground` | `#48443f`         |
| inverse-surface           | `--oe-color-inverse-surface`           | `bg-inverse-surface`                                | (varies by theme) |
| inverse-on-surface        | `--oe-color-inverse-on-surface`        | `text-inverse-on-surface`                           | (varies by theme) |
| surface-variant           | `--oe-color-surface-variant`           | `bg-surface-variant` / `bg-muted`                   | (varies by theme) |
| **Outline / Border**      |                                        |                                                     |                   |
| outline                   | `--oe-color-outline`                   | `border-outline`                                    | `#76706b`         |
| outline-variant           | `--oe-color-outline-variant`           | `border-outline-variant` / `border-border`          | `#ccc6c0`         |
| surface-tint              | `--oe-color-surface-tint`              | `border-surface-tint`                               | (varies by theme) |
| **Primary**               |                                        |                                                     |                   |
| primary                   | `--oe-color-primary`                   | `bg-primary` / `text-primary` / `ring-primary`      | `#5d4a8a`         |
| on-primary                | `--oe-color-on-primary`                | `text-on-primary` / `text-primary-foreground`       | `#ffffff`         |
| primary-container         | `--oe-color-primary-container`         | `bg-primary-container`                              | `#7c6bb0`         |
| on-primary-container      | `--oe-color-on-primary-container`      | `text-on-primary-container`                         | `#ede2ff`         |
| inverse-primary           | `--oe-color-inverse-primary`           | `text-inverse-primary`                              | `#d4c4ff`         |
| primary-fixed             | `--oe-color-primary-fixed`             | `bg-primary-fixed`                                  | (varies by theme) |
| primary-fixed-dim         | `--oe-color-primary-fixed-dim`         | `bg-primary-fixed-dim`                              | (varies by theme) |
| on-primary-fixed          | `--oe-color-on-primary-fixed`          | `text-on-primary-fixed`                             | (varies by theme) |
| on-primary-fixed-variant  | `--oe-color-on-primary-fixed-variant`  | `text-on-primary-fixed-variant`                     | (varies by theme) |
| **Secondary**             |                                        |                                                     |                   |
| secondary                 | `--oe-color-secondary`                 | `bg-secondary` / `text-secondary`                   | `#665e77`         |
| on-secondary              | `--oe-color-on-secondary`              | `text-on-secondary` / `text-secondary-foreground`   | `#ffffff`         |
| secondary-container       | `--oe-color-secondary-container`       | `bg-secondary-container`                            | `#e8dff7`         |
| on-secondary-container    | `--oe-color-on-secondary-container`    | `text-on-secondary-container`                       | `#655d77`         |
| **Tertiary**              |                                        |                                                     |                   |
| tertiary                  | `--oe-color-tertiary`                  | `bg-tertiary` / `text-tertiary`                     | `#b8862d`         |
| on-tertiary               | `--oe-color-on-tertiary`               | `text-on-tertiary`                                  | `#ffffff`         |
| tertiary-container        | `--oe-color-tertiary-container`        | `bg-tertiary-container`                             | `#f0d68a`         |
| on-tertiary-container     | `--oe-color-on-tertiary-container`     | `text-on-tertiary-container`                        | `#4a3800`         |
| **Error**                 |                                        |                                                     |                   |
| error                     | `--oe-color-error`                     | `bg-error` / `text-error` / `bg-destructive`        | `#ba1a1a`         |
| on-error                  | `--oe-color-on-error`                  | `text-on-error` / `text-destructive-foreground`     | `#ffffff`         |
| error-container           | `--oe-color-error-container`           | `bg-error-container`                                | `#ffdad6`         |
| on-error-container        | `--oe-color-on-error-container`        | `text-on-error-container`                           | (varies by theme) |
| **Success**               |                                        |                                                     |                   |
| success                   | `--oe-color-success`                   | `bg-success` / `text-success`                       | `#16a34a`         |
| **Aliases**               |                                        |                                                     |                   |
| background                | `--oe-color-background`                | `bg-background`                                     | `#fcfaf8`         |
| on-background             | `--oe-color-on-background`             | `text-on-background`                                | `#1f1c18`         |
| border                    | `--oe-color-outline-variant`           | `border-border`                                     | `#ccc6c0`         |
| foreground                | `--oe-color-on-surface`                | `text-foreground`                                   | `#1f1c18`         |
| input                     | `--oe-color-outline-variant`           | `border-input`                                      | `#ccc6c0`         |
| ring                      | `--oe-color-primary`                   | `ring-ring`                                         | `#5d4a8a`         |
| ring-offset               | `--oe-color-background`                | `ring-offset-ring-offset`                           | `#fcfaf8`         |
| card                      | `--oe-color-surface-container-lowest`  | `bg-card`                                           | `#ffffff`         |
| card-foreground           | `--oe-color-on-surface`                | `text-card-foreground`                              | `#1f1c18`         |
| popover                   | `--oe-color-surface-container`         | `bg-popover`                                        | `#f2eee9`         |
| popover-foreground        | `--oe-color-on-surface`                | `text-popover-foreground`                           | `#1f1c18`         |
| muted                     | `--oe-color-surface-variant`           | `bg-muted`                                          | (varies by theme) |
| muted-foreground          | `--oe-color-on-surface-variant`        | `text-muted-foreground`                             | `#48443f`         |
| accent                    | `--oe-color-accent`                    | `bg-accent` / `text-accent`                         | (varies by theme) |
| accent-foreground         | `--oe-color-on-secondary`              | `text-accent-foreground`                            | `#ffffff`         |
| destructive               | `--oe-color-error`                     | `bg-destructive` / `text-destructive`               | `#ba1a1a`         |
| destructive-foreground    | `--oe-color-on-error`                  | `text-destructive-foreground`                       | `#ffffff`         |

---

## Spacing Tokens

| Token             | CSS Variable                | Tailwind Class                              | Value  |
| ----------------- | --------------------------- | ------------------------------------------- | ------ |
| 2xs               | `--oe-space-2xs`            | (not mapped)                                | 2px    |
| xs                | `--oe-space-xs`             | `p-xs` / `m-xs` / `gap-xs`                  | 4px    |
| sm                | `--oe-space-sm`             | `p-sm` / `m-sm` / `gap-sm`                  | 8px    |
| md                | `--oe-space-md`             | `p-md` / `m-md` / `gap-md`                  | 12px   |
| lg                | `--oe-space-lg`             | `p-lg` / `m-lg` / `gap-lg`                  | 16px   |
| xl                | `--oe-space-xl`             | `p-xl` / `m-xl` / `gap-xl`                  | 24px   |
| 2xl               | `--oe-space-2xl`            | (not mapped)                                | 32px   |
| 3xl               | `--oe-space-3xl`            | (not mapped)                                | 40px   |
| 4xl               | `--oe-space-4xl`            | (not mapped)                                | 48px   |
| 5xl               | `--oe-space-5xl`            | (not mapped)                                | 64px   |
| base              | `--oe-space-base`           | `p-base` / `m-base` / `gap-base`            | 16px   |
| gutter            | `--oe-space-gutter`         | `gap-gutter`                                | 24px   |
| margin-desktop    | `--oe-space-margin-desktop` | `px-margin-desktop`                         | 48px   |
| margin-mobile     | `--oe-space-margin-mobile`  | `px-margin-mobile`                          | 16px   |
| container-max     | `--oe-space-container-max`  | `max-w-container-max`                       | 720px  |
| panel-nav         | `--oe-space-panel-nav`      | `w-panel-nav` / `max-w-panel-nav`           | 240px  |
| panel-explorer    | `--oe-space-panel-explorer` | `w-panel-explorer` / `max-w-panel-explorer` | 320px  |
| reading-width     | `--oe-reading-width`        | `max-w-reading`                             | 68ch   |
| paragraph-spacing | `--oe-paragraph-spacing`    | `space-y-paragraph-spacing`                 | 1.5rem |

---

## Radius Tokens

| Token   | CSS Variable          | Tailwind Class                | Value           |
| ------- | --------------------- | ----------------------------- | --------------- |
| sm      | `--oe-radius-sm`      | `rounded-sm`                  | 0.125rem (2px)  |
| DEFAULT | `--oe-radius-DEFAULT` | `rounded` / `rounded-default` | 0.375rem (6px)  |
| md      | `--oe-radius-md`      | `rounded-md`                  | 0.5rem (8px)    |
| lg      | `--oe-radius-lg`      | `rounded-lg`                  | 0.625rem (10px) |
| xl      | `--oe-radius-xl`      | `rounded-xl`                  | 0.75rem (12px)  |
| full    | `--oe-radius-full`    | `rounded-full`                | 9999px          |

---

## Typography Tokens

### Font Families

| Token                | CSS Variable                          | Tailwind Class                       | Value                                       |
| -------------------- | ------------------------------------- | ------------------------------------ | ------------------------------------------- |
| productive body      | `--oe-font-productive-body-family`    | `font-body-md`                       | Inter, system-ui, -apple-system, sans-serif |
| expressive body      | `--oe-font-expressive-body-family`    | `font-body-lg` / `font-body-reading` | "Source Serif 4", Georgia, ui-serif, serif  |
| display (expressive) | `--oe-font-expressive-display-family` | `font-display` / `font-display-lg`   | "Source Serif 4", Georgia, ui-serif, serif  |
| heading (productive) | `--oe-font-productive-heading-family` | `font-headline-lg`                   | Inter, system-ui, -apple-system, sans-serif |
| code                 | `--oe-font-productive-code-family`    | `font-mono`                          | "JetBrains Mono", ui-monospace, monospace   |

### Font Sizes (Productive Set)

| Role       | CSS Variable                        | Tailwind Class     | Size / Weight / Line-Height |
| ---------- | ----------------------------------- | ------------------ | --------------------------- |
| display    | `--oe-font-productive-display-*`    | `text-headline-lg` | 40px / 700 / 1.1            |
| heading    | `--oe-font-productive-heading-*`    | `text-h1`          | 28px / 650 / 1.3            |
| subheading | `--oe-font-productive-subheading-*` | `text-h2`          | 24px / 600 / 1.3            |
| heading3   | `--oe-font-productive-heading3-*`   | `text-h3`          | 20px / 600 / 1.4            |
| heading4   | `--oe-font-productive-heading4-*`   | `text-h4`          | 18px / 600 / 1.4            |
| heading5   | `--oe-font-productive-heading5-*`   | `text-h5`          | 16px / 600 / 1.5            |
| heading6   | `--oe-font-productive-heading6-*`   | `text-h6`          | 14px / 600 / 1.5            |
| body       | `--oe-font-productive-body-*`       | `text-body-ui`     | 14px / 420 / 1.6            |
| label      | `--oe-font-productive-label-*`      | `text-label-caps`  | 11px / 600 / 1.0 / 0.08em   |
| caption    | `--oe-font-productive-caption-*`    | `text-caption`     | 13px / 420 / 1.5            |
| code       | `--oe-font-productive-code-*`       | `text-mono`        | 13px / 400 / 1.6            |

### Font Sizes (Expressive Set)

| Role    | CSS Variable                     | Tailwind Class      | Size / Weight / Line-Height |
| ------- | -------------------------------- | ------------------- | --------------------------- |
| display | `--oe-font-expressive-display-*` | `text-display-lg`   | 40px / 700 / 1.1            |
| heading | `--oe-font-expressive-heading-*` | (not mapped)        | 28px / 600 / 1.3            |
| body    | `--oe-font-expressive-body-*`    | `text-body-reading` | 18px / 420 / 1.7            |

---

## Motion Tokens

| Token              | CSS Variable                     | Tailwind Class    | Value                        |
| ------------------ | -------------------------------- | ----------------- | ---------------------------- |
| duration-fast      | `--oe-motion-duration-fast`      | `duration-fast`   | 100ms                        |
| duration-normal    | `--oe-motion-duration-normal`    | `duration-normal` | 200ms                        |
| duration-slow      | `--oe-motion-duration-slow`      | `duration-slow`   | 300ms                        |
| easing-ease-in-out | `--oe-motion-easing-ease-in-out` | `ease-in-out`     | cubic-bezier(0.4, 0, 0.2, 1) |
| easing-ease-out    | `--oe-motion-easing-ease-out`    | `ease-out`        | cubic-bezier(0, 0, 0.15, 1)  |
| easing-ease-in     | `--oe-motion-easing-ease-in`     | `ease-in`         | cubic-bezier(0.4, 0, 1, 1)   |

---

## Sizing Tokens

| Token        | CSS Variable             | Tailwind Class            | Value |
| ------------ | ------------------------ | ------------------------- | ----- |
| icon-xs      | `--oe-size-icon-xs`      | `w-icon-xs` / `h-icon-xs` | 12px  |
| icon-sm      | `--oe-size-icon-sm`      | `w-icon-sm` / `h-icon-sm` | 16px  |
| icon-md      | `--oe-size-icon-md`      | `w-icon-md` / `h-icon-md` | 20px  |
| icon-lg      | `--oe-size-icon-lg`      | `w-icon-lg` / `h-icon-lg` | 24px  |
| icon-xl      | `--oe-size-icon-xl`      | `w-icon-xl` / `h-icon-xl` | 32px  |
| height-xs    | `--oe-size-height-xs`    | `h-xs`                    | 24px  |
| height-sm    | `--oe-size-height-sm`    | `h-sm`                    | 32px  |
| height-md    | `--oe-size-height-md`    | `h-md`                    | 40px  |
| height-lg    | `--oe-size-height-lg`    | `h-lg`                    | 48px  |
| height-xl    | `--oe-size-height-xl`    | `h-xl`                    | 56px  |
| min-width-xs | `--oe-size-min-width-xs` | `min-w-xs`                | 48px  |
| min-width-sm | `--oe-size-min-width-sm` | `min-w-sm`                | 64px  |
| min-width-md | `--oe-size-min-width-md` | `min-w-md`                | 120px |
| min-width-lg | `--oe-size-min-width-lg` | `min-w-lg`                | 200px |

### Icon Size Tokens (legacy)

| Token    | CSS Variable         | Tailwind Class    | Value |
| -------- | -------------------- | ----------------- | ----- |
| icon-xs  | `--oe-icon-size-xs`  | `size-xs` (icon)  | 16px  |
| icon-sm  | `--oe-icon-size-sm`  | `size-sm` (icon)  | 20px  |
| icon-md  | `--oe-icon-size-md`  | `size-md` (icon)  | 24px  |
| icon-lg  | `--oe-icon-size-lg`  | `size-lg` (icon)  | 32px  |
| icon-xl  | `--oe-icon-size-xl`  | `size-xl` (icon)  | 40px  |
| icon-2xl | `--oe-icon-size-2xl` | `size-2xl` (icon) | 48px  |

---

## Elevation Tokens

| Token   | CSS Variable             | Tailwind Class             | Value                          |
| ------- | ------------------------ | -------------------------- | ------------------------------ |
| flat    | `--oe-elevation-flat`    | `shadow-elevation-flat`    | none                           |
| raised  | `--oe-elevation-raised`  | `shadow-elevation-raised`  | 0 1px 2px rgba(31,28,24,0.08)  |
| overlay | `--oe-elevation-overlay` | `shadow-elevation-overlay` | 0 4px 12px rgba(31,28,24,0.10) |
| modal   | `--oe-elevation-modal`   | `shadow-elevation-modal`   | 0 8px 24px rgba(31,28,24,0.14) |
| sticky  | `--oe-elevation-sticky`  | `shadow-elevation-sticky`  | 0 2px 6px rgba(31,28,24,0.08)  |

---

## Z-Index Scale

| Token    | CSS Variable      | Value | Usage                   |
| -------- | ----------------- | ----- | ----------------------- |
| dropdown | `--oe-z-dropdown` | 50    | Dropdown menus          |
| sticky   | `--oe-z-sticky`   | 100   | Sticky headers/sidebars |
| modal    | `--oe-z-modal`    | 200   | Modals and dialogs      |
| popover  | `--oe-z-popover`  | 300   | Popovers and tooltips   |
| tooltip  | `--oe-z-tooltip`  | 400   | Tooltips                |
| toast    | `--oe-z-toast`    | 500   | Toast notifications     |

---

## Border Width Tokens

| Token | CSS Variable          | Tailwind Class        | Value |
| ----- | --------------------- | --------------------- | ----- |
| 0     | `--oe-border-width-0` | `border-0`            | 0px   |
| 1     | `--oe-border-width-1` | `border` / `border-1` | 1px   |
| 2     | `--oe-border-width-2` | `border-2`            | 2px   |
| 4     | `--oe-border-width-4` | `border-4`            | 4px   |
| 8     | `--oe-border-width-8` | `border-8`            | 8px   |

---

## Focus Ring Tokens

| Token  | CSS Variable             | Tailwind Class          | Value               |
| ------ | ------------------------ | ----------------------- | ------------------- |
| width  | `--oe-focus-ring-width`  | `ring` (default)        | 2px                 |
| offset | `--oe-focus-ring-offset` | `ring-offset` (default) | 2px                 |
| color  | `--oe-focus-ring-color`  | `ring-ring`             | `#5d4a8a` (primary) |

---

## Layout Tokens

| Token             | CSS Variable                          | Tailwind Class        | Value |
| ----------------- | ------------------------------------- | --------------------- | ----- |
| sidebar           | `--oe-layout-sidebar-width`           | `w-sidebar`           | 280px |
| sidebar-collapsed | `--oe-layout-sidebar-collapsed-width` | `w-sidebar-collapsed` | 64px  |
| header            | `--oe-layout-header-height`           | `h-header`            | 64px  |
| panel-nav         | `--oe-layout-panel-nav-width`         | `w-panel-nav`         | 240px |
| panel-explorer    | `--oe-layout-panel-explorer-width`    | `w-panel-explorer`    | 320px |
| content           | `--oe-layout-content-max-width`       | `max-w-content`       | 720px |
| reading           | `--oe-layout-reading-width`           | `max-w-reading`       | 68ch  |
| grid-sm           | `--oe-layout-grid-gap-sm`             | `gap-grid-sm`         | 8px   |
| grid-md           | `--oe-layout-grid-gap-md`             | `gap-grid-md`         | 16px  |
| grid-lg           | `--oe-layout-grid-gap-lg`             | `gap-grid-lg`         | 24px  |
| grid-xl           | `--oe-layout-grid-gap-xl`             | `gap-grid-xl`         | 32px  |
