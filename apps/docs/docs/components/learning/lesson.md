# Lesson

**Purpose:** Renders a lesson card with an optional icon, title, and child content.

## Import

```tsx
import { Lesson } from '@open-edu/design-system';
```

## Props

| Prop        | Type        | Default     | Description                                    |
| ----------- | ----------- | ----------- | ---------------------------------------------- |
| `title`     | `string`    | —           | Lesson title                                   |
| `children`  | `ReactNode` | —           | Lesson content                                 |
| `icon`      | `string`    | `undefined` | Optional emoji/icon displayed before the title |
| `className` | `string`    | `undefined` | Additional CSS class                           |

## Accessibility

- Uses `Card`, `CardHeader`, `CardTitle`, `CardContent` primitives for semantic structure.
- Icon has `aria-hidden="true"` when provided.
- Heading hierarchy uses `<CardTitle>` for the lesson title.

## Examples

```tsx
<Lesson title="Variables" icon="📦">
  <p>Variables store data values in JavaScript.</p>
</Lesson>
```
