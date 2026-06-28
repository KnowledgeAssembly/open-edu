# Skeleton

**Purpose:** A loading placeholder that pulses to indicate content is loading.

## Import

```tsx
import { Skeleton } from '@open-edu/design-system';
```

## Props

| Prop      | Type      | Default | Description                                         |
| --------- | --------- | ------- | --------------------------------------------------- |
| asChild   | `boolean` | `false` | Whether to render as a child element via Radix Slot |
| className | `string`  | —       | Additional CSS classes (use for width/height)       |

Also accepts all native `HTMLAttributes<HTMLDivElement>`.

## Accessibility

- **ARIA:** Add `aria-hidden="true"` or `aria-label="Loading"` as needed
- **Screen reader:** Consider adding a live region for loading state

## Examples

```tsx
<Skeleton className="w-20 h-4" />
<Skeleton className="h-10 w-full" />
```
