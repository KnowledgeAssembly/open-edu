# TutorMessage

**Purpose:** Renders a chat message bubble for either the AI tutor or the user, with appropriate alignment and styling.

## Import

```tsx
import { TutorMessage } from '@open-edu/design-system';
```

## Props

| Prop        | Type             | Default     | Description          |
| ----------- | ---------------- | ----------- | -------------------- |
| `role`      | `'user' \| 'ai'` | —           | Message sender role  |
| `children`  | `ReactNode`      | —           | Message content      |
| `className` | `string`         | `undefined` | Additional CSS class |

## Accessibility

- AI messages display a bot icon (decorative, `aria-hidden="true"`).
- Messages are aligned left for AI, right for user using flexbox justification.

## Examples

```tsx
<TutorMessage role="ai">Hello! How can I help you?</TutorMessage>
<TutorMessage role="user">What is a variable?</TutorMessage>
```
