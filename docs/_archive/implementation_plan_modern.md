# Detailed Implementation Plan: Radix UI, shadcn/ui & Lucide Icons for Learner App

This document outlines the architecture, setup, component library structure, and migration steps for adopting **Radix UI**, **shadcn/ui**, and **Lucide Icons** within `apps/learner`.

---

## 1. Overview & Objectives

Currently, `apps/learner` relies on native HTML elements (`<button>`, `<input>`, `<div>`), inline unicode emojis (`🏠`, `📈`, `⚙️`), and custom modal logic for dialogs. Integrating Radix UI primitives and shadcn/ui pattern library will:

- Elevate the UI aesthetics to meet modern, accessible design standards.
- Provide accessible, keyboard-navigable primitives (dialogs, tooltips, tabs, switches, progress bars).
- Replace raw emojis with crisp, cohesive SVG icons from `lucide-react`.
- Ensure seamless compatibility with Open-Edu's existing **4-theme system** (`RuntimeThemeProvider` CSS variables).

---

## 2. Architecture & Design System Integration

### Theme Token Mapping

Open-Edu uses `--oe-*` CSS variables. Shadcn UI components rely on Tailwind utility classes and shadcn CSS variables (`--background`, `--foreground`, `--primary`, `--muted`, etc.).

We will define shadcn CSS variables in `apps/learner/src/index.css` that reference Open-Edu's `--oe-*` variables directly, so dynamic theme switching works out of the box.

**Shadcn → Open-Edu CSS Variable Mapping:**

```css
@layer base {
  :root {
    /* shadcn base tokens → Open-Edu --oe-* vars */
    --background: var(--oe-color-surface);
    --foreground: var(--oe-color-on-surface);
    --card: var(--oe-color-surface-container-lowest);
    --card-foreground: var(--oe-color-on-surface);
    --popover: var(--oe-color-surface-container);
    --popover-foreground: var(--oe-color-on-surface);
    --primary: var(--oe-color-primary);
    --primary-foreground: var(--oe-color-on-primary);
    --secondary: var(--oe-color-secondary-container);
    --secondary-foreground: var(--oe-color-on-secondary-container);
    --muted: var(--oe-color-surface-variant);
    --muted-foreground: var(--oe-color-on-surface-variant);
    --accent: var(--oe-color-primary-container);
    --accent-foreground: var(--oe-color-on-primary-container);
    --destructive: var(--oe-color-error);
    --destructive-foreground: var(--oe-color-on-error);
    --success: var(--oe-color-success);
    --success-foreground: var(--oe-color-on-secondary);
    --border: var(--oe-color-outline);
    --input: var(--oe-color-outline);
    --ring: var(--oe-color-primary);
    --radius: var(--oe-radius-DEFAULT);
  }
}
```

No `@media (prefers-color-scheme: dark)` override is needed — Open-Edu's `RuntimeThemeProvider` injects the correct `--oe-*` values at runtime via inline styles. The shadcn vars always resolve through `--oe-*` → theme's inlined `style` attribute.

### React Aria / Radix Coexistence

The project already uses React Aria indirectly through `@open-edu/accessibility` (e.g., `FocusTrap`). Radix UI primitives (Dialog, Tabs, Select) include their own focus management. We will:

- Let Radix own focus management within its primitives (Dialog traps focus internally).
- Keep `FocusTrap` from `@open-edu/accessibility` for any custom focus-managed regions outside Radix scope.
- Not mix both on the same interactive region.

### Path Alias Setup (`@/`)

The shadcn convention uses `@/` as a project root alias. The learner app needs:

1. **`tsconfig.json`** — add `"paths": { "@/*": ["./src/*"] }` (inheriting the base `tsconfig.base.json`).
2. **`vite.config.ts`** — add `resolve.alias` entry: `"@"` → `path.resolve(__dirname, "./src")`.
3. **`vitest.config.ts`** — add the same `resolve.alias` so tests resolve `@/` imports.

---

