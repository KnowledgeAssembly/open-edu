# Textarea

**Purpose:** A styled multi-line text input.

## Import

```tsx
import { Textarea } from '@open-edu/design-system';
```

## Props

| Prop      | Type     | Default | Description            |
| --------- | -------- | ------- | ---------------------- |
| className | `string` | —       | Additional CSS classes |

Also accepts all native `TextareaHTMLAttributes<HTMLTextAreaElement>`.

## Accessibility

- **Keyboard:** Tab to focus, type to enter text
- **ARIA:** Native `<textarea>` with implicit textbox role
- **Screen reader:** Reads associated label or placeholder

## Examples

```tsx
<Textarea placeholder="Enter text" />
<Textarea disabled value="Disabled" />
```
