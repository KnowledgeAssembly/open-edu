# ReferenceCard

**Purpose:** Displays a reference with title, optional description, and an optional link to view the reference.

## Import

```tsx
import { ReferenceCard } from '@open-edu/design-system';
```

## Props

| Prop          | Type     | Default     | Description                    |
| ------------- | -------- | ----------- | ------------------------------ |
| `title`       | `string` | —           | Reference title                |
| `url`         | `string` | `undefined` | Optional URL to the reference  |
| `description` | `string` | `undefined` | Optional reference description |
| `className`   | `string` | `undefined` | Additional CSS class           |

## Accessibility

- Uses `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` primitives.
- Link opens in new tab with `target="_blank"` and `rel="noopener noreferrer"`.

## Examples

```tsx
<ReferenceCard
  title="MDN: JavaScript Guide"
  url="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide"
  description="Comprehensive guide to JavaScript."
/>
```
