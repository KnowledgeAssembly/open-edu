# AICallout

**Purpose:** Displays an AI-generated callout with an optional icon, title, and content, styled with tertiary theme colors.

## Import

```tsx
import { AICallout } from '@open-edu/design-system';
```

## Props

| Prop       | Type        | Default     | Description                                    |
| ---------- | ----------- | ----------- | ---------------------------------------------- |
| `icon`     | `string`    | `undefined` | Optional emoji/icon displayed before the title |
| `title`    | `string`    | —           | Callout heading                                |
| `children` | `ReactNode` | —           | Callout body content                           |

## Accessibility

- Has `role="complementary"`.
- `aria-label` is set to the `title` prop value.
- Icon has `aria-hidden="true"`.
- Title is rendered as an `<h3>`.

## Examples

```tsx
<AICallout title="AI Suggestion" icon="💡">
  <p>Consider reviewing the previous module before proceeding.</p>
</AICallout>
```