## 3. Dependencies & Setup

### [MODIFY] `apps/learner/package.json`

Add the following dependencies:

- `lucide-react`: Cohesive icon set.
- `@radix-ui/react-dialog`, `@radix-ui/react-progress`, `@radix-ui/react-tabs`, `@radix-ui/react-select`, `@radix-ui/react-slot`, `@radix-ui/react-switch`, `@radix-ui/react-tooltip`: Accessible UI primitives.
- `clsx`, `tailwind-merge`, `class-variance-authority`: UI utility dependencies for shadcn component variants.
- `tailwindcss-animate`: Tailwind plugin for Radix/shadcn enter/exit animations (required by Dialog, Tabs, Select).

### [MODIFY] `apps/learner/tailwind.config.ts`

Add the `tailwindcss-animate` plugin and an explicit `"animate"` key in the content paths:

```ts
plugins: [require('tailwindcss-animate')],
```

(This automatically provides `animate-in`, `animate-out`, `fade-in`, `zoom-in-95`, `slide-in-from-*`, etc. utilities used by shadcn.)

### [MODIFY] `apps/learner/tsconfig.json`

Add path alias:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

### [MODIFY] `apps/learner/vite.config.ts`

Add `resolve.alias`:

```ts
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), eduDataPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: { port: 4001 },
});
```

### [MODIFY] `apps/learner/vitest.config.ts`

Add the same `resolve.alias` so test files can resolve `@/`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

### [NEW] `apps/learner/components.json`

Standard shadcn/ui project configuration:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### [NEW] `apps/learner/src/lib/utils.ts`

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

### [MODIFY] `apps/learner/src/index.css`

Add the shadcn CSS variable mapping (see Section 2 above) inside `@layer base`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: var(--oe-color-surface);
    --foreground: var(--oe-color-on-surface);
    --card: var(--oe-color-surface-container-lowest);
    --card-foreground: var(--oe-color-on-surface);
    --popover: var(--oe-color-surface-container);
    --popover-foreground: var(--oe-color-on-surface);
    --primary: var(--oe-color-primary);
    --primary-foreground: var(--oe-color-on-primary);
    --secondary: var(--oe-color-secondary-container);
    --secondary-foreground: var(--oe-color-on-secondary-container);
    --muted: var(--oe-color-surface-variant);
    --muted-foreground: var(--oe-color-on-surface-variant);
    --accent: var(--oe-color-primary-container);
    --accent-foreground: var(--oe-color-on-primary-container);
    --destructive: var(--oe-color-error);
    --destructive-foreground: var(--oe-color-on-error);
    --success: var(--oe-color-success);
    --success-foreground: var(--oe-color-on-secondary);
    --border: var(--oe-color-outline);
    --input: var(--oe-color-outline);
    --ring: var(--oe-color-primary);
    --radius: var(--oe-radius-DEFAULT);
  }
}
```

---

## 4. Core UI Components (`src/components/ui/`)

All components follow the standard shadcn/ui implementation patterns. Each is a thin wrapper around its Radix primitive, styled using Tailwind utilities that resolve through the `--oe-*` → shadcn → theme variable chain.

### [NEW] `src/components/ui/button.tsx`

Shadcn Button built with `@radix-ui/react-slot` and `class-variance-authority`. Variants: `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`. Sizes: `default`, `sm`, `lg`, `icon`. Uses `--primary`, `--secondary`, `--destructive`, `--muted` etc. for colors.

### [NEW] `src/components/ui/card.tsx`

Modular Card components: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`. Uses `--card` / `--card-foreground` for background/text, `--border` for borders.

### [NEW] `src/components/ui/dialog.tsx`

Radix `Dialog.Portal`-based modal with `Overlay`, `Content`, `Header`, `Footer`, `Title`, `Description`, `Close`. Uses `animate-in`/`fade-in`/`zoom-in-95` for enter animation, `data-[state=open]` styling. Replace custom overlay + manual keyboard listeners in `CourseExitWarningDialog`.

