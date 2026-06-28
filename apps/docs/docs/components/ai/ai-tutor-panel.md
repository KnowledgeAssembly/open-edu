# AITutorPanel

**Purpose:** A sidebar panel providing an AI tutor chat interface with tabs for Ask AI, My Notes, and Highlights.

## Import

```tsx
import { AITutorPanel } from '@open-edu/design-system';
```

## Props

| Prop      | Type      | Default | Description                  |
| --------- | --------- | ------- | ---------------------------- |
| `visible` | `boolean` | `true`  | Whether the panel is visible |

## Accessibility

- Rendered as `<aside>` with `aria-label="AI Tutor panel"`.
- Tab list uses `role="tablist"`, `aria-label`, and keyboard navigation (ArrowLeft, ArrowRight, Home, End).
- Tab buttons use `role="tab"`, `aria-selected`, and `aria-controls`.
- Tab panels use `role="tabpanel"` and `aria-labelledby`.
- Chat area uses `aria-live="polite"`.
- Textarea has `aria-label="Ask a question"`.
- Send button has `aria-label="Send message"`.

## Examples

```tsx
<AITutorPanel />
```
