# Design System Implementation Plan

> **For agentic workers:** Use subagent-driven-development or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the existing design system with openedu-way philosophy by adding Visual DNA, completing token coverage, standardizing styling, fixing accessibility gaps, and establishing Figma integration.

**Architecture:** Three parallel tracks — Visual DNA (design exploration), Design System Cleanup (code), and Figma Integration (tooling). Track 2 executes first because it has zero design ambiguity. Track 1 requires human design decisions. Track 3 depends on Track 2's token completeness.

**Tech Stack:** TypeScript, Tailwind CSS 3.x, Radix UI, shadcn/ui pattern, class-variance-authority, Vitest, Storybook

---

## File Map

### New Files to Create

| File                                                                     | Purpose                                            |
| ------------------------------------------------------------------------ | -------------------------------------------------- |
| `packages/design-system/src/tokens/sizing.ts`                            | Sizing token scale                                 |
| `packages/design-system/src/tokens/opacity.ts`                           | Opacity token scale                                |
| `packages/design-system/src/tokens/borders.ts`                           | Border width/style tokens                          |
| `packages/design-system/src/tokens/focus.ts`                             | Focus ring tokens                                  |
| `packages/design-system/src/tokens/icons.ts`                             | Icon sizing tokens                                 |
| `packages/design-system/src/tokens/layout.ts`                            | Layout tokens (sidebar width, header height, etc.) |
| `packages/design-system/src/tokens/__tests__/sizing.test.ts`             | Tests for sizing tokens                            |
| `packages/design-system/src/tokens/__tests__/opacity.test.ts`            | Tests for opacity tokens                           |
| `packages/design-system/src/tokens/__tests__/borders.test.ts`            | Tests for border tokens                            |
| `packages/design-system/src/tokens/__tests__/focus.test.ts`              | Tests for focus tokens                             |
| `packages/design-system/src/tokens/__tests__/icons.test.ts`              | Tests for icon tokens                              |
| `packages/design-system/src/tokens/__tests__/layout.test.ts`             | Tests for layout tokens                            |
| `packages/design-system/src/primitives/geo-primitive.tsx`                | Geometric primitive component (Track 1)            |
| `packages/design-system/src/primitives/__tests__/geo-primitive.test.tsx` | Tests for primitive                                |
| `packages/design-system/scripts/export-tokens.ts`                        | Figma token export script                          |

### Files to Modify

| File                                                   | Change                                           |
| ------------------------------------------------------ | ------------------------------------------------ |
| `packages/design-system/src/tokens/tailwind.ts`        | Add mappings for new token categories            |
| `packages/design-system/src/tokens/index.ts`           | Export new token modules                         |
| `packages/design-system/src/theme/types.ts`            | Extend ThemeDefinition with new categories       |
| `packages/runtime/src/components/ThemeSelector.tsx`    | Migrate inline styles to Tailwind                |
| `packages/runtime/src/components/SkillSummary.tsx`     | Migrate inline styles to Tailwind                |
| `packages/runtime/src/components/ReadingRuler.tsx`     | Migrate inline styles to Tailwind                |
| `packages/runtime/src/components/ProgressRing.tsx`     | Replace inline style with Tailwind               |
| `packages/runtime/src/components/WidgetCanvas.tsx`     | Replace inline style with Tailwind               |
| `apps/learner/src/lib/utils.ts`                        | Remove duplicate cn(), import from design-system |
| `packages/design-system/src/effects/ConfettiBurst.tsx` | Replace hardcoded colors with tokens             |
| `packages/design-system/src/effects/GlowPulse.tsx`     | Replace hardcoded color with token               |
| `packages/design-system/src/learning/Module.tsx`       | Replace hardcoded color with token               |
| `packages/design-system/src/patterns/CourseTree.tsx`   | Replace hardcoded color with token               |
| `packages/widgets/src/builtins/*/` (13 files)          | Migrate ThemedButton → Button                    |
| `packages/widgets/src/themed-button.tsx`               | Delete after migration                           |

### Files to Delete

| File                                          | Reason                                                      |
| --------------------------------------------- | ----------------------------------------------------------- |
| `apps/learner/src/lib/utils.ts`               | Duplicate cn() — import from design-system instead          |
| `packages/widgets/src/themed-button.tsx`      | Deprecated — all consumers migrated to design-system Button |
| `packages/widgets/src/themed-button.test.tsx` | Test for deleted component                                  |

