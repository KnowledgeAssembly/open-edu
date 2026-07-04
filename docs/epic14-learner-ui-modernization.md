# Epic 14: Learner UI Modernization — Radix UI, shadcn/ui & Lucide Icons

**Parent:** Epic 13 (Learner App)  
**Status:** Planned  
**Priority:** P1  
**Depends on:** Epic 13 (Learner App) — all 4 stories completed  
**Target:** Modernize `apps/learner` UI with accessible primitives, consistent iconography, and theme-token-bound component library

---

## Epic Summary

Replace native HTML elements, emoji icons, and custom modal logic in `apps/learner` with Radix UI primitives, shadcn/ui component patterns, and Lucide SVG icons — all bound to the existing Open-Edu 4-theme system via `--oe-*` CSS variables.

### What changes

| Before                                           | After                                                     |
| ------------------------------------------------ | --------------------------------------------------------- |
| Unicode emojis (`🏠`, `📈`, `⚙️`)                | Lucide SVG icons (`Home`, `TrendingUp`, `Settings`)       |
| Native `<button>` with inline Tailwind           | shadcn `Button` with variants                             |
| Custom `<div>` + CSS progress bars               | Radix `Progress` with `role="progressbar"`                |
| Custom overlay + manual keyboard listeners       | Radix `Dialog` with built-in focus trap + Escape handling |
| Native `<input type="checkbox">` toggle switches | Radix `Switch` with `role="switch"`                       |
| Custom `<div>` stat cards                        | shadcn `Card` component family                            |
| Native sort buttons                              | shadcn `Select` dropdown                                  |
| Tag filter `<button>` elements                   | shadcn `Badge` interactive chips                          |

### Architecture

All shadcn components reference CSS variables defined in `index.css` that alias directly to Open-Edu's `--oe-*` runtime theme tokens. Dynamic theme switching (Lumina Scholastica, Nocturnal, High Focus, Sylvan Workspace) continues to work because `--background`, `--primary`, `--muted` etc. resolve through `--oe-color-*` which `RuntimeThemeProvider` sets as inline styles.

---

## Stories

### Story 14.1: Project Scaffolding & Dependency Setup

**Status:** Pending  
**Files to modify:**

- `apps/learner/package.json`
- `apps/learner/tsconfig.json`
- `apps/learner/vite.config.ts`
- `apps/learner/vitest.config.ts`
- `apps/learner/tailwind.config.ts`
- `apps/learner/src/index.css`

**Files to create:**

- `apps/learner/components.json`
- `apps/learner/src/lib/utils.ts`

#### Detailed spec

1. **`package.json`** — Add these dependencies under `dependencies`:
   - `lucide-react`
   - `@radix-ui/react-dialog`
   - `@radix-ui/react-progress`
   - `@radix-ui/react-tabs`
   - `@radix-ui/react-select`
   - `@radix-ui/react-slot`
   - `@radix-ui/react-switch`
   - `@radix-ui/react-tooltip`
   - `clsx`
   - `tailwind-merge`
   - `class-variance-authority`

   Add under `devDependencies`:
   - `tailwindcss-animate`

   After editing, run: `pnpm install`

2. **`tsconfig.json`** — Add `baseUrl` and `paths` so `@/` resolves to `./src`:

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

3. **`vite.config.ts`** — Add `resolve.alias`:

   ```typescript
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

4. **`vitest.config.ts`** — Add the same `resolve.alias`:

   ```typescript
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

5. **`tailwind.config.ts`**:
   - Add `require('tailwindcss-animate')` to the `plugins` array.

6. **`src/index.css`** — Replace the existing content with:

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

7. **`components.json`** (new file at `apps/learner/components.json`):

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

8. **`src/lib/utils.ts`** (new file):

   ```typescript
   import { clsx, type ClassValue } from 'clsx';
   import { twMerge } from 'tailwind-merge';

   export function cn(...inputs: ClassValue[]): string {
     return twMerge(clsx(inputs));
   }
   ```

#### Verification

- `pnpm --filter @open-edu/learner typecheck` passes
- `pnpm --filter @open-edu/learner test` passes (no test changes needed yet — all existing tests should still pass)

---

### Story 14.2: Core UI Components — Button, Card, Badge, Input

**Status:** Pending  
**Depends on:** Story 14.1  
**Files to create:**

- `apps/learner/src/components/ui/button.tsx`
- `apps/learner/src/components/ui/card.tsx`
- `apps/learner/src/components/ui/badge.tsx`
- `apps/learner/src/components/ui/input.tsx`

#### Detailed spec

All components go in `src/components/ui/` and use `@/lib/utils` for the `cn()` helper. Every component must:

- Accept `className` prop merged via `cn()`
- Forward `ref` using `React.forwardRef`
- Use `displayName` for devtools
- Be styled exclusively with Tailwind classes that resolve through `--oe-*` → shadcn → theme variable chain

##### `button.tsx`

Standard shadcn Button pattern with `Slot` from `@radix-ui/react-slot` for as-child composition, and `cva` from `class-variance-authority` for variants.

