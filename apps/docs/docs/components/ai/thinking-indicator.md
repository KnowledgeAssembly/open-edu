# ThinkingIndicator

**Purpose:** Displays an animated bouncing dots indicator with a label to show that the AI is processing.

## Import

```tsx
import { ThinkingIndicator } from '@open-edu/design-system';
```

## Props

| Prop    | Type     | Default         | Description                             |
| ------- | -------- | --------------- | --------------------------------------- |
| `label` | `string` | `'Thinking...'` | Accessible label for the thinking state |

## Accessibility

- Uses text label alongside animated dots for non-visual users.
- Animation is visual only; the label provides the accessible context.

## Examples

```tsx
<ThinkingIndicator />
<ThinkingIndicator label="Processing..." />
```