### [NEW] `src/components/ui/badge.tsx`

Badge component with `default`, `secondary`, `destructive`, `outline` variants. Used for course tags, progress statuses, bundle labels, difficulty levels.

### [NEW] `src/components/ui/input.tsx`

Styled `<input>` with consistent border, focus ring, disabled state, and file input styling. Includes `--input` border color and `--ring` focus ring.

### [NEW] `src/components/ui/select.tsx`

Radix `Select.Portal`-based accessible dropdown. Used in `CatalogPage` for sort dropdown, replacing the native button toggle group with a proper select menu.

### [NEW] `src/components/ui/switch.tsx`

Radix `Switch.Root` + `Switch.Thumb` component. Replaces the custom checkbox-based toggle switches in `SettingsPage` (Reduced Motion, High Contrast).

### [NEW] `src/components/ui/progress.tsx`

Radix `Progress.Root` + `Progress.Indicator`. Replaces custom div-width progress bars in `ProgressDashboard` and `CatalogPage` bundle cards.

### [NEW] `src/components/ui/tabs.tsx`

Radix `Tabs.Root` / `Tabs.List` / `Tabs.Trigger` / `Tabs.Content`. Used in `SettingsPage` for tabbed accessibility controls and potentially in `BundleOverviewPage` for module-level navigation.

### [NEW] `src/components/ui/tooltip.tsx`

Radix `Tooltip.Provider` / `Tooltip.Root` / `Tooltip.Trigger` / `Tooltip.Content`. Used in `LeftNav` for icon-only navigation items and `AppShell` header actions.

---

## 5. Refactoring Learner Views & Features

### [MODIFY] `src/LeftNav.tsx`

- Replace emoji icons with Lucide icons: `🏠` → `Home`, `📈` → `TrendingUp`, `📚` → `BookOpen`, `⚙️` → `Settings`, `← Back to Catalog` → `ArrowLeft`.
- Replace native `<button>` navigation items with shadcn `Button` component (`variant="ghost"`, `size="sm"`).
- Wrap icon+label in a flex layout using `cn()` from `@/lib/utils`.
- Keep the CourseStepList as-is (it uses custom rendering appropriate for step progress), but update its checkmark/indicators with Lucide `Check` icon.

### [MODIFY] `src/CourseExitWarningDialog.tsx`

- Replace the entire custom overlay, manual `useEffect` keyboard listeners, `FocusTrap` import, and inline styles with shadcn `Dialog`, `DialogContent`, `DialogHeader`, `DialogFooter`, and `Button`.
- Radix Dialog provides built-in focus trapping, escape handling, and backdrop click dismissal.
- Remove the `FocusTrap` import from `@open-edu/accessibility` in this file.

### [MODIFY] `src/HomePage.tsx`

- Replace the three stat cards' emoji icons with Lucide: `📚` → `BookOpen`, `📈` → `TrendingUp`, `🏆` → `Trophy`.
- Wrap stat cards in shadcn `Card` / `CardContent`.
- Replace native `<button>` quick links with shadcn `Button` (variant `default` and `outline`).
- Use `Sparkles`, `PlayCircle`, `GraduationCap`, `Clock` for decorative accents.

### [MODIFY] `src/CatalogPage.tsx`