**Variants:**
| Variant | Classes |
|---|---|
| `default` | `bg-primary text-primary-foreground hover:bg-primary/90` |
| `secondary` | `bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| `destructive` | `bg-destructive text-destructive-foreground hover:bg-destructive/90` |
| `outline` | `border border-input bg-background hover:bg-accent hover:text-accent-foreground` |
| `ghost` | `hover:bg-accent hover:text-accent-foreground` |
| `link` | `text-primary underline-offset-4 hover:underline` |

**Sizes:**
| Size | Classes |
|---|---|
| `default` | `h-10 px-4 py-2` |
| `sm` | `h-9 rounded-md px-3` |
| `lg` | `h-11 rounded-md px-8` |
| `icon` | `h-10 w-10` |

**Props:** `variant`, `size`, `asChild` (boolean — when true uses `Slot`), plus all native button props.  
**Default:** `variant="default"`, `size="default"`, `asChild={false}`.  
**Base classes (always applied):** `inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50`  
**Display name:** `Button`

##### `card.tsx`

Modular card with 6 subcomponents, all using `React.forwardRef` and `cn()`.

| Component         | Tag     | Base classes                                               |
| ----------------- | ------- | ---------------------------------------------------------- |
| `Card`            | `<div>` | `rounded-lg border bg-card text-card-foreground shadow-sm` |
| `CardHeader`      | `<div>` | `flex flex-col space-y-1.5 p-6`                            |
| `CardTitle`       | `<h3>`  | `text-2xl font-semibold leading-none tracking-tight`       |
| `CardDescription` | `<p>`   | `text-sm text-muted-foreground`                            |
| `CardContent`     | `<div>` | `p-6 pt-0`                                                 |
| `CardFooter`      | `<div>` | `flex items-center p-6 pt-0`                               |

Each component gets an interface extending `React.HTMLAttributes<HTMLDivElement>` (or `HTMLHeadingElement` / `HTMLParagraphElement` for title/description).  
**Display names:** `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`

##### `badge.tsx`

Small inline component using `cva`.

**Variants:**
| Variant | Classes |
|---|---|
| `default` | `border-transparent bg-primary text-primary-foreground hover:bg-primary/80` |
| `secondary` | `border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| `destructive` | `border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80` |
| `outline` | `text-foreground` |

**Base classes:** `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2`  
**Props:** `variant` (default: `default`), optional `onClick` for interactive badges.  
**Display name:** `Badge`

##### `input.tsx`

Simple styled `<input>` with `React.forwardRef`.

**Props:** extends `React.InputHTMLAttributes<HTMLInputElement>`  
**Base classes:** `flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`  
**Display name:** `Input`

#### Verification

- `pnpm --filter @open-edu/learner typecheck` passes
- No existing tests break (these are new files, nothing consumes them yet)

---

### Story 14.3: Core UI Components — Dialog, Select, Progress, Tabs, Switch, Tooltip

**Status:** Pending  
**Depends on:** Story 14.1  
**Files to create:**

- `apps/learner/src/components/ui/dialog.tsx`
- `apps/learner/src/components/ui/select.tsx`
- `apps/learner/src/components/ui/progress.tsx`
- `apps/learner/src/components/ui/tabs.tsx`
- `apps/learner/src/components/ui/switch.tsx`
- `apps/learner/src/components/ui/tooltip.tsx`

#### Detailed spec

##### `dialog.tsx`

Radix Dialog-based modal following shadcn patterns. Uses `@radix-ui/react-dialog`.

**Exports:**
| Export | Implementation |
|---|---|
| `Dialog` | `Dialog.Root` |
| `DialogTrigger` | `Dialog.Trigger` |
| `DialogPortal` | `Dialog.Portal` (with `forceMount` prop forwarding) |
| `DialogOverlay` | `Dialog.Overlay` with base: `fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0` |
| `DialogContent` | `Dialog.Content` with: `fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg`. Include a close `<button>` with `X` icon (Lucide `X`) at top-right using `Dialog.Close`. |
| `DialogHeader` | `<div>` with `flex flex-col space-y-1.5 text-center sm:text-left` |
| `DialogFooter` | `<div>` with `flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2` |
| `DialogTitle` | `Dialog.Title` with `text-lg font-semibold leading-none tracking-tight` |
| `DialogDescription` | `Dialog.Description` with `text-sm text-muted-foreground` |

All components use `React.forwardRef` and `cn()`.  
The `DialogOverlay` and `DialogContent` must close the dialog on backdrop click and Escape (Radix handles this by default).

##### `select.tsx`

Radix Select-based accessible dropdown. Uses `@radix-ui/react-select`. Follow shadcn patterns for `<SelectTrigger>` (visible button with chevron icon), `<SelectScrollUpButton>`, `<SelectScrollDownButton>`, `<SelectContent>` (positioned portal overlay), `<SelectItem>` (individual options), `<SelectLabel>`, `<SelectSeparator>`, `<SelectValue>`.

**Exports:**

- `Select` — `Select.Root`
- `SelectGroup` — `Select.Group`
- `SelectValue` — `Select.Value`
- `SelectTrigger` — styled button with `ChevronDown` icon
- `SelectContent` — portal overlay with `animate-in`/`fade-in`/`zoom-in-95`
- `SelectLabel` — `px-2 py-1.5 text-sm font-semibold`
- `SelectItem` — each option with `Check` icon when selected
- `SelectSeparator` — `-mx-1 my-1 h-px bg-muted`

##### `progress.tsx`

Radix Progress bar. Uses `@radix-ui/react-progress`.

```tsx
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn('bg-secondary relative h-4 w-full overflow-hidden rounded-full', className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="bg-primary h-full w-full flex-1 transition-all"
      style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;
```

##### `tabs.tsx`

Radix Tabs with `TabsList`, `TabsTrigger`, `TabsContent`. Uses `@radix-ui/react-tabs`.

