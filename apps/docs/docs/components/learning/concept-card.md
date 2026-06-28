# ConceptCard

**Purpose:** Renders a concept card with a title, optional icon, and child content for highlighting key ideas.

## Import

```tsx
import { ConceptCard } from '@open-edu/design-system';
```

## Props

| Prop        | Type        | Default     | Description                                          |
| ----------- | ----------- | ----------- | ---------------------------------------------------- |
| `title`     | `string`    | —           | Concept title                                        |
| `children`  | `ReactNode` | —           | Concept explanation content                          |
| `icon`      | `string`    | `undefined` | Optional emoji/icon displayed in a colored container |
| `className` | `string`    | `undefined` | Additional CSS class                                 |

## Accessibility

- Uses semantic `<Card>` primitive.
- Icon has `aria-hidden="true"`.
- Title is rendered as an `<h3>` for proper heading hierarchy.

## Examples

```tsx
<ConceptCard title="Closure" icon="🔒">
  <p>A closure is a function that retains access to its outer scope.</p>
</ConceptCard>
```
