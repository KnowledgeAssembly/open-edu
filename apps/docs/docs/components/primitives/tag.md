# Tag

**Purpose:** Displays a removable tag or chip for categorization.

## Import

```tsx
import { Tag } from '@open-edu/design-system';
```

## Props

| Prop      | Type                                                                          | Default     | Description                            |
| --------- | ----------------------------------------------------------------------------- | ----------- | -------------------------------------- |
| variant   | `'default' \| 'secondary' \| 'success' \| 'warning' \| 'danger' \| 'outline'` | `'default'` | Visual style variant                   |
| onRemove  | `() => void`                                                                  | —           | Callback when remove button is clicked |
| className | `string`                                                                      | —           | Additional CSS classes                 |

Also accepts all native `HTMLAttributes<HTMLSpanElement>`.

## Variants

- **default:** Primary tinted background
- **secondary:** Secondary tinted background
- **success:** Success tinted background
- **warning:** Warning tinted background
- **danger:** Destructive tinted background
- **outline:** Bordered with transparent background

## Accessibility

- **Keyboard:** Remove button is tab-indexed when `onRemove` is provided
- **ARIA:** Remove button has `aria-label="Remove"`
- **Screen reader:** Announces tag text and remove action

## Examples

```tsx
<Tag>React</Tag>
<Tag variant="success">Completed</Tag>
<Tag onRemove={() => alert('Removed')}>Removable</Tag>
```
