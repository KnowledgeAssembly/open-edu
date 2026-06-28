# AIChat

**Purpose:** A full AI chat interface with message history, text input, thinking indicator, citations, and suggested questions.

## Import

```tsx
import { AIChat } from '@open-edu/design-system';
```

## Props

| Prop                        | Type                         | Default               | Description                                   |
| --------------------------- | ---------------------------- | --------------------- | --------------------------------------------- |
| `messages`                  | `ChatMessage[]`              | —                     | Array of chat messages                        |
| `onSend`                    | `(message: string) => void`  | —                     | Callback when a message is sent               |
| `placeholder`               | `string`                     | `'Ask a question...'` | Placeholder text for the input                |
| `isThinking`                | `boolean`                    | `false`               | Whether the AI is currently thinking          |
| `suggestedQuestions`        | `string[]`                   | `undefined`           | Optional suggested questions shown when empty |
| `onSuggestedQuestionSelect` | `(question: string) => void` | `undefined`           | Callback when a suggested question is clicked |
| `className`                 | `string`                     | `undefined`           | Additional CSS class                          |

### ChatMessage

| Prop        | Type                                 | Description                        |
| ----------- | ------------------------------------ | ---------------------------------- |
| `role`      | `'user' \| 'ai'`                     | Message sender                     |
| `text`      | `string`                             | Message body text                  |
| `citations` | `{ source: string; text: string }[]` | Optional citations for AI messages |

## Accessibility

- Uses `TutorMessage`, `Citation`, `ThinkingIndicator`, and `SuggestedQuestions` sub-components with their own accessible patterns.
- Input is a `<Textarea>` with an accessible send button.
- Suggested questions section only shows when messages are empty.

## Examples

```tsx
<AIChat
  messages={[
    { role: 'user', text: 'What is a closure?' },
    {
      role: 'ai',
      text: 'A closure is a function that retains access to its outer scope.',
      citations: [{ source: 'MDN', text: 'Closures' }],
    },
  ]}
  onSend={(msg) => console.log('send', msg)}
  isThinking={false}
  suggestedQuestions={['What is a variable?', 'Explain hoisting']}
  onSuggestedQuestionSelect={(q) => console.log(q)}
/>
```
