# Spinner

**Purpose:** An animated loading spinner indicator.

## Import

```tsx
import { Spinner } from '@open-edu/design-system';
```

## Props

| Prop      | Type                   | Default | Description            |
| --------- | ---------------------- | ------- | ---------------------- |
| size      | `'sm' \| 'md' \| 'lg'` | `'md'`  | Spinner size           |
| className | `string`               | —       | Additional CSS classes |

## Sizes

- **sm:** h-4 w-4
- **md:** h-6 w-6
- **lg:** h-8 w-8

## Accessibility

- **ARIA:** `role="status"` with `aria-label="Loading"`
- **Screen reader:** Announces "Loading"

## Examples

```tsx
<Spinner />
<Spinner size="sm" />
<Spinner size="lg" />
```