---

## Track 2: Design System Cleanup

### Phase 2a: Token Completeness

#### Task 1: Sizing Tokens

**Files:**

- Create: `packages/design-system/src/tokens/sizing.ts`
- Create: `packages/design-system/src/tokens/__tests__/sizing.test.ts`
- Modify: `packages/design-system/src/tokens/tailwind.ts`
- Modify: `packages/design-system/src/tokens/index.ts`

- [ ] **Step 1: Create sizing token definitions**

```typescript
// packages/design-system/src/tokens/sizing.ts
export const sizingScale = {
  // Icon sizes
  'icon-xs': '12px',
  'icon-sm': '16px',
  'icon-md': '20px',
  'icon-lg': '24px',
  'icon-xl': '32px',
  // Component heights
  'height-xs': '24px',
  'height-sm': '32px',
  'height-md': '40px',
  'height-lg': '48px',
  'height-xl': '56px',
  // Min widths
  'min-width-xs': '48px',
  'min-width-sm': '64px',
  'min-width-md': '120px',
  'min-width-lg': '200px',
} as const;

export type SizingToken = keyof typeof sizingScale;

export function sizingTokenToCssVar(token: SizingToken): string {
  return `var(--oe-size-${token})`;
}
```

- [ ] **Step 2: Write tests**

```typescript
// packages/design-system/src/tokens/__tests__/sizing.test.ts
import { describe, it, expect } from 'vitest';
import { sizingScale, sizingTokenToCssVar } from '../sizing';

describe('sizing tokens', () => {
  it('has icon sizes', () => {
    expect(sizingScale['icon-sm']).toBe('16px');
    expect(sizingScale['icon-lg']).toBe('24px');
  });

  it('has component heights', () => {
    expect(sizingScale['height-md']).toBe('40px');
  });

  it('generates CSS var references', () => {
    expect(sizingTokenToCssVar('icon-sm')).toBe('var(--oe-size-icon-sm)');
  });
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @open-edu/design-system test -- sizing`
Expected: PASS

- [ ] **Step 4: Add Tailwind mapping**

Add to `packages/design-system/src/tokens/tailwind.ts`:

```typescript
import { sizingScale } from './sizing';

export const tailwindSizingExtensions = Object.fromEntries(
  Object.entries(sizingScale).map(([key, value]) => [key, value]),
);
```

- [ ] **Step 5: Export from index**

Add to `packages/design-system/src/tokens/index.ts`:

```typescript
export * from './sizing';
```

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/tokens/sizing.ts packages/design-system/src/tokens/__tests__/sizing.test.ts packages/design-system/src/tokens/tailwind.ts packages/design-system/src/tokens/index.ts
git commit -m "feat(design-system): add sizing token scale"
```

---

#### Task 2: Opacity Tokens

**Files:**

- Create: `packages/design-system/src/tokens/opacity.ts`
- Create: `packages/design-system/src/tokens/__tests__/opacity.test.ts`
- Modify: `packages/design-system/src/tokens/index.ts`

- [ ] **Step 1: Create opacity token definitions**

```typescript
// packages/design-system/src/tokens/opacity.ts
export const opacityScale = {
  '0': '0',
  '5': '0.05',
  '10': '0.10',
  '20': '0.20',
  '30': '0.30',
  '40': '0.40',
  '50': '0.50',
  '60': '0.60',
  '70': '0.70',
  '80': '0.80',
  '90': '0.90',
  '100': '1',
} as const;

export type OpacityToken = keyof typeof opacityScale;

export function opacityTokenToCssVar(token: OpacityToken): string {
  return `var(--oe-opacity-${token})`;
}
```

- [ ] **Step 2: Write tests**

```typescript
// packages/design-system/src/tokens/__tests__/opacity.test.ts
import { describe, it, expect } from 'vitest';
import { opacityScale, opacityTokenToCssVar } from '../opacity';