- `TabsList` — `inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground`
- `TabsTrigger` — `inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm`
- `TabsContent` — `mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`

##### `switch.tsx`

Radix Switch using `@radix-ui/react-switch`.

```tsx
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'focus-visible:ring-ring focus-visible:ring-offset-background data-[state=checked]:bg-primary data-[state=unchecked]:bg-input peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'bg-background pointer-events-none block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;
```

##### `tooltip.tsx`

Radix Tooltip using `@radix-ui/react-tooltip`.

- `TooltipProvider` — wraps app section, accepts `delayDuration` prop
- `Tooltip` — `Root`
- `TooltipTrigger` — `Trigger`
- `TooltipContent` — portal with: `z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2`

#### Verification

- `pnpm --filter @open-edu/learner typecheck` passes
- All 6 components compile without errors

---

### Story 14.4: LeftNav & AppShell — Lucide Icons + shadcn Button

**Status:** Pending  
**Depends on:** Story 14.2  
**Files to modify:**

- `apps/learner/src/LeftNav.tsx`
- `apps/learner/src/AppShell.tsx`

#### Detailed spec

##### `LeftNav.tsx` changes

1. **Replace emoji icons** with Lucide components. Import from `lucide-react`:
   - `🏠` → `<Home className="h-5 w-5" />`
   - `📈` → `<TrendingUp className="h-5 w-5" />`
   - `📚` → `<BookOpen className="h-5 w-5" />`
   - `⚙️` → `<Settings className="h-5 w-5" />`
   - `←` (Back to Catalog arrow) → `<ArrowLeft className="h-4 w-4" />`
   - `✓` (visited step checkmark) → `<Check className="h-4 w-4" />`
   - `📖` → `<BookOpen className="h-5 w-5" />`

2. **Replace navigation `<button>` elements** with shadcn `Button` component:
   - Import `Button` from `@/components/ui/button`
   - Active nav item: `variant="secondary"` + `className="justify-start w-full"`
   - Inactive nav item: `variant="ghost"` + `className="justify-start w-full"`
   - Remove the manual `border-l-2` active indicator styling — shadcn Button variants handle the active state visually
   - Keep `aria-current="page"` on the active button
   - Keep `data-testid` attributes on buttons

3. **Back to Catalog button**: Replace with `<Button variant="outline" size="sm" className="w-full">`

4. **Course step list**: Replace the checkmark `<span>` with Lucide `<Check className="h-3 w-3" />`. Replace the "Back to Catalog" native button with shadcn Button.

5. **Remove `aria-hidden="true"` from emoji spans** (no longer needed since icons have `aria-hidden` by default in Lucide).

6. **Update the `navItems` array**: Remove the `icon` string field; render icons inline via a mapping function or object.

##### `AppShell.tsx` changes