- Replace native `<button>` tag filters with shadcn `Badge` components (clickable, `data-[active=true]` styling).
- Replace native sort buttons with shadcn `Select` component for sort dropdown.
- Wrap catalog items and bundle cards in shadcn `Card` components.
- Replace custom div-width progress bars with shadcn `Progress`.
- Add Lucide `Search` icon within an `Input` wrapper for future search (input exists in the plan but current CatalogPage doesn't have a search box — defer if not present).
- Replace native "View all" and "Continue Learning" buttons with shadcn `Button`.

### [MODIFY] `src/ProgressDashboard.tsx`

- Replace custom `div`-based progress bars with shadcn `Progress`.
- Wrap each course progress card in shadcn `Card`.
- Replace emoji `📚` in empty state with Lucide `BookOpen`.
- Replace native `<button>` elements (Continue, Browse Courses) with shadcn `Button`.
- Add Lucide icons for badge/stats display: `Award`, `Trophy`, `Target`, `Zap`, `Flame`.
- Use shadcn `Badge` for the "Completed ✓" status label.

### [MODIFY] `src/SettingsPage.tsx`

- Wrap theme section and accessibility sections in shadcn `Card`.
- Replace custom checkbox toggle switches with shadcn `Switch` component (much more accessible and maintainable).
- Replace A-/A+ font size buttons with shadcn `Button` (variant `outline`, size `sm`).
- Add Lucide icons: `Sun`, `Moon`, `Volume2`, `Eye`, `Type`, `Minus`, `Plus`.
- Use shadcn `Tabs` if the settings surface grows to multiple tabs (optional — currently a single column layout is fine).

### [MODIFY] `src/AppShell.tsx`

- Replace any native buttons in the shell with shadcn `Button`.
- Add Lucide icons for header actions and navigation toggles (`Menu`, `X`, `ChevronLeft`, `ChevronRight`).

### [MODIFY] `src/CourseRuntime.tsx`

- Replace native HTML buttons used for course navigation (next/previous step, module buttons) with shadcn `Button`.
- Use Lucide icons for navigation: `ChevronLeft`, `ChevronRight`, `CheckCircle`.

### [MODIFY] `src/BundleOverviewPage.tsx`

- Wrap bundle module cards in shadcn `Card`.
- Replace native buttons with shadcn `Button`.
- Use shadcn `Progress` for overall bundle progress.

---

## 6. Test Update Guidance

Existing test files that need updates:

| Test file                          | Required changes                                                                                                                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LeftNav.test.tsx`                 | Update `aria-current` assertions if Radix changes DOM structure; update role/query selectors if buttons become `<button>` within shadcn `Button` (it renders a `<button>` by default, so minimal impact) |
| `HomePage.test.tsx`                | Update icon queries — emojis were `aria-hidden="true"`, Lucide icons render as inline SVGs with `aria-hidden="true"` by default; confirm `data-testid` selectors unchanged                               |
| `CatalogPage.test.tsx`             | Update filter chip queries if migrating from `<button>` to `<Badge>` component; adjust `data-testid` assertions if Card refactoring changes DOM nesting                                                  |
| `ProgressDashboard.test.tsx`       | Update progress bar queries — Radix `Progress` renders `role="progressbar"` with `aria-valuenow`; update assertions from div width style to ARIA attribute checks                                        |
| `SettingsPage.test.tsx`            | Update toggle switch queries — `Switch.Root` renders `role="switch"` with `aria-checked` instead of `<input type="checkbox">`                                                                            |
| `CourseExitWarningDialog.test.tsx` | Significant rewrite — Radix `Dialog` uses portals (`data-radix-portal`); focus trap tests need to target dialog content via `role="dialog"`; remove manual keyboard event assertions (handled by Radix)  |
| `AppShell.test.tsx`                | Minimal — update any button queries if shell buttons are refactored                                                                                                                                      |
| `CourseRuntime.test.tsx`           | Update navigation button queries if migrated to shadcn `Button`                                                                                                                                          |
| `a11y-themes.test.tsx`             | Re-run axe-core audits on every page in every theme; verify no violations from new ARIA attributes or unmounted portal content                                                                           |

---

## 7. Verification Plan

### Automated Tests

1. **Dependency & Workspace Check**:
   - `pnpm install`
   - `pnpm --filter @open-edu/learner typecheck`
   - `pnpm --filter @open-edu/learner test`
2. **Component & Integration Testing**:
   - Run updated Vitest suite: `pnpm --filter @open-edu/learner test`
   - Verify all existing tests pass with updated selectors/assertions
3. **Accessibility Audits**:
   - Run the a11y-themes test suite to ensure all refactored pages pass axe-core checks in all 4 themes

### Manual Verification

1. Launch learner dev app: `pnpm --filter @open-edu/learner dev`
2. Verify visual rendering, theme switching (Lumina Scholastica, Nocturnal, High Focus, Sylvan Workspace), dialog keyboard control (`Esc`, `Tab` focus ring), and icon alignment across desktop and mobile viewports

---

## 8. Implementation Order

This dependency order minimizes intermediate breakage:

| Step | Description                                                                                   | Depends on |
| ---- | --------------------------------------------------------------------------------------------- | ---------- |
| 1    | Add dependencies to `package.json`, run `pnpm install`                                        | —          |
| 2    | Set up path aliases (`tsconfig.json`, `vite.config.ts`, `vitest.config.ts`)                   | —          |
| 3    | Create `src/lib/utils.ts` and `components.json`                                               | 2          |
| 4    | Update `index.css` with shadcn CSS variable mappings                                          | —          |
| 5    | Add `tailwindcss-animate` plugin to `tailwind.config.ts`                                      | 1          |
| 6    | Create core UI components: `button`, `card`, `badge`, `input`, `switch`                       | 3, 4, 5    |
| 7    | Create `dialog`, `select`, `tabs`, `progress`, `tooltip`                                      | 3, 4, 5    |
| 8    | Refactor `CourseExitWarningDialog` → shadcn `Dialog`                                          | 7          |
| 9    | Refactor `SettingsPage` → shadcn `Card`, `Switch`, `Button`, Lucide icons                     | 6, 7       |
| 10   | Refactor `HomePage` → shadcn `Card`, `Button`, Lucide icons                                   | 6          |
| 11   | Refactor `LeftNav` → shadcn `Button`, Lucide icons                                            | 6          |
| 12   | Refactor `CatalogPage` → shadcn `Card`, `Badge`, `Select`, `Progress`, `Button`, Lucide icons | 6, 7       |
| 13   | Refactor `ProgressDashboard` → shadcn `Card`, `Progress`, `Button`, `Badge`, Lucide icons     | 6, 7       |
| 14   | Refactor `AppShell` → shadcn `Button`, Lucide icons                                           | 6          |
| 15   | Refactor `CourseRuntime` → shadcn `Button`, Lucide icons                                      | 6          |
| 16   | Refactor `BundleOverviewPage` → shadcn `Card`, `Button`, `Progress`                           | 6, 7       |
| 17   | Update all test files                                                                         | 8–16       |
| 18   | Run full verification suite (typecheck, lint, test)                                           | 17         |

Steps 8–16 can be parallelized within the same PR as they affect different files with minimal cross-dependency.

---

## 9. Future Considerations (Out of Scope)

- **Storybook**: A component catalog for shadcn components is not part of this plan but would be a natural follow-up.
- **shadcn CLI**: We are writing components manually (copy patterns from shadcn/ui source). Future projects may use `npx shadcn@latest add`.
- **`CourseRuntime` rich text controls**: The MD renderer is handled by `@open-edu/runtime` and is not being migrated to shadcn forms.

---

## 10. Rollout & Risk Mitigation

### Risks

1. **Theme regression**: Shadcn components that don't resolve through `--oe-*` variables will break theme switching. Mitigation: enforce the CSS variable mapping table from Section 2 in code review.
2. **Test breakage**: Radix portals render outside the component DOM tree, so `screen.getByTestId` may fail to find dialog content. Mitigation: use `screen.findByRole('dialog')` + `within()` for portal content.
3. **Tree-shaking**: Radix packages are treeshakable, but unused imports could bloat the bundle. Mitigation: import only the specific primitives needed (`import * as Dialog from '@radix-ui/react-dialog'` — the barrel pattern is fine).
4. **`tailwindcss-animate` version compatibility**: Ensure the installed version is compatible with Tailwind 3.4. Mitigation: pin to `tailwindcss-animate@1.0.7` which is tested with Tailwind 3.x.
