# Breadcrumb

**Purpose:** A navigation breadcrumb trail showing the current page location.

## Import

```tsx
import { Breadcrumb } from '@open-edu/design-system';
```

## Props

| Prop      | Type                                 | Default | Description               |
| --------- | ------------------------------------ | ------- | ------------------------- |
| items     | `{ label: string; href?: string }[]` | —       | Array of breadcrumb items |
| className | `string`                             | —       | Additional CSS classes    |

## Accessibility

- **ARIA:** `aria-label="Breadcrumb"` on `<nav>` element
- **Screen reader:** Announces breadcrumb trail structure

## Examples

```tsx
<Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Current' }]} />
```
