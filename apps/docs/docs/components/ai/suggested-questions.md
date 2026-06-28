# SuggestedQuestions

**Purpose:** Displays a grid of clickable suggested questions for the user to select in a chat conversation.

## Import

```tsx
import { SuggestedQuestions } from '@open-edu/design-system';
```

## Props

| Prop        | Type                         | Default     | Description                         |
| ----------- | ---------------------------- | ----------- | ----------------------------------- |
| `questions` | `string[]`                   | —           | Array of suggested question texts   |
| `onSelect`  | `(question: string) => void` | —           | Callback when a question is clicked |
| `className` | `string`                     | `undefined` | Additional CSS class                |

## Accessibility

- Questions are rendered as focusable `<button>` elements.
- Section has a heading `<h3>` for screen reader context.

## Examples

```tsx
<SuggestedQuestions
  questions={['What is a variable?', 'How do I write a function?', 'What is an API?']}
  onSelect={(q) => console.log('selected', q)}
/>
```