1. Import Lucide icons as needed for header actions (currently `TopAppBar` and shell buttons use native elements).
2. Replace any native `<button>` in the shell layout with `<Button>`.
3. No structural changes — just button/icon replacement. The `TopAppBar` is imported from `@open-edu/runtime` and should not be modified here (it's part of a separate package).

#### Test impact

- `LeftNav.test.tsx`: Tests check `getByText('Home')` and `getByTestId('leftnav-home')` — these still work since `data-testid` and visible text labels are preserved. The `aria-current` assertions remain valid. Step 1/2 indicators change from emoji text nodes to SVG elements but `data-testid` selectors are unchanged.
- `AppShell.test.tsx`: No changes needed — shell button refactoring is minimal and `data-testid` attributes preserved.

#### Verification

- `pnpm --filter @open-edu/learner typecheck` passes
- `pnpm --filter @open-edu/learner test` passes (all existing tests)

---

### Story 14.5: HomePage — shadcn Card, Button, Lucide Icons

**Status:** Pending  
**Depends on:** Story 14.2  
**Files to modify:**

- `apps/learner/src/HomePage.tsx`

#### Detailed spec

1. **Import shadcn components:**

   ```tsx
   import { Card, CardContent } from '@/components/ui/card';
   import { Button } from '@/components/ui/button';
   ```

2. **Import Lucide icons:**

   ```tsx
   import {
     BookOpen,
     TrendingUp,
     Trophy,
     Sparkles,
     PlayCircle,
     GraduationCap,
     Clock,
   } from 'lucide-react';
   ```

3. **Stat cards** — Replace the three `<div>` stat cards with:

   ```tsx
   <Card>
     <CardContent className="flex flex-col items-center p-6 text-center">
       <BookOpen className="text-primary mb-2 h-8 w-8" />
       <div className="text-primary text-3xl font-bold">{totalUnits}</div>
       <p className="text-muted-foreground text-sm">Learning Units Available</p>
     </CardContent>
   </Card>
   ```

   (Repeat for the other two stat cards with `TrendingUp`/`GraduationCap` and `Trophy`/`Award` icons)

4. **Quick Links section** — Replace the `<div>` with:

   ```tsx
   <Card className="border-primary/20 bg-primary/5">
     <CardContent className="p-6">
       <h2 className="text-primary mb-3 flex items-center gap-2 text-lg font-semibold">
         <Sparkles className="h-5 w-5" /> Quick Links
       </h2>
       <div className="flex flex-wrap gap-3">
         <Button onClick={() => onNavigate({ view: 'catalog' })}>
           <PlayCircle className="mr-2 h-4 w-4" /> Browse Courses
         </Button>
         <Button variant="outline" onClick={() => onNavigate({ view: 'progress' })}>
           View Progress
         </Button>
         <Button variant="outline" onClick={() => onNavigate({ view: 'settings' })}>
           Settings
         </Button>
       </div>
     </CardContent>
   </Card>
   ```

5. **Remove** the emoji `<div>` elements `📚`, `📈`, `🏆`.

6. **Preserve** all `data-testid` attributes (`home-page` on the outer div, etc.).

#### Test impact

- `HomePage.test.tsx` checks `getByText('Welcome to OpenEdu')`, `getByText('Browse Courses')`, `getByText('View Progress')`, `getByText('Settings')` — all still present after refactoring.
- The "+" emoji was used in stat card headings as `{'\uD83D\uDCDA'}` etc. — these are replaced with icons. No test asserts on these emoji values, so the test suite should pass.

#### Verification

- `pnpm --filter @open-edu/learner typecheck` passes
- `pnpm --filter @open-edu/learner test` passes

---

### Story 14.6: SettingsPage — shadcn Card, Switch, Button, Lucide Icons

**Status:** Pending  
**Depends on:** Story 14.2, Story 14.3  
**Files to modify:**

- `apps/learner/src/SettingsPage.tsx`

#### Detailed spec

1. **Import shadcn components:**

   ```tsx
   import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
   import { Button } from '@/components/ui/button';
   import { Switch } from '@/components/ui/switch';
   ```

2. **Import Lucide icons:**

   ```tsx
   import { Sun, Moon, Eye, Type, Minus, Plus } from 'lucide-react';
   ```

3. **Theme section** — Wrap existing `ThemeSelector` component in a `Card`:

   ```tsx
   <Card>
     <CardHeader>
       <CardTitle className="flex items-center gap-2">
         <Sun className="h-5 w-5" /> Theme
       </CardTitle>
     </CardHeader>
     <CardContent>
       <ThemeSelector currentThemeId={currentThemeId} onThemeChange={onThemeChange} />
     </CardContent>
   </Card>
   ```

4. **Accessibility section** — Wrap in a `Card`:

   ```tsx
   <Card>
     <CardHeader>
       <CardTitle className="flex items-center gap-2">
         <Eye className="h-5 w-5" /> Accessibility
       </CardTitle>
     </CardHeader>
     <CardContent className="space-y-4">
       {/* Font Size row */}
       <div className="flex items-center justify-between">
         <div className="flex items-center gap-2">
           <Type className="text-muted-foreground h-4 w-4" />
           <div>
             <p className="text-sm font-medium">Font Size</p>
             <p className="text-muted-foreground text-xs">Adjust text size</p>
           </div>
         </div>
         <div className="flex items-center gap-2">
           <Button
             variant="outline"
             size="sm"
             onClick={() => setFontSize((s) => Math.max(80, s - 10))}
             aria-label="Decrease font size"
           >
             <Minus className="h-4 w-4" />
           </Button>
           <span className="w-12 text-center font-mono text-sm">{fontSize}%</span>
           <Button
             variant="outline"
             size="sm"
             onClick={() => setFontSize((s) => Math.min(150, s + 10))}
             aria-label="Increase font size"
           >
             <Plus className="h-4 w-4" />
           </Button>
         </div>
       </div>

       {/* Reduced Motion row */}
       <div className="flex items-center justify-between">
         <div className="flex items-center gap-2">
           <div>
             <p className="text-sm font-medium">Reduced Motion</p>
             <p className="text-muted-foreground text-xs">Minimize animations</p>
           </div>
         </div>
         <Switch
           checked={reducedMotion}
           onCheckedChange={setReducedMotion}
           aria-label="Reduced Motion"
         />
       </div>

       {/* High Contrast row */}
       <div className="flex items-center justify-between">
         <div className="flex items-center gap-2">
           <div>
             <p className="text-sm font-medium">High Contrast</p>
             <p className="text-muted-foreground text-xs">Increase color contrast</p>
           </div>
         </div>
         <Switch
           checked={highContrast}
           onCheckedChange={setHighContrast}
           aria-label="High Contrast"
         />
       </div>
     </CardContent>
   </Card>
   ```

5. **Remove** the custom checkbox toggle markup (the `<label>` + `<input type="checkbox">` + `<div>` peer pattern). Replace with `<Switch>`.

6. **Remove** the font size `<button>` elements with inline classes. Replace with `<Button variant="outline" size="sm">`.

7. **Preserve** all `data-testid` attributes and existing functionality. The `useEffect` hooks for setting CSS variables remain unchanged.

#### Test impact

- `SettingsPage.test.tsx` checks `getByText('Theme')`, `getByText('Accessibility')`, `getByText('Font Size')`, `getByText('Reduced Motion')`, `getByText('High Contrast')` — all still present.
- The toggle switch element changes from `<input type="checkbox">` to a `<button role="switch">`. The `getByLabelText('Reduced Motion')` query uses the `aria-label` which is preserved on the Switch. Update the test if it queries by `input` type directly (it doesn't — it checks text content only).

#### Verification

- `pnpm --filter @open-edu/learner typecheck` passes
- `pnpm --filter @open-edu/learner test` passes

---

### Story 14.7: CatalogPage — shadcn Card, Badge, Select, Progress, Button, Lucide Icons

**Status:** Pending  
**Depends on:** Story 14.2, Story 14.3  
**Files to modify:**

- `apps/learner/src/CatalogPage.tsx`

#### Detailed spec

1. **Import shadcn components:**

   ```tsx
   import {
     Card,
     CardContent,
     CardHeader,
     CardTitle,
     CardDescription,
     CardFooter,
   } from '@/components/ui/card';
   import { Button } from '@/components/ui/button';
   import { Badge } from '@/components/ui/badge';
   import { Progress } from '@/components/ui/progress';
   import {
     Select,
     SelectContent,
     SelectItem,
     SelectTrigger,
     SelectValue,
   } from '@/components/ui/select';
   ```

2. **Import Lucide icons** (as needed; the `CourseCard` component is from `@open-edu/runtime` and already has its own rendering):

   ```tsx
   import { Search } from 'lucide-react';
   ```

3. **Continue Learning section** — Replace the native `<button>` "View all" with `<Button variant="link" size="sm">`. Keep the `CourseCard` from `@open-edu/runtime` as-is (it's a separate package component, not modified here).

4. **Bundle cards** — Replace the native `<button>` bundle cards with shadcn `Card`:

   ```tsx
   <Card
     key={bundle.manifest.id}
     className="cursor-pointer transition-shadow hover:shadow-md"
     onClick={() => onStartBundle?.(bundle.manifest.id)}
     data-testid="bundle-card"
     data-bundle-id={bundle.manifest.id}
   >
     <CardHeader>
       <div className="mb-1 flex items-center gap-2">
         <Badge variant="secondary">Bundle</Badge>
         <CardTitle className="truncate text-lg">{bundle.manifest.title}</CardTitle>
       </div>
       <CardDescription>
         {bundle.manifest.description ?? `${bundle.moduleCount} modules`}
       </CardDescription>
     </CardHeader>
     <CardContent>
       <div className="text-muted-foreground flex gap-4 text-xs">
         <span>{bundle.moduleCount} modules</span>
         <span>{bundle.totalNodeCount} activities</span>
       </div>
       {prog && (
         <div className="mt-2">
           <Progress
             value={Math.round((completedModules / bundle.moduleCount) * 100)}
             className="h-2"
           />
           <span className="text-muted-foreground mt-1 block text-xs">
             {completedModules} of {bundle.moduleCount} complete
           </span>
         </div>
       )}
     </CardContent>
   </Card>
   ```

5. **Tag filter chips** — Replace native `<button>` tag filters with interactive `Badge` components:

   ```tsx
   <Badge
     variant={activeTag === null ? 'default' : 'outline'}
     className="cursor-pointer"
     onClick={() => setActiveTag(null)}
   >
     All
   </Badge>;
   {
     tags.map((tag) => (
       <Badge
         key={tag}
         variant={activeTag === tag ? 'default' : 'outline'}
         className="cursor-pointer"
         onClick={() => setActiveTag(tag)}
       >
         {tag}
       </Badge>
     ));
   }
   ```

6. **Sort controls** — Replace native sort buttons with a `Select` dropdown:

   ```tsx
   <Select
     value={sortBy}
     onValueChange={(v) => setSortBy(v as 'newest' | 'inProgress' | 'alphabetical')}
   >
     <SelectTrigger className="w-[180px]">
       <SelectValue placeholder="Sort by" />
     </SelectTrigger>
     <SelectContent>
       <SelectItem value="newest">Newest</SelectItem>
       <SelectItem value="inProgress">In Progress First</SelectItem>
       <SelectItem value="alphabetical">Alphabetical</SelectItem>
     </SelectContent>
   </Select>
   ```

   The `sortBy` state type should remain `'newest' | 'inProgress' | 'alphabetical'`. The sort behavior logic stays unchanged.

7. **Empty state**: Replace native `<button>` "Browse Courses" (in empty state) with `<Button>`.

8. **Preserve** all `data-testid` attributes: `catalog-page`, `continue-learning-shelf`, `bundle-list-section`, `filter-chips`, `sort-controls`, `course-card`, `bundle-card`.

#### Test impact

- `CatalogPage.test.tsx` checks `getAllByTestId('course-card')` — `CourseCard` from `@open-edu/runtime` is unchanged.
- The empty state test `getByText('No courses found.')` is unchanged.
- The sort controls change from `<button>` elements to a `<select>` — the test checks text content `getByText('Course One')` and `getByRole('button', { name: /Start Course One/ })` which are inside `CourseCard` and unchanged.
- The filter chip elements change role from `button` to `Badge` (which renders as a `<span>`). Update `CatalogPage.test.tsx` if any test queries filter chips by role `button`.

#### Verification

- `pnpm --filter @open-edu/learner typecheck` passes
- `pnpm --filter @open-edu/learner test` passes (update `CatalogPage.test.tsx` if needed)

---

### Story 14.8: ProgressDashboard — shadcn Card, Progress, Button, Badge, Lucide Icons

**Status:** Pending  
**Depends on:** Story 14.2, Story 14.3  
**Files to modify:**

- `apps/learner/src/ProgressDashboard.tsx`

#### Detailed spec

1. **Import shadcn components:**

   ```tsx
   import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
   import { Button } from '@/components/ui/button';
   import { Badge } from '@/components/ui/badge';
   import { Progress } from '@/components/ui/progress';
   ```

2. **Import Lucide icons:**

   ```tsx
   import { BookOpen, Trophy, Target, Zap, Flame, Award, CheckCircle2 } from 'lucide-react';
   ```

3. **Empty state** — Wrap in `Card` and use Lucide `BookOpen` icon:

   ```tsx
   <Card className="p-8 text-center">
     <CardContent>
       <BookOpen className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
       <CardTitle className="mb-2">Your learning journey starts here!</CardTitle>
       <CardDescription className="mb-6">
         Begin a course and your progress will appear here.
       </CardDescription>
       <Button onClick={() => onNavigate({ view: 'catalog' })}>Browse Courses</Button>
     </CardContent>
   </Card>
   ```

4. **Progress cards** — Replace the outer `<div>` course card with `Card`. Use `CardHeader` for the title, `CardContent` for stats and progress bar.
   - Replace custom div-based progress bar with `<Progress value={percent} className="h-2" />`
   - Replace "Completed ✓" text span with `<Badge variant="secondary">Completed <CheckCircle2 className="h-3 w-3 ml-1 inline" /></Badge>`
   - Replace "Continue" button with `<Button size="sm">Continue</Button>`
   - Keep the `border-l-4 border-l-success` on completed cards — add it via `className` on `Card`
   - Keep all `data-testid` attributes (`progress-dashboard`, `progress-card-{packageId}`)

5. **Preserve** existing logic: `relativeTime`, `humanizeNodeId`, sorting, badge count display.

#### Test impact

- `ProgressDashboard.test.tsx` checks `getByText('Your learning journey starts here!')`, `getByText('Browse Courses')`, `getByText('My Progress')` — all still present.
- Custom progress bars (`<div>` with inline `width` style) are replaced with Radix `Progress` (`role="progressbar"`) — no existing test queries progress bar internals.
- The empty state button changes from native `<button>` to shadcn `Button` (still renders a `<button>` element) — no test impact.

#### Verification

- `pnpm --filter @open-edu/learner typecheck` passes
- `pnpm --filter @open-edu/learner test` passes

---

### Story 14.9: CourseExitWarningDialog — Radix Dialog Replacement

**Status:** Pending  
**Depends on:** Story 14.3 (specifically `dialog.tsx`)  
**Files to modify:**

- `apps/learner/src/CourseExitWarningDialog.tsx`

#### Detailed spec

**Complete rewrite of the component body.** The interface stays the same:

```tsx
export interface CourseExitWarningDialogProps {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}
```

**Replace the entire implementation** with:

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function CourseExitWarningDialog({
  open,
  onStay,
  onLeave,
}: CourseExitWarningDialogProps): JSX.Element | null {
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onStay();
      }}
    >
      <DialogContent data-testid="exit-warning-dialog">
        <DialogHeader>
          <DialogTitle>Leave this course?</DialogTitle>
          <DialogDescription>
            Your progress up to this point has been saved. You can resume from where you left off.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onStay} data-testid="exit-warning-stay">
            Stay
          </Button>
          <Button variant="destructive" onClick={onLeave} data-testid="exit-warning-leave">
            Leave Course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**What to remove:**

- `useRef`, `useEffect` imports (no longer needed — Radix handles focus trap and Escape internally)
- `FocusTrap` import from `@open-edu/accessibility`
- Manual `handleEscape` keyboard event listener
- Manual focus management on `stayRef`
- The entire dialog overlay and content `<div>` markup
- The `<h2>`, `<p>`, and custom styled `<button>` elements

**What to keep:**

- The component interface (`CourseExitWarningDialogProps`)
- The `data-testid` attributes for `exit-warning-dialog`, `exit-warning-stay`, `exit-warning-leave`
- The `null` return when `open` is false (though Radix handles this internally now — the `Dialog` component removes itself from DOM when closed)

**Note:** The `CourseExitWarningDialog` no longer needs a conditional `if (!open) return null` — Radix `Dialog` manages its own open/close state. However, the parent (`AppShell`) passes `open` as a prop. We use `Dialog`'s controlled mode (`open={open}`). When `open` is false, Radix unmounts the content. Keep the `if (!open) return null` guard OR remove it — both work. Removing it simplifies the component.

#### Test impact

- The dialog content now renders in a Radix portal (outside the root React tree). Tests using `screen.getByTestId('exit-warning-dialog')` may fail because portal content isn't in the main DOM tree.
- **Fix:** Use `await screen.findByRole('dialog')` or `await screen.findByTestId('exit-warning-dialog')` (with `findBy` which retries) since portal content renders asynchronously.
- The Escape key test (`fireEvent.keyDown(document, { key: 'Escape' })`) should be updated to fire on the dialog content instead, or use `userEvent.keyboard('{Escape}')` which works with Radix.
- The `aria-labelledby` check needs updating — Radix Dialog handles title associations via `DialogTitle` automatically. The dialog will have `aria-labelledby` pointing to the Radix-generated title ID. Update the test to just check that `aria-labelledby` exists (not a specific value).

#### Verification

- `pnpm --filter @open-edu/learner typecheck` passes
- `pnpm --filter @open-edu/learner test` — tests will likely fail and need updating (see Story 14.11)

---

### Story 14.10: CourseRuntime & BundleOverviewPage — shadcn Button, Card, Progress

**Status:** Pending  
**Depends on:** Story 14.2, Story 14.3  
**Files to modify:**

- `apps/learner/src/CourseRuntime.tsx`
- `apps/learner/src/BundleOverviewPage.tsx`

#### Detailed spec

##### `CourseRuntime.tsx` changes

1. **Import shadcn components:**

   ```tsx
   import { Button } from '@/components/ui/button';
   ```

2. **Import Lucide icons:**

   ```tsx
   import { ArrowLeft } from 'lucide-react';
   ```

3. **Replace the "Course not available" fallback** (line ~171-181):
   - Replace native `<button>` with `<Button onClick={onBackToCatalog}>`
   - Add `<ArrowLeft className="h-4 w-4 mr-2" />` icon inside the button

4. **Badge toast notification** (line ~209-218):
   - Currently uses a `<div>` with inline `opacity` style. Replace with a more accessible approach but keep the same visual behavior. Use `<Card>` if desired, but the current implementation is simple enough to keep — just replace the div with appropriate classes. The toast is a simple fixed-position notification — minimal changes needed here. Optionally replace the `<div>` with a `Card`:

   ```tsx
   <Card
     className="fixed bottom-4 right-4 z-[9999] shadow-lg"
     style={{ opacity: toastVisible ? 1 : 0 }}
     data-testid="badge-toast"
   >
     <CardContent className="p-3">
       <div className="text-success flex items-center gap-1 text-sm font-semibold">
         <Award className="h-4 w-4" /> Badge earned!
       </div>
       <div className="text-base">{toastBadgeName}</div>
     </CardContent>
   </Card>
   ```

5. **`LayoutShellWithBack`**: The navigation buttons inside this inner component delegate to `LayoutShell` from `@open-edu/runtime`. No changes needed here as `LayoutShell` is in a separate package.

##### `BundleOverviewPage.tsx` changes

This is a thin wrapper around `BundleOverview` from `@open-edu/runtime`. The component itself has minimal UI — it constructs data objects and passes them to the runtime component. No shadcn component changes are needed here since the UI is delegated to `@open-edu/runtime`'s `BundleOverview`.

**However**, if `BundleOverview` renders native buttons, those would need to be changed in the runtime package — that's out of scope for this epic. For this story, just ensure the wrapper passes props correctly (no changes needed).

#### Test impact

- `CourseRuntime.test.tsx`: The "Back to catalog" button in the no-workflow fallback changes from native `<button>` to shadcn `Button`. The test queries it by text content (`getByText('Back to catalog')`) which still works. The `getByTestId('course-runtime')` and `getByTestId('child-content')` checks are unchanged.
- No `BundleOverviewPage.test.tsx` exists — no impact.

#### Verification

- `pnpm --filter @open-edu/learner typecheck` passes
- `pnpm --filter @open-edu/learner test` passes

---

### Story 14.11: Test Updates for Refactored Components

**Status:** Pending  
**Depends on:** Stories 14.4 through 14.10  
**Files to modify:**

- `apps/learner/src/CourseExitWarningDialog.test.tsx`
- `apps/learner/src/CatalogPage.test.tsx` (if filter chip queries break)
- `apps/learner/src/__tests__/a11y-themes.test.tsx` (if needed)
- Any other test file with selector changes

#### Detailed spec

This story updates tests to match the new component DOM structure after the migration. Do not merge without this story.

##### `CourseExitWarningDialog.test.tsx` — Major update

The original tests use `screen.getByTestId('exit-warning-dialog')` which queries the DOM synchronously. Radix `DialogContent` renders in a portal (outside the React root) and may not be immediately available:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CourseExitWarningDialog } from './CourseExitWarningDialog';