describe('opacity tokens', () => {
  it('has full scale from 0 to 100', () => {
    expect(opacityScale['0']).toBe('0');
    expect(opacityScale['50']).toBe('0.50');
    expect(opacityScale['100']).toBe('1');
  });

  it('generates CSS var references', () => {
    expect(opacityTokenToCssVar('50')).toBe('var(--oe-opacity-50)');
  });
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @open-edu/design-system test -- opacity`
Expected: PASS

- [ ] **Step 4: Export from index and commit**

```bash
git add packages/design-system/src/tokens/opacity.ts packages/design-system/src/tokens/__tests__/opacity.test.ts packages/design-system/src/tokens/index.ts
git commit -m "feat(design-system): add opacity token scale"
```

---

#### Task 3: Border Tokens

**Files:**

- Create: `packages/design-system/src/tokens/borders.ts`
- Create: `packages/design-system/src/tokens/__tests__/borders.test.ts`
- Modify: `packages/design-system/src/tokens/index.ts`

- [ ] **Step 1: Create border token definitions**

```typescript
// packages/design-system/src/tokens/borders.ts
export const borderWidthScale = {
  '0': '0',
  '1': '1px',
  '2': '2px',
  '4': '4px',
  '8': '8px',
} as const;

export const borderStyleScale = {
  solid: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
  none: 'none',
} as const;

export type BorderWidthToken = keyof typeof borderWidthScale;
export type BorderStyleToken = keyof typeof borderStyleScale;

export function borderWidthTokenToCssVar(token: BorderWidthToken): string {
  return `var(--oe-border-width-${token})`;
}
```

- [ ] **Step 2: Write tests**

```typescript
// packages/design-system/src/tokens/__tests__/borders.test.ts
import { describe, it, expect } from 'vitest';
import { borderWidthScale, borderStyleScale, borderWidthTokenToCssVar } from '../borders';

describe('border tokens', () => {
  it('has width scale', () => {
    expect(borderWidthScale['1']).toBe('1px');
    expect(borderWidthScale['2']).toBe('2px');
  });

  it('has style scale', () => {
    expect(borderStyleScale['solid']).toBe('solid');
    expect(borderStyleScale['dashed']).toBe('dashed');
  });

  it('generates CSS var references', () => {
    expect(borderWidthTokenToCssVar('1')).toBe('var(--oe-border-width-1)');
  });
});
```

- [ ] **Step 3: Run tests and commit**

Run: `pnpm --filter @open-edu/design-system test -- borders`
Expected: PASS

```bash
git add packages/design-system/src/tokens/borders.ts packages/design-system/src/tokens/__tests__/borders.test.ts packages/design-system/src/tokens/index.ts
git commit -m "feat(design-system): add border width and style tokens"
```

---

#### Task 4: Focus Tokens

**Files:**

- Create: `packages/design-system/src/tokens/focus.ts`
- Create: `packages/design-system/src/tokens/__tests__/focus.test.ts`
- Modify: `packages/design-system/src/tokens/index.ts`

- [ ] **Step 1: Create focus token definitions**

```typescript
// packages/design-system/src/tokens/focus.ts
export const focusTokens = {
  'ring-width': '2px',
  'ring-offset': '2px',
  'ring-color': 'var(--oe-color-focus-ring)',
  'ring-style': 'solid',
} as const;

export type FocusToken = keyof typeof focusTokens;

export function focusRingClass(): string {
  return 'outline-none ring-2 ring-offset-2';
}
```

- [ ] **Step 2: Write tests**

```typescript
// packages/design-system/src/tokens/__tests__/focus.test.ts
import { describe, it, expect } from 'vitest';
import { focusTokens, focusRingClass } from '../focus';

describe('focus tokens', () => {
  it('defines ring width', () => {
    expect(focusTokens['ring-width']).toBe('2px');
  });

  it('generates focus ring class string', () => {
    expect(focusRingClass()).toContain('ring-2');
  });
});
```

- [ ] **Step 3: Run tests and commit**

Run: `pnpm --filter @open-edu/design-system test -- focus`
Expected: PASS

```bash
git add packages/design-system/src/tokens/focus.ts packages/design-system/src/tokens/__tests__/focus.test.ts packages/design-system/src/tokens/index.ts
git commit -m "feat(design-system): add focus ring tokens"
```

---

#### Task 5: Icon Tokens

**Files:**

- Create: `packages/design-system/src/tokens/icons.ts`
- Create: `packages/design-system/src/tokens/__tests__/icons.test.ts`
- Modify: `packages/design-system/src/tokens/index.ts`

- [ ] **Step 1: Create icon token definitions**

```typescript
// packages/design-system/src/tokens/icons.ts
export const iconSizeScale = {
  xs: '12px',
  sm: '16px',
  md: '20px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
} as const;

export const iconStrokeScale = {
  thin: '1',
  regular: '1.5',
  thick: '2',
} as const;

export type IconSizeToken = keyof typeof iconSizeScale;
export type IconStrokeToken = keyof typeof iconStrokeScale;

export function iconSizeTokenToCssVar(token: IconSizeToken): string {
  return `var(--oe-icon-size-${token})`;
}
```

- [ ] **Step 2: Write tests and run**

```typescript
// packages/design-system/src/tokens/__tests__/icons.test.ts
import { describe, it, expect } from 'vitest';
import { iconSizeScale, iconStrokeScale } from '../icons';

describe('icon tokens', () => {
  it('has size scale', () => {
    expect(iconSizeScale['sm']).toBe('16px');
    expect(iconSizeScale['lg']).toBe('24px');
  });

  it('has stroke scale', () => {
    expect(iconStrokeScale['regular']).toBe('1.5');
  });
});
```

Run: `pnpm --filter @open-edu/design-system test -- icons`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/tokens/icons.ts packages/design-system/src/tokens/__tests__/icons.test.ts packages/design-system/src/tokens/index.ts
git commit -m "feat(design-system): add icon sizing and stroke tokens"
```

---

#### Task 6: Layout Tokens

**Files:**

- Create: `packages/design-system/src/tokens/layout.ts`
- Create: `packages/design-system/src/tokens/__tests__/layout.test.ts`
- Modify: `packages/design-system/src/tokens/index.ts`

- [ ] **Step 1: Create layout token definitions**

```typescript
// packages/design-system/src/tokens/layout.ts
export const layoutTokens = {
  'sidebar-width': '280px',
  'sidebar-collapsed-width': '64px',
  'header-height': '56px',
  'panel-nav-width': '240px',
  'panel-explorer-width': '300px',
  'content-max-width': '720px',
  'reading-width': '680px',
  'grid-gap-sm': '8px',
  'grid-gap-md': '16px',
  'grid-gap-lg': '24px',
  'grid-gap-xl': '32px',
} as const;

export type LayoutToken = keyof typeof layoutTokens;

export function layoutTokenToCssVar(token: LayoutToken): string {
  return `var(--oe-layout-${token})`;
}
```

- [ ] **Step 2: Write tests and run**

```typescript
// packages/design-system/src/tokens/__tests__/layout.test.ts
import { describe, it, expect } from 'vitest';
import { layoutTokens } from '../layout';

describe('layout tokens', () => {
  it('defines sidebar width', () => {
    expect(layoutTokens['sidebar-width']).toBe('280px');
  });

  it('defines header height', () => {
    expect(layoutTokens['header-height']).toBe('56px');
  });

  it('defines reading width', () => {
    expect(layoutTokens['reading-width']).toBe('680px');
  });
});
```

Run: `pnpm --filter @open-edu/design-system test -- layout`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/tokens/layout.ts packages/design-system/src/tokens/__tests__/layout.test.ts packages/design-system/src/tokens/index.ts
git commit -m "feat(design-system): add layout tokens"
```

---

#### Task 7: Wire New Tokens into Tailwind and ThemeDefinition

**Files:**

- Modify: `packages/design-system/src/tokens/tailwind.ts`
- Modify: `packages/design-system/src/theme/types.ts`

- [ ] **Step 1: Add new token imports and exports to tailwind.ts**

```typescript
// Add to existing imports in tailwind.ts
import { sizingScale } from './sizing';
import { opacityScale } from './opacity';
import { borderWidthScale } from './borders';
import { focusTokens } from './focus';
import { iconSizeScale } from './icons';
import { layoutTokens } from './layout';

// Add new extension objects
export const tailwindSizingExtensions = Object.fromEntries(
  Object.entries(sizingScale).map(([key, value]) => [`size-${key}`, value]),
);

export const tailwindOpacityExtensions = Object.fromEntries(
  Object.entries(opacityScale).map(([key, value]) => [key, value]),
);

export const tailwindBorderWidthExtensions = Object.fromEntries(
  Object.entries(borderWidthScale).map(([key, value]) => [key, value]),
);

export const tailwindIconSizeExtensions = Object.fromEntries(
  Object.entries(iconSizeScale).map(([key, value]) => [key, value]),
);
```

- [ ] **Step 2: Extend ThemeDefinition with optional new categories**

```typescript
// Add to ThemeDefinition in types.ts (after radii field)
export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description?: string;
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radii: RadiiTokens;
  metadata?: {
    author?: string;
    version?: string;
  };
}
// Note: sizing, opacity, borders, focus, icons, layout are global tokens,
// not per-theme. They don't belong in ThemeDefinition.
```

- [ ] **Step 3: Run full token test suite**

Run: `pnpm --filter @open-edu/design-system test`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/tokens/tailwind.ts packages/design-system/src/theme/types.ts
git commit -m "feat(design-system): wire new token categories into Tailwind config"
```

---

### Phase 2b: Styling Standardization

#### Task 8: Migrate ThemeSelector Inline Styles

**Files:**

- Modify: `packages/runtime/src/components/ThemeSelector.tsx`

- [ ] **Step 1: Read current file and identify all inline styles**

The file has 11 inline style occurrences across 8 named CSSProperties objects (~87 lines). Read the file first.

- [ ] **Step 2: Replace style objects with Tailwind classes**

Key migrations:

- `triggerStyle` → `className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm"`
- `popoverStyle` → `className="z-[300] rounded-lg border bg-popover p-4 shadow-md"`
- `gridStyle` → `className="grid grid-cols-3 gap-3"`
- `cardBaseStyle` → `className="cursor-pointer rounded-md border p-3 transition-colors hover:bg-accent"`
- `swatchStyle()` → Dynamic classes using `cn()` with conditional bg colors
- `cardNameStyle` → `className="mt-2 text-xs font-medium"`
- `cardDescStyle` → `className="mt-1 text-xs text-muted-foreground"`
- `checkmarkStyle` → `className="absolute right-1 top-1 text-primary"`

For dynamic styles (like `swatchStyle()` which takes a color), use Tailwind arbitrary values or CSS variables:

```typescript
// Before: style={{ backgroundColor: swatchColor }}
// After: className={cn("rounded-full", `bg-[${swatchColor}]`)}
// Or better: use the theme token system
```

- [ ] **Step 3: Remove all CSSProperties imports and style objects**

- [ ] **Step 4: Run existing tests**

Run: `pnpm --filter @open-edu/runtime test -- ThemeSelector`
Expected: PASS (or update snapshots)

- [ ] **Step 5: Verify in Storybook**

Run: `pnpm --filter @open-edu/design-system storybook`
Visual check that ThemeSelector renders correctly.

- [ ] **Step 6: Commit**

```bash
git add packages/runtime/src/components/ThemeSelector.tsx
git commit -m "refactor(runtime): migrate ThemeSelector from inline styles to Tailwind"
```

---

#### Task 9: Migrate SkillSummary Inline Styles

**Files:**

- Modify: `packages/runtime/src/components/SkillSummary.tsx`

- [ ] **Step 1: Replace 5 inline style blocks with Tailwind classes**

```typescript
// Before: style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
// After: className="flex items-center gap-2"

// Before: style={{ width: `${score}%`, height: '6px', borderRadius: '3px', backgroundColor: 'var(--oe-color-primary)' }}
// After: className="h-1.5 rounded-full bg-primary" with dynamic width via style={{ width: `${score}%` }}
```

Note: Dynamic widths that depend on data must remain as inline styles. Static styles should be Tailwind classes.

- [ ] **Step 2: Replace hardcoded `#6b7280` with `text-muted-foreground`**

- [ ] **Step 3: Run tests and commit**

Run: `pnpm --filter @open-edu/runtime test -- SkillSummary`
Expected: PASS

```bash
git add packages/runtime/src/components/SkillSummary.tsx
git commit -m "refactor(runtime): migrate SkillSummary from inline styles to Tailwind"
```

---

#### Task 10: Migrate ReadingRuler Inline Styles

**Files:**

- Modify: `packages/runtime/src/components/ReadingRuler.tsx`

- [ ] **Step 1: Replace rulerStyle with Tailwind classes**

```typescript
// Before: style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 50, ... }}
// After: className="fixed inset-0 z-50 pointer-events-none"
```

The yellow highlight colors (`rgba(255, 255, 150, 0.25)`) should become theme tokens. Add a `--oe-color-reading-ruler` token or use `bg-primary/10`.

- [ ] **Step 2: Run tests and commit**

```bash
git add packages/runtime/src/components/ReadingRuler.tsx
git commit -m "refactor(runtime): migrate ReadingRuler from inline styles to Tailwind"
```

---

#### Task 11: Migrate ProgressRing and WidgetCanvas

**Files:**

- Modify: `packages/runtime/src/components/ProgressRing.tsx`
- Modify: `packages/runtime/src/components/WidgetCanvas.tsx`

- [ ] **Step 1: ProgressRing — keep dynamic size as inline style, move static styles to Tailwind**

Dynamic `width`/`height` based on `size` prop must stay inline. But the container styles can be Tailwind.

- [ ] **Step 2: WidgetCanvas — keep dynamic minHeight as inline style, move static styles to Tailwind**

- [ ] **Step 3: Run tests and commit**

```bash
git add packages/runtime/src/components/ProgressRing.tsx packages/runtime/src/components/WidgetCanvas.tsx
git commit -m "refactor(runtime): migrate ProgressRing and WidgetCanvas inline styles to Tailwind"
```

---

#### Task 12: Remove Duplicate cn() Utility

**Files:**

- Modify: `apps/learner/src/lib/utils.ts`
- Modify: Any files in `apps/learner/` that import from `../lib/utils`

- [ ] **Step 1: Find all imports of the learner app's cn()**

```bash
grep -r "from.*lib/utils" apps/learner/src/
```

- [ ] **Step 2: Update imports to use design-system**

```typescript
// Before: import { cn } from '@/lib/utils';
// After: import { cn } from '@open-edu/design-system';
```

- [ ] **Step 3: Delete the duplicate file**

```bash
rm apps/learner/src/lib/utils.ts
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @open-edu/learner test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/learner/src/
git commit -m "refactor(learner): remove duplicate cn() utility, import from design-system"
```

---

### Phase 2c: Accessibility and Hardcoded Color Fixes

#### Task 13: Replace Hardcoded Colors in Design System Components

**Files:**

- Modify: `packages/design-system/src/effects/ConfettiBurst.tsx`
- Modify: `packages/design-system/src/effects/GlowPulse.tsx`
- Modify: `packages/design-system/src/learning/Module.tsx`
- Modify: `packages/design-system/src/patterns/CourseTree.tsx`

- [ ] **Step 1: ConfettiBurst — replace `#6750a4`, `#16a34a`, `#e7c365`, `#dc2626`, `#003eb3` with token vars**

```typescript
// Before: color: 'var(--oe-color-primary, #6750a4)'
// After: color: 'var(--oe-color-primary)'
```

Remove all fallback hex values. If the token is guaranteed to exist (it should via ThemeProvider), fallbacks are unnecessary.

- [ ] **Step 2: GlowPulse — replace `#6750a4` default with token**

- [ ] **Step 3: Module — replace `#6750a4` fallback with token**

- [ ] **Step 4: CourseTree — replace `#6750a4` fallback with token**

- [ ] **Step 5: Run tests and commit**

Run: `pnpm --filter @open-edu/design-system test`
Expected: PASS

```bash
git add packages/design-system/src/
git commit -m "fix(design-system): remove hardcoded color fallbacks from components"
```

---

#### Task 14: Add Reduced Motion Support to CompletionScreen

**Files:**

- Modify: `packages/design-system/src/learning/CompletionScreen.tsx` (or runtime equivalent)

- [ ] **Step 1: Import useReducedMotion hook**

```typescript
import { useReducedMotion } from '../tokens/motion';
```

- [ ] **Step 2: Conditionally disable confetti**

```typescript
const prefersReducedMotion = useReducedMotion();

// In confetti rendering:
if (!prefersReducedMotion) {
  // render confetti
}
```

- [ ] **Step 3: Run tests and commit**

```bash
git add packages/design-system/src/learning/CompletionScreen.tsx
git commit -m "feat(design-system): add reduced-motion support to CompletionScreen"
```

---

#### Task 15: Migrate ThemedButton Consumers to Button

**Files:**

- Modify: 13 widget files in `packages/widgets/src/builtins/`
- Delete: `packages/widgets/src/themed-button.tsx`

- [ ] **Step 1: Update each widget import**

```typescript
// Before: import { ThemedButton } from '../../themed-button';
// After: import { Button } from '@open-edu/design-system';
```

- [ ] **Step 2: Map props**

```typescript
// Before: <ThemedButton variant="primary" size="md" onClick={...}>
// After: <Button variant="default" size="default" onClick={...}>
```

Variant mapping: primary→default, secondary→secondary, outline→outline, ghost→ghost
Size mapping: sm→sm, md→default, lg→lg

- [ ] **Step 3: Delete themed-button.tsx and its test**

```bash
rm packages/widgets/src/themed-button.tsx packages/widgets/src/themed-button.test.tsx
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @open-edu/widgets test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/widgets/src/
git commit -m "refactor(widgets): migrate all widgets from ThemedButton to design-system Button"
```

---

## Track 1: Visual DNA (Design Exploration)

This track requires human design decisions. The tasks below create scaffolding and infrastructure for the exploration.

#### Task 16: Create Geometric Primitive Component

**Files:**

- Create: `packages/design-system/src/primitives/geo-primitive.tsx`
- Create: `packages/design-system/src/primitives/__tests__/geo-primitive.test.tsx`

- [ ] **Step 1: Create a placeholder SVG primitive**

```typescript
// packages/design-system/src/primitives/geo-primitive.tsx
import * as React from 'react';
import { cn } from '../../lib/utils';

export interface GeoPrimitiveProps extends React.SVGAttributes<SVGSVGElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'muted' | 'accent';
}

const sizeMap = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

export const GeoPrimitive = React.forwardRef<SVGSVGElement, GeoPrimitiveProps>(
  ({ size = 'md', variant = 'default', className, ...props }, ref) => {
    const px = sizeMap[size];
    return (
      <svg
        ref={ref}
        width={px}
        height={px}
        viewBox="0 0 20 20"
        className={cn('fill-current', className)}
        {...props}
      >
        {/* Placeholder: a simple rounded square — to be replaced with actual primitive */}
        <rect x="2" y="2" width="16" height="16" rx="3" />
      </svg>
    );
  }
);
GeoPrimitive.displayName = 'GeoPrimitive';
```

- [ ] **Step 2: Write tests**

```typescript
// packages/design-system/src/primitives/__tests__/geo-primitive.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GeoPrimitive } from '../geo-primitive';

describe('GeoPrimitive', () => {
  it('renders with default size', () => {
    render(<GeoPrimitive data-testid="primitive" />);
    const svg = screen.getByTestId('primitive');
    expect(svg).toHaveAttribute('width', '20');
  });

  it('renders with lg size', () => {
    render(<GeoPrimitive size="lg" data-testid="primitive" />);
    const svg = screen.getByTestId('primitive');
    expect(svg).toHaveAttribute('width', '24');
  });

  it('applies custom className', () => {
    render(<GeoPrimitive className="text-primary" data-testid="primitive" />);
    expect(screen.getByTestId('primitive')).toHaveClass('text-primary');
  });
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @open-edu/design-system test -- geo-primitive`
Expected: PASS

- [ ] **Step 4: Export from design-system barrel**

Add to `packages/design-system/src/index.ts`:

```typescript
export { GeoPrimitive, type GeoPrimitiveProps } from './primitives/geo-primitive';
```

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/primitives/geo-primitive.tsx packages/design-system/src/primitives/__tests__/geo-primitive.test.tsx packages/design-system/src/index.ts
git commit -m "feat(design-system): add geometric primitive placeholder component"
```

---

#### Task 17: Create Visual DNA Storybook Stories

**Files:**

- Create: `packages/design-system/src/primitives/geo-primitive.stories.tsx`

- [ ] **Step 1: Create Storybook story for primitive exploration**

```typescript
// packages/design-system/src/primitives/geo-primitive.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { GeoPrimitive } from './geo-primitive';

const meta: Meta<typeof GeoPrimitive> = {
  title: 'Visual DNA/Geometric Primitive',
  component: GeoPrimitive,
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    variant: { control: 'select', options: ['default', 'muted', 'accent'] },
  },
};

