# EmptyState

**Purpose:** Displays a placeholder when no data is available.

## Import

```tsx
import { EmptyState } from '@open-edu/design-system';
```

## Props

| Prop        | Type        | Default | Description                       |
| ----------- | ----------- | ------- | --------------------------------- |
| title       | `string`    | —       | Main heading text                 |
| description | `string`    | —       | Optional descriptive text         |
| icon        | `ReactNode` | —       | Optional icon element             |
| action      | `ReactNode` | —       | Optional action button or element |
| className   | `string`    | —       | Additional CSS classes            |

Also accepts all native `HTMLAttributes<HTMLDivElement>`.

## Accessibility

- **ARIA:** Uses `<h3>` for the title for semantic heading structure
- **Screen reader:** Announces title and description

## Examples

```tsx
<EmptyState title="No results" description="Try a different search" />
<EmptyState title="Empty" action={<button>Add item</button>} />
```
