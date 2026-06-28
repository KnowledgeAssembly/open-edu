# Badge

**Purpose:** Displays a small status indicator or label.

## Import

```tsx
import { Badge } from '@open-edu/design-system';
```

## Props

| Prop      | Type                                                     | Default     | Description            |
| --------- | -------------------------------------------------------- | ----------- | ---------------------- |
| variant   | `'default' \| 'secondary' \| 'destructive' \| 'outline'` | `'default'` | Visual style variant   |
| className | `string`                                                 | —           | Additional CSS classes |

Also accepts all native `HTMLAttributes<HTMLDivElement>`.

## Variants

- **default:** Primary filled background
- **secondary:** Secondary muted background
- **destructive:** Red destructive background
- **outline:** Bordered with transparent background

## Accessibility

- **ARIA:** Uses `<div>` element; add `aria-label` for context
- **Screen reader:** Announces contained text

## Examples

```tsx
<Badge>New</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Draft</Badge>
```