describe('CourseExitWarningDialog', () => {
  it('renders when open', async () => {
    render(<CourseExitWarningDialog open onStay={vi.fn()} onLeave={vi.fn()} />);
    // Use findByTestId or findByRole — portal content is async
    expect(await screen.findByTestId('exit-warning-dialog')).toBeInTheDocument();
    expect(await screen.findByText('Leave this course?')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<CourseExitWarningDialog open={false} onStay={vi.fn()} onLeave={vi.fn()} />);
    // Query immediately — should not be in DOM at all
    expect(screen.queryByTestId('exit-warning-dialog')).not.toBeInTheDocument();
  });

  it('calls onStay when Stay button is clicked', async () => {
    const onStay = vi.fn();
    render(<CourseExitWarningDialog open onStay={onStay} onLeave={vi.fn()} />);
    fireEvent.click(await screen.findByTestId('exit-warning-stay'));
    expect(onStay).toHaveBeenCalledTimes(1);
  });

  it('calls onLeave when Leave button is clicked', async () => {
    const onLeave = vi.fn();
    render(<CourseExitWarningDialog open onStay={vi.fn()} onLeave={onLeave} />);
    fireEvent.click(await screen.findByTestId('exit-warning-leave'));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('calls onStay on Escape key', async () => {
    const onStay = vi.fn();
    render(<CourseExitWarningDialog open onStay={onStay} onLeave={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    // Radix Dialog handles Escape internally — use fireEvent on the dialog content
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onStay).toHaveBeenCalledTimes(1);
  });

  it('does not call onStay on Escape key when closed', () => {
    const onStay = vi.fn();
    render(<CourseExitWarningDialog open={false} onStay={onStay} onLeave={vi.fn()} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onStay).not.toHaveBeenCalled();
  });

  it('has accessible dialog role and aria attributes', async () => {
    render(<CourseExitWarningDialog open onStay={vi.fn()} onLeave={vi.fn()} />);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // Radix Dialog auto-generates the aria-labelledby reference
    expect(dialog).toHaveAttribute('aria-labelledby');
  });
});
```

##### `CatalogPage.test.tsx` — If filter chips break

If the test queries filter chips by `role('button')`, update to query by text or `data-testid` since `Badge` renders as a `<span>` (not a `<button>`). The existing test doesn't query filter chips, so this may not be needed:

```tsx
// Only needed if the test fails:
// Update any `getByRole('button', { name: /All/ })` to `getByText('All')`
```

##### `a11y-themes.test.tsx` — Verify no regressions

Re-run the suite. The CourseExitWarningDialog test in this file may need the same `findByRole` fix for Radix portals:

```tsx
it('CourseExitWarningDialog has no axe violations', async () => {
  const { container } = renderWithTheme(
    <CourseExitWarningDialog open onStay={vi.fn()} onLeave={vi.fn()} />,
    themeId,
  );
  // Wait for portal content to render before running axe
  await screen.findByRole('dialog');
  const result = await axe.run(container);
  expect(result.violations).toHaveLength(0);
});
```

##### Other test files

No changes needed for: `HomePage.test.tsx`, `ProgressDashboard.test.tsx`, `SettingsPage.test.tsx`, `LeftNav.test.tsx`, `AppShell.test.tsx`, `CourseRuntime.test.tsx`. These tests query by text content and `data-testid` attributes which are preserved.

#### Verification

- `pnpm --filter @open-edu/learner test` — ALL tests pass (11 test files, ~40+ test cases)

---

### Story 14.12: Accessibility Audit Verification

**Status:** Pending  
**Depends on:** Stories 14.4 through 14.11  
**Files to check:**

- `apps/learner/src/__tests__/a11y-themes.test.tsx`

#### Detailed spec

1. **Run the full a11y audit** across all 4 themes on all 6 pages:

   ```bash
   pnpm --filter @open-edu/learner test -- --reporter=verbose src/__tests__/a11y-themes.test.tsx
   ```

   Expected: 24 test cases (4 themes × 6 pages), all passing with 0 axe violations.

2. **Known axe rules that might fire and how to handle them:**

   | Rule ID             | Potential trigger                               | Fix                                                                                                 |
   | ------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
   | `color-contrast`    | shadcn component colors not matching background | Check that `--primary`/`--primary-foreground` resolve to valid contrast ratios through all 4 themes |
   | `aria-allowed-role` | Radix Dialog/Tabs/Select roles                  | These are correct — Radix uses valid ARIA roles. Verify in test output.                             |
   | `button-name`       | Icon-only buttons without accessible labels     | Ensure all icon-only `Button` components have `aria-label`                                          |
   | `landmark-one-main` | Multiple `<main>` regions                       | Ensure only one `<main>` per page view                                                              |

3. **If violations are found:**
   - Add `data-axe-exclude` or adjust the component styling to fix the violation
   - Do NOT use axe `{ rules: { 'color-contrast': { enabled: false } } }` — all violations must be fixed

4. **Manual verification checklist:**
   - [ ] Theme switching: navigate through all 4 themes — no broken colors in shadcn components
   - [ ] Dialog: Tab focus order within dialog, Escape to close, click outside to close
   - [ ] Select: keyboard navigation (ArrowUp/Down) in sort dropdown
   - [ ] Tabs: ArrowLeft/ArrowRight switching between tabs (if used in SettingsPage)
   - [ ] Progress: screen reader announces `aria-valuenow` correctly
   - [ ] Switch: keyboard toggle (Space/Enter) works, `aria-checked` updates
   - [ ] Icons: all Lucide icons have `aria-hidden="true"` (default behavior)

#### Verification

- `pnpm --filter @open-edu/learner test` — all 24 a11y test cases pass with 0 violations
- Manual visual verification on `localhost:4001`

---

## Epic Verification Checklist

Run before marking Epic 14 complete:

- [ ] `pnpm install` — no dependency errors
- [ ] `pnpm --filter @open-edu/learner typecheck` — 0 errors
- [ ] `pnpm --filter @open-edu/learner lint` — 0 errors
- [ ] `pnpm --filter @open-edu/learner test` — all tests pass
- [ ] `pnpm test` — full monorepo test suite passes
- [ ] `pnpm format:check` — formatting is correct
- [ ] axe-core violations: 0 across all 4 themes, all 6 pages
- [ ] Manual: `pnpm --filter @open-edu/learner dev` — app renders, all views work, theme switching works
- [ ] No dead code, debug logs, or temporary edits
- [ ] Conventional commit messages on all story PRs

---

## Dependency Graph Among Stories

```
14.1 (Scaffolding)
  ├─► 14.2 (Button, Card, Badge, Input)
  │     ├─► 14.4 (LeftNav + AppShell)
  │     ├─► 14.5 (HomePage)
  │     ├─► 14.6 (SettingsPage)
  │     ├─► 14.7 (CatalogPage)
  │     ├─► 14.8 (ProgressDashboard)
  │     └─► 14.10 (CourseRuntime + BundleOverviewPage)
  ├─► 14.3 (Dialog, Select, Progress, Tabs, Switch, Tooltip)
  │     ├─► 14.6 (SettingsPage — Switch)
  │     ├─► 14.7 (CatalogPage — Select, Progress)
  │     ├─► 14.8 (ProgressDashboard — Progress)
  │     └─► 14.9 (CourseExitWarningDialog — Dialog)
  └─► 14.11 (Test Updates — depends on 14.4–14.10)
        └─► 14.12 (A11y Audit — depends on 14.11)
```

Stories 14.4–14.10 can be implemented in parallel after 14.2 and 14.3 are complete, since they modify different files with no shared state.