export default meta;
type Story = StoryObj<typeof GeoPrimitive>;

export const Default: Story = {
  args: { size: 'md', variant: 'default' },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <GeoPrimitive size="xs" />
      <GeoPrimitive size="sm" />
      <GeoPrimitive size="md" />
      <GeoPrimitive size="lg" />
      <GeoPrimitive size="xl" />
    </div>
  ),
};

export const Assembly: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <GeoPrimitive key={i} size="md" />
      ))}
    </div>
  ),
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/design-system/src/primitives/geo-primitive.stories.tsx
git commit -m "feat(design-system): add geometric primitive Storybook stories"
```

---

## Track 3: Figma Integration

#### Task 18: Create Token Export Pipeline

**Files:**

- Create: `packages/design-system/scripts/export-tokens.ts`
- Modify: `packages/design-system/package.json` (add script)

- [ ] **Step 1: Create token export script**

```typescript
// packages/design-system/scripts/export-tokens.ts
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { palette } from '../src/tokens/colors';
import { defaultTypography } from '../src/tokens/typography';
import { spacingScale } from '../src/tokens/spacing';
import { radiusScale } from '../src/tokens/radius';
import { elevationScale } from '../src/tokens/elevation';
import { motionTokens } from '../src/tokens/motion';
import { sizingScale } from '../src/tokens/sizing';
import { opacityScale } from '../src/tokens/opacity';
import { borderWidthScale } from '../src/tokens/borders';
import { focusTokens } from '../src/tokens/focus';
import { iconSizeScale } from '../src/tokens/icons';
import { layoutTokens } from '../src/tokens/layout';

