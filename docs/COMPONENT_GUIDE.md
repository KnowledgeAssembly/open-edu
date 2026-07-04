# Component Development Guide

Authoritative reference for building UI components in the Open-Edu design system.

## Pattern A — shadcn/ui Standard

All new primitives in `@open-edu/design-system` follow the shadcn/ui pattern:

```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils.js';

const badgeVariants = cva(
  'focus:ring-ring inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/80 border-transparent',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-transparent',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/80 border-transparent',
        outline: 'text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  ),
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
```

Reference implementations: `packages/design-system/src/primitives/badge.tsx`, `button.tsx`, `card.tsx`.

## File Structure

Each primitive gets a co-located directory in `packages/design-system/src/primitives/`:

```
primitives/
├── button.tsx          # component implementation
├── button.stories.tsx  # Storybook stories (optional, for visual regression)
└── __tests__/
    └── button.test.tsx  # Vitest tests
```

Runtime components live in `packages/runtime/src/components/` with a flat structure and co-located tests:

```
components/
├── ThemeSelector.tsx
├── ThemeSelector.test.tsx    # co-located
├── CourseCard.tsx
├── CourseCard.test.tsx
└── __tests__/                # or grouped (legacy convention)
    └── AICallout.test.tsx
```

## Required Elements

Every primitive component must include:

| Element                               | Example                                               | Required?                    |
| ------------------------------------- | ----------------------------------------------------- | ---------------------------- |
| `React.forwardRef`                    | `React.forwardRef<HTMLDivElement, Props>(...)`        | Yes                          |
| `.displayName`                        | `Badge.displayName = 'Badge'`                         | Yes                          |
| `cn()` from `@open-edu/design-system` | `className={cn('base', className)}`                   | Yes                          |
| `cva()` for variants                  | `const variants = cva('base', { variants: { ... } })` | Yes (if multi-variant)       |
| Named exports                         | `export { Badge, badgeVariants }`                     | Yes — never `export default` |
| Prop interface                        | `export interface BadgeProps extends ...`             | Yes                          |

## Prop Conventions

| Convention       | Pattern           | Example                                |
| ---------------- | ----------------- | -------------------------------------- |
| Callbacks        | `on*` prefix      | `onClick`, `onThemeChange`, `onSelect` |
| Booleans         | `is`/`has` prefix | `isLocked`, `isDisabled`, `hasError`   |
| Styling override | `className` prop  | Always accept `className?: string`     |

## Token Usage Rules

- **Never hardcode color values.** Use `--oe-*` CSS variables through Tailwind theme classes.
- **Never use raw Tailwind palette colors** like `text-amber-400`, `bg-blue-500`, `border-gray-300`.
- Use semantic token classes: `bg-primary`, `text-on-surface`, `border-outline-variant`, `bg-surface-container`.

### Prohibited ❌

```tsx
// Hardcoded hex
style={{ color: '#4f378a' }}
className="text-amber-400"

// Non-token Tailwind color
className="bg-blue-500 text-gray-700"
```

### Correct ✓

```tsx
className = 'bg-primary text-primary-foreground';
className = 'text-on-surface-variant border-outline-variant';
```

## Allowed Inline Style Exceptions

Inline `style={{}}` is **prohibited for all styling** except these specific cases:

1. **Dynamic sizing from props** — computed widths/heights that cannot be expressed in Tailwind:

   ```tsx
   style={{ width: `${percentage}%` }}
   ```

2. **CSS variable references** — passing `--oe-*` values to child elements:

   ```tsx
   style={{ '--oe-reduced-motion': reduced ? 'reduce' : 'unset' } as React.CSSProperties}
   ```

3. **`RuntimeThemeProvider`** — injects theme CSS variables dynamically.

4. **`ThemeSelector` swatches** — theme color preview swatches where values come from theme definitions.

## Testing Patterns

Tests use **vitest** + **@testing-library/react**. Every component needs:

1. **Rendering test** — verify the component renders.
2. **Interaction test** — verify user actions produce expected behavior.
3. **a11y test** — verify no axe-core violations.

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../badge.jsx';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('Badge', () => {
  it('has no accessibility violations', async () => {
    await checkAccessibility(<Badge>Badge</Badge>);
  });
  it('renders with text', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeDefined();
  });
  it('renders with variant classes', () => {
    render(<Badge variant="destructive">Error</Badge>);
    expect(screen.getByText('Error').className).toContain('bg-destructive');
  });
  it('sets displayName', () => {
    expect(Badge.displayName).toBe('Badge');
  });
});
```

The `checkAccessibility()` helper (`packages/design-system/src/test-utils/a11y.tsx`) renders the element, runs `axe-core`, and throws on any violations (with color-contrast disabled since theme tokens are injected at runtime).

## Common Anti-Patterns

| Anti-pattern              | Why                                     | Fix                                            |
| ------------------------- | --------------------------------------- | ---------------------------------------------- |
| Hardcoded colors          | Breaks theme switching                  | Use `--oe-*` tokens                            |
| `style={{}}` for layout   | Ignores theme, breaks dark mode         | Use Tailwind classes                           |
| No `forwardRef`           | Breaks ref forwarding from parent       | Wrap with `React.forwardRef`                   |
| No `displayName`          | Debugging difficulty                    | Add `Component.displayName = '...'`            |
| `export default`          | Poor tree-shaking, inconsistent imports | Use named exports                              |
| Missing `className` prop  | Consumers can't override positioning    | Add `className?: string` and merge with `cn()` |
| `as={...}` without `Slot` | TypeScript complexity                   | Use `@radix-ui/react-slot`                     |

## Migration Guide

### Pattern B → Pattern A

Pattern B: Named functions without `forwardRef` or `displayName`.

```tsx
// Before (Pattern B)
export function Card({ card, level, onClick }: CardProps): JSX.Element { ... }

// After (Pattern A)
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ card, level, onClick, className, ...props }, ref) => ( ... ),
);
Card.displayName = 'Card';
export { Card };
```

Steps:

1. Wrap component body in `React.forwardRef<HTMLElement, Props>`.
2. Add `.displayName = 'ComponentName'`.
3. Add `className` prop if missing; merge with `cn()`.
4. If variants exist, extract to `cva()`.

### Pattern C → Pattern A

Pattern C: Default exports, inline `style={{}}`, hardcoded colors, no `forwardRef`.

```tsx
// Before (Pattern C)
export default function Widget({ size }: { size: number }) {
  return <div style={{ width: size, color: '#4f378a' }}>Widget</div>;
}

// After (Pattern A)
const Widget = React.forwardRef<HTMLDivElement, WidgetProps>(
  ({ size, className, ...props }, ref) => (
    <div ref={ref} className={cn('text-primary', className)} style={{ width: size }} {...props} />
  ),
);
Widget.displayName = 'Widget';
export { Widget };
```

Steps:

1. Replace `export default function` with named export + `const` + `forwardRef`.
2. Move hardcoded colors to Tailwind token classes (`text-primary`).
3. Keep inline `style={{}}` only for computed values (dynamic sizing).
4. Add `displayName`.
5. Add `className` with `cn()` merge.
6. Add prop interface with `extends React.HTMLAttributes<HTMLElement>`.