function flattenForFigma(tokens: Record<string, any>, prefix: string): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(tokens)) {
    if (typeof value === 'string') {
      result[`${prefix}/${key}`] = value;
    } else if (typeof value === 'object') {
      Object.assign(result, flattenForFigma(value, `${prefix}/${key}`));
    }
  }
  return result;
}

const figmaTokens = {
  color: palette,
  typography: defaultTypography,
  spacing: spacingScale,
  radius: radiusScale,
  elevation: elevationScale,
  motion: motionTokens,
  sizing: sizingScale,
  opacity: opacityScale,
  borderWidth: borderWidthScale,
  focus: focusTokens,
  icons: iconSizeScale,
  layout: layoutTokens,
};

const outputPath = resolve(__dirname, '../dist/tokens.json');
writeFileSync(outputPath, JSON.stringify(figmaTokens, null, 2));
console.log(`Tokens exported to ${outputPath}`);
```

- [ ] **Step 2: Add export script to package.json**

```json
{
  "scripts": {
    "export:tokens": "tsx scripts/export-tokens.ts"
  }
}
```

- [ ] **Step 3: Run export**

Run: `pnpm --filter @open-edu/design-system export:tokens`
Expected: `dist/tokens.json` created

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/scripts/export-tokens.ts packages/design-system/package.json packages/design-system/dist/tokens.json
git commit -m "feat(design-system): add Figma token export pipeline"
```

---

## Execution Order

```
Phase 2a (Tokens):       Tasks 1-7    (can be parallelized per token category)
Phase 2b (Styling):      Tasks 8-12   (sequential, each depends on previous patterns)
Phase 2c (A11y/Colors):  Tasks 13-15  (can be parallelized)
Track 1 (Visual DNA):    Tasks 16-17  (parallel with Track 2)
Track 3 (Figma):         Task 18      (depends on Phase 2a completion)
```

## Success Criteria

- [ ] All 12 token categories defined and tested
- [ ] Zero inline styles in ThemeSelector, SkillSummary, ReadingRuler
- [ ] Zero hardcoded hex colors in design-system components
- [ ] Zero duplicate cn() utilities
- [ ] ThemedButton deleted, all widgets use design-system Button
- [ ] CompletionScreen respects prefers-reduced-motion
- [ ] Geometric primitive component exists with Storybook stories
- [ ] Token export pipeline produces tokens.json for Figma
- [ ] All tests pass: `pnpm test`
- [ ] No lint errors: `pnpm lint`
- [ ] TypeScript compiles: `pnpm typecheck`
